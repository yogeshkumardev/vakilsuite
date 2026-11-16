import uuid
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class ReadinessResponse(BaseModel):
    draft_type: str
    blueprint_code: str
    blueprint_version: int
    tier: Literal["A", "B", "C"]
    banner: str
    missing_inputs: list[str]
    missing_case_fields: list[str]
    missing_profile_fields: list[str]
    prefill: dict[str, Any]
    warnings: list[str]


class AdvocateProfileResponse(BaseModel):
    full_name: str
    office_address_line1: str | None = None
    office_address_line2: str | None = None
    city: str | None = None
    district: str | None = None
    state: str | None = None
    mobile_number: str | None = None
    chamber_number: str | None = None
    court_registrations: dict[str, dict[str, str]] = Field(default_factory=dict)


class AdvocateProfileUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    office_address_line1: str | None = Field(None, max_length=300)
    office_address_line2: str | None = Field(None, max_length=300)
    city: str | None = Field(None, max_length=100)
    district: str | None = Field(None, max_length=100)
    state: str | None = Field(None, max_length=100)
    mobile_number: str | None = Field(None, min_length=10, max_length=20)
    chamber_number: str | None = Field(None, max_length=100)


class AdvocateCourtRegistrationUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    enrollment_number: str | None = Field(None, max_length=100)
    aor_number: str | None = Field(None, max_length=100)


class CreateCourtDraftRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    draft_type: Literal["regular_bail_483_bnss"]
    summary_run_id: uuid.UUID
    expected_summary_hash: str = Field(pattern=r"^[a-f0-9]{64}$")
    court_code: Literal["allahabad_hc"] = "allahabad_hc"
    bench_code: Literal["allahabad", "lucknow"] = "allahabad"
    filing_mode: Literal["physical", "efiling"] = "efiling"
    pleading_language: Literal["en", "mixed"] = "en"
    affidavit_mode: Literal["separate"] = "separate"
    case: dict[str, Any] = Field(default_factory=dict)
    applicants: list[dict[str, Any]] = Field(default_factory=list, max_length=20)
    deponents: list[dict[str, Any]] = Field(default_factory=list, max_length=10)
    advocate: dict[str, Any] = Field(default_factory=dict)
    verification: dict[str, Any] = Field(default_factory=dict)
    annexures: list[dict[str, Any]] = Field(default_factory=list, max_length=50)
    case_specific_affidavit_paragraphs: str = Field(default="", max_length=30_000)


class DraftParagraphEdit(BaseModel):
    component_code: str = Field(min_length=1, max_length=100)
    paragraph_index: int = Field(ge=0, le=1000)
    text: str = Field(min_length=1, max_length=20_000)


class UpdateCourtDraftRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    expected_content_hash: str = Field(pattern=r"^[a-f0-9]{64}$")
    edits: list[DraftParagraphEdit] = Field(min_length=1, max_length=20)


class StartCourtDraftGenerationRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    expected_content_hash: str = Field(pattern=r"^[a-f0-9]{64}$")
    idempotency_key: str = Field(min_length=8, max_length=128)


class CourtDraftGenerationResponse(BaseModel):
    id: uuid.UUID
    status: str
    draft_id: uuid.UUID


class CourtDraftEditorResponse(BaseModel):
    working_document_id: uuid.UUID


class EnqueueCourtDraftExportRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    expected_content_hash: str = Field(pattern=r"^[a-f0-9]{64}$")
    idempotency_key: str = Field(min_length=8, max_length=128)
    acknowledge_compliance_warnings: bool = False


class CourtDraftExportResponse(BaseModel):
    id: uuid.UUID
    status: str
    draft_id: uuid.UUID
    artifact_ready: bool


class CourtDraftResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    case_id: uuid.UUID
    summary_run_id: uuid.UUID
    draft_type: str
    blueprint_code: str
    blueprint_version: int
    version: int
    status: str
    content: dict[str, Any]
    content_hash: str
    rule_snapshot: dict[str, Any]
    compliance_report: dict[str, Any] | None
    stale_reason: str | None
    prompt_version: str
    model: str | None
    source_summary_hash: str
    working_document_id: uuid.UUID | None
    created_at: datetime
    updated_at: datetime
