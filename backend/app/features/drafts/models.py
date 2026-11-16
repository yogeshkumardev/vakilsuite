import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.db.base import Base


class AdvocateProfile(Base):
    """Reusable professional details, kept separate from login identity."""

    __tablename__ = "advocate_profiles"
    __table_args__ = (UniqueConstraint("user_id", name="uq_advocate_profiles_user"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    office_address_line1: Mapped[str | None] = mapped_column(String(300), nullable=True)
    office_address_line2: Mapped[str | None] = mapped_column(String(300), nullable=True)
    city: Mapped[str | None] = mapped_column(String(100), nullable=True)
    district: Mapped[str | None] = mapped_column(String(100), nullable=True)
    state: Mapped[str | None] = mapped_column(String(100), nullable=True)
    mobile_number: Mapped[str | None] = mapped_column(String(20), nullable=True)
    chamber_number: Mapped[str | None] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(), default=func.now(), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(), default=func.now(), onupdate=func.now(), server_default=func.now(), nullable=False)


class AdvocateCourtRegistration(Base):
    """Court-specific advocate identifiers; never infer or fabricate these."""

    __tablename__ = "advocate_court_registrations"
    __table_args__ = (
        UniqueConstraint("advocate_profile_id", "court_code", name="uq_advocate_court_registration"),
        Index("ix_advocate_court_registrations_court", "court_code"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    advocate_profile_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("advocate_profiles.id", ondelete="CASCADE"), nullable=False)
    court_code: Mapped[str] = mapped_column(String(80), nullable=False)
    identifiers: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict, server_default="{}")
    created_at: Mapped[datetime] = mapped_column(DateTime(), default=func.now(), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(), default=func.now(), onupdate=func.now(), server_default=func.now(), nullable=False)


class CourtDraft(Base):
    __tablename__ = "court_drafts"
    __table_args__ = (
        UniqueConstraint("case_id", "version", name="uq_court_drafts_case_version"),
        Index("ix_court_drafts_chamber_case_created", "chamber_id", "case_id", "created_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    chamber_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("chambers.id", ondelete="RESTRICT"), nullable=False)
    case_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("cases.id", ondelete="RESTRICT"), nullable=False)
    summary_run_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("summary_runs.id", ondelete="RESTRICT"), nullable=False)
    draft_type: Mapped[str] = mapped_column(String(80), nullable=False)
    blueprint_code: Mapped[str] = mapped_column(String(120), nullable=False)
    blueprint_version: Mapped[int] = mapped_column(Integer, nullable=False)
    version: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="needs_review", server_default="needs_review")
    content: Mapped[dict] = mapped_column(JSONB, nullable=False)
    content_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    rule_snapshot: Mapped[dict] = mapped_column(JSONB, nullable=False)
    compliance_report: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    stale_reason: Mapped[str | None] = mapped_column(String(80), nullable=True)
    prompt_version: Mapped[str] = mapped_column(String(80), nullable=False, default="bail-483-skeleton-v1")
    model: Mapped[str | None] = mapped_column(String(160), nullable=True)
    source_summary_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    # The generated court draft remains the immutable rule-bound source. Lawyer
    # edits are saved as revisions in the linked Word working document.
    working_document_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("working_documents.id", ondelete="RESTRICT"),
        nullable=True,
        unique=True,
    )
    created_by_user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(), default=func.now(), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(), default=func.now(), onupdate=func.now(), server_default=func.now(), nullable=False)


class DraftDownload(Base):
    """Immutable record of an authorized, short-lived court-draft download."""

    __tablename__ = "draft_downloads"
    __table_args__ = (Index("ix_draft_downloads_draft_created", "court_draft_id", "created_at"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    court_draft_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("court_drafts.id", ondelete="RESTRICT"), nullable=False)
    export_job_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("jobs.id", ondelete="RESTRICT"), nullable=False)
    chamber_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("chambers.id", ondelete="RESTRICT"), nullable=False)
    downloaded_by_user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    content_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(), default=func.now(), server_default=func.now(), nullable=False)
