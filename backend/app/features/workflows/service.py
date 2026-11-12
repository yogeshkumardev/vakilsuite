"""Owner-scoped persistence for workflow runs and immutable review decisions."""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictError, NotFoundError
from app.features.chambers.permissions import ChamberCapability
from app.features.chambers.service import require_capability
from app.features.workflows.models import (
    WorkflowReview,
    WorkflowReviewStatus,
    WorkflowResumeIntent,
    WorkflowRun,
    WorkflowRunStatus,
)


async def get_or_create_poc_run(
    db: AsyncSession,
    *,
    owner_id: uuid.UUID,
    chamber_id: uuid.UUID,
    idempotency_key: str,
    input_manifest_hash: str,
    graph_version: str,
) -> tuple[WorkflowRun, bool]:
    """Create a synthetic S01 run once; no client content enters this path."""
    run_id = uuid.uuid4()
    statement = (
        insert(WorkflowRun)
        .values(
            id=run_id,
            owner_id=owner_id,
            chamber_id=chamber_id,
            workflow_type="s01_poc",
            graph_version=graph_version,
            thread_id=f"workflow-{run_id}",
            idempotency_key=idempotency_key,
            input_manifest_hash=input_manifest_hash,
        )
        .on_conflict_do_nothing(
            index_elements=["chamber_id", "owner_id", "workflow_type", "idempotency_key"]
        )
        .returning(WorkflowRun.id)
    )
    created_id = (await db.execute(statement)).scalar_one_or_none()
    if created_id is not None:
        run = await db.get(WorkflowRun, created_id)
        assert run is not None
        return run, True

    run = await db.scalar(
        select(WorkflowRun).where(
            WorkflowRun.owner_id == owner_id,
            WorkflowRun.chamber_id == chamber_id,
            WorkflowRun.workflow_type == "s01_poc",
            WorkflowRun.idempotency_key == idempotency_key,
        )
    )
    if run is None:
        raise RuntimeError("Workflow idempotency insert did not return or find a run")
    if run.input_manifest_hash != input_manifest_hash:
        raise ConflictError("Idempotency key was already used with different input")
    return run, False


async def get_run_for_owner(db: AsyncSession, run_id: uuid.UUID, owner_id: uuid.UUID) -> WorkflowRun:
    run = await db.scalar(select(WorkflowRun).where(WorkflowRun.id == run_id, WorkflowRun.owner_id == owner_id))
    if run is None:
        raise NotFoundError("Workflow run not found")
    if run.chamber_id is None:
        raise NotFoundError("Workflow run not found")
    await require_capability(
        db,
        chamber_id=run.chamber_id,
        user_id=owner_id,
        capability=ChamberCapability.workflow_resume,
    )
    return run


async def get_or_create_review(db: AsyncSession, *, run: WorkflowRun, review_summary: dict) -> WorkflowReview:
    review = await db.scalar(
        select(WorkflowReview).where(WorkflowReview.run_id == run.id, WorkflowReview.sequence == 1)
    )
    if review is not None:
        return review
    review = WorkflowReview(run_id=run.id, sequence=1, review_summary=review_summary)
    db.add(review)
    await db.flush()
    return review


async def decide_review(
    db: AsyncSession,
    *,
    run_id: uuid.UUID,
    owner_id: uuid.UUID,
    approved: bool,
    expected_version: int,
    idempotency_key: str,
) -> tuple[WorkflowReview, WorkflowResumeIntent | None]:
    """Persist one immutable owner-scoped decision before graph resume."""
    run = await get_run_for_owner(db, run_id, owner_id)
    review = await db.scalar(
        select(WorkflowReview)
        .where(WorkflowReview.run_id == run.id, WorkflowReview.sequence == 1)
        .with_for_update()
    )
    if review is None:
        raise NotFoundError("Workflow review not found")
    expected = WorkflowReviewStatus.approved if approved else WorkflowReviewStatus.rejected
    if review.status != WorkflowReviewStatus.pending:
        if review.status == expected:
            intent = await db.scalar(
                select(WorkflowResumeIntent).where(WorkflowResumeIntent.review_id == review.id)
            )
            return review, intent
        raise ConflictError("Workflow review already has a different decision")
    if review.version != expected_version:
        raise ConflictError("Workflow review has changed; reload before deciding")

    review.status = expected
    review.version += 1
    review.decided_by_user_id = owner_id
    review.decided_at = datetime.now()
    run.status = WorkflowRunStatus.running if approved else WorkflowRunStatus.rejected
    intent: WorkflowResumeIntent | None = None
    if approved:
        intent = WorkflowResumeIntent(
            run_id=run.id,
            review_id=review.id,
            idempotency_key=idempotency_key,
        )
        db.add(intent)
    await db.flush()
    return review, intent


async def get_review_for_owner(
    db: AsyncSession, *, run_id: uuid.UUID, owner_id: uuid.UUID
) -> tuple[WorkflowRun, WorkflowReview]:
    run = await get_run_for_owner(db, run_id, owner_id)
    review = await db.scalar(
        select(WorkflowReview).where(WorkflowReview.run_id == run.id, WorkflowReview.sequence == 1)
    )
    if review is None:
        raise NotFoundError("Workflow review not found")
    return run, review
