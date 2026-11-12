"""Server-owned original/page provenance, distinct from human approval."""

import uuid
from datetime import datetime
from sqlalchemy import ForeignKey, String, DateTime, Integer, Boolean, Index, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func
from app.db.base import Base


class OriginalTextSource(Base):
    __tablename__ = "original_text_sources"
    file_version_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("document_file_versions.id"), primary_key=True
    )
    source_sha256: Mapped[str] = mapped_column(String(64), nullable=False)
    editor_document: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    editor_version: Mapped[int] = mapped_column(
        Integer, nullable=False, default=1, server_default="1"
    )
    pages: Mapped[list] = mapped_column(JSONB, nullable=False)
    revision_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("working_document_revisions.id"), unique=True
    )
    revision_sha256: Mapped[str | None] = mapped_column(String(64))
    mode: Mapped[str] = mapped_column(String(32), nullable=False)
    reviewed_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id")
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(), server_default=func.now())


class ReviewedSourceProvenance(Base):
    """Immutable versioned repairs preserve older reviewed source snapshots."""

    __tablename__ = "reviewed_source_provenance"
    revision_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("working_document_revisions.id"),
        primary_key=True,
    )
    file_version_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("document_file_versions.id"), nullable=False
    )
    revision_sha256: Mapped[str] = mapped_column(String(64), nullable=False)
    source_sha256: Mapped[str] = mapped_column(String(64), nullable=False)
    page_paths: Mapped[dict] = mapped_column(JSONB, nullable=False)
    reviewed_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    mode: Mapped[str] = mapped_column(String(32), nullable=False, default="reviewed")


class DocumentTypingAttempt(Base):
    """Durable external-typing ledger without document text or provider output."""

    __tablename__ = "document_typing_attempts"
    __table_args__ = (
        UniqueConstraint("job_id", "sequence", name="uq_document_typing_attempt_sequence"),
        Index("ix_document_typing_attempts_job", "job_id"),
        Index("ix_document_typing_attempts_provider_job", "provider_job_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    job_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False
    )
    file_version_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("document_file_versions.id", ondelete="RESTRICT"), nullable=False
    )
    sequence: Mapped[int] = mapped_column(Integer, nullable=False)
    provider: Mapped[str] = mapped_column(String(32), nullable=False)
    model: Mapped[str] = mapped_column(String(160), nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False)
    source_sha256: Mapped[str] = mapped_column(String(64), nullable=False)
    quote_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    reserved_paise: Mapped[int] = mapped_column(Integer, nullable=False)
    provider_job_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    provider_run_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    reported_usage: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    error_code: Mapped[str | None] = mapped_column(String(100), nullable=True)
    outcome_unknown: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    next_poll_at: Mapped[datetime | None] = mapped_column(DateTime(), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(), server_default=func.now(), onupdate=func.now(), nullable=False
    )
