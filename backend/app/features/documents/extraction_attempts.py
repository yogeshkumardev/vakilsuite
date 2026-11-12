"""Reservation and reconciliation for provider extraction attempts."""
from __future__ import annotations
import uuid
from datetime import UTC, datetime
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.features.documents.models import DocumentExtractionAttempt, ExtractionAttemptStatus

def _now() -> datetime:
    return datetime.now(UTC).replace(tzinfo=None)

async def reserve_attempt(db: AsyncSession, *, job_id: uuid.UUID, file_version_id: uuid.UUID, provider: str, model: str, manifest_digest: str) -> DocumentExtractionAttempt:
    next_sequence = (await db.scalar(select(func.coalesce(func.max(DocumentExtractionAttempt.sequence), 0)).where(DocumentExtractionAttempt.job_id == job_id))) + 1
    attempt = DocumentExtractionAttempt(job_id=job_id, file_version_id=file_version_id, sequence=next_sequence, provider=provider, model=model, input_manifest_digest=manifest_digest)
    db.add(attempt)
    await db.flush()
    return attempt

async def reconcile_attempt(db: AsyncSession, *, attempt: DocumentExtractionAttempt, succeeded: bool, output_sha256: str | None = None, provider_request_id: str | None = None, error_code: str | None = None, outcome_unknown: bool = False) -> DocumentExtractionAttempt:
    attempt.status = ExtractionAttemptStatus.succeeded if succeeded else ExtractionAttemptStatus.unknown if outcome_unknown else ExtractionAttemptStatus.failed
    attempt.output_sha256 = output_sha256
    attempt.provider_request_id = provider_request_id
    attempt.error_code = error_code
    attempt.outcome_unknown = outcome_unknown
    attempt.reconciled_at = _now()
    await db.flush()
    return attempt
