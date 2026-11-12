"""Small provider-neutral contracts for document typing adapters.

These are deliberately not the generic AI-provider contracts used by summaries
or drafts. A typed source requires physical-page coverage and provenance.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class TypedPage:
    page_number: int
    text: str


@dataclass(frozen=True)
class TypedDocument:
    pages: tuple[TypedPage, ...]
    request_id: str | None = None
    usage: dict[str, int] | None = None


@dataclass(frozen=True)
class SubmittedDocumentJob:
    job_id: str
    run_id: str | None
    status: str


class DocumentTypingProviderError(RuntimeError):
    """Sanitized external failure; never retain source bytes in this object."""

    def __init__(self, message: str, *, status_code: int | None = None, code: str | None = None):
        super().__init__(message)
        self.status_code = status_code
        self.code = code
