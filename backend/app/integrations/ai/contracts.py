"""Narrow, provider-neutral contracts for VakilSuite AI operations.

The application owns authorization, source/version bookkeeping and review state.
Providers only receive the explicitly selected input for one bounded operation.
"""

from __future__ import annotations

import enum
from typing import Protocol, runtime_checkable

from pydantic import BaseModel, ConfigDict, Field, model_validator


class ProviderName(str, enum.Enum):
    gemini = "gemini"
    openai = "openai"


class ContractModel(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)


class TranscribeInput(ContractModel):
    """One text or inline document input for a transcription request."""

    text_prompt: str | None = Field(default=None, min_length=1)
    file_bytes: bytes | None = Field(default=None, max_length=20 * 1024 * 1024)
    filename: str | None = Field(default=None, max_length=255)
    mime_type: str | None = Field(default=None, max_length=100)
    source_id: str = Field(min_length=1, max_length=255)
    language_hint: str = Field(default="hi+en", max_length=50)
    document_type: str = Field(default="legal", max_length=100)
    max_output_tokens: int = Field(default=4096, ge=256, le=32_768)

    @model_validator(mode="after")
    def validate_source(self) -> "TranscribeInput":
        if (self.text_prompt is None) == (self.file_bytes is None):
            raise ValueError("Provide exactly one of text_prompt or file_bytes")
        if self.file_bytes is not None and (not self.filename or not self.mime_type):
            raise ValueError("filename and mime_type are required with file_bytes")
        return self


class SummarizeInput(ContractModel):
    """Approved text plus the revision IDs that authorize its use."""

    approved_text: str = Field(min_length=1)
    source_ids: list[str] = Field(min_length=1)
    facts: dict[str, str] = Field(default_factory=dict)
    language: str = Field(default="hi+en", max_length=50)
    max_output_tokens: int = Field(default=2048, ge=256, le=16_384)


class DraftInput(ContractModel):
    template_name: str = Field(min_length=1, max_length=255)
    approved_facts: dict[str, str]
    instructions: str = Field(min_length=1)
    source_ids: list[str] = Field(default_factory=list)
    max_output_tokens: int = Field(default=4096, ge=256, le=32_768)


class TextBlock(ContractModel):
    text: str
    page_ref: str | None = None
    is_uncertain: bool = False


class TranscriptionPayload(ContractModel):
    blocks: list[TextBlock]
    coverage_note: str | None = None


class SummaryPayload(ContractModel):
    purpose: str
    parties: list[str]
    key_dates: list[str]
    key_amounts: list[str]
    key_events: list[str]
    uncertainties: list[str]
    source_ids: list[str]


class DraftSection(ContractModel):
    title: str
    content: str


class DraftPayload(ContractModel):
    sections: list[DraftSection]
    missing_facts: list[str]


class ProviderResult(ContractModel):
    provider: ProviderName
    model: str
    latency_ms: int = Field(ge=0)
    input_tokens: int | None = Field(default=None, ge=0)
    output_tokens: int | None = Field(default=None, ge=0)
    provider_request_id: str | None = None


class TranscribeResult(ProviderResult):
    blocks: list[TextBlock]
    coverage_note: str | None = None
    raw_finish_reason: str | None = None


class SummarizeResult(ProviderResult):
    purpose: str
    parties: list[str]
    key_dates: list[str]
    key_amounts: list[str]
    key_events: list[str]
    uncertainties: list[str]
    source_ids: list[str]


class DraftResult(ProviderResult):
    sections: list[DraftSection]
    missing_facts: list[str]


class ProviderErrorCode(str, enum.Enum):
    rate_limit = "RATE_LIMIT"
    quota_exhausted = "QUOTA_EXHAUSTED"
    timeout = "TIMEOUT"
    unavailable = "UNAVAILABLE"
    safety_block = "SAFETY_BLOCK"
    invalid_input = "INVALID_INPUT"
    invalid_response = "INVALID_RESPONSE"
    authentication = "AUTHENTICATION"
    unknown = "UNKNOWN"


RETRYABLE_ERROR_CODES: frozenset[str] = frozenset(
    {ProviderErrorCode.rate_limit.value}
)
NON_RETRYABLE_ERROR_CODES: frozenset[str] = frozenset(
    code.value for code in ProviderErrorCode if code.value not in RETRYABLE_ERROR_CODES
)


class ProviderError(ContractModel):
    """Sanitized provider failure safe to persist or return to an operator UI."""

    provider: ProviderName
    error_code: ProviderErrorCode
    message: str
    retryable: bool
    outcome_unknown: bool = False
    provider_request_id: str | None = None
    input_tokens: int | None = Field(default=None, ge=0)
    output_tokens: int | None = Field(default=None, ge=0)


AIResult = TranscribeResult | SummarizeResult | DraftResult | ProviderError


@runtime_checkable
class AIProvider(Protocol):
    provider_name: ProviderName
    model: str

    def transcribe(
        self, input: TranscribeInput
    ) -> TranscribeResult | ProviderError: ...

    def summarize(
        self, input: SummarizeInput
    ) -> SummarizeResult | ProviderError: ...

    def draft(self, input: DraftInput) -> DraftResult | ProviderError: ...
