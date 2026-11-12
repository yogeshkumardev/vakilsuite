"""One gate for enqueue and download of persisted case drafts."""

import uuid
from sqlalchemy import select
from app.core.exceptions import ConflictError, NotFoundError
from app.features.revisions.models import RevisionStatus
from app.features.revisions.service import WorkingDocumentService
from app.features.revisions.eligibility import SourceEligibilityResolver


async def require_reviewed_export(db, *, document_id, revision_id, expected_hash, user):
    service = WorkingDocumentService(db)
    document = await service.repo.get(document_id)
    if document is None:
        raise NotFoundError("Working document not found")
    await service._require_readable_case(document.case_id, user)
    revision = await service.repo.get_revision(document.id, revision_id)
    if revision is None or revision.content_sha256 != expected_hash:
        raise ConflictError("Export revision changed; reload the draft")
    if revision.status != RevisionStatus.approved:
        raise ConflictError("Review and approve the saved draft before downloading it")
    eligibility = await SourceEligibilityResolver(db).resolve(
        user=user,
        working_document_id=document.id,
        revision_id=revision.id,
        expected_revision_sha256=expected_hash,
    )
    if not eligibility.eligible:
        raise ConflictError(
            "Draft approval is no longer current; review the latest revision"
        )
    if document.document_kind == "ai_draft_unreviewed":
        from app.features.jobs.models import Job
        from app.features.okf_exports.generation import JOB_TYPE
        from app.features.okf_exports.snapshots import OkfContextService

        job = await db.scalar(
            select(Job).where(
                Job.case_id == document.case_id,
                Job.chamber_id == document.chamber_id,
                Job.job_type == JOB_TYPE,
                Job.result_summary["working_document_id"].as_string()
                == str(document.id),
            )
        )
        if job is None or not job.payload.get("snapshot_id"):
            raise ConflictError("Draft source context is unavailable")
        await OkfContextService(db).read(
            case_id=document.case_id,
            snapshot_id=uuid.UUID(job.payload["snapshot_id"]),
            user=user,
        )
    return document, revision
