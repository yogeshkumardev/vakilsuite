"""Authenticated, feature-gated HTTP contract for the S01 synthetic POC."""

from __future__ import annotations

import uuid
import logging

from fastapi import APIRouter, Header
from sqlalchemy import select

from app.core.api_responses import ERROR_RESPONSES, SuccessResponse
from app.core.config import settings
from app.core.dependencies import CurrentUser, DB
from app.core.exceptions import AppError
from app.db.session import AsyncSessionLocal
from app.features.workflows.models import WorkflowResumeIntent, WorkflowReview, WorkflowRunStatus
from app.features.chambers.permissions import ChamberCapability
from app.features.chambers.service import resolve_capable_chamber
from app.features.workflows.poc import POC_GRAPH_VERSION
from app.features.workflows.registry import require_registered_graph
from app.features.workflows.runtime import start_poc_workflow
from app.features.workflows.schemas import (
    CreatePocWorkflowIn,
    DecideWorkflowReviewIn,
    WorkflowResumeIntentOut,
    WorkflowReviewOut,
    WorkflowRunOut,
)
from app.features.workflows.service import (
    decide_review,
    get_or_create_poc_run,
    get_run_for_owner,
    get_or_create_review,
)

router = APIRouter(prefix="/workflow-runs", tags=["Workflow runs"])
logger = logging.getLogger(__name__)


def _require_poc_enabled() -> None:
    if not settings.ENABLE_SPIKE_ENDPOINTS:
        raise AppError(code="NOT_FOUND", message="Not found", status_code=404)


async def _as_out(db: DB, run) -> WorkflowRunOut:
    review = await db.scalar(
        select(WorkflowReview).where(WorkflowReview.run_id == run.id, WorkflowReview.sequence == 1)
    )
    intent = await db.scalar(
        select(WorkflowResumeIntent).where(WorkflowResumeIntent.run_id == run.id)
    )
    return WorkflowRunOut(
        **{field: getattr(run, field) for field in WorkflowRunOut.model_fields if field not in {"review", "resume_intent"}},
        review=WorkflowReviewOut.model_validate(review) if review else None,
        resume_intent=WorkflowResumeIntentOut.model_validate(intent) if intent else None,
    )


@router.post(
    "/poc",
    status_code=202,
    response_model=SuccessResponse[WorkflowRunOut],
    operation_id="workflow_poc_create",
    responses=ERROR_RESPONSES,
)
async def create_poc_workflow(
    body: CreatePocWorkflowIn,
    current_user: CurrentUser,
    db: DB,
    x_chamber_id: uuid.UUID | None = Header(default=None),
) -> SuccessResponse[WorkflowRunOut]:
    _require_poc_enabled()
    chamber = await resolve_capable_chamber(
        db,
        user_id=current_user.id,
        capability=ChamberCapability.workflow_resume,
        chamber_id=x_chamber_id,
    )
    # Server pins the registered graph; HTTP callers cannot select graph code.
    require_registered_graph("s01_poc", POC_GRAPH_VERSION)
    run, created = await get_or_create_poc_run(
        db,
        owner_id=current_user.id,
        chamber_id=chamber.id,
        idempotency_key=body.idempotency_key,
        input_manifest_hash=body.input_manifest_hash,
        graph_version=POC_GRAPH_VERSION,
    )
    if created:
        await get_or_create_review(
            db,
            run=run,
            review_summary={"kind": "synthetic_s01_poc", "input_manifest_hash": run.input_manifest_hash},
        )
        # The graph/checkpointer uses a separate short-lived session, so the
        # authoritative run must be durable before its first interrupt.
        await db.commit()
        await db.refresh(run)
    if run.status == WorkflowRunStatus.pending_review:
        await start_poc_workflow(
            database_url=settings.DATABASE_URL,
            session_factory=AsyncSessionLocal,
            run=run,
        )
    return {"success": True, "data": await _as_out(db, run)}


@router.get(
    "/{run_id}",
    response_model=SuccessResponse[WorkflowRunOut],
    operation_id="workflow_run_get",
    responses=ERROR_RESPONSES,
)
async def get_workflow_run(
    run_id: uuid.UUID, current_user: CurrentUser, db: DB
) -> SuccessResponse[WorkflowRunOut]:
    _require_poc_enabled()
    run = await get_run_for_owner(db, run_id, current_user.id)
    return {"success": True, "data": await _as_out(db, run)}


@router.post(
    "/{run_id}/review",
    status_code=202,
    response_model=SuccessResponse[WorkflowRunOut],
    operation_id="workflow_review_decide",
    responses=ERROR_RESPONSES,
)
async def decide_workflow_review(
    run_id: uuid.UUID,
    body: DecideWorkflowReviewIn,
    current_user: CurrentUser,
    db: DB,
) -> SuccessResponse[WorkflowRunOut]:
    _require_poc_enabled()
    review, intent = await decide_review(
        db,
        run_id=run_id,
        owner_id=current_user.id,
        approved=body.approved,
        expected_version=body.expected_version,
        idempotency_key=body.idempotency_key,
    )
    # Commit review + outbox before attempting asynchronous delivery.
    await db.commit()
    if intent is not None:
        from app.worker.tasks.workflow_resume import resume_workflow_poc

        try:
            task = resume_workflow_poc.apply_async(kwargs={"intent_id": str(intent.id)})
        except Exception as exc:
            # The outbox row is already durable. A reconciler can safely retry
            # delivery; returning 202 must not pretend the review was lost.
            logger.warning("Workflow resume enqueue deferred: intent_id=%s type=%s", intent.id, type(exc).__name__)
        else:
            intent.celery_task_id = task.id
            await db.commit()
    run = await get_run_for_owner(db, run_id, current_user.id)
    return {"success": True, "data": await _as_out(db, run)}
