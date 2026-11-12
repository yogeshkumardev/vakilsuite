"""At-least-once Celery delivery for durable S01 workflow resume intents."""

from __future__ import annotations

import asyncio
import logging
import uuid
from datetime import datetime, timedelta, timezone

from celery import Task
from sqlalchemy import select
from app.worker.database import create_worker_sync_engine
from app.worker.database import worker_session_factory
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.features.workflows.models import (
    WorkflowResumeIntent,
    WorkflowResumeIntentStatus,
    WorkflowRun,
)
from app.features.workflows.runtime import resume_poc_workflow
from app.features.workflows.registry import require_registered_graph
from app.worker.celery_app import celery_app

logger = logging.getLogger(__name__)

_sync_db_url = settings.DATABASE_URL.replace(
    "postgresql+asyncpg://", "postgresql+psycopg2://"
).replace("postgresql+aiopg://", "postgresql+psycopg2://")
_engine = create_worker_sync_engine(_sync_db_url, pool_pre_ping=True, pool_size=2, max_overflow=2)
_SessionLocal = sessionmaker(bind=_engine, expire_on_commit=False)
MAX_ATTEMPTS = 3
LEASE_SECONDS = 60


def _utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _claim(intent_id: str, task_id: str) -> tuple[WorkflowRun | None, str]:
    with _SessionLocal.begin() as db:
        intent = db.scalar(
            select(WorkflowResumeIntent)
            .where(WorkflowResumeIntent.id == uuid.UUID(intent_id))
            .with_for_update()
        )
        if intent is None:
            raise LookupError("Workflow resume intent not found")
        if intent.status == WorkflowResumeIntentStatus.processed:
            return None, "terminal"
        now = _utcnow()
        if (
            intent.status == WorkflowResumeIntentStatus.processing
            and intent.leased_until is not None
            and intent.leased_until > now
        ):
            return None, "busy"
        if intent.attempt_count >= MAX_ATTEMPTS:
            intent.status = WorkflowResumeIntentStatus.failed
            intent.error_code = "RETRY_EXHAUSTED"
            return None, "exhausted"
        run = db.get(WorkflowRun, intent.run_id, with_for_update=True)
        if run is None:
            intent.status = WorkflowResumeIntentStatus.failed
            intent.error_code = "RUN_NOT_FOUND"
            return None, "missing"
        intent.status = WorkflowResumeIntentStatus.processing
        intent.attempt_count += 1
        intent.celery_task_id = task_id
        intent.error_code = None
        intent.leased_until = now + timedelta(seconds=LEASE_SECONDS)
        return run, "claimed"


def _mark_processed(intent_id: str) -> None:
    with _SessionLocal.begin() as db:
        intent = db.get(WorkflowResumeIntent, uuid.UUID(intent_id), with_for_update=True)
        if intent is None or intent.status == WorkflowResumeIntentStatus.processed:
            return
        intent.status = WorkflowResumeIntentStatus.processed
        intent.processed_at = _utcnow()
        intent.error_code = None
        intent.leased_until = None


def _release_for_retry(intent_id: str, error_code: str) -> None:
    with _SessionLocal.begin() as db:
        intent = db.get(WorkflowResumeIntent, uuid.UUID(intent_id), with_for_update=True)
        if intent is None or intent.status == WorkflowResumeIntentStatus.processed:
            return
        intent.status = WorkflowResumeIntentStatus.pending
        intent.error_code = error_code[:80]
        intent.leased_until = None


async def _resume_on_worker_loop(run_id: uuid.UUID) -> dict:
    """Build asyncpg resources on this Celery thread's own event loop."""
    async with worker_session_factory() as factory:
        async with factory() as db:
            run = await db.get(WorkflowRun, run_id)
            if run is None:
                raise LookupError("Workflow run not found")
            require_registered_graph(run.workflow_type, run.graph_version)
        return await resume_poc_workflow(
            database_url=settings.DATABASE_URL,
            session_factory=factory,
            run=run,
        )


@celery_app.task(
    bind=True,
    name="app.worker.tasks.workflow_resume.resume_workflow_poc",
    max_retries=MAX_ATTEMPTS,
    acks_late=True,
)
def resume_workflow_poc(self: Task, intent_id: str) -> dict:
    """Claim one outbox row and resume only its server-owned graph thread."""
    run, claim = _claim(intent_id, str(self.request.id or ""))
    if claim != "claimed":
        return {"status": claim}
    assert run is not None
    try:
        result = asyncio.run(_resume_on_worker_loop(run.id))
        _mark_processed(intent_id)
        logger.info("Workflow POC resume completed: intent_id=%s run_id=%s", intent_id, run.id)
        return {"status": "processed", "artifact_id": result.get("artifact_id")}
    except Exception as exc:
        _release_for_retry(intent_id, type(exc).__name__)
        logger.warning("Workflow POC resume failed: intent_id=%s type=%s", intent_id, type(exc).__name__)
        raise self.retry(exc=exc, countdown=2 ** (self.request.retries + 1))


@celery_app.task(name="app.worker.tasks.workflow_resume.reconcile_workflow_resumes")
def reconcile_workflow_resumes(limit: int = 50) -> dict:
    """Re-enqueue durable pending outbox rows after broker/worker crash windows."""
    with _SessionLocal() as db:
        intent_ids = list(
            db.scalars(
                select(WorkflowResumeIntent.id)
                .where(
                    (WorkflowResumeIntent.status == WorkflowResumeIntentStatus.pending)
                    | (
                        (WorkflowResumeIntent.status == WorkflowResumeIntentStatus.processing)
                        & (WorkflowResumeIntent.leased_until < _utcnow())
                    )
                )
                .order_by(WorkflowResumeIntent.created_at)
                .limit(max(1, min(limit, 200)))
            )
        )
    for intent_id in intent_ids:
        resume_workflow_poc.delay(str(intent_id))
    return {"enqueued": len(intent_ids)}
