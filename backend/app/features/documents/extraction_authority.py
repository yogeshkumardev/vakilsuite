"""Last-moment authority checks for extraction submission and review handoff."""
from __future__ import annotations
import uuid
from dataclasses import dataclass
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.exceptions import ConflictError, NotFoundError
from app.features.cases.repository import CaseRepository
from app.features.documents.models import Document, DocumentFileVersion
from app.features.documents.extraction_routing import ExtractionRoute, select_extraction_route
from app.features.documents.source_manifest import build_verified_manifest
from app.features.chambers.provider_policy_service import get_policy_output
from app.features.jobs.models import Job
from app.features.users.models import User

@dataclass(frozen=True)
class ReviewHandoff:
    status: str
    job_id: uuid.UUID
    file_version_id: uuid.UUID
    manifest_digest: str

async def recheck_extraction_authority(db: AsyncSession, *, job: Job, user: User, provider: str) -> ExtractionRoute:
    if job.job_type != "document_extraction":
        raise NotFoundError("Extraction job not found")
    version_id = uuid.UUID(str(job.payload.get("file_version_id", "")))
    version = await db.get(DocumentFileVersion, version_id)
    if version is None or version.sha256_hex != job.payload.get("sha256"):
        raise ConflictError("Extraction source version changed or is unavailable")
    document = await db.get(Document, version.document_id)
    if document is None or not await CaseRepository(db).can_access(document.case_id, user.id):
        raise NotFoundError("Extraction source is unavailable")
    manifest = build_verified_manifest(version)
    if manifest.digest != job.payload.get("manifest_digest"):
        raise ConflictError("Extraction source manifest changed")
    policy = await get_policy_output(db, chamber_id=version.chamber_id)
    route = select_extraction_route(classification=version.content_classification, policy=policy, policy_version=policy.version)
    if route is None or provider not in {name for name, _model in route.providers}:
        raise ConflictError("Provider is no longer authorized for this extraction")
    return route

def pending_review_handoff(*, job: Job) -> ReviewHandoff:
    """A valid extraction may enter correction/review, never automatic approval."""
    return ReviewHandoff(status="pending_review", job_id=job.id, file_version_id=uuid.UUID(str(job.payload["file_version_id"])), manifest_digest=str(job.payload["manifest_digest"]))
