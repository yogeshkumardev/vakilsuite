"""Bind the filing index to the exact originals used by an approved summary."""

from __future__ import annotations

import re
import uuid

from sqlalchemy import select

from app.core.exceptions import ValidationError
from app.features.documents.models import Document, DocumentFileVersion


ANNEXURE_NUMBER = re.compile(r"(?i)\bannexure[\s_-]*(?:no[.\s_-]*)?0*([1-9][0-9]?)(?=$|[\s_.-])")
MISSING = "[● lawyer confirm karein ●]"


def source_document_versions(snapshot: list[dict]) -> dict[uuid.UUID, uuid.UUID]:
    result: dict[uuid.UUID, uuid.UUID] = {}
    for entry in snapshot:
        sources = [entry] if entry.get("kind") == "original_pdf" else entry.get("file_dependencies", [])
        for source in sources:
            document_id = source.get("document_id") or source.get("original_document_id")
            version_id = source.get("file_version_id")
            if document_id and version_id:
                document_id, version_id = uuid.UUID(str(document_id)), uuid.UUID(str(version_id))
                if document_id in result and result[document_id] != version_id:
                    raise ValidationError("One summary uses two revisions of the same annexure")
                result[document_id] = version_id
    return result


async def summary_annexures(db, *, summary, case_id: uuid.UUID, chamber_id: uuid.UUID) -> list[dict]:
    source_versions = source_document_versions(summary.dependency_snapshot)
    if not source_versions:
        raise ValidationError("The approved summary has no source originals for its annexure index")
    documents = {row.id: row for row in (await db.scalars(select(Document).where(
        Document.id.in_(source_versions), Document.case_id == case_id,
        Document.chamber_id == chamber_id, Document.deleted_at.is_(None),
    ))).all()}
    versions = {row.id: row for row in (await db.scalars(select(DocumentFileVersion).where(
        DocumentFileVersion.id.in_(source_versions.values()),
        DocumentFileVersion.chamber_id == chamber_id,
    ))).all()}
    if len(documents) != len(source_versions) or len(versions) != len(source_versions):
        raise ValidationError("A summary source original is no longer available")
    result = []
    used_numbers: set[int] = set()
    for document_id, version_id in source_versions.items():
        version = versions[version_id]
        if version.document_id != document_id:
            raise ValidationError("A summary source original does not match its file version")
        filename = version.original_filename
        matches = list(ANNEXURE_NUMBER.finditer(filename))
        if len(matches) != 1:
            raise ValidationError(f"Name the source PDF with one Annexure-01 style number: {filename}")
        number = int(matches[0].group(1))
        if number in used_numbers:
            raise ValidationError(f"Annexure-{number:02d} appears on more than one source PDF")
        used_numbers.add(number)
        description = re.sub(r"(?i)\.pdf$", "", filename)
        description = (description[:matches[0].start()] + description[matches[0].end():]).strip(" _-.")
        result.append({
            "document_id": str(document_id), "file_version_id": str(version_id),
            "source_sha256": version.sha256_hex, "filename": filename,
            "annexure_number": f"{number:02d}", "description": description or filename,
            "date": MISSING, "page_number": MISSING,
        })
    return sorted(result, key=lambda item: int(item["annexure_number"]))
