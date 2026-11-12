"""Bounded asynchronous Indian Kanoon API adapter.

It deliberately does not retry billable requests.  A timeout after dispatch has
an unknown billing outcome and must be decided by the durable domain workflow.
"""

from __future__ import annotations

import json
from collections.abc import Mapping
from typing import Any

import httpx

from app.core.config import settings
from app.integrations.indiankanoon.contracts import (
    AuthorityPayload,
    IndianKanoonError,
    IndianKanoonErrorCode,
    IndianKanoonOperation,
    SearchHit,
    SearchRequest,
    SearchResult,
    positive_document_id,
)


class IndianKanoonClient:
    """One fixed-origin client; callers cannot supply an upstream URL."""

    base_url = "https://api.indiankanoon.org"

    def __init__(
        self,
        *,
        client: httpx.AsyncClient | None = None,
        token: str | None = None,
        enabled: bool | None = None,
    ) -> None:
        self._token = (settings.INDIAN_KANOON_API_TOKEN if token is None else token).strip()
        self._enabled = settings.INDIAN_KANOON_ENABLED if enabled is None else enabled
        self._client = client
        self._owns_client = client is None

    async def __aenter__(self) -> "IndianKanoonClient":
        return self

    async def __aexit__(self, *_: object) -> None:
        await self.aclose()

    async def aclose(self) -> None:
        if self._owns_client and self._client is not None:
            await self._client.aclose()
            self._client = None

    async def search(self, request: SearchRequest) -> SearchResult:
        payload = await self._request_json(
            IndianKanoonOperation.search,
            "/search/",
            {"formInput": request.query, "pagenum": str(request.page)},
        )
        return self._parse_search(payload, page=request.page)

    async def document(self, document_id: int) -> AuthorityPayload:
        return await self._authority(IndianKanoonOperation.document, document_id)

    async def metadata(self, document_id: int) -> AuthorityPayload:
        return await self._authority(IndianKanoonOperation.metadata, document_id)

    async def fragment(self, document_id: int, query: str) -> AuthorityPayload:
        normalized = SearchRequest(query=query).query
        return await self._authority(
            IndianKanoonOperation.fragment,
            document_id,
            params={"formInput": normalized},
        )

    async def _authority(
        self,
        operation: IndianKanoonOperation,
        document_id: int,
        *,
        params: Mapping[str, str] | None = None,
    ) -> AuthorityPayload:
        valid_id = positive_document_id(document_id)
        path = {
            IndianKanoonOperation.document: f"/doc/{valid_id}/",
            IndianKanoonOperation.metadata: f"/docmeta/{valid_id}/",
            IndianKanoonOperation.fragment: f"/docfragment/{valid_id}/",
        }[operation]
        return self._parse_authority(
            await self._request_json(operation, path, params), document_id=valid_id
        )

    async def _request_json(
        self,
        operation: IndianKanoonOperation,
        path: str,
        params: Mapping[str, str] | None = None,
    ) -> dict[str, Any]:
        if not self._enabled or not self._token:
            raise IndianKanoonError(
                code=IndianKanoonErrorCode.not_configured,
                message="Indian Kanoon legal research is not configured for this server.",
            )
        client = self._client or self._new_client()
        self._client = client
        try:
            response = await client.post(path, params=params)
        except httpx.TimeoutException as exc:
            raise IndianKanoonError(
                code=IndianKanoonErrorCode.timeout,
                message="Indian Kanoon request timed out; its upstream outcome is unknown.",
                outcome_unknown=True,
            ) from exc
        except httpx.HTTPError as exc:
            raise IndianKanoonError(
                code=IndianKanoonErrorCode.unavailable,
                message="Indian Kanoon is temporarily unavailable.",
                outcome_unknown=True,
            ) from exc
        return self._decode_response(operation, response)

    def _new_client(self) -> httpx.AsyncClient:
        return httpx.AsyncClient(
            base_url=self.base_url,
            timeout=httpx.Timeout(settings.INDIAN_KANOON_TIMEOUT_SECONDS),
            follow_redirects=False,
            headers={
                "Authorization": f"Token {self._token}",
                "Accept": "application/json",
                "User-Agent": "VakilSuite/1.0 legal-research",
            },
        )

    def _decode_response(
        self, operation: IndianKanoonOperation, response: httpx.Response
    ) -> dict[str, Any]:
        if response.status_code >= 400:
            raise self._http_error(response)
        content_length = response.headers.get("content-length")
        if content_length and int(content_length) > settings.INDIAN_KANOON_MAX_RESPONSE_BYTES:
            raise IndianKanoonError(
                code=IndianKanoonErrorCode.response_too_large,
                message="Indian Kanoon response exceeded the permitted size.",
                outcome_unknown=False,
            )
        if len(response.content) > settings.INDIAN_KANOON_MAX_RESPONSE_BYTES:
            raise IndianKanoonError(
                code=IndianKanoonErrorCode.response_too_large,
                message="Indian Kanoon response exceeded the permitted size.",
            )
        content_type = response.headers.get("content-type", "").lower()
        if "json" not in content_type:
            raise IndianKanoonError(
                code=IndianKanoonErrorCode.invalid_response,
                message="Indian Kanoon returned an unexpected response format.",
            )
        try:
            payload = response.json()
        except (json.JSONDecodeError, ValueError) as exc:
            raise IndianKanoonError(
                code=IndianKanoonErrorCode.invalid_response,
                message="Indian Kanoon returned invalid JSON.",
            ) from exc
        if not isinstance(payload, dict):
            raise IndianKanoonError(
                code=IndianKanoonErrorCode.invalid_response,
                message="Indian Kanoon returned an unexpected JSON payload.",
            )
        return payload

    @staticmethod
    def _http_error(response: httpx.Response) -> IndianKanoonError:
        retry_after: int | None = None
        try:
            retry_after = max(0, int(response.headers.get("retry-after", "")))
        except ValueError:
            pass
        mappings = {
            401: (IndianKanoonErrorCode.authentication, "Indian Kanoon authentication failed.", False),
            403: (IndianKanoonErrorCode.forbidden, "Indian Kanoon denied this request.", False),
            402: (IndianKanoonErrorCode.quota_exhausted, "Indian Kanoon usage limit has been reached.", False),
            429: (IndianKanoonErrorCode.rate_limited, "Indian Kanoon rate limit reached.", False),
        }
        code, message, unknown = mappings.get(
            response.status_code,
            (IndianKanoonErrorCode.unavailable, "Indian Kanoon is temporarily unavailable.", response.status_code >= 500),
        )
        return IndianKanoonError(
            code=code,
            message=message,
            status_code=429 if code is IndianKanoonErrorCode.rate_limited else 503,
            retry_after_seconds=retry_after,
            outcome_unknown=unknown,
        )

    @staticmethod
    def _parse_search(payload: dict[str, Any], *, page: int) -> SearchResult:
        raw_hits = payload.get("docs") or payload.get("results") or []
        if not isinstance(raw_hits, list):
            raise IndianKanoonError(
                code=IndianKanoonErrorCode.invalid_response,
                message="Indian Kanoon search response has an invalid result list.",
            )
        hits: list[SearchHit] = []
        for raw in raw_hits[:100]:
            if not isinstance(raw, dict):
                continue
            raw_id = raw.get("tid", raw.get("docid", raw.get("id")))
            try:
                document_id = positive_document_id(int(raw_id))
            except (TypeError, ValueError):
                continue
            title = str(raw.get("title") or raw.get("headline") or "Untitled judgment").strip()
            if not title:
                title = "Untitled judgment"
            hits.append(
                SearchHit(
                    upstream_document_id=document_id,
                    title=title[:1000],
                    headline=_bounded_text(raw.get("headline"), 10_000),
                    court=_bounded_text(raw.get("court"), 500),
                    decision_date=_bounded_text(raw.get("docdate"), 100),
                    citation=_bounded_text(raw.get("citation"), 500),
                )
            )
        return SearchResult(hits=hits, page=page, has_more=bool(payload.get("has_more")))

    @staticmethod
    def _parse_authority(payload: dict[str, Any], *, document_id: int) -> AuthorityPayload:
        raw_text = payload.get("doc") or payload.get("text") or payload.get("fragment")
        text = _bounded_text(raw_text, 1_500_000)
        return AuthorityPayload(
            upstream_document_id=document_id,
            title=_bounded_text(payload.get("title"), 1000),
            court=_bounded_text(payload.get("court"), 500),
            decision_date=_bounded_text(payload.get("docdate"), 100),
            citation=_bounded_text(payload.get("citation"), 500),
            text=text,
            raw=_safe_raw(payload),
        )


def _bounded_text(value: Any, limit: int) -> str | None:
    if value is None:
        return None
    rendered = str(value).strip()
    return rendered[:limit] if rendered else None


def _safe_raw(payload: dict[str, Any]) -> dict[str, Any]:
    """Retain only scalar metadata; full upstream content is handled separately."""
    return {
        str(key)[:100]: value
        for key, value in payload.items()
        if isinstance(value, (str, int, float, bool, type(None))) and key not in {"doc", "text", "fragment"}
    }
