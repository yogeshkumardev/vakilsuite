"""Explicit, policy-bound extraction job creation; providers are never called here."""
from __future__ import annotations
import uuid
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.exceptions import NotFoundError
from app.features.cases.repository import CaseRepository
from app.features.documents.models import Document, DocumentFileVersion
from app.features.documents.extraction_routing import select_extraction_route
from app.features.documents.source_manifest import build_verified_manifest
from app.features.chambers.provider_policy_service import get_policy_output
from app.features.jobs.service import get_or_create_job
from app.features.jobs.models import Job, JobStatus
from app.features.users.models import User

async def enqueue_authorized_extraction(db: AsyncSession, *, file_version_id: uuid.UUID, user: User, idempotency_key: str):
    version = await db.get(DocumentFileVersion, file_version_id)
    if version is None:
        raise NotFoundError("Document file version not found")
    document = await db.get(Document, version.document_id)
    if document is None or not await CaseRepository(db).can_access(document.case_id, user.id):
        raise NotFoundError("Document file version not found")
    policy = await get_policy_output(db, chamber_id=version.chamber_id)
    route = select_extraction_route(classification=version.content_classification, policy=policy, policy_version=policy.version)
    if route is None:
        raise NotFoundError("No authorized extraction route is configured")
    manifest = build_verified_manifest(version)
    job, created = await get_or_create_job(db, owner_id=user.id, chamber_id=version.chamber_id, case_id=document.case_id, job_type="document_extraction", idempotency_key=idempotency_key, payload={"manifest_digest": manifest.digest, "file_version_id": manifest.file_version_id, "sha256": manifest.sha256, "route": route.mode, "providers": route.providers, "policy_version": route.policy_version})
    await db.commit()
    await db.refresh(job)
    return job, created

async def enqueue_document_extraction(db: AsyncSession, *, document_id: uuid.UUID, user: User, idempotency_key: str):
    version = await db.scalar(select(DocumentFileVersion).where(DocumentFileVersion.document_id == document_id).order_by(DocumentFileVersion.version_number.desc()).limit(1))
    if version is None:
        raise NotFoundError("Document file version not found")
    return await enqueue_authorized_extraction(db, file_version_id=version.id, user=user, idempotency_key=idempotency_key)

async def cancel_document_extraction(db: AsyncSession, *, document_id: uuid.UUID, job_id: uuid.UUID, user: User) -> Job:
    job = await db.get(Job, job_id, with_for_update=True)
    if job is None or job.job_type != "document_extraction" or str(job.payload.get("file_version_id")) == "":
        raise NotFoundError("Extraction job not found")
    version = await db.get(DocumentFileVersion, uuid.UUID(str(job.payload["file_version_id"])))
    if version is None or version.document_id != document_id:
        raise NotFoundError("Extraction job not found")
    document = await db.get(Document, document_id)
    if document is None or not await CaseRepository(db).can_access(document.case_id, user.id):
        raise NotFoundError("Extraction job not found")
    if job.status == JobStatus.queued:
        job.status = JobStatus.cancelled
        job.error_message = "Cancelled by user before provider submission"
        await db.commit()
        await db.refresh(job)
    return job
