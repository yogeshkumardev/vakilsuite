"""Wire contracts for a deterministic, non-persisted OKF export preview."""

from __future__ import annotations

import uuid

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.features.summaries.contracts import SummarySectionName


class OkfTemplateOptionResponse(BaseModel):
    bundle_id: str
    bundle_version: str
    okf_spec_version: str
    okf_spec_commit: str
    template_entry_id: str
    template_title: str


class OkfAnnexureCandidateResponse(BaseModel):
    annexure_id: uuid.UUID
    slot_code: str
    label: str
    eligible: bool
    reason: str | None = None


class ConfirmedFindingSelection(BaseModel):
    section: SummarySectionName | None = None
    finding_index: int | None = Field(default=None, ge=0, le=99)
    finding_id: str | None = Field(default=None, pattern=r"^fact_[0-9]{4,}$")

    @model_validator(mode="after")
    def one_identity(self):
        if self.finding_id is not None:
            if self.section is not None or self.finding_index is not None:
                raise ValueError("Select by stable ID or legacy index, not both")
        elif self.section is None or self.finding_index is None:
            raise ValueError("A finding identity is required")
        return self


class PrepareOkfExportPreviewRequest(BaseModel):
    authority_manifest_id: uuid.UUID | None = None
    expected_authority_context_hash: str | None = Field(
        default=None, pattern=r"^[a-f0-9]{64}$"
    )

    @model_validator(mode="after")
    def authority_pair(self):
        if (self.authority_manifest_id is None) != (
            self.expected_authority_context_hash is None
        ):
            raise ValueError(
                "Authority manifest ID and expected hash must be supplied together"
            )
        return self

    summary_run_id: uuid.UUID
    expected_summary_result_hash: str = Field(
        min_length=64, max_length=64, pattern=r"^[a-f0-9]{64}$"
    )
    bundle_id: str = Field(min_length=3, max_length=80)
    bundle_version: str = Field(min_length=3, max_length=40)
    template_entry_id: str = Field(min_length=3, max_length=80)
    confirmed_findings: list[ConfirmedFindingSelection] = Field(
        min_length=1, max_length=200
    )
    annexure_ids: list[uuid.UUID] = Field(default_factory=list, max_length=50)


class OkfExportPreviewResponse(BaseModel):
    """Canonical application metadata. S07-08 will persist an immutable artifact."""

    model_config = ConfigDict(extra="forbid")

    export_format: str
    manifest_sha256: str
    payload: dict


class SaveOkfContextRequest(PrepareOkfExportPreviewRequest):
    expected_manifest_sha256: str = Field(pattern=r"^[a-f0-9]{64}$")


class OkfContextResponse(OkfExportPreviewResponse):
    id: uuid.UUID
    current: bool
