"""Validation and coordination for one short dictation turn."""

from __future__ import annotations

import logging
import uuid
from contextlib import asynccontextmanager
from pathlib import Path
from typing import AsyncIterator

import redis.asyncio as aioredis

from app.core.config import settings
from app.core.exceptions import AppError, ConflictError, FileTooLargeError, ValidationError
from app.features.dictation.schemas import DictationLanguage, DictationMode
from app.integrations.speech.contracts import (
    SpeechProviderError,
    SpeechTranscriber,
    SpeechTranscription,
    SpeechTranscriptionInput,
)

logger = logging.getLogger(__name__)

ALLOWED_AUDIO_TYPES = frozenset(
    {
        "audio/aac",
        "audio/aiff",
        "audio/amr",
        "audio/flac",
        "audio/mp4",
        "audio/mpeg",
        "audio/ogg",
        "audio/opus",
        "audio/wav",
        "audio/webm",
        "audio/x-aiff",
        "audio/x-m4a",
        "audio/x-ms-wma",
        "audio/x-wav",
    }
)


def detect_audio_container(audio: bytes) -> str | None:
    """Identify supported audio containers from bounded header bytes."""
    header = audio[:16]
    if header.startswith(b"\x1aE\xdf\xa3"):
        return "webm"
    if header.startswith(b"OggS"):
        return "ogg"
    if header.startswith(b"fLaC"):
        return "flac"
    if header.startswith(b"#!AMR"):
        return "amr"
    if header.startswith(b"RIFF") and audio[8:12] == b"WAVE":
        return "wav"
    if header.startswith(b"FORM") and audio[8:12] in {b"AIFF", b"AIFC"}:
        return "aiff"
    if len(audio) >= 12 and audio[4:8] == b"ftyp":
        return "mp4"
    if header.startswith(b"ID3") or (
        len(audio) >= 2 and audio[0] == 0xFF and audio[1] & 0xE0 == 0xE0
    ):
        return "mpeg-aac"
    if header.startswith(b"0&\xb2u\x8ef\xcf\x11\xa6\xd9\x00\xaa\x00b\xcel"):
        return "wma"
    return None


def normalize_content_type(value: str | None) -> str:
    return (value or "").split(";", 1)[0].strip().lower()


def validate_audio(*, audio: bytes, filename: str, content_type: str) -> tuple[str, str]:
    if not audio:
        raise ValidationError("Audio file is empty")
    if len(audio) > settings.SARVAM_STT_MAX_BYTES:
        raise FileTooLargeError("Audio exceeds the dictation size limit")
    safe_name = Path(filename).name.strip()
    if not safe_name or len(safe_name) > 255:
        raise ValidationError("Audio filename is invalid")
    normalized_type = normalize_content_type(content_type)
    if normalized_type not in ALLOWED_AUDIO_TYPES:
        raise ValidationError("Unsupported audio format")
    if detect_audio_container(audio) is None:
        raise ValidationError("Audio content does not match a supported format")
    return safe_name, normalized_type


class DictationService:
    def __init__(self, transcriber: SpeechTranscriber) -> None:
        self._transcriber = transcriber

    def transcribe(
        self,
        *,
        audio: bytes,
        filename: str,
        content_type: str,
        language_code: DictationLanguage,
        mode: DictationMode,
    ) -> SpeechTranscription:
        safe_name, normalized_type = validate_audio(
            audio=audio,
            filename=filename,
            content_type=content_type,
        )
        try:
            return self._transcriber.transcribe(
                SpeechTranscriptionInput(
                    audio=audio,
                    filename=safe_name,
                    content_type=normalized_type,
                    language_code=language_code.value,
                    mode=mode.value,
                )
            )
        except SpeechProviderError as exc:
            raise AppError(
                code=exc.code,
                message=exc.message,
                status_code=exc.status_code,
                details={"outcome_unknown": exc.outcome_unknown},
            ) from exc


class DictationRequestGate:
    def __init__(self) -> None:
        self._redis = aioredis.from_url(settings.REDIS_URL, socket_connect_timeout=3, socket_timeout=3)

    @asynccontextmanager
    async def hold(self, user_id: uuid.UUID, *, ttl_seconds: int | None = None) -> AsyncIterator[None]:
        key = f"dictation:active:{user_id}"
        token = str(uuid.uuid4())
        try:
            acquired = await self._redis.set(
                key,
                token,
                ex=ttl_seconds or settings.SARVAM_STT_TIMEOUT_SECONDS + 15,
                nx=True,
            )
        except Exception as exc:
            logger.error("Dictation request gate unavailable: type=%s", type(exc).__name__)
            raise AppError(
                code="DICTATION_COORDINATION_UNAVAILABLE",
                message="Dictation is temporarily unavailable. Please try again.",
                status_code=503,
            ) from exc
        if not acquired:
            raise ConflictError("A dictation request is already in progress")

        try:
            yield
        finally:
            try:
                await self._redis.eval(
                    "if redis.call('get', KEYS[1]) == ARGV[1] then "
                    "return redis.call('del', KEYS[1]) else return 0 end",
                    1,
                    key,
                    token,
                )
            except Exception as exc:
                logger.error("Dictation request gate cleanup failed: type=%s", type(exc).__name__)

    async def check_realtime_rate(self, user_id: uuid.UUID) -> None:
        """HTTP middleware does not see WebSockets; charge one bounded session here."""
        try:
            count = await self._redis.eval(
                "local n = redis.call('incr', KEYS[1]); "
                "if n == 1 then redis.call('expire', KEYS[1], 3600) end; return n",
                1, f"dictation:realtime-rate:{user_id}",
            )
        except Exception as exc:
            raise AppError("Dictation is temporarily unavailable.", "DICTATION_COORDINATION_UNAVAILABLE", 503) from exc
        if count > 30:
            raise AppError("Live dictation limit reached (30 sessions/hour). Try again later.", "DICTATION_RATE_LIMIT", 429)
