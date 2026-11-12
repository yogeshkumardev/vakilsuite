"""At-least-once worker for immutable working-document exports."""
from __future__ import annotations
import uuid
from app.worker.database import create_worker_sync_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings
from app.features.jobs.models import Job, JobStatus
from app.features.revisions.models import WorkingDocumentRevision, RevisionStatus
from app.features.exports.service import ExportService
from app.features.exports.schemas import RenderExportRequest
from app.features.documents.storage import get_r2_client
from app.worker.celery_app import celery_app

_url = settings.DATABASE_URL.replace("postgresql+asyncpg://", "postgresql+psycopg2://")
_session = sessionmaker(bind=create_worker_sync_engine(_url, pool_pre_ping=True), expire_on_commit=False)

@celery_app.task(bind=True, name="app.worker.tasks.export_working_document.run_working_document_export", acks_late=True, max_retries=3)
def run_working_document_export(self, job_id: str):
    try:
        with _session.begin() as db:
            job = db.get(Job, uuid.UUID(job_id), with_for_update=True)
            if not job or job.status == JobStatus.succeeded:
                return
            if job.status in {JobStatus.failed, JobStatus.cancelled}:
                return
            job.status = JobStatus.running
            job.attempt_count += 1
            revision = db.get(WorkingDocumentRevision, uuid.UUID(job.payload["revision_id"]))
            if not revision or revision.content_sha256 != job.payload["revision_hash"]:
                raise RuntimeError("Pinned revision is unavailable")
            if revision.status != RevisionStatus.approved:
                job.status = JobStatus.failed
                job.error_message = "Draft approval is required before export"
                return
            artifact = ExportService().render(RenderExportRequest(title=job.payload["title"], output_format=job.payload["format"], document=revision.editor_document))
            key = f"private/chambers/{job.chamber_id}/exports/{job.id}/{artifact.file_name}"
            get_r2_client().put_object(Bucket=settings.R2_BUCKET_NAME, Key=key, Body=artifact.content, ContentType=artifact.media_type, Metadata={"revision-id": str(revision.id), "revision-sha256": revision.content_sha256})
            job.status = JobStatus.succeeded
            job.result_summary = {"r2_key": key, "file_name": artifact.file_name, "content_sha256": revision.content_sha256}
            job.leased_until = None
    except Exception as exc:
        with _session.begin() as db:
            job = db.get(Job, uuid.UUID(job_id), with_for_update=True)
            if job and job.attempt_count >= 3:
                job.status = JobStatus.failed
                job.error_message = f"Export failed: {type(exc).__name__}"[:2000]
            elif job:
                job.status = JobStatus.queued
                job.error_message = "Export retry scheduled"
        raise self.retry(exc=exc, countdown=2 ** (self.request.retries + 1))
