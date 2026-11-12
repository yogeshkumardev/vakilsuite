"""Idempotent S01 queue probe backed by the authoritative PostgreSQL job row."""

import logging
import time
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Literal

from celery import Task
from sqlalchemy import select
from app.worker.database import create_worker_sync_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.features.jobs.models import Job, JobStatus
from app.worker.celery_app import celery_app

logger = logging.getLogger(__name__)

_sync_db_url = settings.DATABASE_URL.replace(
    "postgresql+asyncpg://", "postgresql+psycopg2://"
).replace("postgresql+aiopg://", "postgresql+psycopg2://")
_engine = create_worker_sync_engine(_sync_db_url, pool_pre_ping=True, pool_size=2, max_overflow=2)
_SessionLocal = sessionmaker(bind=_engine, expire_on_commit=False)

LEASE_SECONDS = 10


def _utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _claim_job(
    job_id: str, task_id: str
) -> tuple[Literal["claimed", "busy", "terminal", "exhausted"], dict[str, Any]]:
    """Claim a queued/stale job under a row lock and increment its attempt."""
    with _SessionLocal.begin() as session:
        job = session.scalar(
            select(Job).where(Job.id == uuid.UUID(job_id)).with_for_update()
        )
        if job is None:
            raise LookupError("Job record not found")
        if job.status in {JobStatus.succeeded, JobStatus.failed, JobStatus.cancelled}:
            return "terminal", job.result_summary or {}

        now = _utcnow()
        if (
            job.status == JobStatus.running
            and job.leased_until is not None
            and job.leased_until > now
        ):
            return "busy", {}
        if job.attempt_count >= job.max_attempts:
            job.status = JobStatus.failed
            job.error_message = "Maximum attempts exhausted"
            job.completed_at = now
            job.leased_until = None
            return "exhausted", {}

        job.status = JobStatus.running
        job.celery_task_id = task_id
        job.attempt_count += 1
        job.started_at = job.started_at or now
        job.leased_until = now + timedelta(seconds=LEASE_SECONDS)
        job.error_message = None
        return "claimed", {}


def _release_for_retry(job_id: str, message: str) -> None:
    with _SessionLocal.begin() as session:
        job = session.get(Job, uuid.UUID(job_id), with_for_update=True)
        if job is None or job.status != JobStatus.running:
            return
        job.status = JobStatus.queued
        job.leased_until = None
        job.error_message = message[:2000]
        job.updated_at = _utcnow()


def _mark_succeeded(job_id: str, result: dict[str, Any]) -> bool:
    with _SessionLocal.begin() as session:
        job = session.get(Job, uuid.UUID(job_id), with_for_update=True)
        if job is None or job.status != JobStatus.running:
            return False
        now = _utcnow()
        job.status = JobStatus.succeeded
        job.result_summary = result
        job.completed_at = now
        job.leased_until = None
        job.updated_at = now
        return True


def _mark_failed_if_active(job_id: str, message: str) -> None:
    with _SessionLocal.begin() as session:
        job = session.get(Job, uuid.UUID(job_id), with_for_update=True)
        if job is None or job.status in {
            JobStatus.succeeded,
            JobStatus.failed,
            JobStatus.cancelled,
        }:
            return
        now = _utcnow()
        job.status = JobStatus.failed
        job.error_message = message[:2000]
        job.completed_at = now
        job.leased_until = None
        job.updated_at = now


class _BaseTask(Task):
    abstract = True

    def on_failure(self, exc, task_id, args, kwargs, einfo):  # noqa: ANN001
        job_id = kwargs.get("job_id") or (args[0] if args else None)
        if job_id:
            _mark_failed_if_active(str(job_id), "Worker retries exhausted")
        logger.error(
            "Task failed permanently: task_id=%s job_id=%s type=%s",
            task_id,
            job_id,
            type(exc).__name__,
        )


@celery_app.task(
    bind=True,
    base=_BaseTask,
    name="app.worker.tasks.dummy.run_dummy_job",
    max_retries=3,
    acks_late=True,
)
def run_dummy_job(self: Task, job_id: str, label: str = "default") -> dict[str, Any]:
    task_id = str(self.request.id or "")
    claim, prior_result = _claim_job(job_id, task_id)
    if claim == "terminal":
        return {**prior_result, "duplicate_delivery": True}
    if claim == "exhausted":
        return {"processed": False, "attempts_exhausted": True}
    if claim == "busy":
        raise self.retry(countdown=LEASE_SECONDS)

    try:
        time.sleep(0.25)
        result = {"label": label, "processed": True}
        if not _mark_succeeded(job_id, result):
            return {"processed": False, "superseded": True}
        logger.info("Dummy job succeeded: job_id=%s", job_id)
        return result
    except Exception as exc:
        _release_for_retry(job_id, f"{type(exc).__name__}: retry scheduled")
        logger.warning(
            "Dummy job attempt failed: job_id=%s retry=%d type=%s",
            job_id,
            self.request.retries,
            type(exc).__name__,
        )
        raise self.retry(exc=exc, countdown=2 ** (self.request.retries + 1))
