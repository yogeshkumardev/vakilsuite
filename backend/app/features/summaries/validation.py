"""Strict structured summary validation before human review or persistence."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field, model_validator


class SummaryClaim(BaseModel):
    model_config = ConfigDict(extra="forbid")
    text: str = Field(min_length=1, max_length=5_000)
    source_revision_id: str = Field(min_length=1)
    source_paths: list[str] = Field(min_length=1, max_length=100)
    confirmed: bool = False


class StructuredSummary(BaseModel):
    model_config = ConfigDict(extra="forbid")
    purpose: str = Field(min_length=1, max_length=2_000)
    claims: list[SummaryClaim] = Field(min_length=1, max_length=500)
    uncertainties: list[str] = Field(default_factory=list, max_length=200)
    source_revision_ids: list[str] = Field(min_length=1, max_length=500)

    @model_validator(mode="after")
    def claims_reference_selected_sources(self):
        selected = set(self.source_revision_ids)
        if len(selected) != len(self.source_revision_ids):
            raise ValueError("source_revision_ids must be unique")
        if any(claim.source_revision_id not in selected for claim in self.claims):
            raise ValueError("Every claim must reference a selected source revision")
        return self


def validate_summary_sources(
    summary: StructuredSummary, *, eligible_revision_ids: set[str]
) -> StructuredSummary:
    if not set(summary.source_revision_ids).issubset(eligible_revision_ids):
        raise ValueError(
            "Summary references a source that is not currently approved and eligible"
        )
    return summary
