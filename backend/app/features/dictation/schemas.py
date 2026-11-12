"""Public dictation API schemas."""

from __future__ import annotations

import enum
import uuid

from pydantic import BaseModel, ConfigDict, Field


class DictationLanguage(str, enum.Enum):
    hindi = "hi-IN"
    english = "en-IN"
    auto = "unknown"


class DictationMode(str, enum.Enum):
    codemix = "codemix"
    transcribe = "transcribe"


class DictationTranscription(BaseModel):
    model_config = ConfigDict(extra="forbid")

    transcript: str = Field(min_length=1, max_length=50_000)
    language_code: str | None
    provider: str
    model: str
    provider_request_id: str | None
    client_request_id: uuid.UUID
    latency_ms: int = Field(ge=0)
