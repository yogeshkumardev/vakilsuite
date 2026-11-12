"""Durable queued-job recovery. Never resubmit an uncertain paid call."""

import asyncio
import uuid
from datetime import UTC, datetime, timedelta
from sqlalchemy import select
from app.worker.database import worker_session
from app.features.jobs.models import Job, JobStatus
from app.features.okf_exports.generation import DraftGenerationService, JOB_TYPE
from app.worker.celery_app import celery_app
from app.worker.delivery import reserve_delivery, send_delivery, record_worker_failure


async def execute(ident):
    try:
        async with worker_session() as db:
            await DraftGenerationService(db).execute(uuid.UUID(ident))
    except Exception as exc:
        await record_worker_failure(ident, exc)
        raise


@celery_app.task(max_retries=0)
def generate_draft(ident):
    asyncio.run(execute(ident))


async def recover():
    async with worker_session() as db:
        jobs = (
            await db.scalars(
                select(Job)
                .where(
                    Job.job_type.in_([JOB_TYPE, "original_page_ocr"]),
                    Job.status.in_([JobStatus.queued, JobStatus.running]),
                )
                .order_by(Job.queued_at)
                .limit(100)
                .with_for_update(skip_locked=True)
            )
        ).all()
        deliver = []
        for job in jobs:
            if job.status == JobStatus.queued or "response" in job.payload:
                if reserve_delivery(job):
                    deliver.append((str(job.id), job.job_type))
            elif job.started_at and datetime.now(UTC).replace(
                tzinfo=None
            ) > job.started_at + timedelta(
                seconds=job.payload["quote"]["deadline_seconds"] + 120
            ):
                job.status = JobStatus.failed
                job.error_message = "PROVIDER_OUTCOME_UNKNOWN_NO_RETRY"
                job.completed_at = datetime.now(UTC).replace(tzinfo=None)
        await db.commit()
    for ident, kind in deliver:
        if kind == "original_page_ocr":
            from app.worker.tasks.source_ocr import transcribe_page

            await send_delivery(transcribe_page, ident)
        else:
            await send_delivery(generate_draft, ident)


@celery_app.task(max_retries=0)
def recover_drafts():
    asyncio.run(recover())
