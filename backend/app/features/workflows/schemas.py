from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.features.workflows.models import (
    WorkflowResumeIntentStatus,
    WorkflowReviewStatus,
    WorkflowRunStatus,
)


class CreatePocWorkflowIn(BaseModel):
    idempotency_key: str = Field(min_length=8, max_length=128)
    input_manifest_hash: str = Field(pattern=r"^[a-f0-9]{64}$")


class DecideWorkflowReviewIn(BaseModel):
    approved: bool
    expected_version: int = Field(ge=1)
    idempotency_key: str = Field(min_length=8, max_length=128)


class WorkflowReviewOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    status: WorkflowReviewStatus
    version: int
    review_summary: dict
    decided_at: datetime | None


class WorkflowResumeIntentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    status: WorkflowResumeIntentStatus
    attempt_count: int
    error_code: str | None
    celery_task_id: str | None
    processed_at: datetime | None


class WorkflowRunOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    workflow_type: str
    graph_version: str
    status: WorkflowRunStatus
    input_manifest_hash: str
    result_summary: dict | None
    error_code: str | None
    created_at: datetime
    completed_at: datetime | None
    review: WorkflowReviewOut | None = None
    resume_intent: WorkflowResumeIntentOut | None = None
