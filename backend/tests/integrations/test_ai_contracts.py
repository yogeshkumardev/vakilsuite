"""Offline contract tests for both explicit AI provider adapters."""

from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import pytest
from pydantic import ValidationError

from app.integrations.ai.contracts import (
    DraftInput,
    DraftPayload,
    DraftSection,
    ProviderError,
    ProviderErrorCode,
    ProviderName,
    SummarizeInput,
    SummaryPayload,
    TextBlock,
    TranscribeInput,
    TranscribeResult,
    TranscriptionPayload,
)


def test_transcribe_input_requires_exactly_one_source() -> None:
    with pytest.raises(ValidationError):
        TranscribeInput(source_id="revision-1")
    with pytest.raises(ValidationError):
        TranscribeInput(
            source_id="revision-1", text_prompt="text", file_bytes=b"pdf"
        )


def test_file_input_requires_filename_and_mime_type() -> None:
    with pytest.raises(ValidationError):
        TranscribeInput(source_id="revision-1", file_bytes=b"pdf")
    value = TranscribeInput(
        source_id="revision-1",
        file_bytes=b"pdf",
        filename="sample.pdf",
        mime_type="application/pdf",
    )
    assert value.filename == "sample.pdf"


def test_summary_requires_approved_source_ids() -> None:
    with pytest.raises(ValidationError):
        SummarizeInput(approved_text="Reviewed text", source_ids=[])


def _gemini_adapter() -> tuple[object, MagicMock]:
    from app.integrations.ai.gemini import GeminiAdapter

    client = MagicMock()
    adapter = object.__new__(GeminiAdapter)
    adapter.model = "gemini-test"
    adapter.provider_name = ProviderName.gemini
    adapter._client = client
    return adapter, client


def _gemini_response(parsed: object) -> SimpleNamespace:
    return SimpleNamespace(
        parsed=parsed,
        text=None,
        response_id="gemini-request-1",
        usage_metadata=SimpleNamespace(
            prompt_token_count=100, candidates_token_count=50
        ),
        candidates=[SimpleNamespace(finish_reason=SimpleNamespace(name="STOP"))],
    )


def test_gemini_transcribe_uses_schema_and_max_tokens() -> None:
    adapter, client = _gemini_adapter()
    client.models.generate_content.return_value = _gemini_response(
        TranscriptionPayload(
            blocks=[TextBlock(page_ref="page 1", text="दिनांक", is_uncertain=False)]
        )
    )

    result = adapter.transcribe(
        TranscribeInput(source_id="revision-1", text_prompt="दिनांक")
    )

    assert isinstance(result, TranscribeResult)
    assert result.blocks[0].text == "दिनांक"
    assert result.provider_request_id == "gemini-request-1"
    call = client.models.generate_content.call_args.kwargs
    assert call["config"].response_schema is None
    response_schema = call["config"].response_json_schema
    assert response_schema["additionalProperties"] is False
    assert response_schema["properties"]["blocks"]["type"] == "array"
    assert call["config"].max_output_tokens == 4096


def test_gemini_rejects_hallucinated_summary_source_id() -> None:
    adapter, client = _gemini_adapter()
    client.models.generate_content.return_value = _gemini_response(
        SummaryPayload(
            purpose="Bail",
            parties=[],
            key_dates=[],
            key_amounts=[],
            key_events=[],
            uncertainties=[],
            source_ids=["not-supplied"],
        )
    )
    result = adapter.summarize(
        SummarizeInput(approved_text="Reviewed", source_ids=["revision-1"])
    )
    assert isinstance(result, ProviderError)
    assert result.error_code == ProviderErrorCode.invalid_response
    assert result.retryable is False


def test_gemini_case_summary_uses_strict_source_grounded_schema(monkeypatch) -> None:
    import httpx
    import json
    from app.integrations.ai import gemini
    from app.features.summaries.contracts import CaseSummaryPayload, SummarySection, SummarySectionName

    adapter, _ = _gemini_adapter()
    expected = CaseSummaryPayload(
        output_language="en-IN",
        sections=[SummarySection(name=name) for name in SummarySectionName],
    )
    requests = []

    def respond(request):
        requests.append(json.loads(request.content))
        return httpx.Response(200, json={
            "candidates": [{"finishReason": "STOP", "content": {"parts": [{"text": expected.model_dump_json()}]}}],
            "usageMetadata": {"promptTokenCount": 100, "candidatesTokenCount": 50},
            "responseId": "gemini-request-1",
        })

    real_client = httpx.Client
    monkeypatch.setattr(gemini.httpx, "Client", lambda **kwargs: real_client(
        transport=httpx.MockTransport(respond), **kwargs))
    result = adapter.summarize_case(contents="Approved source record", max_output_tokens=2048)
    assert not isinstance(result, ProviderError)
    payload, input_tokens, output_tokens, request_id = result
    assert payload.output_language == "en-IN"
    assert (input_tokens, output_tokens, request_id) == (100, 50, "gemini-request-1")
    assert len(requests) == 1
    assert requests[0]["generationConfig"]["responseJsonSchema"]["type"] == "object"


def test_gemini_timeout_has_unknown_outcome_and_is_not_blindly_retryable() -> None:
    adapter, client = _gemini_adapter()
    client.models.generate_content.side_effect = TimeoutError("deadline timeout")
    result = adapter.transcribe(
        TranscribeInput(source_id="revision-1", text_prompt="text")
    )
    assert isinstance(result, ProviderError)
    assert result.error_code == ProviderErrorCode.timeout
    assert result.outcome_unknown is True
    assert result.retryable is False
    assert "deadline" not in result.message


def test_gemini_depleted_credits_are_actionable_and_not_retryable() -> None:
    from google.genai import errors

    adapter, _ = _gemini_adapter()
    result = adapter._map_exception(  # type: ignore[attr-defined]
        errors.ClientError(
            402,
            {"error": {"message": "prepayment credits are depleted"}},
        )
    )
    assert result.error_code == ProviderErrorCode.quota_exhausted
    assert result.retryable is False
    assert result.outcome_unknown is False
    assert "prepayment" not in result.message


def _openai_adapter() -> tuple[object, MagicMock]:
    from app.integrations.ai.openai import OpenAIAdapter

    client = MagicMock()
    adapter = object.__new__(OpenAIAdapter)
    adapter.model = "openai-test"
    adapter.provider_name = ProviderName.openai
    adapter._client = client
    return adapter, client


def _openai_response(parsed: object) -> SimpleNamespace:
    return SimpleNamespace(
        output_parsed=parsed,
        id="openai-request-1",
        status="completed",
        usage=SimpleNamespace(input_tokens=75, output_tokens=25),
    )


def test_openai_transcribe_sends_pdf_as_input_file() -> None:
    adapter, client = _openai_adapter()
    client.responses.parse.return_value = _openai_response(
        TranscriptionPayload(blocks=[TextBlock(text="Typed text", page_ref="page 1")])
    )
    result = adapter.transcribe(
        TranscribeInput(
            source_id="revision-1",
            file_bytes=b"%PDF sample",
            filename="sample.pdf",
            mime_type="application/pdf",
        )
    )
    assert isinstance(result, TranscribeResult)
    content = client.responses.parse.call_args.kwargs["input"][1]["content"]
    file_item = next(item for item in content if item["type"] == "input_file")
    assert file_item["filename"] == "sample.pdf"
    assert file_item["file_data"].startswith("data:application/pdf;base64,")
    assert client.responses.parse.call_args.kwargs["text_format"] is TranscriptionPayload


def test_openai_draft_uses_typed_sections() -> None:
    adapter, client = _openai_adapter()
    client.responses.parse.return_value = _openai_response(
        DraftPayload(
            sections=[DraftSection(title="Facts", content="Approved facts only")],
            missing_facts=[],
        )
    )
    result = adapter.draft(
        DraftInput(
            template_name="bail",
            approved_facts={"petitioner": "A"},
            instructions="Draft concisely",
        )
    )
    assert result.sections[0].title == "Facts"  # type: ignore[union-attr]


def test_registry_requires_provider_specific_key() -> None:
    import app.integrations.ai.registry as registry

    with patch.object(registry.settings, "OPENAI_API_KEY", ""):
        with pytest.raises(ValueError, match="OPENAI_API_KEY"):
            registry.get_provider(ProviderName.openai)
