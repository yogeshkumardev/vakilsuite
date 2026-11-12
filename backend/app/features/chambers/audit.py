"""Minimal, payload-free chamber audit ledger for S02-06.

These rows answer who changed chamber membership or case access. They are not
an event bus and must never contain document content, filenames, signed URLs,
credentials, prompts, or arbitrary request data.
"""

from __future__ import annotations

import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum as SAEnum, ForeignKey, Index, JSON, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.db.base import Base


class ChamberAuditEventType(str, enum.Enum):
    chamber_created = "chamber.created"
    membership_added = "membership.added"
    membership_role_changed = "membership.role_changed"
    membership_revoked = "membership.revoked"
    case_access_granted = "case_access.granted"
    case_access_revoked = "case_access.revoked"
    case_archived = "case.archived"
    case_soft_deleted = "case.soft_deleted"


class ChamberAuditEvent(Base):
    __tablename__ = "chamber_audit_events"
    __table_args__ = (
        Index("ix_chamber_audit_events_chamber_occurred", "chamber_id", "occurred_at"),
        Index("ix_chamber_audit_events_resource", "resource_type", "resource_id"),
        Index("ix_chamber_audit_events_actor_occurred", "actor_user_id", "occurred_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    chamber_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("chambers.id", ondelete="RESTRICT"), nullable=False
    )
    actor_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    event_type: Mapped[ChamberAuditEventType] = mapped_column(
        SAEnum(ChamberAuditEventType, name="chamber_audit_event_type"), nullable=False
    )
    resource_type: Mapped[str] = mapped_column(String(40), nullable=False)
    resource_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    subject_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=True
    )
    # Only enum/state metadata produced by services. Never raw request bodies.
    metadata_json: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict, server_default="{}")
    occurred_at: Mapped[datetime] = mapped_column(DateTime(), nullable=False, default=func.now(), server_default=func.now())

