"""At-least-once Celery delivery for an explicitly submitted summary run."""
from __future__ import annotations

import asyncio
import uuid

from app.worker.database import worker_session
from app.features.summaries.generation import SummaryGenerationService
from app.worker.celery_app import celery_app


async def _execute(run_id: uuid.UUID) -> str:
    async with worker_session() as db:
        return await SummaryGenerationService(db).execute(run_id=run_id)


@celery_app.task(
    bind=True,
    name="app.worker.tasks.summary_generation.generate_summary_run",
    acks_late=True,
    max_retries=0,
)
def generate_summary_run(self, run_id: str) -> dict[str, str]:
    # Provider outcome may be unknown on a timeout. Do not retry blindly; the
    # durable run/attempt records require an explicit later reconciliation.
    return {"status": asyncio.run(_execute(uuid.UUID(run_id)))}
