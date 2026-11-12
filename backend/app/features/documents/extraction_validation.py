"""Validate provider extraction before it can enter human review.

Provider output is untrusted: this module makes page coverage and source IDs
explicit, and never converts a partial/refused result into approved text.
"""
from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field, model_validator


class ExtractedBlock(BaseModel):
    model_config = ConfigDict(extra="forbid")
    page_number: int = Field(ge=1)
    text: str = Field(min_length=1, max_length=100_000)
    uncertain: bool = False


class ExtractedTable(BaseModel):
    model_config = ConfigDict(extra="forbid")
    page_number: int = Field(ge=1)
    rows: list[list[str]] = Field(min_length=1, max_length=200)


class ExtractionOutput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    source_file_version_id: str = Field(min_length=1)
    source_sha256: str = Field(min_length=64, max_length=64, pattern=r"^[0-9a-f]{64}$")
    completed_pages: list[int] = Field(min_length=1, max_length=500)
    blocks: list[ExtractedBlock] = Field(default_factory=list, max_length=20_000)
    tables: list[ExtractedTable] = Field(default_factory=list, max_length=2_000)
    refusal_reason: str | None = Field(default=None, max_length=1_000)
    truncated: bool = False

    @model_validator(mode="after")
    def unique_pages(self):
        if len(set(self.completed_pages)) != len(self.completed_pages):
            raise ValueError("completed_pages must not contain duplicates")
        return self


class ExtractionValidationError(ValueError):
    pass


def validate_extraction_output(output: ExtractionOutput, *, file_version_id: str, sha256: str, page_count: int | None) -> ExtractionOutput:
    if output.refusal_reason:
        raise ExtractionValidationError("Provider refused extraction")
    if output.truncated:
        raise ExtractionValidationError("Provider output was truncated")
    if output.source_file_version_id != file_version_id or output.source_sha256 != sha256:
        raise ExtractionValidationError("Provider output does not match the authorized source")
    if page_count is not None:
        expected = set(range(1, page_count + 1))
        if set(output.completed_pages) != expected:
            raise ExtractionValidationError("Provider output does not cover every authorized page")
        referenced = {block.page_number for block in output.blocks} | {table.page_number for table in output.tables}
        if not referenced.issubset(expected):
            raise ExtractionValidationError("Provider output references an unauthorized page")
    return output
