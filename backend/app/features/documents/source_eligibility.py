"""Server-attested original text never impersonates human-approved content."""

from sqlalchemy import select
from app.features.documents.source_models import (
    OriginalTextSource,
    ReviewedSourceProvenance,
)
from app.features.documents.models import Document, DocumentFileVersion, UploadStatus
from app.features.revisions.models import WorkingDocumentRevision, RevisionStatus


async def original_source_eligibility(db, document, revision):
    row = await db.get(ReviewedSourceProvenance, revision.id)
    if row is None:
        return await _legacy_eligibility(db, document, revision)
    return await _bound_eligibility(db, document, revision, row)


async def _legacy_eligibility(db, document, revision):
    row = await db.scalar(
        select(OriginalTextSource)
        .join(
            WorkingDocumentRevision,
            WorkingDocumentRevision.id == OriginalTextSource.revision_id,
        )
        .where(WorkingDocumentRevision.working_document_id == document.id)
    )
    if row is None:
        return False, False
    return await _bound_eligibility(db, document, revision, row)


async def _bound_eligibility(db, document, revision, row):
    version = await db.get(DocumentFileVersion, row.file_version_id)
    original = await db.get(Document, version.document_id) if version else None
    if (
        version is None
        or original is None
        or original.deleted_at is not None
        or original.case_id != document.case_id
        or original.chamber_id != document.chamber_id
        or version.chamber_id != document.chamber_id
        or original.upload_status != UploadStatus.uploaded
        or version.upload_status != UploadStatus.uploaded
        or version.sha256_hex != row.source_sha256
    ):
        return False, False
    latest = await db.scalar(
        select(DocumentFileVersion.id)
        .where(DocumentFileVersion.document_id == original.id)
        .order_by(DocumentFileVersion.version_number.desc())
        .limit(1)
    )
    valid = latest == version.id
    exact = (
        row.revision_id == revision.id
        and row.revision_sha256 == revision.content_sha256
        and revision.status == RevisionStatus.saved
        and (row.mode == "reviewed" and row.reviewed_by is not None)
    )
    return valid, valid and exact


async def original_page_metadata(db, revision):
    mapped = await db.get(ReviewedSourceProvenance, revision.id)
    if mapped is not None:
        if mapped.revision_sha256 != revision.content_sha256:
            return {}
        version = await db.get(DocumentFileVersion, mapped.file_version_id)
        return {
            "original_document_id": str(version.document_id),
            "file_version_id": str(version.id),
            "original_sha256": mapped.source_sha256,
            "page_paths": mapped.page_paths,
            "source_mode": "reviewed",
            "source_notes": [],
        }
    row = await db.scalar(
        select(OriginalTextSource).where(
            OriginalTextSource.revision_id == revision.id,
            OriginalTextSource.revision_sha256 == revision.content_sha256,
        )
    )
    if row is None:
        return {}
    version = await db.get(DocumentFileVersion, row.file_version_id)
    # Legacy snapshots keep their historical provenance. Never infer a page
    # from editable marker strings in old free-form rich text.
    paths = (
        {}
        if row.editor_document is not None
        else {
            f"editorState.root.children.{i}.children.0": p["page_number"]
            for i, p in enumerate(row.pages)
        }
    )
    return {
        "original_document_id": str(version.document_id),
        "file_version_id": str(version.id),
        "original_sha256": row.source_sha256,
        "page_paths": paths,
        "source_mode": row.mode,
        "source_notes": [],
    }
