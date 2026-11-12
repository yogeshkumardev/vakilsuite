"""Fail closed when a case summary omits an active original or upload."""

from collections import Counter
from sqlalchemy import select
from app.core.exceptions import ConflictError
from app.features.documents.models import Document, UploadStatus


def manifest_original_ids(entries):
    ids = []
    for item in entries:
        if item.get("kind") == "original_pdf":
            ids.append(str(item["document_id"]))
        else:
            ids.extend(
                str(d["original_document_id"])
                for d in item.get("file_dependencies", [])
                if d.get("original_document_id")
            )
    return ids


def validate_case_coverage(documents, entries):
    if not documents:
        raise ConflictError("Upload case documents before generating a case summary")
    if any(d.upload_status != UploadStatus.uploaded for d in documents):
        raise ConflictError(
            "Finish or remove pending/failed uploads before generating the case summary"
        )
    actual = Counter(manifest_original_ids(entries))
    expected = Counter(str(d.id) for d in documents)
    if actual != expected:
        raise ConflictError(
            "Case documents changed or are not all ready. Review every scan and refresh Case Summary before continuing"
        )


async def require_case_coverage(db, *, case_id, entries):
    documents = list(
        await db.scalars(
            select(Document).where(
                Document.case_id == case_id, Document.deleted_at.is_(None)
            )
        )
    )
    validate_case_coverage(documents, entries)
