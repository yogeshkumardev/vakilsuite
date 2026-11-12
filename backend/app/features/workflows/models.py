"""Authoritative audit records for resumable human-reviewed workflows.

LangGraph checkpoints hold execution state.  These tables hold the business
facts that must remain inspectable and owner-scoped even if a worker restarts.
Do not put document text, prompts, signed URLs, or secrets in these records.
"""

from __future__ import annotations

import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum as SAEnum, ForeignKey, Index, Integer, JSON, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.db.base import Base


class WorkflowRunStatus(str, enum.Enum):
    pending_review = "pending_review"
    running = "running"
    completed = "completed"
    rejected = "rejected"
    failed = "failed"


class WorkflowReviewStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class WorkflowResumeIntentStatus(str, enum.Enum):
    pending = "pending"
    processing = "processing"
    processed = "processed"
    failed = "failed"


class WorkflowRun(Base):
    __tablename__ = "workflow_runs"
    __table_args__ = (
        Index("ix_workflow_runs_owner_id", "owner_id"),
        Index("ix_workflow_runs_chamber_id", "chamber_id"),
        Index("ix_workflow_runs_status", "status"),
        Index("uq_workflow_runs_chamber_owner_type_idempotency", "chamber_id", "owner_id", "workflow_type", "idempotency_key", unique=True),
        Index("uq_workflow_runs_thread_id", "thread_id", unique=True),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    # Nullable only while legacy workflow runs are migrated.  Graph execution
    # will receive an explicit chamber scope in S02-03.
    chamber_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("chambers.id", ondelete="RESTRICT"), nullable=True)
    workflow_type: Mapped[str] = mapped_column(String(100), nullable=False)
    graph_version: Mapped[str] = mapped_column(String(80), nullable=False)
    thread_id: Mapped[str] = mapped_column(String(160), nullable=False)
    idempotency_key: Mapped[str] = mapped_column(String(128), nullable=False)
    # SHA-256 of the selected, versioned input manifest; never source content.
    input_manifest_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    status: Mapped[WorkflowRunStatus] = mapped_column(
        SAEnum(WorkflowRunStatus, name="workflow_run_status"),
        nullable=False,
        default=WorkflowRunStatus.pending_review,
        server_default=WorkflowRunStatus.pending_review.value,
    )
    result_summary: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    error_code: Mapped[str | None] = mapped_column(String(80), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(), default=func.now(), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(), default=func.now(), onupdate=func.now(), server_default=func.now())
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(), nullable=True)


class WorkflowReview(Base):
    __tablename__ = "workflow_reviews"
    __table_args__ = (
        Index("ix_workflow_reviews_run_id", "run_id"),
        Index("uq_workflow_reviews_run_sequence", "run_id", "sequence", unique=True),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    run_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("workflow_runs.id", ondelete="CASCADE"), nullable=False)
    sequence: Mapped[int] = mapped_column(Integer, nullable=False, default=1, server_default="1")
    # Optimistic-concurrency token supplied by the reviewer on decision.
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1, server_default="1")
    status: Mapped[WorkflowReviewStatus] = mapped_column(
        SAEnum(WorkflowReviewStatus, name="workflow_review_status"),
        nullable=False,
        default=WorkflowReviewStatus.pending,
        server_default=WorkflowReviewStatus.pending.value,
    )
    # Metadata only: source/version identifiers and validation hints, never text.
    review_summary: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict, server_default="{}")
    decided_by_user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=True)
    decided_at: Mapped[datetime | None] = mapped_column(DateTime(), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(), default=func.now(), server_default=func.now())


class WorkflowOperation(Base):
    """Idempotency ledger for externally visible workflow operations."""

    __tablename__ = "workflow_operations"
    __table_args__ = (
        Index("ix_workflow_operations_run_id", "run_id"),
        Index("uq_workflow_operations_run_name_input", "run_id", "operation_name", "input_hash", unique=True),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    run_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("workflow_runs.id", ondelete="CASCADE"), nullable=False)
    operation_name: Mapped[str] = mapped_column(String(100), nullable=False)
    input_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    result_summary: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(), default=func.now(), server_default=func.now())


class WorkflowResumeIntent(Base):
    """Transactional outbox row created with an approved review decision."""

    __tablename__ = "workflow_resume_intents"
    __table_args__ = (
        Index("ix_workflow_resume_intents_status", "status"),
        Index("uq_workflow_resume_intents_review", "review_id", unique=True),
        Index("uq_workflow_resume_intents_idempotency", "run_id", "idempotency_key", unique=True),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    run_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("workflow_runs.id", ondelete="CASCADE"), nullable=False)
    review_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("workflow_reviews.id", ondelete="CASCADE"), nullable=False)
    idempotency_key: Mapped[str] = mapped_column(String(128), nullable=False)
    status: Mapped[WorkflowResumeIntentStatus] = mapped_column(
        SAEnum(WorkflowResumeIntentStatus, name="workflow_resume_intent_status"),
        nullable=False,
        default=WorkflowResumeIntentStatus.pending,
        server_default=WorkflowResumeIntentStatus.pending.value,
    )
    attempt_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    error_code: Mapped[str | None] = mapped_column(String(80), nullable=True)
    celery_task_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    leased_until: Mapped[datetime | None] = mapped_column(DateTime(), nullable=True)
    processed_at: Mapped[datetime | None] = mapped_column(DateTime(), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(), default=func.now(), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(), default=func.now(), onupdate=func.now(), server_default=func.now())
