from __future__ import annotations

import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    Enum as SAEnum,
    ForeignKey,
    Index,
    Integer,
    JSON,
    String,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.db.base import Base


class JobStatus(str, enum.Enum):
    queued = "queued"
    running = "running"
    succeeded = "succeeded"
    failed = "failed"
    cancelled = "cancelled"


class Job(Base):
    """
    Background job record — tracks Celery task lifecycle in PostgreSQL.

    PostgreSQL is the authoritative source for job state. Celery/Redis is
    transport only; never treat Redis result backend as the only durable record.

    State machine: queued → running → succeeded | failed | cancelled
    """

    __tablename__ = "jobs"

    __table_args__ = (
        CheckConstraint("attempt_count >= 0", name="ck_jobs_attempt_count_nonnegative"),
        CheckConstraint("max_attempts > 0", name="ck_jobs_max_attempts_positive"),
        CheckConstraint(
            "attempt_count <= max_attempts", name="ck_jobs_attempt_within_limit"
        ),
        Index("ix_jobs_owner_id", "owner_id"),
        Index("ix_jobs_chamber_id", "chamber_id"),
        Index("ix_jobs_status", "status"),
        Index("ix_jobs_job_type", "job_type"),
        Index(
            "uq_jobs_chamber_owner_type_idempotency",
            "chamber_id",
            "owner_id",
            "job_type",
            "idempotency_key",
            unique=True,
        ),
        Index(
            "uq_jobs_celery_task_id",
            "celery_task_id",
            unique=True,
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    job_type: Mapped[str] = mapped_column(
        String(100), nullable=False
    )  # e.g. 'dummy', 'transcribe', 'summarize', 'draft', 'export'
    status: Mapped[JobStatus] = mapped_column(
        SAEnum(JobStatus, name="job_status"),
        nullable=False,
        default=JobStatus.queued,
        server_default=JobStatus.queued.value,
    )
    owner_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )
    # S02 expand/migrate compatibility: S02-03 will require every enqueueing
    # path to set this tenant boundary and scope idempotency accordingly.
    chamber_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("chambers.id", ondelete="RESTRICT"),
        nullable=True,
    )
    case_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("cases.id", ondelete="SET NULL"),
        nullable=True,
    )
    celery_task_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    idempotency_key: Mapped[str | None] = mapped_column(String(128), nullable=True)
    attempt_count: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, server_default="0"
    )
    max_attempts: Mapped[int] = mapped_column(
        Integer, nullable=False, default=3, server_default="3"
    )
    # payload: input params — no sensitive content, no document text, no signed URLs
    payload: Mapped[dict] = mapped_column(
        JSON, nullable=False, default=dict, server_default="{}"
    )
    # result_summary: short structured result — not full generated text
    result_summary: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    error_message: Mapped[str | None] = mapped_column(String(2000), nullable=True)
    queued_at: Mapped[datetime] = mapped_column(
        DateTime(), default=func.now(), server_default=func.now()
    )
    started_at: Mapped[datetime | None] = mapped_column(DateTime(), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(), nullable=True)
    leased_until: Mapped[datetime | None] = mapped_column(DateTime(), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(), default=func.now(), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(),
        default=func.now(),
        onupdate=func.now(),
        server_default=func.now(),
    )
