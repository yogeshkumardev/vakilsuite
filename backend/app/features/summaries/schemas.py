"""HTTP contracts for selecting approved inputs for a future summary run."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, model_validator
from app.features.summaries.structured import StructuredSummary, UnverifiedSummary
from app.features.summaries.prompt import SIMPLE_PROMPT_VERSION
from app.features.summaries.contracts import CaseSummaryPayload
from .presentation import SummaryView


class SummarySourceCandidateResponse(BaseModel):
    source_kind: Literal["reviewed_text", "original_pdf"] = "reviewed_text"
    original_document_id: uuid.UUID | None = None
    working_document_id: uuid.UUID
    revision_id: uuid.UUID | None
    title: str
    revision_number: int | None
    status: str | None
    revision_sha256: str | None
    eligible: bool
    reasons: list[str]


class SummarySourceSelectionRequest(BaseModel):
    working_document_id: uuid.UUID
    revision_id: uuid.UUID
    expected_revision_sha256: str = Field(
        min_length=64, max_length=64, pattern=r"^[0-9a-f]{64}$"
    )


class OriginalPdfSelection(BaseModel):
    document_id: uuid.UUID
    file_version_id: uuid.UUID
    sha256: str = Field(pattern=r"^[a-f0-9]{64}$")


class PrepareSummaryRunRequest(BaseModel):
    sources: list[SummarySourceSelectionRequest] = Field(
        default_factory=list, max_length=50
    )
    original_pdf_sources: list[OriginalPdfSelection] = Field(
        default_factory=list, max_length=50
    )

    @model_validator(mode="after")
    def require_sources(self):
        if not 1 <= len(self.sources) + len(self.original_pdf_sources) <= 50:
            raise ValueError("Select between 1 and 50 sources")
        return self

    prompt_version: Literal["allahabad-criminal-summary-v6"] = SIMPLE_PROMPT_VERSION
    output_language: Literal["en-IN", "hi-IN"] = "en-IN"


class SummaryRunResponse(BaseModel):
    id: uuid.UUID
    case_id: uuid.UUID
    status: str
    source_manifest_hash: str
    prompt_version: str
    policy_version: int
    source_count: int
    schema_version: str = "case-summary-v1"
    output_language: str = "en-IN"
    created_at: datetime
    completed_at: datetime | None


class SubmitSummaryRunResponse(BaseModel):
    id: uuid.UUID
    status: str


class SummaryReviewDecisionResponse(BaseModel):
    id: uuid.UUID
    sequence: int
    action: Literal["approve", "request_changes"]
    result_hash: str
    reviewed_by_user_id: uuid.UUID
    comment: str | None
    created_at: datetime


class SummaryReviewDocument(BaseModel):
    document_id: uuid.UUID
    filename: str


class SummaryEditorBlock(BaseModel):
    id: str
    title: str
    text: str


class SaveSummaryEditorRequest(BaseModel):
    expected_review_version: int = Field(ge=1)
    expected_result_hash: str = Field(pattern=r"^[0-9a-f]{64}$")
    editor_state: dict


class SummaryRunDetailResponse(SummaryRunResponse):
    """Generated content is derived and remains immutable until a later revision flow exists."""

    editor_state: dict | None = None
    editor_blocks: list[SummaryEditorBlock] = Field(default_factory=list)
    has_saved_edits: bool = False
    editor_recovery_notice: str | None = None
    provider: str | None
    model: str | None
    provider_request_id: str | None
    input_tokens: int | None
    output_tokens: int | None
    result_hash: str | None
    result_payload: StructuredSummary | CaseSummaryPayload | UnverifiedSummary | None
    presentation: SummaryView | None = None
    review_documents: list[SummaryReviewDocument] = Field(default_factory=list)
    validation_report: dict | None
    error_code: str | None
    review_version: int
    reviewed_by_user_id: uuid.UUID | None
    reviewed_at: datetime | None
    review_comment: str | None
    decisions: list[SummaryReviewDecisionResponse]


class DecideSummaryReviewRequest(BaseModel):
    acknowledge_incomplete: bool = False
    action: Literal["approve", "request_changes"]
    expected_result_hash: str = Field(
        min_length=64, max_length=64, pattern=r"^[0-9a-f]{64}$"
    )
    expected_review_version: int = Field(ge=1)
    comment: str | None = Field(default=None, max_length=2000)
