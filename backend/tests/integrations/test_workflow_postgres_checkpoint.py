"""Opt-in proof that a LangGraph interruption survives a new process/checkpointer.

Run only against a disposable local/test PostgreSQL database:
    RUN_POSTGRES_CHECKPOINT_TESTS=1 uv run pytest -q tests/integrations/test_workflow_postgres_checkpoint.py
"""

from __future__ import annotations

import os
import uuid

import pytest
from langgraph.types import Command

if os.environ.get("RUN_POSTGRES_CHECKPOINT_TESTS") != "1":
    pytest.skip("Set RUN_POSTGRES_CHECKPOINT_TESTS=1 for PostgreSQL checkpoint integration test", allow_module_level=True)

from app.core.config import settings
from app.features.workflows.checkpoints import postgres_checkpointer
from app.features.workflows.fallback import BoundedFallbackRouter, ProviderAttempt
from app.features.workflows.poc import InMemoryReviewLedger, build_poc_graph


class SyntheticProvider:
    name = "synthetic-provider"

    def invoke(self, request_digest: str) -> ProviderAttempt:
        return ProviderAttempt(provider=self.name, success=True, output="synthetic-output")


@pytest.mark.asyncio
async def test_postgres_checkpoint_resumes_after_new_checkpointer_instance() -> None:
    """No client content or real provider is used in this persistence proof."""
    ledger = InMemoryReviewLedger()
    thread_id = f"workflow-poc-{uuid.uuid4()}"
    run_id = str(uuid.uuid4())
    config = {"configurable": {"thread_id": thread_id}}
    router = BoundedFallbackRouter([SyntheticProvider()])

    async with postgres_checkpointer(settings.DATABASE_URL) as first_saver:
        first_graph = build_poc_graph(ledger=ledger, fallback_router=router, checkpointer=first_saver)
        paused = await first_graph.ainvoke({"run_id": run_id, "request_digest": "synthetic-sha256"}, config)
        assert paused["__interrupt__"][0].value["run_id"] == run_id

    ledger.decide(run_id, approved=True)

    # A fresh checkpointer and graph model a worker/process restart.
    async with postgres_checkpointer(settings.DATABASE_URL) as second_saver:
        resumed_graph = build_poc_graph(ledger=ledger, fallback_router=router, checkpointer=second_saver)
        result = await resumed_graph.ainvoke(Command(resume={}), config)

    assert result["artifact_id"] == f"artifact-{run_id}"
    assert ledger.publish_calls == 1
