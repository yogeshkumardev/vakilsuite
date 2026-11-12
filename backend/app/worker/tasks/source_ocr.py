import asyncio
import logging
import uuid
from sqlalchemy import select
from app.features.jobs.models import Job
from app.worker.delivery import reserve_delivery, send_delivery, record_worker_failure
from app.worker.database import worker_session
from app.features.documents.source_ocr import (
    OcrJobFailed,
    SourceOcrService,
)
from app.worker.celery_app import celery_app
from app.core.config import settings


async def execute(ident):
    try:
        async with worker_session() as db:
            return await SourceOcrService(db).execute(uuid.UUID(ident))
    except Exception as exc:
        await record_worker_failure(ident, exc)
        raise


@celery_app.task(bind=True, max_retries=settings.OCR_TRANSIENT_MAX_RETRIES)
def transcribe_page(self, ident):
    result = asyncio.run(execute(ident))
    if result.continuation_countdown is not None:
        # Parse is asynchronous. This task has durably checkpointed the next
        # provider poll; its successful completion is not document completion.
        transcribe_page.apply_async(args=(ident,), countdown=result.continuation_countdown)
        return
    if result.retry_countdown is not None:
        raise self.retry(
            exc=OcrJobFailed("OCR_PROVIDER_TRANSIENT"),
            countdown=result.retry_countdown,
        )
    if result.failure_code is not None:
        raise OcrJobFailed(result.failure_code)


async def dispatch_queued_source_ocr(job_id: uuid.UUID):
    """Reserve delivery under the same row lock used by beat recovery."""
    try:
        async with worker_session() as db:
            current = await db.scalar(
                select(Job).where(Job.id == job_id).with_for_update()
            )
            deliver = current is not None and reserve_delivery(current)
            await db.commit()
    except Exception as exc:
        logging.getLogger(__name__).warning(
            "Typing delivery reservation deferred (%s)", type(exc).__name__
        )
        return
    if deliver:
        await send_delivery(transcribe_page, job_id)
