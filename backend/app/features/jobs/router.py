import uuid

from fastapi import APIRouter, Header

from app.core.api_responses import ERROR_RESPONSES, SuccessResponse
from app.core.config import settings
from app.core.dependencies import CurrentUser, DB
from app.core.exceptions import AppError
from app.features.jobs.models import JobStatus
from app.features.chambers.permissions import ChamberCapability
from app.features.chambers.service import resolve_capable_chamber
from app.features.jobs.schemas import EnqueueDummyJobIn, JobOut
from app.features.jobs.service import get_job, get_or_create_job, update_job_status

router = APIRouter(prefix="/jobs", tags=["Jobs"])


@router.post(
    "/dummy",
    status_code=202,
    response_model=SuccessResponse[JobOut],
    operation_id="jobs_enqueue_dummy",
    responses=ERROR_RESPONSES,
    summary="Enqueue a dummy background job (S01-07 spike)",
)
async def enqueue_dummy_job(
    body: EnqueueDummyJobIn,
    current_user: CurrentUser,
    db: DB,
    x_chamber_id: uuid.UUID | None = Header(default=None),
) -> SuccessResponse[JobOut]:
    """
    Enqueue a dummy Celery task to prove the queue infrastructure works.

    Creates a PostgreSQL job record (queued), fires the Celery task, then
    stores the returned celery_task_id back on the record. Caller polls
    GET /jobs/{job_id} to track progress.

    Upload/save alone never starts a paid operation. This endpoint exists
    only for S01-07 integration testing.
    """
    if not settings.ENABLE_SPIKE_ENDPOINTS:
        raise AppError(code="NOT_FOUND", message="Not found", status_code=404)

    from app.worker.tasks.dummy import run_dummy_job

    chamber = await resolve_capable_chamber(
        db,
        user_id=current_user.id,
        capability=ChamberCapability.case_write,
        chamber_id=x_chamber_id,
    )
    job, created = await get_or_create_job(
        db,
        owner_id=current_user.id,
        chamber_id=chamber.id,
        job_type="dummy",
        payload={"label": body.label},
        idempotency_key=body.idempotency_key,
    )
    if not created:
        return {"success": True, "data": JobOut.model_validate(job)}

    task_id = str(uuid.uuid4())
    job.celery_task_id = task_id
    await db.commit()
    await db.refresh(job)

    try:
        run_dummy_job.apply_async(
            kwargs={"job_id": str(job.id), "label": body.label},
            task_id=task_id,
        )
    except Exception as exc:
        await update_job_status(
            db,
            job.id,
            JobStatus.failed,
            error_message="Queue submission failed",
        )
        await db.commit()
        raise AppError(
            code="QUEUE_UNAVAILABLE",
            message="Background queue is unavailable. Retry with the same idempotency key.",
            status_code=503,
        ) from exc

    return {"success": True, "data": JobOut.model_validate(job)}


@router.get(
    "/{job_id}",
    response_model=SuccessResponse[JobOut],
    operation_id="jobs_get",
    responses=ERROR_RESPONSES,
    summary="Get background job status (owner-scoped)",
)
async def get_job_status(
    job_id: uuid.UUID,
    current_user: CurrentUser,
    db: DB,
) -> SuccessResponse[JobOut]:
    """
    Poll the status of a background job.

    Owner-scoped: returns 404 for jobs belonging to other users so resource
    existence is not leaked.
    """
    job = await get_job(db, job_id, current_user.id)
    return {"success": True, "data": JobOut.model_validate(job)}
