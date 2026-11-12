import base64
import io
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest
from pypdf import PdfReader, PdfWriter
from app.features.documents import source_ocr as ocr
from app.core.exceptions import ValidationError


def test_count_uses_multimodal_contents_with_generation_prompt(monkeypatch):
    client = MagicMock()
    client.__enter__.return_value = client
    client.models.count_tokens.return_value = SimpleNamespace(total_tokens=4000)
    monkeypatch.setattr(ocr.genai, "Client", lambda **kw: client)
    quote = {"model": "test-model", "mime_type": "application/pdf", "page_number": 0}
    assert ocr.count_input_tokens(b"pdf", quote) == 5024
    request = client.models.count_tokens.call_args.kwargs
    assert request["model"] == "test-model"
    assert request["contents"] == ocr.transcription_contents(b"pdf", quote)
    assert not client.models.generate_content.called


def test_normalize_pdf_for_gemini_rewrites_pages_without_changing_count():
    source = io.BytesIO()
    writer = PdfWriter()
    writer.add_blank_page(width=72, height=72)
    writer.add_blank_page(width=72, height=72)
    writer.write(source)

    normalized = ocr.normalize_pdf_for_gemini(source.getvalue())

    assert normalized.startswith(b"%PDF-")
    assert len(PdfReader(io.BytesIO(normalized), strict=True).pages) == 2


def test_transcription_request_uses_canonical_inline_data_payload(monkeypatch):
    response = MagicMock()
    response.is_error = False
    response.json.return_value = {
        "responseId": "fixture",
        "candidates": [
            {"finishReason": "STOP", "content": {"parts": [{"text": "typed"}]}}
        ],
        "usageMetadata": {
            "promptTokenCount": 1,
            "candidatesTokenCount": 1,
            "thoughtsTokenCount": 0,
        },
    }
    client = MagicMock()
    client.__enter__.return_value = client
    client.post.return_value = response
    monkeypatch.setattr(ocr.httpx, "Client", lambda **kw: client)

    ocr.transcribe(
        b"fixture-pdf",
        {
            "model": "test-model",
            "mime_type": "application/pdf",
            "page_number": 0,
            "max_output_tokens": 1024,
            "deadline_seconds": 60,
        },
    )

    request = client.post.call_args.kwargs
    payload = request["json"]
    inline = payload["contents"][0]["parts"][0]["inlineData"]
    assert inline["mimeType"] == "application/pdf"
    assert "mime_type" not in inline
    assert base64.b64decode(inline["data"]) == b"fixture-pdf"
    assert "mediaResolution" not in payload
    assert "automaticFunctionCalling" not in payload["generationConfig"]
    schema = payload["generationConfig"]["responseJsonSchema"]
    assert "$defs" not in schema
    assert "$ref" not in schema
    page_schema = schema["properties"]["pages"]["items"]
    assert page_schema["propertyOrdering"] == ["page_number", "text"]
    assert page_schema["properties"]["text"] == {"type": "string"}
    assert (
        ocr.transcribe(
            b"fixture-pdf",
            {
                "model": "models/test-model",
                "mime_type": "application/pdf",
                "page_number": 0,
                "max_output_tokens": 1024,
                "deadline_seconds": 60,
            },
        )["text"]
        == "typed"
    )
    assert client.post.call_args.args[0].endswith("/models/test-model:generateContent")


@pytest.mark.parametrize("count", [None, 0, -1])
def test_missing_count_blocks_typing(monkeypatch, count):
    client = MagicMock()
    client.__enter__.return_value = client
    client.models.count_tokens.return_value = SimpleNamespace(total_tokens=count)
    monkeypatch.setattr(ocr.genai, "Client", lambda **kw: client)
    with pytest.raises(ValidationError, match="Could not estimate"):
        ocr.count_input_tokens(
            b"pdf", {"model": "test", "mime_type": "application/pdf", "page_number": 0}
        )
    assert not client.models.generate_content.called


@pytest.mark.parametrize("pages", [1, 2, 12, 20])
def test_page_budget_reserves_input_and_output_without_fixed_five_rupee_cap(pages):
    identity = {
        "budget_paise": pages * 50,
        "page_count": pages,
        "input_rate": 9000,
        "output_rate": 45000,
        "output_ceiling": 32768,
    }
    limit, cost = ocr.output_budget(identity, 560 * pages + 1024)
    assert limit >= 512 * pages
    assert cost <= pages * 50
    if pages == 12:
        assert cost > 500


def test_cannot_afford_readable_output_stops_before_generation():
    with pytest.raises(ValidationError, match="cannot fit"):
        ocr.output_budget(
            {
                "budget_paise": 50,
                "page_count": 1,
                "input_rate": 9000,
                "output_rate": 45000,
                "output_ceiling": 32768,
            },
            100_000,
        )


@pytest.mark.asyncio
async def test_worker_revalidation_uses_persisted_quote_without_provider(monkeypatch):
    from unittest.mock import AsyncMock
    from datetime import date

    async def inline(fn, *args):
        return fn(*args)

    monkeypatch.setattr(ocr.asyncio, "to_thread", inline)
    from app.core.config import settings
    import uuid

    source = SimpleNamespace(
        revision_id=None,
        source_sha256="a" * 64,
        editor_version=1,
        pages=[{"page_number": 1, "native": False}],
    )
    version = SimpleNamespace(
        id=uuid.uuid4(), sha256_hex="a" * 64, detected_mime_type="image/png"
    )
    doc = SimpleNamespace(chamber_id=uuid.uuid4())
    service = ocr.SourceOcrService(SimpleNamespace(get=AsyncMock(return_value=source)))
    service.sources.authorized = AsyncMock(return_value=(doc, version))
    task = SimpleNamespace(
        providers=[
            SimpleNamespace(provider=SimpleNamespace(value="gemini"), model="fixture")
        ],
        max_input_bytes=100,
        max_output_tokens=32768,
        run_budget_paise=25000,
        transcription_budget_paise_per_page=50,
        deadline_seconds=300,
    )
    monkeypatch.setattr(ocr, "require_capability", AsyncMock())
    monkeypatch.setattr(
        ocr,
        "get_policy_output",
        AsyncMock(
            return_value=SimpleNamespace(
                version=2, capabilities=SimpleNamespace(indexing=True)
            )
        ),
    )
    monkeypatch.setattr(
        ocr, "resolve_authorized_task_policy", AsyncMock(return_value=task)
    )
    monkeypatch.setattr(ocr, "read_original", lambda version: b"fixture")
    counter = AsyncMock(return_value=1600)
    monkeypatch.setattr(ocr, "cached_input_tokens", counter)
    for name, value in {
        "GEMINI_MODEL": "fixture",
        "GEMINI_ALLOWED_MODELS": [],
        "GEMINI_API_KEY": "unit-test-only",
        "DRAFT_PRICING_MODEL": "fixture",
        "DRAFT_PRICING_VALID_UNTIL": date.today().isoformat(),
        "DRAFT_INPUT_PAISE_PER_MILLION": 9000,
        "DRAFT_OUTPUT_PAISE_PER_MILLION": 45000,
    }.items():
        monkeypatch.setattr(settings, name, value)
    user = SimpleNamespace(id=uuid.uuid4())
    body = ocr.OcrPageRequest(page_number=0, expected_source_sha256="a" * 64)
    *_, quote = await service.prepare(uuid.uuid4(), user, body)
    counter.assert_awaited_once()
    counter.reset_mock()
    *_, fresh = await service.prepare(uuid.uuid4(), user, body, stored_quote=quote)
    assert fresh == quote
    counter.assert_not_awaited()
    source.editor_version += 1
    from app.core.exceptions import ConflictError

    with pytest.raises(ConflictError):
        await service.prepare(uuid.uuid4(), user, body, stored_quote=quote)
    counter.assert_not_awaited()


@pytest.mark.asyncio
async def test_quote_submit_reuses_count_and_never_caches_document(monkeypatch):
    from unittest.mock import AsyncMock
    import redis.asyncio

    values = {}
    cache = MagicMock()
    cache.__aenter__ = AsyncMock(return_value=cache)
    cache.__aexit__ = AsyncMock(return_value=False)
    lock = MagicMock()
    lock.__aenter__ = AsyncMock()
    lock.__aexit__ = AsyncMock(return_value=False)
    cache.lock.return_value = lock
    cache.get = AsyncMock(side_effect=lambda key: values.get(key))

    async def save(key, value, ex):
        assert ex == 900
        assert isinstance(value, int)
        values[key] = value

    cache.set = AsyncMock(side_effect=save)
    monkeypatch.setattr(redis.asyncio.Redis, "from_url", lambda *a, **kw: cache)

    async def inline(fn, *args):
        return fn(*args)

    monkeypatch.setattr(ocr.asyncio, "to_thread", inline)
    counter = MagicMock(return_value=2000)
    monkeypatch.setattr(ocr, "count_input_tokens", counter)
    for _ in range(2):
        assert (
            await ocr.cached_input_tokens(
                b"private-original", {"source_sha256": "a" * 64}, "chamber-a"
            )
            == 2000
        )
    counter.assert_called_once()
    await ocr.cached_input_tokens(
        b"private-original", {"source_sha256": "a" * 64}, "chamber-b"
    )
    assert counter.call_count == 2


@pytest.mark.parametrize("page", [0, 1])
def test_printed_only_prompt_preserves_page_coverage(page):
    prompt = ocr.transcription_contents(
        b"pdf", {"mime_type": "application/pdf", "page_number": page}
    )[1]
    assert "Ignore all handwritten text" in prompt
    assert "stamps and seals" in prompt
    assert "[NO PRINTED TEXT]" in prompt


def test_only_pre_dispatch_failure_can_be_restarted():
    from app.features.jobs.models import JobStatus
    from app.core.exceptions import ConflictError

    job = SimpleNamespace(
        status=JobStatus.failed,
        error_message="OCR_SOURCE_OR_POLICY_CHANGED",
        attempt_count=0,
        started_at=None,
        payload={"quote": {"old": True}},
        completed_at="old",
    )
    assert ocr.can_restart_before_dispatch(job)
    ocr.restart_before_dispatch(job, {"new": True}, {"page_number": 0})
    assert job.status == JobStatus.queued and job.error_message is None
    assert job.payload["preflight_failures"][0]["quote"] == {"old": True}
    job.status = JobStatus.failed
    job.error_message = "OCR_SOURCE_OR_POLICY_CHANGED"
    job.attempt_count = 1
    assert not ocr.can_restart_before_dispatch(job)
    with pytest.raises(ConflictError):
        ocr.restart_before_dispatch(job, {}, {})
    job.attempt_count = 0
    job.payload["response"] = {}
    assert not ocr.can_restart_before_dispatch(job)


@pytest.mark.parametrize(
    "status,code",
    [
        (400, "OCR_REQUEST_REJECTED"),
        (403, "OCR_PROVIDER_AUTH"),
        (429, "OCR_PROVIDER_TRANSIENT"),
        (500, "OCR_PROVIDER_TRANSIENT"),
    ],
)
def test_provider_failure_classification_hides_sensitive_details(status, code):
    from google.genai.errors import APIError

    actual, diagnostic = ocr.provider_failure(
        APIError(status, {"error": {"message": "private prompt or key"}})
    )
    assert actual == code
    assert diagnostic["http_status"] == status
    assert "private" not in str(diagnostic)


def test_unknown_retry_requires_attempt_specific_consent_and_preserves_history():
    from app.features.jobs.models import JobStatus
    from app.core.exceptions import ConflictError

    job = SimpleNamespace(
        status=JobStatus.failed,
        attempt_count=1,
        error_message="OCR_OUTCOME_UNKNOWN_NO_RETRY",
        payload={"quote": {"old": True}},
        result_summary=None,
    )
    assert ocr.retry_may_charge(job)
    for stale in [None, 0]:
        with pytest.raises(ConflictError):
            ocr.restart_failed_attempt(job, {}, {}, stale)
    ocr.restart_failed_attempt(job, {"new": True}, {"page_number": 0}, 1)
    assert job.status == JobStatus.queued and job.attempt_count == 1
    assert job.max_attempts == 2 + ocr.settings.OCR_TRANSIENT_MAX_RETRIES
    assert job.payload["attempt_history"][0]["error"] == "OCR_OUTCOME_UNKNOWN_NO_RETRY"
    with pytest.raises(ConflictError):
        ocr.restart_failed_attempt(job, {}, {}, 1)


@pytest.mark.asyncio
@pytest.mark.parametrize("state", ["queued", "running", "succeeded"])
async def test_duplicate_quote_and_submit_never_prepare_or_call_provider(state):
    from unittest.mock import AsyncMock
    from app.features.jobs.models import JobStatus

    job = SimpleNamespace(
        status=JobStatus(state),
        payload={"quote": {"model": "existing", "estimated_reservation_paise": 100}},
        attempt_count=1,
    )
    service = ocr.SourceOcrService(SimpleNamespace())
    service.existing_request = AsyncMock(return_value=(None, None, job))
    service.prepare = AsyncMock(
        side_effect=AssertionError(
            "Duplicate must not count tokens/read original again"
        )
    )
    body = ocr.OcrSubmitRequest(
        page_number=0, expected_source_sha256="a" * 64, expected_quote_hash="b" * 64
    )
    for _ in range(3):
        assert await service.quote("doc", "user", body) == job.payload["quote"]
        assert (await service.submit("doc", "user", body)).job is job
    service.prepare.assert_not_awaited()


@pytest.mark.asyncio
async def test_old_submit_cannot_restart_failed_attempt_implicitly():
    from unittest.mock import AsyncMock
    from app.features.jobs.models import JobStatus

    job = SimpleNamespace(status=JobStatus.failed, attempt_count=0)
    service = ocr.SourceOcrService(SimpleNamespace())
    service.existing_request = AsyncMock(return_value=(None, None, job))
    service.prepare = AsyncMock()
    body = ocr.OcrSubmitRequest(
        page_number=0, expected_source_sha256="a" * 64, expected_quote_hash="b" * 64
    )
    assert (await service.submit("doc", "user", body)).job is job
    service.prepare.assert_not_awaited()
