"""Offline worker regression: eleven sources, publication, duplicate delivery."""

import json
import uuid
from types import SimpleNamespace as NS
from unittest.mock import AsyncMock

import httpx
import pytest

from app.features.summaries import generation
from app.features.summaries.models import SummaryProviderAttempt, SummaryRunStatus
from app.features.summaries.prompt import SIMPLE_PROMPT_VERSION
from app.features.users.models import User
from app.integrations.ai import gemini
from app.integrations.ai.contracts import ProviderName


@pytest.mark.asyncio
async def test_concise_eleven_source_run_publishes_once(monkeypatch):
    user = NS(id=uuid.uuid4())
    run = NS(
        id=uuid.uuid4(), created_by_user_id=user.id,
        status=SummaryRunStatus.running, prompt_version=SIMPLE_PROMPT_VERSION,
        schema_version="case-summary-v3", output_language="en-IN",
        input_tokens=500, source_manifest_hash="a" * 64,
    )
    attempts = []

    def add(attempt):
        attempt.id = uuid.uuid4()
        attempts.append(attempt)

    async def get(model, ident, **kwargs):
        if model is User:
            return user
        if model is SummaryProviderAttempt:
            return next(attempt for attempt in attempts if attempt.id == ident)
        raise AssertionError("Unexpected database read")

    db = NS(
        scalar=AsyncMock(side_effect=[run, None, 0, run, run]),
        get=get, add=add, commit=AsyncMock(),
    )
    records = [{
        "source_document_id": f"doc-{i}", "source_revision_id": f"version-{i}",
        "file_version_id": f"version-{i}", "source_paths": ["page:1"],
        "page_paths": {"page:1": 1}, "source_blocks": {},
        "text": "Read the attached fictional PDF.",
    } for i in range(11)]
    pdfs = [{
        "source_document_id": record["source_document_id"],
        "source_revision_id": record["source_revision_id"], "data": b"synthetic-pdf",
    } for record in records]
    route = NS(provider=ProviderName.gemini, model="gemini-test")
    policy = NS(providers=[route], max_output_tokens=12288,
                max_input_bytes=1_000_000, deadline_seconds=60)
    service = generation.SummaryGenerationService(db)
    service._authorize_and_collect = AsyncMock(return_value=(records, policy))
    service._load_summary_pdf_sources = AsyncMock(return_value=(pdfs, 0))
    service._validate_pricing_and_budget = lambda **kwargs: 12288
    adapter = gemini.GeminiAdapter.__new__(gemini.GeminiAdapter)
    adapter.model = route.model
    monkeypatch.setattr(generation, "GeminiAdapter", lambda **kwargs: adapter)
    requests = []

    def respond(request):
        body = json.loads(request.content)
        requests.append(body)
        config = body["generationConfig"]
        assert config["maxOutputTokens"] == 12288
        schema_text = json.dumps(config["responseJsonSchema"])
        assert '"maxItems"' not in schema_text and '"$ref"' not in schema_text
        assert sum("inlineData" in part for part in body["contents"][0]["parts"]) == 11
        payload = {
            "output_language": "en-IN", "uncertainties": [],
            "sections": [{"name": "documentary_evidence", "findings": [{
                "text": "A fictional record was supplied.", "finding_type": "documentary_evidence",
                "citations": [{
                    "source_document_id": record["source_document_id"],
                    "source_revision_id": record["source_revision_id"],
                    "page_number": 1, "source_paths": ["page:1"],
                    "page_reference_note": "Original page 1",
                }],
            } for record in records]}],
        }
        return httpx.Response(200, json={
            "candidates": [{"finishReason": "STOP", "content": {"parts": [{"text": json.dumps(payload)}]}}],
            "usageMetadata": {"promptTokenCount": 500, "candidatesTokenCount": 700},
            "responseId": "synthetic-summary",
        })

    real_client = httpx.Client
    monkeypatch.setattr(gemini.httpx, "Client", lambda **kwargs: real_client(
        transport=httpx.MockTransport(respond), **kwargs))

    assert await service.execute(run_id=run.id) == "pending_review"
    assert run.status == SummaryRunStatus.pending_review
    assert len(run.result_payload["sections"][0]["findings"]) == 11
    assert run.result_hash and run.provider_request_id == "synthetic-summary"
    assert (run.input_tokens, run.output_tokens) == (500, 700)
    assert attempts[0].status == "succeeded"
    # A duplicate Celery delivery must reuse the saved result, not bill again.
    assert await service.execute(run_id=run.id) == "pending_review"
    assert len(attempts) == len(requests) == 1
