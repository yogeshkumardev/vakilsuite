"""Sarvam realtime transport; provider messages never escape this boundary."""

from contextlib import asynccontextmanager
from dataclasses import dataclass
from typing import AsyncIterator, Literal
import base64

import httpx
from sarvamai import AsyncSarvamAI, RealtimeAudioInput, RealtimeSpeechEnd, RealtimeSpeechStart
from sarvamai.core.api_error import ApiError
from sarvamai.speech_to_text_realtime_streaming.socket_client import (
    AsyncSpeechToTextRealtimeStreamingSocketClient,
)

from app.core.config import settings
from app.core.exceptions import AppError


def provider_error(status: int | None = None) -> AppError:
    if status in {402, 429}:
        return AppError("Dictation usage limit reached. Please try again later.", "DICTATION_QUOTA_EXHAUSTED", 429)
    return AppError("Live dictation is temporarily unavailable. Please try again.", "DICTATION_UNAVAILABLE", 503)


@dataclass(frozen=True)
class RealtimeTranscript:
    kind: Literal["partial", "final"]
    text: str


class SarvamRealtimeSession:
    def __init__(self, socket: AsyncSpeechToTextRealtimeStreamingSocketClient):
        self.socket = socket

    async def start(self) -> None:
        # A completed socket handshake does not mean Sarvam accepted the model/key.
        event = await self.socket.recv()
        if getattr(event, "event", None) != "session.begin":
            raise provider_error(getattr(event, "status_code", None))
        await self.socket.send_realtime_speech_start(RealtimeSpeechStart())

    async def send_audio(self, audio: bytes) -> None:
        await self.socket.send_realtime_audio_input(
            RealtimeAudioInput(audio=base64.b64encode(audio).decode("ascii"))
        )

    async def finish(self) -> None:
        await self.socket.send_realtime_speech_end(RealtimeSpeechEnd())

    async def transcripts(self) -> AsyncIterator[RealtimeTranscript]:
        async for event in self.socket:
            kind = getattr(event, "event", None)
            if kind == "error":
                raise provider_error(getattr(event, "status_code", None))
            if kind in {"transcript.partial", "transcript.final"}:
                text = event.text
                if not isinstance(text, str) or len(text) > 50_000:
                    raise provider_error()
                yield RealtimeTranscript("partial" if kind.endswith("partial") else "final", text)
            if kind == "session.end":
                break


@asynccontextmanager
async def connect_sarvam_realtime(language: str, mode: str) -> AsyncIterator[SarvamRealtimeSession]:
    if not settings.SARVAM_API_KEY.strip():
        raise AppError("Dictation is not configured on the server.", "DICTATION_NOT_CONFIGURED", 503)
    async with httpx.AsyncClient() as http:
        client = AsyncSarvamAI(api_subscription_key=settings.SARVAM_API_KEY.strip(), httpx_client=http)
        try:
            async with client.speech_to_text_realtime_streaming.connect(
                language_code="auto" if language == "unknown" else language,
                model="saaras:v4", mode=mode, stream_type="balanced",
                endpointing="manual", encoding="linear16", sample_rate="16000",
            ) as socket:
                yield SarvamRealtimeSession(socket)
        except ApiError as exc:
            raise provider_error(exc.status_code) from None
