"""Application-facing helpers for the immutable S02 chamber audit ledger."""

from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ValidationError
from app.features.chambers.audit import ChamberAuditEvent, ChamberAuditEventType


_ALLOWED_METADATA: dict[ChamberAuditEventType, frozenset[str]] = {
    ChamberAuditEventType.chamber_created: frozenset(),
    ChamberAuditEventType.membership_added: frozenset({"role"}),
    ChamberAuditEventType.membership_role_changed: frozenset({"previous_role", "role"}),
    ChamberAuditEventType.membership_revoked: frozenset({"previous_role"}),
    ChamberAuditEventType.case_access_granted: frozenset({"can_edit"}),
    ChamberAuditEventType.case_access_revoked: frozenset(),
    ChamberAuditEventType.case_archived: frozenset(),
    ChamberAuditEventType.case_soft_deleted: frozenset(),
}


async def record_audit_event(
    db: AsyncSession,
    *,
    chamber_id: uuid.UUID,
    actor_user_id: uuid.UUID,
    event_type: ChamberAuditEventType,
    resource_type: str,
    resource_id: uuid.UUID,
    subject_user_id: uuid.UUID | None = None,
    metadata: dict[str, str | bool] | None = None,
) -> ChamberAuditEvent:
    """Append a narrow event in the caller's existing transaction."""
    metadata = metadata or {}
    if set(metadata) - _ALLOWED_METADATA[event_type]:
        raise ValidationError("Unsupported audit metadata")
    if any(not isinstance(value, (str, bool)) for value in metadata.values()):
        raise ValidationError("Invalid audit metadata")
    event = ChamberAuditEvent(
        chamber_id=chamber_id,
        actor_user_id=actor_user_id,
        event_type=event_type,
        resource_type=resource_type,
        resource_id=resource_id,
        subject_user_id=subject_user_id,
        metadata_json=metadata,
    )
    db.add(event)
    await db.flush()
    return event


async def list_audit_events(
    db: AsyncSession, *, chamber_id: uuid.UUID, limit: int
) -> list[ChamberAuditEvent]:
    rows = await db.scalars(
        select(ChamberAuditEvent)
        .where(ChamberAuditEvent.chamber_id == chamber_id)
        .order_by(ChamberAuditEvent.occurred_at.desc(), ChamberAuditEvent.id.desc())
        .limit(limit)
    )
    return list(rows)

