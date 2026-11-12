"""Database-backed runtime pieces for the isolated S01 workflow POC."""

from __future__ import annotations

import hashlib
import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.features.workflows.checkpoints import postgres_checkpointer
from app.features.workflows.fallback import BoundedFallbackRouter, ProviderAttempt
from app.features.workflows.poc import build_async_poc_graph
from app.features.workflows.models import (
    WorkflowOperation,
    WorkflowReview,
    WorkflowRun,
    WorkflowRunStatus,
)


class DatabaseReviewLedger:
    """Each graph node uses a short DB transaction; it never holds one paused."""

    def __init__(self, session_factory: async_sessionmaker[AsyncSession]) -> None:
        self._session_factory = session_factory

    async def ensure_pending_review(self, run_id: str) -> str:
        async with self._session_factory() as db:
            review = await db.scalar(
                select(WorkflowReview).where(
                    WorkflowReview.run_id == uuid.UUID(run_id), WorkflowReview.sequence == 1
                )
            )
            if review is None:
                raise LookupError("Workflow review missing")
            return str(review.id)

    async def review_status(self, run_id: str):
        async with self._session_factory() as db:
            review = await db.scalar(
                select(WorkflowReview.status)
                .join(WorkflowRun, WorkflowRun.id == WorkflowReview.run_id)
                .where(WorkflowRun.id == uuid.UUID(run_id), WorkflowReview.sequence == 1)
            )
            if review is None:
                raise LookupError("Workflow review missing")
            return review.value

    async def publish_once(self, run_id: str, output: str) -> str:
        output_hash = hashlib.sha256(output.encode()).hexdigest()
        run_uuid = uuid.UUID(run_id)
        async with self._session_factory.begin() as db:
            statement = (
                insert(WorkflowOperation)
                .values(
                    id=uuid.uuid4(),
                    run_id=run_uuid,
                    operation_name="s01_poc_publish",
                    input_hash=output_hash,
                    result_summary={"artifact_id": f"artifact-{run_id}"},
                )
                .on_conflict_do_nothing(
                    index_elements=["run_id", "operation_name", "input_hash"]
                )
                .returning(WorkflowOperation.result_summary)
            )
            result = (await db.execute(statement)).scalar_one_or_none()
            if result is None:
                result = await db.scalar(
                    select(WorkflowOperation.result_summary).where(
                        WorkflowOperation.run_id == run_uuid,
                        WorkflowOperation.operation_name == "s01_poc_publish",
                        WorkflowOperation.input_hash == output_hash,
                    )
                )
            run = await db.get(WorkflowRun, run_uuid, with_for_update=True)
            if run is None:
                raise LookupError("Workflow run missing")
            run.status = WorkflowRunStatus.completed
            run.result_summary = result
            run.completed_at = datetime.now(timezone.utc).replace(tzinfo=None)
            return result["artifact_id"]


class SyntheticPOCProvider:
    """Explicit fake adapter: proves control flow without an external API call."""

    name = "synthetic-poc"

    def invoke(self, request_digest: str) -> ProviderAttempt:
        return ProviderAttempt(
            provider=self.name,
            success=True,
            output=f"synthetic-artifact:{request_digest[:12]}",
        )


async def start_poc_workflow(
    *,
    database_url: str,
    session_factory: async_sessionmaker[AsyncSession],
    run: WorkflowRun,
) -> None:
    """Checkpoint the initial interrupt. The caller has already committed the run."""
    ledger = DatabaseReviewLedger(session_factory)
    async with postgres_checkpointer(database_url) as checkpointer:
        graph = build_async_poc_graph(
            ledger=ledger,
            fallback_router=BoundedFallbackRouter([SyntheticPOCProvider()]),
            checkpointer=checkpointer,
        )
        config = {"configurable": {"thread_id": run.thread_id}}
        # An HTTP retry after a crash window must not create a second initial
        # interrupt/checkpoint. A missing checkpoint is safe to initialize.
        if (await graph.aget_state(config)).values:
            return
        await graph.ainvoke(
            {"run_id": str(run.id), "request_digest": run.input_manifest_hash},
            config,
        )


async def resume_poc_workflow(
    *,
    database_url: str,
    session_factory: async_sessionmaker[AsyncSession],
    run: WorkflowRun,
) -> dict:
    """Resume only the server-owned checkpoint after the stored decision."""
    from langgraph.types import Command

    ledger = DatabaseReviewLedger(session_factory)
    async with postgres_checkpointer(database_url) as checkpointer:
        graph = build_async_poc_graph(
            ledger=ledger,
            fallback_router=BoundedFallbackRouter([SyntheticPOCProvider()]),
            checkpointer=checkpointer,
        )
        return await graph.ainvoke(
            Command(resume={"run_id": str(run.id)}),
            {"configurable": {"thread_id": run.thread_id}},
        )
