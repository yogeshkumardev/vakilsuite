"""Durable DOCX export for one pinned court-draft content hash."""
from __future__ import annotations

import uuid

from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.features.documents.storage import get_r2_client
from app.features.drafts.models import CourtDraft
from app.features.drafts.rendering import render_court_draft_docx
from app.features.jobs.models import Job, JobStatus
from app.worker.celery_app import celery_app
from app.worker.database import create_worker_sync_engine

_url = settings.DATABASE_URL.replace("postgresql+asyncpg://", "postgresql+psycopg2://")
_session = sessionmaker(bind=create_worker_sync_engine(_url, pool_pre_ping=True), expire_on_commit=False)


@celery_app.task(bind=True, name="app.worker.tasks.export_court_draft.export_court_draft", acks_late=True, max_retries=3)
def export_court_draft(self, job_id: str):
    try:
        with _session.begin() as db:
            job = db.get(Job, uuid.UUID(job_id), with_for_update=True)
            if not job or job.job_type != "court_draft_export" or job.status in {JobStatus.succeeded, JobStatus.failed, JobStatus.cancelled}:
                return
            job.status, job.attempt_count = JobStatus.running, job.attempt_count + 1
            draft = db.get(CourtDraft, uuid.UUID(job.payload["draft_id"]), with_for_update=True)
            if not draft or draft.status == "stale" or draft.content_hash != job.payload["content_hash"]:
                job.status, job.error_message = JobStatus.failed, "Pinned court draft is no longer current"
                return
            data = render_court_draft_docx(draft.content, draft.rule_snapshot, title=f"Court draft {draft.version}")
            file_name = f"allahabad-bail-draft-v{draft.version}.docx"
            key = f"private/chambers/{draft.chamber_id}/court-drafts/{draft.id}/exports/{job.id}/{file_name}"
            get_r2_client().put_object(Bucket=settings.R2_BUCKET_NAME, Key=key, Body=data, ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document", Metadata={"court-draft-id": str(draft.id), "content-sha256": draft.content_hash})
            job.status, job.result_summary, job.leased_until = JobStatus.succeeded, {"r2_key": key, "file_name": file_name, "content_hash": draft.content_hash}, None
    except Exception as exc:
        with _session.begin() as db:
            job = db.get(Job, uuid.UUID(job_id), with_for_update=True)
            if job and job.attempt_count >= 3:
                job.status, job.error_message = JobStatus.failed, f"Export failed: {type(exc).__name__}"[:2000]
            elif job:
                job.status, job.error_message = JobStatus.queued, "Export retry scheduled"
        raise self.retry(exc=exc, countdown=2 ** (self.request.retries + 1))
