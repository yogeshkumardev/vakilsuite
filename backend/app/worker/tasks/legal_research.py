"""Durable delivery for legal-authority review resume intents.

This worker only advances the local outbox. It never repeats an Indian Kanoon
request, so at-least-once Celery delivery cannot create provider billing risk.
"""
from __future__ import annotations

import uuid

from sqlalchemy import select
from app.worker.database import create_worker_sync_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.features.legal_research.models import LegalResearchResumeIntent
from app.worker.celery_app import celery_app

_sync_url = settings.DATABASE_URL.replace("postgresql+asyncpg://", "postgresql+psycopg2://")
_engine = create_worker_sync_engine(_sync_url, pool_pre_ping=True, pool_size=2, max_overflow=2)
_sessions = sessionmaker(bind=_engine, expire_on_commit=False)


@celery_app.task(name="app.worker.tasks.legal_research.resume_approved_authority", acks_late=True, max_retries=0)
def resume_approved_authority(intent_id: str) -> dict[str, str]:
    """Claim one intent; graph resume is deliberately local-only at this stage."""
    with _sessions.begin() as db:
        intent = db.scalar(select(LegalResearchResumeIntent).where(LegalResearchResumeIntent.id == uuid.UUID(intent_id)).with_for_update())
        if intent is None:
            return {"status": "missing"}
        if intent.status == "processed":
            return {"status": "processed"}
        if intent.status == "processing":
            return {"status": "busy"}
        intent.status = "processing"
        intent.attempt_count += 1
        # The actual graph contains no billable node; this marks durable review
        # resumption. Manifest creation remains an explicit API action.
        intent.status, intent.error_code = "processed", None
    return {"status": "processed"}


@celery_app.task(name="app.worker.tasks.legal_research.reconcile_resume_intents")
def reconcile_resume_intents(limit: int = 50) -> dict[str, int]:
    with _sessions() as db:
        ids = list(db.scalars(select(LegalResearchResumeIntent.id).where(LegalResearchResumeIntent.status == "pending").order_by(LegalResearchResumeIntent.created_at).limit(max(1, min(limit, 200)))))
    for intent_id in ids:
        resume_approved_authority.delay(str(intent_id))
    return {"enqueued": len(ids)}
