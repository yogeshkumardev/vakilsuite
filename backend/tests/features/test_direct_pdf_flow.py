import json
import uuid
from types import SimpleNamespace as NS
from unittest.mock import AsyncMock, Mock
import pytest
from pypdf._page import PageObject
from app.core.exceptions import ValidationError, ConflictError
from app.features.documents.direct_pdf import digital_pdf
from app.features.documents.source_service import OriginalSourceService
from app.features.documents.page_provenance import pages_with_provenance as pages_editor
from app.features.documents.source_schemas import ReviewSourceEditorRequest
from app.features.jobs.models import JobStatus
from tests.features.test_original_source_text import pdf_bytes
from tests.features.test_source_page_review import ocr_harness
from app.features.documents import source_ocr as ocr


@pytest.fixture(autouse=True)
def inline_thread(monkeypatch):
    async def inline(fn, *args, **kwargs):
        return fn(*args, **kwargs)

    monkeypatch.setattr(ocr.asyncio, "to_thread", inline)


def test_digital_classification_never_extracts_unicode(monkeypatch):
    monkeypatch.setattr(
        PageObject, "extract_text", Mock(side_effect=AssertionError("No extraction"))
    )
    assert digital_pdf(pdf_bytes(["x", ""])) == (True, 2)
    assert digital_pdf(pdf_bytes([""])) == (False, 1)


@pytest.mark.asyncio
async def test_digital_inspection_never_creates_review_state(monkeypatch):
    service = OriginalSourceService(NS(get=AsyncMock(), add=Mock(), commit=AsyncMock()))
    version = NS(
        id=uuid.uuid4(), sha256_hex="a" * 64, detected_mime_type="application/pdf"
    )
    service.authorized = AsyncMock(return_value=(NS(), version))
    monkeypatch.setattr(
        "app.features.documents.source_service.read_original",
        lambda _: pdf_bytes(["x"]),
    )
    result = await service.inspect(uuid.uuid4(), NS())
    assert result.mode == "direct_pdf" and result.pages == [] and result.page_count == 1
    assert result.working_document_id is None
    service.db.add.assert_not_called()
    service.db.get.assert_not_awaited()
    with pytest.raises(ValidationError, match="Digital PDFs"):
        await service.require_scanned(version)


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "pages,version,success",
    [
        (
            [{"page_number": 1, "text": "First"}, {"page_number": 2, "text": "Second"}],
            1,
            True,
        ),
        ([{"page_number": 1, "text": "First"}], 1, False),
        (
            [
                {"page_number": 1, "text": "First"},
                {"page_number": 1, "text": "Duplicate"},
            ],
            1,
            False,
        ),
        (
            [{"page_number": 1, "text": "First"}, {"page_number": 2, "text": "Second"}],
            2,
            False,
        ),
    ],
)
async def test_whole_document_ocr_coverage_and_editor_race(
    monkeypatch, pages, version, success
):
    service, job, source = ocr_harness()
    job.payload["request"]["page_number"] = 0
    source.editor_version = version
    before = source.pages
    monkeypatch.setattr(
        ocr,
        "transcribe",
        Mock(return_value={"text": json.dumps({"pages": pages}), "finish": "STOP"}),
    )
    await service.execute(job.id)
    assert job.status == (JobStatus.succeeded if success else JobStatus.failed)
    assert source.revision_id is None
    if success:
        assert [p["text"] for p in source.pages] == ["First", "Second"]
        assert source.editor_document and source.editor_version == 2
    else:
        assert source.pages == before


@pytest.mark.asyncio
async def test_full_editor_review_requires_current_saved_version(monkeypatch):
    source = NS(
        source_sha256="a" * 64, revision_id=None, editor_version=2, editor_document=None, pages=[{"page_number":1}]
    )
    service = OriginalSourceService(
        NS(get=AsyncMock(return_value=source), commit=AsyncMock())
    )
    service.authorized = AsyncMock(
        return_value=(
            NS(chamber_id=uuid.uuid4()),
            NS(id=uuid.uuid4(), sha256_hex="a" * 64),
        )
    )
    service.require_scanned = AsyncMock()
    service.publish = AsyncMock()
    service.response = AsyncMock(return_value=source)
    monkeypatch.setattr(
        "app.features.documents.source_service.require_capability", AsyncMock()
    )
    body = ReviewSourceEditorRequest(
        expected_source_sha256="a" * 64,
        expected_editor_version=1,
        editor_document=pages_editor([{"page_number": 1, "text": "Reviewed text"}]),
        confirmed=True,
    )
    with pytest.raises(ConflictError):
        await service.save_editor(uuid.uuid4(), NS(id=uuid.uuid4()), body, review=True)
    service.publish.assert_not_awaited()
    body.expected_editor_version = 2
    await service.save_editor(uuid.uuid4(), NS(id=uuid.uuid4()), body, review=True)
    service.publish.assert_awaited_once()
    assert source.mode == "reviewed" and source.editor_version == 3


def test_gemini_summary_attaches_original_bytes(monkeypatch):
    import base64
    import httpx
    from app.integrations.ai import gemini
    from app.integrations.ai.gemini import GeminiAdapter
    from tests.features.test_summary_validation import source_bound_payload

    adapter = object.__new__(GeminiAdapter)
    adapter.model = "gemini-test"
    payload = source_bound_payload()
    captured = {}
    client_options = {}

    def respond(request):
        captured.update(json.loads(request.content))
        assert request.headers["x-goog-api-key"] == "test-key"
        return httpx.Response(200, json={
            "candidates": [{"finishReason": "STOP", "content": {"parts": [{"text": payload.model_dump_json()}]}}],
            "usageMetadata": {"promptTokenCount": 32, "candidatesTokenCount": 16},
            "responseId": "fixture",
        })

    real_client = httpx.Client
    monkeypatch.setattr(gemini.settings, "GEMINI_API_KEY", "test-key")
    monkeypatch.setattr(gemini.settings, "GEMINI_SUMMARY_READ_TIMEOUT_SECONDS", 600)

    def mock_client(**kwargs):
        client_options.update(kwargs)
        return real_client(transport=httpx.MockTransport(respond), **kwargs)

    monkeypatch.setattr(
        gemini.httpx, "Client",
        mock_client,
    )
    output = adapter.summarize_case(
        contents="Reviewed scanned text",
        max_output_tokens=100,
        pdf_sources=[{
            "source_document_id": "original-id",
            "source_revision_id": "version-id",
            "data": b"%PDF-fixture",
        }],
    )
    assert output[0] == payload
    assert output[1:3] == (32, 16)
    parts = captured["contents"][0]["parts"]
    assert parts[0]["text"] == "Reviewed scanned text"
    assert "original-id" in parts[1]["text"]
    assert parts[2]["inlineData"]["mimeType"] == "application/pdf"
    assert base64.b64decode(parts[2]["inlineData"]["data"]) == b"%PDF-fixture"
    assert "mime_type" not in parts[2]["inlineData"]
    assert client_options["timeout"].read == 600
    assert client_options["timeout"].connect == 10


def test_mixed_image_page_stays_in_scan_route():
    import io
    from pypdf import PdfReader, PdfWriter
    from pypdf.generic import DecodedStreamObject, NameObject
    reader = PdfReader(io.BytesIO(pdf_bytes(["Digital", ""])))
    writer = PdfWriter()
    writer.add_page(reader.pages[0])
    page = writer.add_page(reader.pages[1])
    stream = DecodedStreamObject()
    stream.set_data(b"q 100 0 0 100 0 0 cm /Im0 Do Q")
    page[NameObject("/Contents")] = writer._add_object(stream)
    out = io.BytesIO()
    writer.write(out)
    assert digital_pdf(out.getvalue()) == (False, 2)
