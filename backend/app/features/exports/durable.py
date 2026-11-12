"""Durable, revision-pinned export job orchestration (S05-06)."""

from __future__ import annotations

import hashlib
import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictError
from app.features.jobs.service import get_or_create_job
from app.features.users.models import User


async def enqueue_revision_export(
    db: AsyncSession,
    *,
    document_id: uuid.UUID,
    revision_id: uuid.UUID,
    expected_hash: str,
    output_format: str,
    idempotency_key: str,
    user: User,
):
    from .review_gate import require_reviewed_export

    document, revision = await require_reviewed_export(
        db,
        document_id=document_id,
        revision_id=revision_id,
        expected_hash=expected_hash,
        user=user,
    )
    if output_format not in {"docx", "pdf"}:
        raise ConflictError("Unsupported export format")
    fingerprint = hashlib.sha256(
        f"{revision.id}:{revision.content_sha256}:{output_format}".encode()
    ).hexdigest()
    job, created = await get_or_create_job(
        db,
        owner_id=user.id,
        chamber_id=document.chamber_id,
        case_id=document.case_id,
        job_type="working_document_export",
        idempotency_key=idempotency_key,
        payload={
            "working_document_id": str(document.id),
            "revision_id": str(revision.id),
            "revision_hash": revision.content_sha256,
            "format": output_format,
            "title": document.title,
            "fingerprint": fingerprint,
        },
    )
    await db.commit()
    await db.refresh(job)
    return job, created
