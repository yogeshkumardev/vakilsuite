import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field

from app.features.jobs.models import JobStatus


class JobOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    job_type: str
    status: JobStatus
    case_id: uuid.UUID | None
    attempt_count: int
    max_attempts: int
    result_summary: dict | None
    error_message: str | None
    queued_at: datetime
    started_at: datetime | None
    completed_at: datetime | None
    created_at: datetime
    updated_at: datetime


class EnqueueDummyJobIn(BaseModel):
    """Request body for POST /jobs/dummy (S01-07 spike)."""

    label: str = Field(min_length=1, max_length=100)
    idempotency_key: str = Field(min_length=8, max_length=128)
