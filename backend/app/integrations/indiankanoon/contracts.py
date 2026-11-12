"""Strict transport contracts for the documented Indian Kanoon API.

The upstream response shape is treated as untrusted.  These models preserve
only bounded, presentation-safe data; the domain layer owns legal verification.
"""

from __future__ import annotations

import enum
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator


class IndianKanoonOperation(str, enum.Enum):
    search = "search"
    document = "document"
    metadata = "metadata"
    fragment = "fragment"
    original = "original"


class IndianKanoonErrorCode(str, enum.Enum):
    not_configured = "NOT_CONFIGURED"
    authentication = "AUTHENTICATION"
    forbidden = "FORBIDDEN"
    quota_exhausted = "QUOTA_EXHAUSTED"
    rate_limited = "RATE_LIMITED"
    unavailable = "UNAVAILABLE"
    timeout = "TIMEOUT"
    invalid_response = "INVALID_RESPONSE"
    response_too_large = "RESPONSE_TOO_LARGE"
    invalid_request = "INVALID_REQUEST"


class IndianKanoonError(Exception):
    """Sanitized external failure; never includes token, query, or body."""

    def __init__(
        self,
        *,
        code: IndianKanoonErrorCode,
        message: str,
        status_code: int = 503,
        retry_after_seconds: int | None = None,
        outcome_unknown: bool = False,
    ) -> None:
        self.code = code
        self.message = message
        self.status_code = status_code
        self.retry_after_seconds = retry_after_seconds
        self.outcome_unknown = outcome_unknown
        super().__init__(message)


class _Contract(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)


class SearchRequest(_Contract):
    query: str = Field(min_length=3, max_length=500)
    page: int = Field(default=0, ge=0, le=9)

    @field_validator("query")
    @classmethod
    def normalize_query(cls, value: str) -> str:
        normalized = " ".join(value.split())
        if not normalized:
            raise ValueError("Query cannot be blank")
        return normalized


class SearchHit(_Contract):
    upstream_document_id: int = Field(gt=0)
    title: str = Field(min_length=1, max_length=1000)
    headline: str | None = Field(default=None, max_length=10_000)
    court: str | None = Field(default=None, max_length=500)
    decision_date: str | None = Field(default=None, max_length=100)
    citation: str | None = Field(default=None, max_length=500)


class SearchResult(_Contract):
    hits: list[SearchHit] = Field(default_factory=list, max_length=100)
    page: int = Field(ge=0)
    has_more: bool = False


class AuthorityPayload(_Contract):
    upstream_document_id: int = Field(gt=0)
    title: str | None = Field(default=None, max_length=1000)
    court: str | None = Field(default=None, max_length=500)
    decision_date: str | None = Field(default=None, max_length=100)
    citation: str | None = Field(default=None, max_length=500)
    text: str | None = Field(default=None, max_length=1_500_000)
    raw: dict[str, Any] = Field(default_factory=dict)


def positive_document_id(value: int) -> int:
    if value <= 0:
        raise ValueError("Indian Kanoon document id must be positive")
    return value
