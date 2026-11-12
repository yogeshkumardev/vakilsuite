"""Sarvam Saaras adapter for short interactive dictation."""

from __future__ import annotations

import logging
import time
from typing import Any

from sarvamai import SarvamAI
from sarvamai.core.api_error import ApiError

from app.core.config import settings
from app.integrations.speech.contracts import (
    SpeechProviderError,
    SpeechTranscription,
    SpeechTranscriptionInput,
)

logger = logging.getLogger(__name__)


class SarvamSpeechTranscriber:
    provider = "sarvam"

    def __init__(self, *, client: Any | None = None, model: str | None = None) -> None:
        api_key = settings.SARVAM_API_KEY.strip()
        if client is None and not api_key:
            raise SpeechProviderError(
                code="DICTATION_NOT_CONFIGURED",
                message="Dictation is not configured on the server.",
                status_code=503,
            )
        self.model = model or settings.SARVAM_STT_MODEL
        self._client = client or SarvamAI(
            api_subscription_key=api_key,
            timeout=settings.SARVAM_STT_TIMEOUT_SECONDS,
        )

    def transcribe(self, request: SpeechTranscriptionInput) -> SpeechTranscription:
        started_at = time.monotonic()
        try:
            response = self._client.speech_to_text.transcribe(
                file=(request.filename, request.audio, request.content_type),
                model=self.model,
                language_code=request.language_code,
                mode=request.mode,
                request_options={
                    "timeout_in_seconds": settings.SARVAM_STT_TIMEOUT_SECONDS,
                    "max_retries": 0,
                },
            )
        except Exception as exc:
            raise self._map_error(exc) from exc

        transcript = str(getattr(response, "transcript", "") or "").strip()
        if not transcript:
            raise SpeechProviderError(
                code="DICTATION_NO_SPEECH",
                message="No speech was detected. Please try again.",
                status_code=422,
                provider_request_id=getattr(response, "request_id", None),
            )
        return SpeechTranscription(
            transcript=transcript,
            language_code=getattr(response, "language_code", None),
            provider=self.provider,
            model=self.model,
            provider_request_id=getattr(response, "request_id", None),
            latency_ms=round((time.monotonic() - started_at) * 1000),
        )

    def _map_error(self, exc: Exception) -> SpeechProviderError:
        status = int(getattr(exc, "status_code", 0) or 0)
        request_id = getattr(exc, "request_id", None)
        outcome_unknown = False

        if isinstance(exc, ApiError):
            if status == 400 or status == 422:
                code, message, app_status = (
                    "DICTATION_INVALID_AUDIO",
                    "The audio could not be transcribed. Record a shorter, clearer clip.",
                    422,
                )
            elif status in {401, 403}:
                code, message, app_status = (
                    "DICTATION_NOT_CONFIGURED",
                    "Dictation is temporarily unavailable.",
                    503,
                )
            elif status in {402, 429}:
                code, message, app_status = (
                    "DICTATION_QUOTA_EXHAUSTED",
                    "Dictation usage limit has been reached. Please try again later.",
                    429,
                )
            elif status in {408, 504}:
                code, message, app_status, outcome_unknown = (
                    "DICTATION_TIMEOUT",
                    "Transcription timed out. Check before retrying.",
                    503,
                    True,
                )
            else:
                code, message, app_status, outcome_unknown = (
                    "DICTATION_UNAVAILABLE",
                    "Dictation is temporarily unavailable.",
                    503,
                    status >= 500,
                )
        elif isinstance(exc, TimeoutError):
            code, message, app_status, outcome_unknown = (
                "DICTATION_TIMEOUT",
                "Transcription timed out. Check before retrying.",
                503,
                True,
            )
        else:
            code, message, app_status, outcome_unknown = (
                "DICTATION_UNAVAILABLE",
                "Dictation is temporarily unavailable.",
                503,
                True,
            )

        logger.error(
            "Sarvam STT failed: code=%s type=%s request_id=%s outcome_unknown=%s",
            code,
            type(exc).__name__,
            request_id,
            outcome_unknown,
        )
        return SpeechProviderError(
            code=code,
            message=message,
            status_code=app_status,
            outcome_unknown=outcome_unknown,
            provider_request_id=request_id,
        )
