"""S01 persisted human-review workflow proof using LangGraph.

The graph is deliberately small: request review -> pause -> call a fake,
policy-bounded provider -> publish a synthetic artifact.  It is not wired to a
case, document, or public route.  Its job is to prove the interruption and
restart semantics before real legal content is introduced.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal, Protocol, TypedDict

from langgraph.graph import END, START, StateGraph
from langgraph.types import interrupt

from app.features.workflows.fallback import BoundedFallbackRouter

POC_GRAPH_VERSION = "s01-poc-v1"


class POCState(TypedDict, total=False):
    run_id: str
    request_digest: str
    review_request_id: str
    artifact_id: str
    provider_name: str
    terminal_error: str


class ReviewLedger(Protocol):
    def ensure_pending_review(self, run_id: str) -> str: ...
    def review_status(self, run_id: str) -> Literal["pending", "approved", "rejected"]: ...
    def publish_once(self, run_id: str, output: str) -> str: ...


@dataclass
class InMemoryReviewLedger:
    """Test double for the DB-backed review/operation ledger added alongside it."""

    reviews: dict[str, str] = field(default_factory=dict)
    request_ids: dict[str, str] = field(default_factory=dict)
    artifacts: dict[str, str] = field(default_factory=dict)
    publish_calls: int = 0

    def ensure_pending_review(self, run_id: str) -> str:
        self.reviews.setdefault(run_id, "pending")
        return self.request_ids.setdefault(run_id, f"review-{run_id}")

    def review_status(self, run_id: str) -> Literal["pending", "approved", "rejected"]:
        return self.reviews[run_id]  # type: ignore[return-value]

    def decide(self, run_id: str, approved: bool) -> None:
        if self.reviews.get(run_id) != "pending":
            raise ValueError("A review decision is immutable")
        self.reviews[run_id] = "approved" if approved else "rejected"

    def publish_once(self, run_id: str, output: str) -> str:
        if run_id not in self.artifacts:
            self.publish_calls += 1
            self.artifacts[run_id] = f"artifact-{run_id}"
        return self.artifacts[run_id]


def build_poc_graph(*, ledger: ReviewLedger, fallback_router: BoundedFallbackRouter, checkpointer):
    """Compile the graph with a caller-provided durable checkpointer.

    Production will provide ``AsyncPostgresSaver``.  Tests use ``InMemorySaver``
    solely to exercise deterministic graph semantics.
    """

    def human_review(state: POCState) -> dict:
        run_id = state["run_id"]
        review_id = ledger.ensure_pending_review(run_id)
        status = ledger.review_status(run_id)
        if status == "pending":
            # This checkpoint is the required durable pause boundary.
            interrupt({"review_request_id": review_id, "run_id": run_id, "graph_version": POC_GRAPH_VERSION})
            status = ledger.review_status(run_id)
        if status == "rejected":
            return {"review_request_id": review_id, "terminal_error": "REVIEW_REJECTED"}
        if status != "approved":
            raise ValueError("Workflow may resume only after an immutable review decision")
        return {"review_request_id": review_id}

    def call_provider(state: POCState) -> dict:
        if state.get("terminal_error"):
            return {}
        outcome = fallback_router.invoke(state["request_digest"])
        if outcome.output is None:
            failure = outcome.terminal_failure.value if outcome.terminal_failure else "UNKNOWN"
            return {"terminal_error": f"PROVIDER_{failure}"}
        return {"provider_name": outcome.attempts[-1].provider, "artifact_id": outcome.output}

    def publish(state: POCState) -> dict:
        if state.get("terminal_error"):
            return {}
        artifact_id = ledger.publish_once(state["run_id"], state["artifact_id"])
        return {"artifact_id": artifact_id}

    graph = StateGraph(POCState)
    graph.add_node("human_review", human_review)
    graph.add_node("call_provider", call_provider)
    graph.add_node("publish", publish)
    graph.add_edge(START, "human_review")
    graph.add_edge("human_review", "call_provider")
    graph.add_edge("call_provider", "publish")
    graph.add_edge("publish", END)
    return graph.compile(checkpointer=checkpointer)


class AsyncReviewLedger(Protocol):
    async def ensure_pending_review(self, run_id: str) -> str: ...
    async def review_status(self, run_id: str) -> Literal["pending", "approved", "rejected"]: ...
    async def publish_once(self, run_id: str, output: str) -> str: ...


def build_async_poc_graph(*, ledger: AsyncReviewLedger, fallback_router: BoundedFallbackRouter, checkpointer):
    """Async twin used by the Celery reconciliation POC and Postgres saver."""

    async def human_review(state: POCState) -> dict:
        run_id = state["run_id"]
        review_id = await ledger.ensure_pending_review(run_id)
        status = await ledger.review_status(run_id)
        if status == "pending":
            interrupt({"review_request_id": review_id, "run_id": run_id, "graph_version": POC_GRAPH_VERSION})
            status = await ledger.review_status(run_id)
        if status == "rejected":
            return {"review_request_id": review_id, "terminal_error": "REVIEW_REJECTED"}
        if status != "approved":
            raise ValueError("Workflow may resume only after an immutable review decision")
        return {"review_request_id": review_id}

    async def call_provider(state: POCState) -> dict:
        if state.get("terminal_error"):
            return {}
        outcome = fallback_router.invoke(state["request_digest"])
        if outcome.output is None:
            failure = outcome.terminal_failure.value if outcome.terminal_failure else "UNKNOWN"
            return {"terminal_error": f"PROVIDER_{failure}"}
        return {"provider_name": outcome.attempts[-1].provider, "artifact_id": outcome.output}

    async def publish(state: POCState) -> dict:
        if state.get("terminal_error"):
            return {}
        artifact_id = await ledger.publish_once(state["run_id"], state["artifact_id"])
        return {"artifact_id": artifact_id}

    graph = StateGraph(POCState)
    graph.add_node("human_review", human_review)
    graph.add_node("call_provider", call_provider)
    graph.add_node("publish", publish)
    graph.add_edge(START, "human_review")
    graph.add_edge("human_review", "call_provider")
    graph.add_edge("call_provider", "publish")
    graph.add_edge("publish", END)
    return graph.compile(checkpointer=checkpointer)
