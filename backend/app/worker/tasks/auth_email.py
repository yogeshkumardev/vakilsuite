"""Dedicated, OTP-free auth mail reconciliation task."""
import asyncio
from datetime import datetime, timezone

from sqlalchemy import select

from app.features.auth.models import AuthEmailOutbox
from app.features.auth.recovery import RecoveryService
from app.worker.celery_app import celery_app
from app.worker.database import worker_session


@celery_app.task(name="app.worker.tasks.auth_email.recover_auth_email_outbox")
def recover_auth_email_outbox():
    async def run():
        async with worker_session() as db:
            now = datetime.now(timezone.utc).replace(tzinfo=None)
            ids = (await db.scalars(select(AuthEmailOutbox.id).where(AuthEmailOutbox.status == "pending", AuthEmailOutbox.next_attempt_at <= now).limit(50))).all()
            for outbox_id in ids:
                await RecoveryService(db).deliver_outbox(outbox_id)
    asyncio.run(run())
