"""Versioned, server-authoritative provider policy for one chamber.

This is deliberately a policy record, not a provider router.  Creating or
updating a policy never submits data to Gemini, OpenAI, or Claude.  Future
workers must resolve this policy with the chamber already established by the
server; they must not trust a chamber, collection, or thread identifier sent
by a client as authority.
"""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Integer, JSON, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.db.base import Base


class ChamberProviderPolicyVersion(Base):
    """An immutable policy snapshot; exactly one snapshot is active per chamber."""

    __tablename__ = "chamber_provider_policy_versions"
    __table_args__ = (
        Index(
            "uq_chamber_provider_policy_versions_active",
            "chamber_id",
            unique=True,
            postgresql_where=text("is_active"),
        ),
        Index(
            "uq_chamber_provider_policy_versions_chamber_version",
            "chamber_id",
            "version",
            unique=True,
        ),
        Index(
            "ix_chamber_provider_policy_versions_chamber_created",
            "chamber_id",
            "created_at",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    chamber_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("chambers.id", ondelete="RESTRICT"), nullable=False
    )
    version: Mapped[int] = mapped_column(Integer, nullable=False)
    # A JSON snapshot keeps the evolving provider/model policy versioned as a
    # single reviewed decision.  Its exact shape is validated by Pydantic
    # before persistence and reconstructed only by this module.
    policy_json: Mapped[dict] = mapped_column(JSON, nullable=False)
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default=text("true")
    )
    previous_policy_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("chamber_provider_policy_versions.id", ondelete="RESTRICT"),
        nullable=True,
    )
    created_by_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(), nullable=False, default=func.now(), server_default=func.now()
    )
