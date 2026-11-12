"""Offline contract tests for authenticated short-turn dictation."""

from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest
from sarvamai.core.api_error import ApiError

from app.core.config import settings
from app.core.exceptions import (
    AppError,
    ConflictError,
    FileTooLargeError,
    ValidationError,
)
from app.features.dictation.schemas import DictationLanguage, DictationMode
from app.features.dictation.service import (
    DictationRequestGate,
    DictationService,
    validate_audio,
)
from app.integrations.speech.contracts import (
    SpeechProviderError,
)
from app.integrations.speech.sarvam import SarvamSpeechTranscriber


def test_audio_validation_normalizes_browser_mime_and_filename() -> None:
    name, mime = validate_audio(
        audio=b"\x1aE\xdf\xa3webm-audio",
        filename="../../dictation.webm",
        content_type="audio/webm; codecs=opus",
    )
    assert name == "dictation.webm"
    assert mime == "audio/webm"


def test_audio_validation_rejects_unsupported_and_oversized_input() -> None:
    with pytest.raises(ValidationError, match="Unsupported"):
        validate_audio(audio=b"audio", filename="clip.txt", content_type="text/plain")
    with (
        patch.object(settings, "SARVAM_STT_MAX_BYTES", 4),
        pytest.raises(FileTooLargeError),
    ):
        validate_audio(audio=b"12345", filename="clip.wav", content_type="audio/wav")


def test_audio_validation_rejects_spoofed_audio_mime() -> None:
    with pytest.raises(ValidationError, match="content"):
        validate_audio(
            audio=b"not really an audio file",
            filename="clip.m4a",
            content_type="audio/mp4",
        )


def test_sarvam_adapter_uses_bounded_request_without_retries() -> None:
    client = MagicMock()
    client.speech_to_text.transcribe.return_value = SimpleNamespace(
        transcript="माननीय court",
        language_code="hi-IN",
        request_id="provider-1",
    )
    adapter = SarvamSpeechTranscriber(client=client, model="saaras:v4")

    result = adapter.transcribe(
        SimpleNamespace(
            audio=b"audio",
            filename="clip.webm",
            content_type="audio/webm",
            language_code="hi-IN",
            mode="codemix",
        )
    )

    assert result.transcript == "माननीय court"
    call = client.speech_to_text.transcribe.call_args.kwargs
    assert call["file"] == ("clip.webm", b"audio", "audio/webm")
    assert call["request_options"]["max_retries"] == 0


def test_sarvam_adapter_sanitizes_provider_rate_limit() -> None:
    adapter = SarvamSpeechTranscriber(client=MagicMock(), model="saaras:v4")
    error = adapter._map_error(ApiError(status_code=429, body={"secret": "detail"}))
    assert error.code == "DICTATION_QUOTA_EXHAUSTED"
    assert error.status_code == 429
    assert "secret" not in error.message


def test_service_maps_provider_error_to_stable_app_error() -> None:
    transcriber = MagicMock()
    transcriber.transcribe.side_effect = SpeechProviderError(
        code="DICTATION_TIMEOUT",
        message="Transcription timed out. Check before retrying.",
        status_code=503,
        outcome_unknown=True,
    )
    service = DictationService(transcriber)

    with pytest.raises(AppError) as exc_info:
        service.transcribe(
            audio=b"\x00\x00\x00\x18ftypM4A audio",
            filename="clip.m4a",
            content_type="audio/mp4",
            language_code=DictationLanguage.hindi,
            mode=DictationMode.codemix,
        )
    assert exc_info.value.code == "DICTATION_TIMEOUT"
    assert exc_info.value.details == {"outcome_unknown": True}


@pytest.mark.asyncio
async def test_request_gate_rejects_second_active_request() -> None:
    gate = object.__new__(DictationRequestGate)
    gate._redis = MagicMock()
    gate._redis.set = AsyncMock(return_value=False)

    with pytest.raises(ConflictError):
        async with gate.hold(uuid4()):
            raise AssertionError("gate should not yield")


def test_openapi_exposes_authenticated_multipart_dictation_contract() -> None:
    from app.main import app

    operation = app.openapi()["paths"]["/api/v1/dictation/transcriptions"]["post"]
    body = operation["requestBody"]["content"]["multipart/form-data"]["schema"]
    assert "$ref" in body
    assert operation["operationId"] == "dictation_create_transcription"
