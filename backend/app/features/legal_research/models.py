"""Additive, chamber-scoped records for Indian Kanoon legal research."""

from __future__ import annotations

import enum
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum as SAEnum, ForeignKey, Index, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.db.base import Base


class LegalResearchRunStatus(str, enum.Enum):
    pending = "pending"
    running = "running"
    completed = "completed"
    cancelled = "cancelled"
    failed = "failed"
    outcome_unknown = "outcome_unknown"


class LegalResearchOperationStatus(str, enum.Enum):
    reserved = "reserved"
    dispatched = "dispatched"
    completed = "completed"
    failed = "failed"
    outcome_unknown = "outcome_unknown"
    cancelled = "cancelled"


class AuthorityReviewAction(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"
    changes_requested = "changes_requested"
    revoked = "revoked"


class LegalResearchRun(Base):
    __tablename__ = "legal_research_runs"
    __table_args__ = (
        UniqueConstraint("chamber_id", "case_id", "idempotency_key", name="uq_legal_research_runs_scoped_idempotency"),
        Index("ix_legal_research_runs_chamber_case_created", "chamber_id", "case_id", "created_at"),
        Index("ix_legal_research_runs_status", "status"),
    )
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    chamber_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("chambers.id", ondelete="RESTRICT"), nullable=False)
    case_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("cases.id", ondelete="RESTRICT"), nullable=False)
    created_by_user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    idempotency_key: Mapped[str] = mapped_column(String(128), nullable=False)
    request_digest: Mapped[str] = mapped_column(String(64), nullable=False)
    query_text: Mapped[str] = mapped_column(String(500), nullable=False)
    query_policy_version: Mapped[str] = mapped_column(String(80), nullable=False, default="v1")
    status: Mapped[LegalResearchRunStatus] = mapped_column(SAEnum(LegalResearchRunStatus, name="legal_research_run_status"), nullable=False, default=LegalResearchRunStatus.pending)
    budget_paise: Mapped[int] = mapped_column(Integer, nullable=False)
    reserved_paise: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    spent_estimate_paise: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    cancelled_at: Mapped[datetime | None] = mapped_column(DateTime(), nullable=True)
    error_code: Mapped[str | None] = mapped_column(String(80), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(), nullable=False, default=func.now(), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(), nullable=False, default=func.now(), onupdate=func.now(), server_default=func.now())


class LegalResearchOperation(Base):
    __tablename__ = "legal_research_operations"
    __table_args__ = (
        UniqueConstraint("run_id", "operation_name", "request_digest", name="uq_legal_research_operations_request"),
        Index("ix_legal_research_operations_run_status", "run_id", "status"),
    )
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    run_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("legal_research_runs.id", ondelete="CASCADE"), nullable=False)
    operation_name: Mapped[str] = mapped_column(String(40), nullable=False)
    request_digest: Mapped[str] = mapped_column(String(64), nullable=False)
    idempotency_key: Mapped[str] = mapped_column(String(128), nullable=False)
    status: Mapped[LegalResearchOperationStatus] = mapped_column(SAEnum(LegalResearchOperationStatus, name="legal_research_operation_status"), nullable=False, default=LegalResearchOperationStatus.reserved)
    reserved_paise: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    outcome_unknown: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    result_payload: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    error_code: Mapped[str | None] = mapped_column(String(80), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(), nullable=False, default=func.now(), server_default=func.now())
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(), nullable=True)


class LegalAuthority(Base):
    __tablename__ = "legal_authorities"
    __table_args__ = (
        UniqueConstraint("chamber_id", "upstream_document_id", name="uq_legal_authorities_chamber_upstream"),
        Index("ix_legal_authorities_chamber", "chamber_id"),
    )
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    chamber_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("chambers.id", ondelete="RESTRICT"), nullable=False)
    upstream_document_id: Mapped[int] = mapped_column(Integer, nullable=False)
    canonical_url: Mapped[str] = mapped_column(String(500), nullable=False)
    current_version_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(), nullable=False, default=func.now(), server_default=func.now())


class LegalAuthorityVersion(Base):
    __tablename__ = "legal_authority_versions"
    __table_args__ = (UniqueConstraint("authority_id", "content_hash", name="uq_legal_authority_versions_content"),)
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    authority_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("legal_authorities.id", ondelete="CASCADE"), nullable=False)
    content_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    metadata_json: Mapped[dict] = mapped_column("metadata", JSONB, nullable=False, default=dict)
    normalized_text: Mapped[str | None] = mapped_column(Text(), nullable=True)
    normalization_version: Mapped[str] = mapped_column(String(40), nullable=False, default="v1")
    fetched_at: Mapped[datetime] = mapped_column(DateTime(), nullable=False, default=func.now(), server_default=func.now())


class LegalAuthorityPassage(Base):
    __tablename__ = "legal_authority_passages"
    __table_args__ = (UniqueConstraint("authority_version_id", "text_hash", "start_offset", name="uq_legal_authority_passages_locator"),)
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    authority_version_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("legal_authority_versions.id", ondelete="CASCADE"), nullable=False)
    text: Mapped[str] = mapped_column(Text(), nullable=False)
    text_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    start_offset: Mapped[int] = mapped_column(Integer, nullable=False)
    end_offset: Mapped[int] = mapped_column(Integer, nullable=False)
    paragraph_label: Mapped[str | None] = mapped_column(String(100), nullable=True)
    locator_valid: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")


class LegalProposition(Base):
    __tablename__ = "legal_propositions"
    __table_args__ = (Index("ix_legal_propositions_case_created", "case_id", "created_at"),)
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    chamber_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("chambers.id", ondelete="RESTRICT"), nullable=False)
    case_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("cases.id", ondelete="RESTRICT"), nullable=False)
    authority_version_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("legal_authority_versions.id", ondelete="RESTRICT"), nullable=False)
    passage_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("legal_authority_passages.id", ondelete="RESTRICT"), nullable=False)
    text: Mapped[str] = mapped_column(Text(), nullable=False)
    text_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    created_by_user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(), nullable=False, default=func.now(), server_default=func.now())


class LegalAuthorityReview(Base):
    __tablename__ = "legal_authority_reviews"
    __table_args__ = (UniqueConstraint("proposition_id", "version", name="uq_legal_authority_reviews_proposition_version"),)
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    chamber_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("chambers.id", ondelete="RESTRICT"), nullable=False)
    case_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("cases.id", ondelete="RESTRICT"), nullable=False)
    proposition_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("legal_propositions.id", ondelete="CASCADE"), nullable=False)
    action: Mapped[AuthorityReviewAction] = mapped_column(SAEnum(AuthorityReviewAction, name="authority_review_action"), nullable=False, default=AuthorityReviewAction.pending)
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1, server_default="1")
    treatment_notes: Mapped[str | None] = mapped_column(String(4000), nullable=True)
    decided_by_user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=True)
    decided_at: Mapped[datetime | None] = mapped_column(DateTime(), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(), nullable=False, default=func.now(), server_default=func.now())


class LegalAuthorityManifest(Base):
    """Immutable case-scoped selection of exact advocate-approved authorities."""

    __tablename__ = "legal_authority_manifests"
    __table_args__ = (Index("ix_legal_authority_manifests_case_created", "case_id", "created_at"),)
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    chamber_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("chambers.id", ondelete="RESTRICT"), nullable=False)
    case_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("cases.id", ondelete="RESTRICT"), nullable=False)
    created_by_user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    context_hash: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    references_json: Mapped[list[dict]] = mapped_column(JSONB, nullable=False)
    schema_version: Mapped[str] = mapped_column(String(32), nullable=False, default="v1")
    is_stale: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    created_at: Mapped[datetime] = mapped_column(DateTime(), nullable=False, default=func.now(), server_default=func.now())


class LegalResearchResumeIntent(Base):
    """Transactional outbox created with an approved authority review."""
    __tablename__ = "legal_research_resume_intents"
    __table_args__ = (UniqueConstraint("review_id", name="uq_legal_research_resume_intents_review"),)
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    review_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("legal_authority_reviews.id", ondelete="CASCADE"), nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="pending", server_default="pending")
    idempotency_key: Mapped[str] = mapped_column(String(128), nullable=False, unique=True)
    attempt_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    error_code: Mapped[str | None] = mapped_column(String(80), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(), nullable=False, default=func.now(), server_default=func.now())
