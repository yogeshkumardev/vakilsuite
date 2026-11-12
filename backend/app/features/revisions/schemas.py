from __future__ import annotations

import uuid
import enum
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class CreateWorkingDocumentRequest(BaseModel):
    title: str = Field(min_length=1, max_length=300)
    document_kind: str = Field(default="typed_document", min_length=1, max_length=64)
    editor_document: dict[str, Any]


class CreateRevisionRequest(BaseModel):
    expected_revision_number: int = Field(ge=1)
    client_mutation_id: uuid.UUID
    editor_document: dict[str, Any]


class SubmitRevisionRequest(BaseModel):
    expected_content_sha256: str = Field(min_length=64, max_length=64, pattern=r"^[0-9a-f]{64}$")


class RevisionDecisionAction(str, enum.Enum):
    approve = "approve"
    request_changes = "request_changes"
    revoke = "revoke"


class DecideRevisionRequest(BaseModel):
    action: RevisionDecisionAction
    expected_content_sha256: str = Field(min_length=64, max_length=64, pattern=r"^[0-9a-f]{64}$")
    comment: str | None = Field(default=None, max_length=2_000)


class SourceDependencyRequest(BaseModel):
    file_version_id: uuid.UUID
    expected_sha256: str = Field(min_length=64, max_length=64, pattern=r"^[0-9a-f]{64}$")
    first_page: int | None = Field(default=None, ge=1)
    last_page: int | None = Field(default=None, ge=1)


class ResolveEligibilityRequest(BaseModel):
    revision_id: uuid.UUID
    expected_revision_sha256: str = Field(min_length=64, max_length=64, pattern=r"^[0-9a-f]{64}$")
    sources: list[SourceDependencyRequest] = Field(default_factory=list, max_length=250)


class EligibilityResponse(BaseModel):
    eligible: bool
    reasons: list[str]
    revision_id: uuid.UUID | None
    revision_hash: str | None


class EditorBootstrapResponse(BaseModel):
    session_id: uuid.UUID
    token: str
    expires_at: datetime


class EditorSessionConsumeRequest(BaseModel):
    token: str = Field(min_length=32, max_length=512)


class EditorSessionRevisionRequest(CreateRevisionRequest):
    pass


class EnqueueRevisionExportRequest(BaseModel):
    revision_id: uuid.UUID
    expected_content_sha256: str = Field(min_length=64, max_length=64, pattern=r"^[0-9a-f]{64}$")
    output_format: str = Field(pattern=r"^(docx|pdf)$")
    idempotency_key: str = Field(min_length=8, max_length=128)


class ExportJobResponse(BaseModel):
    id: uuid.UUID
    status: str
    output_format: str
    revision_id: uuid.UUID
    artifact_ready: bool = False

class ReviewInboxItem(BaseModel):
    revision_id: uuid.UUID
    working_document_id: uuid.UUID
    case_id: uuid.UUID
    title: str
    revision_number: int
    content_sha256: str
    created_at: datetime


class WorkingDocumentRevisionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    working_document_id: uuid.UUID
    case_id: uuid.UUID
    chamber_id: uuid.UUID
    revision_number: int
    parent_revision_id: uuid.UUID | None
    client_mutation_id: uuid.UUID | None
    status: str
    editor_schema_version: int
    editor_document: dict[str, Any]
    normalized_text: str
    source_map: list[dict[str, Any]]
    content_sha256: str
    created_by_user_id: uuid.UUID
    created_at: datetime


class WorkingDocumentSummaryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    case_id: uuid.UUID
    chamber_id: uuid.UUID
    title: str
    document_kind: str
    created_by_user_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    latest_revision_number: int | None = None


class WorkingDocumentDetailResponse(WorkingDocumentSummaryResponse):
    latest_revision: WorkingDocumentRevisionResponse | None = None
