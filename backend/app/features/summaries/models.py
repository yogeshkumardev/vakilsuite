"""Durable, scoped metadata for approved-source summary runs."""

from __future__ import annotations

import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    DateTime,
    Enum as SAEnum,
    ForeignKey,
    Index,
    Integer,
    String,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.db.base import Base


class SummaryRunStatus(str, enum.Enum):
    pending = "pending"
    running = "running"
    pending_review = "pending_review"
    changes_requested = "changes_requested"
    completed = "completed"
    failed = "failed"
    stale = "stale"


class SummaryRun(Base):
    __tablename__ = "summary_runs"
    __table_args__ = (
        UniqueConstraint(
            "chamber_id",
            "case_id",
            "cache_key",
            name="uq_summary_runs_scoped_cache_key",
        ),
        Index(
            "ix_summary_runs_chamber_case_created",
            "chamber_id",
            "case_id",
            "created_at",
        ),
        Index("ix_summary_runs_status", "status"),
    )
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    chamber_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("chambers.id", ondelete="RESTRICT"),
        nullable=False,
    )
    case_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("cases.id", ondelete="RESTRICT"), nullable=False
    )
    created_by_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    status: Mapped[SummaryRunStatus] = mapped_column(
        SAEnum(SummaryRunStatus, name="summary_run_status"),
        nullable=False,
        default=SummaryRunStatus.pending,
    )
    source_manifest_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    cache_key: Mapped[str] = mapped_column(String(64), nullable=False)
    schema_version: Mapped[str] = mapped_column(
        String(40),
        nullable=False,
        default="case-summary-v1",
        server_default="case-summary-v1",
    )
    output_language: Mapped[str] = mapped_column(
        String(50), nullable=False, default="en-IN", server_default="en-IN"
    )
    prompt_version: Mapped[str] = mapped_column(String(80), nullable=False)
    policy_version: Mapped[int] = mapped_column(Integer, nullable=False)
    provider: Mapped[str | None] = mapped_column(String(32), nullable=True)
    model: Mapped[str | None] = mapped_column(String(160), nullable=True)
    input_tokens: Mapped[int | None] = mapped_column(Integer, nullable=True)
    output_tokens: Mapped[int | None] = mapped_column(Integer, nullable=True)
    usage_paise: Mapped[int | None] = mapped_column(Integer, nullable=True)
    result_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)
    result_payload: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    review_editor_state: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    review_payload: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    review_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)
    validation_report: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    review_version: Mapped[int] = mapped_column(
        Integer, nullable=False, default=1, server_default="1"
    )
    reviewed_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=True
    )
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(), nullable=True)
    review_comment: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    error_code: Mapped[str | None] = mapped_column(String(80), nullable=True)
    provider_request_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    dependency_snapshot: Mapped[list[dict[str, object]]] = mapped_column(
        JSONB, nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(), default=func.now(), server_default=func.now(), nullable=False
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(), nullable=True)


class DocumentFactCard(Base):
    """A source-version-bound map result. Failed attempts require an explicit retry."""
    __tablename__ = "document_fact_cards"
    __table_args__ = (
        UniqueConstraint("chamber_id", "source_revision_id", name="uq_fact_card_revision"),
        Index("ix_fact_cards_case_status", "case_id", "status"),
    )
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    chamber_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("chambers.id", ondelete="RESTRICT"), nullable=False)
    case_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("cases.id", ondelete="RESTRICT"), nullable=False)
    original_document_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("documents.id", ondelete="RESTRICT"), nullable=True)
    original_file_version_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    original_sha256: Mapped[str | None] = mapped_column(String(64), nullable=True)
    source_revision_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    source_sha256: Mapped[str] = mapped_column(String(64), nullable=False)
    source_kind: Mapped[str] = mapped_column(String(24), nullable=False, server_default="reviewed_text")
    status: Mapped[str] = mapped_column(String(24), nullable=False, default="pending")
    content: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    error_code: Mapped[str | None] = mapped_column(String(80), nullable=True)
    provider_request_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(), default=func.now(), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(), default=func.now(), server_default=func.now(), onupdate=func.now(), nullable=False)


class FactCardDelivery(Base):
    """Committed, provider-free delivery intent for one map-stage fact card."""

    __tablename__ = "fact_card_deliveries"
    __table_args__ = (
        UniqueConstraint(
            "summary_run_id", "document_fact_card_id", name="uq_fact_card_delivery_run_card"
        ),
        Index("ix_fact_card_deliveries_dispatch", "status", "leased_until"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    summary_run_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("summary_runs.id", ondelete="CASCADE"),
        nullable=False,
    )
    document_fact_card_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("document_fact_cards.id", ondelete="RESTRICT"),
        nullable=False,
    )
    status: Mapped[str] = mapped_column(
        String(24), nullable=False, default="queued", server_default="queued"
    )
    delivery_attempt_count: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, server_default="0"
    )
    leased_until: Mapped[datetime | None] = mapped_column(DateTime(), nullable=True)
    error_code: Mapped[str | None] = mapped_column(String(80), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(), default=func.now(), server_default=func.now(), nullable=False
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(), nullable=True)


class SummarySourceDependency(Base):
    __tablename__ = "summary_source_dependencies"
    __table_args__ = (
        UniqueConstraint(
            "summary_run_id",
            "working_document_revision_id",
            name="uq_summary_source_dependency",
        ),
    )
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    summary_run_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("summary_runs.id", ondelete="CASCADE"),
        nullable=False,
    )
    working_document_revision_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("working_document_revisions.id", ondelete="RESTRICT"),
        nullable=False,
    )
    revision_sha256: Mapped[str] = mapped_column(String(64), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(), default=func.now(), server_default=func.now(), nullable=False
    )


class SummaryProviderAttempt(Base):
    __tablename__ = "summary_provider_attempts"
    __table_args__ = (
        UniqueConstraint(
            "summary_run_id", "sequence", name="uq_summary_provider_attempt_sequence"
        ),
        Index("ix_summary_provider_attempts_run", "summary_run_id", "sequence"),
    )
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    summary_run_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("summary_runs.id", ondelete="CASCADE"),
        nullable=False,
    )
    sequence: Mapped[int] = mapped_column(Integer, nullable=False)
    provider: Mapped[str] = mapped_column(String(32), nullable=False)
    model: Mapped[str] = mapped_column(String(160), nullable=False)
    status: Mapped[str] = mapped_column(
        String(32), nullable=False, default="reserved", server_default="reserved"
    )
    input_manifest_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    output_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)
    error_code: Mapped[str | None] = mapped_column(String(80), nullable=True)
    outcome_unknown: Mapped[bool] = mapped_column(
        nullable=False, default=False, server_default="false"
    )
    provider_request_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(), default=func.now(), server_default=func.now(), nullable=False
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(), nullable=True)


class SummaryReviewDecision(Base):
    """Immutable record of a lawyer's decision on one generated summary result."""

    __tablename__ = "summary_review_decisions"
    __table_args__ = (
        UniqueConstraint(
            "summary_run_id", "sequence", name="uq_summary_review_decision_sequence"
        ),
        Index("ix_summary_review_decisions_run", "summary_run_id", "sequence"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    summary_run_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("summary_runs.id", ondelete="CASCADE"),
        nullable=False,
    )
    sequence: Mapped[int] = mapped_column(Integer, nullable=False)
    action: Mapped[str] = mapped_column(String(32), nullable=False)
    result_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    reviewed_by_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    comment: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(), default=func.now(), server_default=func.now(), nullable=False
    )


class SummaryReviewEdit(Base):
    """Append-only snapshot of a lawyer's saved summary revision."""

    __tablename__ = "summary_review_edits"
    __table_args__ = (
        UniqueConstraint("summary_run_id", "review_version", name="uq_summary_review_edit_version"),
    )
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    summary_run_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("summary_runs.id", ondelete="CASCADE"), nullable=False
    )
    review_version: Mapped[int] = mapped_column(Integer, nullable=False)
    editor_state: Mapped[dict] = mapped_column(JSONB, nullable=False)
    payload: Mapped[dict] = mapped_column(JSONB, nullable=False)
    content_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    saved_by_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(), server_default=func.now(), nullable=False)
