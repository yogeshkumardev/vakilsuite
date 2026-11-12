"""Bounded durable delivery, separate from paid provider attempt accounting."""

import asyncio
import logging
import random
from datetime import UTC, datetime, timedelta

from app.features.jobs.models import JobStatus

MAX_DELIVERIES = 5
logger = logging.getLogger(__name__)


def reserve_delivery(job, now=None):
    now = now or datetime.now(UTC).replace(tzinfo=None)
    if job.status not in (JobStatus.queued, JobStatus.running):
        return False
    if job.status == JobStatus.running and "response" not in job.payload:
        return False  # A provider request may already have been charged.
    if job.leased_until and job.leased_until > now:
        return False
    if isinstance(job.payload.get("provider_job"), dict):
        # An accepted asynchronous provider job is resumed by ID. Polling it
        # must not consume the finite broker-delivery budget intended for a
        # fresh paid submission.
        job.leased_until = now + timedelta(seconds=90)
        return True
    count = job.payload.get("worker_delivery_count", 0)
    if count >= MAX_DELIVERIES:
        job.status = JobStatus.failed
        job.error_message = "WORKER_DELIVERY_EXHAUSTED"
        job.completed_at = now
        job.leased_until = None
        return False
    job.payload = {**job.payload, "worker_delivery_count": count + 1}
    job.leased_until = now + timedelta(
        seconds=min(900, 60 * 2**count) + random.uniform(0, 15)
    )
    return True


async def send_delivery(task, ident):
    try:
        await asyncio.to_thread(task.delay, str(ident))
    except Exception as exc:
        # The durable lease expires with backoff; never busy-loop on Redis loss.
        logger.warning(
            "Worker delivery deferred: job=%s type=%s", ident, type(exc).__name__
        )


async def record_worker_failure(ident, exc):
    """Best effort diagnostic in a fresh transaction; never reset a paid marker."""
    import uuid
    from sqlalchemy import select
    from app.features.jobs.models import Job
    from app.worker.database import worker_session

    try:
        async with worker_session() as db:
            job = await db.scalar(
                select(Job).where(Job.id == uuid.UUID(str(ident))).with_for_update()
            )
            if job is None or job.status not in (JobStatus.queued, JobStatus.running):
                return
            job.payload = {**job.payload, "worker_failure_type": type(exc).__name__}
            # Another delivery may already own a running provider request.
            # Recovery alone expires that marker after its provider deadline.
            if (
                job.status == JobStatus.queued
                and job.payload.get("worker_delivery_count", 0) >= MAX_DELIVERIES
            ):
                job.status = JobStatus.failed
                job.error_message = "WORKER_DELIVERY_EXHAUSTED"
                job.completed_at = datetime.now(UTC).replace(tzinfo=None)
            await db.commit()
    except Exception as diagnostic_error:
        logger.error(
            "Worker failure could not be persisted: job=%s type=%s",
            ident,
            type(diagnostic_error).__name__,
        )
