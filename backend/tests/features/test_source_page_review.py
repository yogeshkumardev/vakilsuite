import uuid
from datetime import UTC, datetime, timedelta
from types import SimpleNamespace as NS
from unittest.mock import AsyncMock, Mock
import pytest
from app.features.documents.source_service import OriginalSourceService
from app.features.documents import source_service
from app.features.documents.source_schemas import ReviewOriginalRequest
from app.features.documents.source_ocr import SourceOcrService
from app.features.documents import source_ocr as ocr
from app.features.documents.page_provenance import (
    page_paths,
    pages_with_provenance,
    stabilize_ordered_source_pages,
)
from app.features.jobs.models import JobStatus
from app.core.exceptions import ValidationError


@pytest.fixture(autouse=True)
def inline_thread(monkeypatch):
    async def inline(fn, *args, **kwargs):
        return fn(*args, **kwargs)

    monkeypatch.setattr(ocr.asyncio, "to_thread", inline)


@pytest.mark.asyncio
async def test_review_cannot_overwrite_native_pages(monkeypatch):
    source = NS(
        source_sha256="a" * 64,
        editor_document=None,
        editor_version=1,
        revision_id=None,
        pages=[
            {"page_number": 1, "native": True, "text": "native original"},
            {"page_number": 2, "native": False, "text": "draft OCR"},
        ],
    )
    service = OriginalSourceService(
        NS(get=AsyncMock(return_value=source), commit=AsyncMock())
    )
    service.authorized = AsyncMock(
        return_value=(
            NS(chamber_id=uuid.uuid4()),
            NS(id=uuid.uuid4(), sha256_hex="a" * 64, detected_mime_type="image/png"),
        )
    )
    service.publish = AsyncMock()
    service.response = AsyncMock(return_value=source)
    monkeypatch.setattr(
        "app.features.documents.source_service.require_capability", AsyncMock()
    )
    user = NS(id=uuid.uuid4())
    body = ReviewOriginalRequest(
        expected_source_sha256="a" * 64,
        page_texts={1: "forged native", 2: "corrected"},
        confirmed=True,
    )
    with pytest.raises(ValidationError):
        await service.review(uuid.uuid4(), user, body)
    service.publish.assert_not_awaited()
    body.page_texts = {2: "lawyer corrected transcription"}
    result = await service.review(uuid.uuid4(), user, body)
    assert result.pages[0]["text"] == "native original"
    assert result.pages[1]["text"] == "lawyer corrected transcription"
    assert result.reviewed_by == user.id and result.mode == "reviewed"
    service.publish.assert_awaited_once()


def ocr_harness():
    version = NS(id=uuid.uuid4())
    doc = NS(id=uuid.uuid4())
    job = NS(
        id=uuid.uuid4(),
        owner_id=uuid.uuid4(),
        status=JobStatus.queued,
        attempt_count=0,
        payload={
            "document_id": str(doc.id),
            "request": {"page_number": 2, "expected_source_sha256": "a" * 64},
            "quote": {"model": "fixture", "editor_version": 1},
        },
        result_summary=None,
    )
    source = NS(
        editor_document=None,
        editor_version=1,
        revision_id=None,
        pages=[
            {"page_number": 1, "native": True, "text": "native"},
            {"page_number": 2, "native": False, "text": ""},
        ],
    )

    async def get(cls, ident, **kwargs):
        return (
            job
            if cls is ocr.Job
            else source
            if cls is ocr.OriginalTextSource
            else NS(id=job.owner_id)
        )

    db = NS(
        scalar=AsyncMock(return_value=job),
        get=AsyncMock(side_effect=get),
        commit=AsyncMock(),
        rollback=AsyncMock(),
    )
    service = SourceOcrService(db)
    service.prepare = AsyncMock(
        return_value=(doc, version, b"page", job.payload["quote"])
    )
    service.sources.authorized = AsyncMock()
    return service, job, source


def sarvam_harness():
    service, job, source = ocr_harness()
    job.payload["request"]["page_number"] = 0
    job.payload["quote"].update(provider="sarvam", deadline_seconds=300)
    job.payload["provider_job"] = {"provider": "sarvam", "job_id": "existing-job"}
    job.started_at = datetime.now(UTC).replace(tzinfo=None) - timedelta(hours=1)
    job.attempt_count = 1
    return service, job, source


@pytest.mark.asyncio
async def test_stored_sarvam_table_is_published_with_plain_source_text_and_page_mapping(monkeypatch):
    service, job, source = sarvam_harness()
    job.payload["response"] = {"provider": "sarvam", "document": {"pages": [
        {"page_number": 1, "text": "First typed page"},
        {"page_number": 2, "text": '<table><tr><th>नाम</th><th>पता</th></tr>'
         '<tr><td>राम</td><td>भारत</td></tr></table>'},
    ]}}
    monkeypatch.setattr(ocr, "SarvamParseClient", Mock(side_effect=AssertionError("No provider IO")))
    monkeypatch.setattr(ocr, "transcribe", Mock(side_effect=AssertionError("No Gemini IO")))

    result = await service.execute(job.id)

    assert result.failure_code is None
    assert job.status == JobStatus.succeeded
    assert source.pages[1]["text"] == "नाम\nपता\nराम\nभारत"
    assert source.editor_document["editorState"]["root"]["children"][1]["children"][0]["type"] == "table"
    assert set(page_paths(source.editor_document, 2, require_complete=True).values()) == {1, 2}
    # Keep provider response intact for audit/recovery, independently of editor formatting.
    assert "<table>" in job.payload["response"]["document"]["pages"][1]["text"]


@pytest.mark.asyncio
async def test_completed_sarvam_after_deadline_publishes_to_lexical_without_resubmission(monkeypatch):
    from app.integrations.document_typing.sarvam import parse_result

    service, job, source = sarvam_harness()
    client = Mock()
    client.status.return_value = {"status": "completed"}
    client.results.return_value = parse_result({"documents": [{"pages": [
        {"page_num": n, "status": "completed", "blocks": [{"reading_order": 0, "text": text}]}
        for n, text in [(1, "First typed page"), (2, "Second typed page")]
    ]}]}, "existing-job")
    monkeypatch.setattr(ocr, "SarvamParseClient", lambda: client)
    gemini = Mock(side_effect=AssertionError("No paid fallback"))
    monkeypatch.setattr(ocr, "transcribe", gemini)

    result = await service.execute(job.id)

    assert result.failure_code is None
    assert job.status == JobStatus.succeeded
    assert source.editor_version == 2
    assert source.editor_document == pages_with_provenance(source.pages)
    assert [p["text"] for p in source.pages] == ["First typed page", "Second typed page"]
    client.submit_parse.assert_not_called()
    client.status.assert_called_once_with("existing-job")
    client.results.assert_called_once_with("existing-job")
    gemini.assert_not_called()


@pytest.mark.asyncio
@pytest.mark.parametrize("changed_editor", [False, True])
async def test_stored_sarvam_response_publishes_without_provider_io_and_preserves_edits(monkeypatch, changed_editor):
    service, job, source = sarvam_harness()
    job.payload["response"] = {"provider": "sarvam", "document": {"pages": [
        {"page_number": 1, "text": "First typed page"},
        {"page_number": 2, "text": "Second typed page"},
    ]}}
    if changed_editor:
        source.editor_version = 2
        source.editor_document = pages_with_provenance(source.pages)
    original_editor = source.editor_document
    monkeypatch.setattr(ocr, "SarvamParseClient", Mock(side_effect=AssertionError("No provider IO")))
    monkeypatch.setattr(ocr, "transcribe", Mock(side_effect=AssertionError("No Gemini IO")))

    result = await service.execute(job.id)

    if changed_editor:
        assert result.failure_code == "OCR_OUTPUT_STALE"
        assert source.editor_document == original_editor
    else:
        assert result.failure_code is None
        assert job.status == JobStatus.succeeded
        assert source.editor_document == pages_with_provenance(source.pages)


@pytest.mark.asyncio
async def test_unfinished_sarvam_after_deadline_stops_polling_without_resubmission(monkeypatch):
    service, job, _ = sarvam_harness()
    client = Mock()
    client.status.return_value = {"status": "processing"}
    monkeypatch.setattr(ocr, "SarvamParseClient", lambda: client)

    result = await service.execute(job.id)

    assert result.failure_code == "OCR_OUTCOME_UNKNOWN_NO_RETRY"
    assert job.status == JobStatus.failed
    client.status.assert_called_once_with("existing-job")
    client.results.assert_not_called()
    client.submit_parse.assert_not_called()


@pytest.mark.asyncio
async def test_unknown_paid_outcome_never_retries(monkeypatch):
    service, job, _ = ocr_harness()
    call = Mock(side_effect=TimeoutError())
    monkeypatch.setattr(ocr, "transcribe", call)
    await service.execute(job.id)
    await service.execute(job.id)
    assert call.call_count == 1 and job.status == JobStatus.failed
    assert job.error_message == "OCR_OUTCOME_UNKNOWN_NO_RETRY"


@pytest.mark.asyncio
async def test_gemini_400_is_a_persisted_terminal_failure(monkeypatch, caplog):
    from google.genai.errors import APIError

    service, job, _ = ocr_harness()
    provider = Mock(
        side_effect=APIError(
            400,
            {
                "error": {
                    "message": "Invalid generateContent request",
                    "details": [
                        {
                            "reason": "INVALID_ARGUMENT",
                            "contents": "document words must never be logged",
                        }
                    ],
                }
            },
        )
    )
    monkeypatch.setattr(ocr, "transcribe", provider)

    result = await service.execute(job.id)

    assert result.failure_code == "OCR_REQUEST_REJECTED"
    assert job.status == JobStatus.failed
    assert job.error_message == "OCR_REQUEST_REJECTED"
    assert provider.call_count == 1
    assert "status=400" in caplog.text
    assert "INVALID_ARGUMENT" in caplog.text
    assert "document words must never be logged" not in caplog.text


@pytest.mark.asyncio
async def test_duplicate_delivery_of_a_failed_job_is_not_a_success(monkeypatch):
    service, job, _ = ocr_harness()
    job.status = JobStatus.failed
    job.error_message = "OCR_REQUEST_REJECTED"
    transcribe = Mock()
    monkeypatch.setattr(ocr, "transcribe", transcribe)

    result = await service.execute(job.id)

    assert result.failure_code == "OCR_REQUEST_REJECTED"
    transcribe.assert_not_called()


@pytest.mark.asyncio
async def test_ocr_preserves_native_pages_and_does_not_approve(monkeypatch):
    service, job, source = ocr_harness()
    call = Mock(
        return_value={"text": '{"text":"Unreviewed scanned text"}', "finish": "STOP"}
    )
    monkeypatch.setattr(ocr, "transcribe", call)
    await service.execute(job.id)
    await service.execute(job.id)
    assert call.call_count == 1 and job.status == JobStatus.succeeded
    assert source.revision_id is None
    assert source.pages[0]["text"] == "native"
    assert source.pages[1]["text"] == "Unreviewed scanned text"
    assert source.pages[1]["reason"] == "ocr_unreviewed"


@pytest.mark.asyncio
async def test_full_document_ocr_persists_editor_document_for_review(monkeypatch):
    service, job, source = ocr_harness()
    job.payload["request"]["page_number"] = 0
    source.pages = [
        {"page_number": 1, "native": False, "text": ""},
        {"page_number": 2, "native": False, "text": ""},
    ]
    monkeypatch.setattr(
        ocr,
        "transcribe",
        Mock(
            return_value={
                "text": (
                    '{"pages":[{"page_number":1,"text":"पहला पृष्ठ"},'
                    '{"page_number":2,"text":"second page"}]}'
                ),
                "finish": "STOP",
            }
        ),
    )

    result = await service.execute(job.id)

    assert result.failure_code is None
    assert job.status == JobStatus.succeeded
    assert source.editor_version == 2
    assert source.pages == [
        {
            "page_number": 1,
            "native": False,
            "text": "पहला पृष्ठ",
            "reason": "ocr_unreviewed",
        },
        {
            "page_number": 2,
            "native": False,
            "text": "second page",
            "reason": "ocr_unreviewed",
        },
    ]
    editor = source.editor_document["editorState"]["root"]["children"]
    assert [page["type"] for page in editor] == ["source-page", "source-page"]
    assert editor[0]["children"][0]["children"][0]["text"] == "पहला पृष्ठ"


def test_whole_document_review_restores_corrupted_system_page_labels():
    editor = pages_with_provenance(
        [
            {"page_number": 1, "text": "first page"},
            {"page_number": 2, "text": "second page"},
            {"page_number": 3, "text": "third page"},
        ]
    )
    pages = editor["editorState"]["root"]["children"]
    pages[1]["pageNumber"] = 1
    pages[2]["pageNumber"] = 1

    stabilized = stabilize_ordered_source_pages(editor, 3)

    assert [page["pageNumber"] for page in pages] == [1, 1, 1]
    assert [
        page["pageNumber"]
        for page in stabilized["editorState"]["root"]["children"]
    ] == [1, 2, 3]
    assert set(page_paths(stabilized, 3, require_complete=True).values()) == {1, 2, 3}


@pytest.mark.asyncio
async def test_provider_truncation_never_becomes_review_text(monkeypatch):
    service, job, source = ocr_harness()
    monkeypatch.setattr(
        ocr,
        "transcribe",
        Mock(return_value={"text": '{"text":"partial"}', "finish": "MAX_TOKENS"}),
    )
    await service.execute(job.id)
    assert job.status == JobStatus.failed
    assert job.error_message == "OCR_OUTPUT_TRUNCATED"
    assert job.payload["failure_diagnostic"] == {
        "phase": "finish_reason",
        "exception_type": "OcrOutputRejected",
    }
    assert source.pages[1]["text"] == ""


def test_transcribe_uses_configured_low_thinking_for_complete_ocr_output(monkeypatch):
    sent = {}

    class Response:
        is_error = False
        status_code = 200

        @staticmethod
        def json():
            return {
                "candidates": [{"content": {"parts": [{"text": '{"text":"typed"}'}]}}],
                "usageMetadata": {},
            }

    class Client:
        def __init__(self, **_kwargs):
            pass

        def __enter__(self):
            return self

        def __exit__(self, *_args):
            return False

        def post(self, _url, *, headers, json):
            assert "x-goog-api-key" in headers
            sent.update(json)
            return Response()

    monkeypatch.setattr(ocr.httpx, "Client", Client)

    ocr.transcribe(
        b"fixture",
        {
            "mime_type": "application/pdf",
            "page_number": 1,
            "model": "gemini-3.6-flash",
            "deadline_seconds": 30,
            "max_output_tokens": 1024,
            "thinking_level": "minimal",
        },
    )

    assert sent["generationConfig"]["thinkingConfig"] == {"thinkingLevel": "minimal"}


@pytest.mark.asyncio
async def test_source_response_queries_generic_json_job_payload():
    # Job.payload is generic JSON (not a JSONB .astext comparator).
    source = NS(
        file_version_id=uuid.uuid4(),
        source_sha256="a" * 64,
        editor_document=None,
        editor_version=1,
        revision_id=None,
        mode="needs_review",
        pages=[
            {
                "page_number": 1,
                "native": False,
                "text": "",
                "reason": "no_readable_text",
            }
        ],
    )
    db = NS(scalars=AsyncMock(return_value=[]))
    result = await OriginalSourceService(db).response(source)
    assert result.pages[0].ocr_status is None
    from sqlalchemy.dialects import postgresql

    query = db.scalars.call_args.args[0]
    assert "original_page_ocr" in str(
        query.compile(
            dialect=postgresql.dialect(), compile_kwargs={"literal_binds": True}
        )
    )


@pytest.mark.asyncio
async def test_ocr_status_uses_database_state_without_reading_r2(monkeypatch):
    document = NS(id=uuid.uuid4())
    version = NS(id=uuid.uuid4())
    job = NS(
        id=uuid.uuid4(),
        status=JobStatus.running,
        error_message=None,
        attempt_count=1,
        started_at=object(),
        payload={"document_id": str(document.id)},
    )
    db = NS(scalar=AsyncMock(return_value=job))
    service = OriginalSourceService(db)
    service.authorized = AsyncMock(return_value=(document, version))
    read = Mock(side_effect=AssertionError("status polling must not read R2"))
    monkeypatch.setattr(source_service, "read_original", read)

    result = await service.ocr_status(document.id, NS(id=uuid.uuid4()))

    assert result.job_id == job.id
    assert result.status == "running"
    assert result.attempt_count == 1
    service.authorized.assert_awaited_once()
    db.scalar.assert_awaited_once()
    read.assert_not_called()


@pytest.mark.asyncio
async def test_late_response_cannot_replace_new_attempt(monkeypatch):
    service, job, source = ocr_harness()

    def late_response(*args):
        # The interrupted attempt returns after a new explicit attempt starts.
        job.attempt_count += 1
        return {"text": '{"text":"old late result"}', "finish": "STOP"}

    monkeypatch.setattr(ocr, "transcribe", late_response)
    await service.execute(job.id)
    assert "response" not in job.payload
    assert source.editor_document is None
    assert job.status == JobStatus.running
