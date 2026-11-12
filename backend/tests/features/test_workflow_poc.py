"""S01-09/S01-10 deterministic feasibility tests; no network or paid API."""

from __future__ import annotations

import pytest
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.types import Command

from app.features.workflows.checkpoints import _to_psycopg_url
from app.features.workflows.fallback import (
    BoundedFallbackRouter,
    CircuitBreaker,
    FailureKind,
    ProviderAttempt,
    SharedSubmissionBudget,
)
from app.features.workflows.poc import InMemoryReviewLedger, build_poc_graph


class FakeProvider:
    def __init__(self, name: str, *responses: ProviderAttempt) -> None:
        self.name = name
        self._responses = list(responses)
        self.calls = 0

    def invoke(self, request_digest: str) -> ProviderAttempt:
        assert request_digest == "synthetic-sha256"
        self.calls += 1
        return self._responses.pop(0)


def _success(name: str, output: str = "synthetic-artifact") -> ProviderAttempt:
    return ProviderAttempt(provider=name, success=True, output=output)


def _failure(name: str, failure: FailureKind) -> ProviderAttempt:
    return ProviderAttempt(provider=name, success=False, failure=failure)


def _graph(ledger: InMemoryReviewLedger, *providers: FakeProvider):
    return build_poc_graph(
        ledger=ledger,
        fallback_router=BoundedFallbackRouter(list(providers)),
        checkpointer=InMemorySaver(),
    )


def test_graph_interrupts_then_resumes_after_immutable_approval() -> None:
    ledger = InMemoryReviewLedger()
    primary = FakeProvider("gemini", _success("gemini"))
    graph = _graph(ledger, primary)
    config = {"configurable": {"thread_id": "workflow-run-1"}}

    paused = graph.invoke({"run_id": "run-1", "request_digest": "synthetic-sha256"}, config)
    assert paused["__interrupt__"][0].value["review_request_id"] == "review-run-1"
    assert primary.calls == 0

    # This is the durable business decision made before the graph resumes.
    ledger.decide("run-1", approved=True)
    result = graph.invoke(Command(resume={"review_request_id": "review-run-1"}), config)

    assert result["artifact_id"] == "artifact-run-1"
    assert result["provider_name"] == "gemini"
    assert primary.calls == 1
    assert ledger.publish_calls == 1


def test_duplicate_resume_does_not_publish_duplicate_artifact() -> None:
    ledger = InMemoryReviewLedger()
    primary = FakeProvider("gemini", _success("gemini"))
    graph = _graph(ledger, primary)
    config = {"configurable": {"thread_id": "workflow-run-duplicate"}}

    graph.invoke({"run_id": "run-duplicate", "request_digest": "synthetic-sha256"}, config)
    ledger.decide("run-duplicate", approved=True)
    graph.invoke(Command(resume={}), config)

    # A later delivery/retry reads the completed checkpoint rather than making
    # the externally visible publication happen twice.
    final = graph.invoke(None, config)
    assert final["artifact_id"] == "artifact-run-duplicate"
    assert ledger.publish_calls == 1
    assert primary.calls == 1


def test_rejected_review_never_calls_provider() -> None:
    ledger = InMemoryReviewLedger()
    primary = FakeProvider("gemini", _success("gemini"))
    graph = _graph(ledger, primary)
    config = {"configurable": {"thread_id": "workflow-run-rejected"}}

    graph.invoke({"run_id": "run-rejected", "request_digest": "synthetic-sha256"}, config)
    ledger.decide("run-rejected", approved=False)
    result = graph.invoke(Command(resume={}), config)

    assert result["terminal_error"] == "REVIEW_REJECTED"
    assert primary.calls == 0
    assert ledger.publish_calls == 0


def test_provider_outage_falls_back_once_to_next_approved_provider() -> None:
    gemini = FakeProvider("gemini", _failure("gemini", FailureKind.unavailable))
    openai = FakeProvider("openai", _success("openai", "fallback-success"))
    outcome = BoundedFallbackRouter([gemini, openai]).invoke("synthetic-sha256")

    assert outcome.output == "fallback-success"
    assert [attempt.provider for attempt in outcome.attempts] == ["gemini", "openai"]
    assert gemini.calls == openai.calls == 1


@pytest.mark.parametrize("failure", [FailureKind.refused, FailureKind.authentication, FailureKind.unknown_outcome])
def test_ambiguous_or_disallowed_failure_never_falls_back(failure: FailureKind) -> None:
    gemini = FakeProvider("gemini", _failure("gemini", failure))
    openai = FakeProvider("openai", _success("openai"))
    outcome = BoundedFallbackRouter([gemini, openai]).invoke("synthetic-sha256")

    assert outcome.output is None
    assert outcome.terminal_failure == failure
    assert gemini.calls == 1
    assert openai.calls == 0


def test_submission_budget_caps_provider_calls() -> None:
    gemini = FakeProvider("gemini", _failure("gemini", FailureKind.rate_limited))
    openai = FakeProvider("openai", _success("openai"))
    outcome = BoundedFallbackRouter([gemini, openai], max_submissions=1).invoke("synthetic-sha256")

    assert outcome.output is None
    assert gemini.calls == 1
    assert openai.calls == 0


def test_three_provider_chain_handles_invalid_output_then_throttle() -> None:
    gemini = FakeProvider("gemini", _failure("gemini", FailureKind.invalid_output))
    openai = FakeProvider("openai", _failure("openai", FailureKind.rate_limited))
    claude = FakeProvider("claude", _success("claude", "validated-fallback"))

    outcome = BoundedFallbackRouter([gemini, openai, claude]).invoke("synthetic-sha256")

    assert outcome.output == "validated-fallback"
    assert [attempt.provider for attempt in outcome.attempts] == ["gemini", "openai", "claude"]
    assert gemini.calls == openai.calls == claude.calls == 1


def test_shared_budget_is_consumed_across_router_invocations() -> None:
    budget = SharedSubmissionBudget(maximum=2)
    gemini = FakeProvider(
        "gemini",
        _failure("gemini", FailureKind.unavailable),
        _failure("gemini", FailureKind.unavailable),
    )
    openai = FakeProvider("openai", _success("openai"))
    router = BoundedFallbackRouter(
        [gemini, openai], max_submissions=2, shared_budget=budget
    )

    first = router.invoke("synthetic-sha256")
    second = router.invoke("synthetic-sha256")

    assert first.output == "synthetic-artifact"
    assert second.terminal_failure == FailureKind.budget_exhausted
    assert budget.consumed == 2
    assert gemini.calls == openai.calls == 1


def test_circuit_breaker_skips_open_provider_then_allows_probe_after_cooldown() -> None:
    now = [100.0]
    breaker = CircuitBreaker(
        failure_threshold=1, cooldown_seconds=10, clock=lambda: now[0]
    )
    budget = SharedSubmissionBudget(maximum=10)
    gemini = FakeProvider(
        "gemini",
        _failure("gemini", FailureKind.unavailable),
        _success("gemini", "recovered"),
    )
    openai = FakeProvider("openai", _success("openai", "fallback"), _success("openai"))
    router = BoundedFallbackRouter(
        [gemini, openai], shared_budget=budget, circuit_breaker=breaker
    )

    first = router.invoke("synthetic-sha256")
    second = router.invoke("synthetic-sha256")
    now[0] += 11
    third = router.invoke("synthetic-sha256")

    assert first.output == "fallback"
    assert second.output == "synthetic-artifact"
    assert second.skipped_open_circuits == ("gemini",)
    assert third.output == "recovered"
    assert gemini.calls == 2


def test_checkpoint_url_is_translated_without_losing_credentials() -> None:
    assert _to_psycopg_url("postgresql+asyncpg://user:pass@host/db") == "postgresql://user:pass@host/db"
    assert _to_psycopg_url("postgresql://user:pass@host/db") == "postgresql://user:pass@host/db"
    with pytest.raises(ValueError, match="PostgreSQL"):
        _to_psycopg_url("sqlite+aiosqlite:///test.db")
