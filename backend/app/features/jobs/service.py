import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AppError
from app.features.chambers.models import ChamberMembership, MembershipStatus
from app.features.jobs.models import Job, JobStatus


async def create_job(
    db: AsyncSession,
    *,
    owner_id: uuid.UUID,
    chamber_id: uuid.UUID,
    job_type: str,
    case_id: uuid.UUID | None = None,
    payload: dict | None = None,
    idempotency_key: str | None = None,
) -> Job:
    """
    Create a Job record with status=queued.

    Caller must commit after this call; flush is used here so the returned
    job has a populated id before the transaction closes.
    """
    job = Job(
        owner_id=owner_id,
        chamber_id=chamber_id,
        job_type=job_type,
        case_id=case_id,
        payload=payload or {},
        idempotency_key=idempotency_key,
    )
    db.add(job)
    await db.flush()
    return job


async def get_or_create_job(
    db: AsyncSession,
    *,
    owner_id: uuid.UUID,
    chamber_id: uuid.UUID,
    job_type: str,
    idempotency_key: str,
    case_id: uuid.UUID | None = None,
    payload: dict | None = None,
) -> tuple[Job, bool]:
    """Return the existing owner-scoped request or create one atomically."""
    new_id = uuid.uuid4()
    statement = (
        insert(Job)
        .values(
            id=new_id,
            owner_id=owner_id,
            chamber_id=chamber_id,
            job_type=job_type,
            case_id=case_id,
            payload=payload or {},
            idempotency_key=idempotency_key,
        )
        .on_conflict_do_nothing(
            index_elements=["chamber_id", "owner_id", "job_type", "idempotency_key"]
        )
        .returning(Job.id)
    )
    created_id = (await db.execute(statement)).scalar_one_or_none()
    if created_id is not None:
        job = await db.get(Job, created_id)
        assert job is not None
        return job, True

    existing = await db.scalar(
        select(Job).where(
            Job.owner_id == owner_id,
            Job.chamber_id == chamber_id,
            Job.job_type == job_type,
            Job.idempotency_key == idempotency_key,
        )
    )
    if existing is None:
        raise RuntimeError("Idempotent job insert did not return or find a record")
    return existing, False


async def update_job_status(
    db: AsyncSession,
    job_id: uuid.UUID,
    status: JobStatus,
    *,
    celery_task_id: str | None = None,
    error_message: str | None = None,
    result_summary: dict | None = None,
) -> Job:
    """
    Update job status and related timestamp/metadata fields.

    This async version is for service-layer use.
    The synchronous counterpart in tasks/dummy.py is for Celery workers.
    """
    job = await db.get(Job, job_id)
    if not job:
        raise AppError(code="JOB_NOT_FOUND", message="Job not found", status_code=404)

    allowed_transitions = {
        JobStatus.queued: {JobStatus.running, JobStatus.failed, JobStatus.cancelled},
        JobStatus.running: {
            JobStatus.queued,
            JobStatus.succeeded,
            JobStatus.failed,
            JobStatus.cancelled,
        },
        JobStatus.succeeded: set(),
        JobStatus.failed: set(),
        JobStatus.cancelled: set(),
    }
    if status != job.status and status not in allowed_transitions[job.status]:
        raise AppError(
            code="INVALID_JOB_TRANSITION",
            message=f"Cannot transition job from {job.status.value} to {status.value}",
            status_code=409,
        )

    now = datetime.now(timezone.utc).replace(tzinfo=None)
    job.status = status
    job.updated_at = now

    if status == JobStatus.running:
        job.started_at = job.started_at or now
        job.attempt_count += 1
    elif status in (JobStatus.succeeded, JobStatus.failed, JobStatus.cancelled):
        job.completed_at = now

    if celery_task_id is not None:
        job.celery_task_id = celery_task_id
    if error_message is not None:
        job.error_message = error_message
    if result_summary is not None:
        job.result_summary = result_summary

    await db.flush()
    return job


async def get_job(
    db: AsyncSession,
    job_id: uuid.UUID,
    owner_id: uuid.UUID,
) -> Job:
    """
    Fetch a job with owner enforcement.

    Returns not-found rather than forbidden when the job exists but belongs
    to another user, to avoid leaking resource existence.
    """
    result = await db.execute(
        select(Job)
        .join(ChamberMembership, ChamberMembership.chamber_id == Job.chamber_id)
        .where(
            Job.id == job_id,
            Job.owner_id == owner_id,
            ChamberMembership.user_id == owner_id,
            ChamberMembership.status == MembershipStatus.active,
        )
    )
    job = result.scalar_one_or_none()
    if not job:
        raise AppError(code="JOB_NOT_FOUND", message="Job not found", status_code=404)
    return job
