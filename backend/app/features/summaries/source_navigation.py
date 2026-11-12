"""Resolve exact cited originals server-side; never accept a model-supplied URL."""

import asyncio
from datetime import UTC, datetime, timedelta
from pydantic import BaseModel
from app.core.exceptions import NotFoundError, ConflictError
from app.features.documents.source_service import OriginalSourceService
from app.features.documents.storage import get_r2_client
from .structured_validation import parse_summary
from .structured import StructuredSummary


class SummarySourceView(BaseModel):
    url: str
    filename: str
    mime_type: str
    page_number: int
    expires_at: datetime


async def resolve_source(db, *, run, user, finding_id, citation_index):
    parsed = parse_summary(run.result_payload or {})
    if not isinstance(parsed, StructuredSummary):
        raise ConflictError("Legacy summaries do not have v2 source identities")
    fact = next((f for f in parsed.facts() if f.id == finding_id), None)
    if fact is None or not 0 <= citation_index < len(fact.citations):
        raise NotFoundError("Summary source not found")
    citation = fact.citations[citation_index]
    authorized = False
    for item in run.dependency_snapshot:
        if item.get("kind") == "original_pdf":
            authorized |= (
                item.get("document_id") == citation.document_id
                and item.get("file_version_id") == citation.file_version_id
                and item.get("revision_id") == citation.source_revision_id
            )
        else:
            for dependency in item.get("file_dependencies", []):
                authorized |= (
                    dependency.get("original_document_id") == citation.document_id
                    and dependency.get("file_version_id") == citation.file_version_id
                    and item.get("revision_id") == citation.source_revision_id
                )
    if not authorized:
        raise ConflictError("Source is not part of this summary manifest")
    doc, version = await OriginalSourceService(db).authorized(
        citation.document_id, user
    )
    if (
        str(doc.case_id) != str(run.case_id)
        or str(version.id) != citation.file_version_id
    ):
        raise ConflictError("Original source has changed or is unavailable")
    hashes = [
        item.get("sha256")
        for item in run.dependency_snapshot
        if item.get("kind") == "original_pdf"
        and item.get("file_version_id") == citation.file_version_id
    ]
    hashes += [
        d.get("original_sha256")
        for item in run.dependency_snapshot
        for d in item.get("file_dependencies", [])
        if d.get("file_version_id") == citation.file_version_id
    ]
    if version.sha256_hex not in hashes or not 1 <= citation.page_number <= (
        version.page_count or 1
    ):
        raise ConflictError("Original source fingerprint/page no longer matches")
    url = await asyncio.to_thread(
        get_r2_client().generate_presigned_url,
        "get_object",
        Params={"Bucket": version.r2_bucket, "Key": version.r2_key},
        ExpiresIn=300,
    )
    return SummarySourceView(
        url=url,
        filename=doc.original_filename,
        mime_type=version.detected_mime_type,
        page_number=citation.page_number,
        expires_at=datetime.now(UTC) + timedelta(minutes=5),
    )
