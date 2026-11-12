"""Provider-neutral contracts for short interactive speech transcription."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol


@dataclass(frozen=True)
class SpeechTranscriptionInput:
    audio: bytes
    filename: str
    content_type: str
    language_code: str
    mode: str


@dataclass(frozen=True)
class SpeechTranscription:
    transcript: str
    language_code: str | None
    provider: str
    model: str
    provider_request_id: str | None
    latency_ms: int


class SpeechProviderError(Exception):
    def __init__(
        self,
        *,
        code: str,
        message: str,
        status_code: int,
        outcome_unknown: bool = False,
        provider_request_id: str | None = None,
    ) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code
        self.outcome_unknown = outcome_unknown
        self.provider_request_id = provider_request_id


class SpeechTranscriber(Protocol):
    def transcribe(self, request: SpeechTranscriptionInput) -> SpeechTranscription: ...
