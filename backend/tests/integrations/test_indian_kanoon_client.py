from __future__ import annotations

import httpx
import pytest

from app.integrations.indiankanoon.client import IndianKanoonClient
from app.integrations.indiankanoon.contracts import (
    IndianKanoonError,
    IndianKanoonErrorCode,
    SearchRequest,
)


def _client(handler) -> IndianKanoonClient:
    return IndianKanoonClient(
        client=httpx.AsyncClient(
            base_url="https://api.indiankanoon.org",
            transport=httpx.MockTransport(handler),
        ),
        token="test-token",
        enabled=True,
    )


@pytest.mark.asyncio
async def test_search_uses_fixed_post_path_and_zero_based_page() -> None:
    async def handler(request: httpx.Request) -> httpx.Response:
        assert request.method == "POST"
        assert request.url.path == "/search/"
        assert request.url.params["pagenum"] == "0"
        assert request.url.params["formInput"] == "Section 482 CrPC"
        return httpx.Response(
            200,
            headers={"content-type": "application/json"},
            json={"docs": [{"tid": "123", "title": "Example v State", "court": "Supreme Court"}]},
        )

    client = _client(handler)
    result = await client.search(SearchRequest(query="  Section 482   CrPC ", page=0))
    await client.aclose()
    assert result.hits[0].upstream_document_id == 123
    assert result.hits[0].title == "Example v State"


@pytest.mark.asyncio
async def test_timeout_has_unknown_outcome_and_no_retry() -> None:
    async def handler(_: httpx.Request) -> httpx.Response:
        raise httpx.ReadTimeout("slow")

    client = _client(handler)
    with pytest.raises(IndianKanoonError) as exc_info:
        await client.search(SearchRequest(query="Section 528 BNSS"))
    await client.aclose()
    assert exc_info.value.code is IndianKanoonErrorCode.timeout
    assert exc_info.value.outcome_unknown is True


@pytest.mark.asyncio
async def test_rate_limit_is_sanitized_and_exposes_retry_after() -> None:
    async def handler(_: httpx.Request) -> httpx.Response:
        return httpx.Response(429, headers={"retry-after": "30"})

    client = _client(handler)
    with pytest.raises(IndianKanoonError) as exc_info:
        await client.search(SearchRequest(query="Allahabad High Court"))
    await client.aclose()
    assert exc_info.value.code is IndianKanoonErrorCode.rate_limited
    assert exc_info.value.retry_after_seconds == 30


@pytest.mark.asyncio
async def test_disabled_client_never_dispatches_request() -> None:
    client = IndianKanoonClient(token="", enabled=False)
    with pytest.raises(IndianKanoonError) as exc_info:
        await client.search(SearchRequest(query="Section 482 CrPC"))
    assert exc_info.value.code is IndianKanoonErrorCode.not_configured
