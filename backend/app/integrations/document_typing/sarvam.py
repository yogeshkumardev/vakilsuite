"""Sarvam Document Intelligence Parse adapter.

The adapter knows only Sarvam's HTTP transport and converts a verified Parse
result into a provider-neutral typed document. It neither touches the database
nor writes Lexical state.
"""

from __future__ import annotations

import logging
from typing import Any

import httpx

from app.core.config import settings
from app.integrations.document_typing.sarvam_output import NO_TEXT_EXTRACTED, strip_empty_image_comments
from app.integrations.document_typing.contracts import (
    DocumentTypingProviderError,
    SubmittedDocumentJob,
    TypedDocument,
    TypedPage,
)

logger = logging.getLogger(__name__)

# Exact provider commentary, only in explicitly non-text layout regions.
# Never remove arbitrary sentences mentioning signatures from document text.
_SIGNATURE_COMMENT = "this image contains a signature and does not contain any text."


class SarvamParseClient:
    def __init__(self, *, api_key: str | None = None, base_url: str | None = None):
        self.api_key = api_key if api_key is not None else settings.SARVAM_DOC_AI_API_KEY
        self.base_url = (base_url or settings.SARVAM_DOC_AI_BASE_URL).rstrip("/")

    @property
    def headers(self) -> dict[str, str]:
        return {"api-subscription-key": self.api_key}

    def _request(self, method: str, path: str, **kwargs: Any) -> dict[str, Any]:
        try:
            with httpx.Client(timeout=settings.SARVAM_DOC_AI_TIMEOUT_SECONDS) as client:
                response = client.request(method, f"{self.base_url}{path}", headers=self.headers, **kwargs)
        except httpx.TimeoutException as exc:
            raise DocumentTypingProviderError("Sarvam request timed out") from exc
        except httpx.HTTPError as exc:
            raise DocumentTypingProviderError("Sarvam request could not be completed") from exc
        try:
            body = response.json()
        except ValueError:
            body = {}
        if response.is_error:
            error = body.get("error", body) if isinstance(body, dict) else {}
            message = error.get("message") if isinstance(error, dict) else None
            # Do not log provider bodies: they may include reflected document content.
            logger.warning("Sarvam Document Intelligence failed: status=%s code=%s", response.status_code, error.get("code") if isinstance(error, dict) else None)
            raise DocumentTypingProviderError(
                str(message or "Sarvam Document Intelligence returned an error")[:500],
                status_code=response.status_code,
                code=str(error.get("code"))[:120] if isinstance(error, dict) and error.get("code") else None,
            )
        if not isinstance(body, dict):
            raise DocumentTypingProviderError("Sarvam returned an invalid response")
        return body

    def submit_parse(self, *, data: bytes, filename: str, mime_type: str, model: str, language: str, content_type: str) -> SubmittedDocumentJob:
        body = self._request(
            "POST",
            "/doc-ai/v1/job/parse",
            data={"model": model, "language": language, "content_type": content_type},
            files={"file": (filename, data, mime_type)},
        )
        job_id = body.get("job_id")
        status = body.get("status")
        if not isinstance(job_id, str) or not job_id or not isinstance(status, str):
            raise DocumentTypingProviderError("Sarvam Parse submission did not return a job identifier")
        run_id = body.get("run_id")
        return SubmittedDocumentJob(job_id=job_id, run_id=run_id if isinstance(run_id, str) else None, status=status)

    def status(self, job_id: str) -> dict[str, Any]:
        return self._request("GET", f"/doc-ai/v1/job/{job_id}/status")

    def results(self, job_id: str) -> TypedDocument:
        return parse_result(self._request("GET", f"/doc-ai/v1/job/{job_id}/results", params={"format": "json"}), job_id)


def _page_number(value: dict[str, Any], fallback: int) -> int:
    for key in (
        "page_number",
        "pageNumber",
        "page_num",
        "pageNum",
        "page_index",
        "pageIndex",
    ):
        candidate = value.get(key)
        if isinstance(candidate, int) and not isinstance(candidate, bool):
            # Document Intelligence APIs sometimes use zero-based index. Only
            # the explicit index spellings are converted.
            return candidate + 1 if key in {"page_index", "pageIndex"} else candidate
    return fallback


def _page_text(value: dict[str, Any]) -> str | None:
    commentary_only = False
    for key in ("text", "markdown", "content"):
        candidate = value.get(key)
        if isinstance(candidate, str) and candidate.strip():
            cleaned = strip_empty_image_comments(candidate).strip()
            if cleaned:
                return cleaned
            commentary_only = True
    if value.get("is_blank") is True or value.get("isBlank") is True:
        return "[BLANK PAGE]"
    blocks = value.get("blocks")
    if not isinstance(blocks, list):
        return NO_TEXT_EXTRACTED if commentary_only else None
    text_blocks: list[tuple[int, int, str]] = []
    for fallback, block in enumerate(blocks):
        if not isinstance(block, dict):
            return None
        text = block.get("text")
        if not isinstance(text, str) or not text.strip():
            # Parse can include layout-only blocks (for example, images) that
            # have no text. They must not erase the readable text blocks.
            continue
        if (
            str(block.get("layout_tag", "")).lower() in {"figure", "image", "signature"}
            and " ".join(text.lower().split()) == _SIGNATURE_COMMENT
        ):
            continue
        reading_order = block.get("reading_order")
        order = reading_order if isinstance(reading_order, int) and not isinstance(reading_order, bool) else fallback
        cleaned = strip_empty_image_comments(text).strip()
        if cleaned:
            text_blocks.append((order, fallback, cleaned))
    if text_blocks:
        return "\n\n".join(text for _, _, text in sorted(text_blocks))
    # Lack of recognized text does not establish that the physical page is blank.
    return NO_TEXT_EXTRACTED


def parse_result(body: dict[str, Any], job_id: str) -> TypedDocument:
    """Map only verified page-level Parse text; reject ambiguous output safely."""
    documents = body.get("documents")
    if not isinstance(documents, list) or len(documents) != 1 or not isinstance(documents[0], dict):
        raise DocumentTypingProviderError("Sarvam Parse result does not contain one document")
    document = documents[0]
    if document.get("partial") is True:
        raise DocumentTypingProviderError("Sarvam Parse returned a partial document")
    raw_pages = document.get("pages")
    if not isinstance(raw_pages, list) or not raw_pages:
        raise DocumentTypingProviderError("Sarvam Parse result does not contain page text")
    pages: list[TypedPage] = []
    for fallback, raw_page in enumerate(raw_pages, start=1):
        if not isinstance(raw_page, dict):
            raise DocumentTypingProviderError("Sarvam Parse returned an invalid page")
        page_status = raw_page.get("status")
        if isinstance(page_status, str) and page_status.lower() not in {
            "completed",
            "complete",
            "succeeded",
            "success",
        }:
            raise DocumentTypingProviderError("Sarvam Parse returned an incomplete page")
        number = _page_number(raw_page, fallback)
        text = _page_text(raw_page)
        if not isinstance(number, int) or number < 1 or text is None:
            raise DocumentTypingProviderError("Sarvam Parse returned incomplete page text")
        pages.append(TypedPage(page_number=number, text=text))
    if len({page.page_number for page in pages}) != len(pages):
        raise DocumentTypingProviderError("Sarvam Parse returned duplicate pages")
    usage_raw = body.get("usage")
    usage = {key: value for key, value in usage_raw.items() if isinstance(value, int) and not isinstance(value, bool)} if isinstance(usage_raw, dict) else None
    return TypedDocument(pages=tuple(sorted(pages, key=lambda page: page.page_number)), request_id=job_id, usage=usage)
