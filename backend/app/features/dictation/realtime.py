"""Versioned, authenticated WebSocket contract for a single dictation turn."""

from __future__ import annotations

import asyncio
import json
import logging
from contextlib import AsyncExitStack, suppress
from functools import lru_cache
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from pydantic import BaseModel, ConfigDict, Field, ValidationError
from starlette.websockets import WebSocketState

from app.core.config import settings
from app.core.dependencies import get_current_user
from app.core.exceptions import AppError
from app.db.session import AsyncSessionLocal
from app.features.dictation.service import DictationRequestGate
from app.integrations.speech.realtime import SarvamRealtimeSession, connect_sarvam_realtime

router = APIRouter(prefix="/dictation", tags=["Dictation"])
logger = logging.getLogger(__name__)
AUTH_TIMEOUT = 8
CONNECT_TIMEOUT = 12
FINAL_TIMEOUT = 15
IDLE_TIMEOUT = 8
MAX_CHUNK_BYTES = 16_000


class RealtimeStart(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    version: Literal[1]
    type: Literal["start"]
    requestId: str = Field(min_length=1, max_length=64)
    token: str = Field(min_length=1, max_length=3000)
    languageCode: Literal["hi-IN", "en-IN", "unknown"]
    mode: Literal["codemix", "transcribe"]


@lru_cache(maxsize=1)
def get_realtime_gate() -> DictationRequestGate:
    return DictationRequestGate()


async def authenticate_realtime(token: str) -> UUID:
    async with AsyncSessionLocal() as db:
        user = await get_current_user(authorization=f"Bearer {token}", access_token=None, db=db)
        return user.id


def invalid_audio(message: str) -> AppError:
    return AppError(message, "DICTATION_INVALID_AUDIO", 422)


async def relay_turn(ws: WebSocket, upstream: SarvamRealtimeSession, request: RealtimeStart) -> None:
    def message(kind: str, **fields: object) -> dict:
        return {"version": 1, "requestId": request.requestId, "type": kind, **fields}

    await ws.send_json(message("ready", maxDurationMs=settings.SARVAM_REALTIME_MAX_SECONDS * 1000))
    stopped = asyncio.Event()

    async def upload() -> bool:
        audio_bytes = 0
        deadline = asyncio.get_running_loop().time() + settings.SARVAM_REALTIME_MAX_SECONDS + 2
        while True:
            remaining = deadline - asyncio.get_running_loop().time()
            if remaining <= 0:
                raise invalid_audio("Recording limit reached. Please start another dictation.")
            frame = await asyncio.wait_for(ws.receive(), timeout=min(IDLE_TIMEOUT, remaining))
            if frame["type"] == "websocket.disconnect":
                return False
            data = frame.get("bytes")
            if data is not None:
                if not data or len(data) > MAX_CHUNK_BYTES or len(data) % 2:
                    raise invalid_audio("Invalid audio chunk. Please start another dictation.")
                audio_bytes += len(data)
                if audio_bytes > 16_000 * 2 * settings.SARVAM_REALTIME_MAX_SECONDS:
                    raise invalid_audio("Recording limit reached. Please start another dictation.")
                await upstream.send_audio(data)
                continue
            raw = frame.get("text", "")
            if len(raw) > 128:
                raise invalid_audio("Invalid dictation command.")
            try:
                command = json.loads(raw)
            except (ValueError, TypeError):
                raise invalid_audio("Invalid dictation command.") from None
            if command == {"type": "cancel"}:
                return False
            if command != {"type": "stop"}:
                raise invalid_audio("Invalid dictation command.")
            if audio_bytes == 0:
                raise invalid_audio("No audio was recorded. Please try again.")
            stopped.set()
            await upstream.finish()
            return True

    async def download() -> str:
        finalized_segments: list[str] = []

        def combined_text() -> str:
            return " ".join(finalized_segments).strip()

        async for event in upstream.transcripts():
            if event.kind == "partial":
                text = " ".join((*finalized_segments, event.text.strip())).strip()
                if text:
                    await ws.send_json(message("partial", text=text))
            elif event.kind == "final":
                text = event.text.strip()
                if text and (not finalized_segments or finalized_segments[-1] != text):
                    # Sarvam can finalize a sentence/segment while the user is
                    # still recording. Keep listening until the client sends
                    # stop, then insert the accumulated transcript once.
                    finalized_segments.append(text)
                    if not stopped.is_set():
                        await ws.send_json(message("partial", text=combined_text()))
                if stopped.is_set() and finalized_segments:
                    return combined_text()
                if stopped.is_set() and not finalized_segments:
                    raise AppError("No speech was detected. Please try again.", "DICTATION_NO_SPEECH", 422)
        if stopped.is_set() and finalized_segments:
            return combined_text()
        if stopped.is_set():
            raise AppError("No speech was detected. Please try again.", "DICTATION_NO_SPEECH", 422)
        raise AppError("Speech connection closed. Please start another dictation.", "DICTATION_INTERRUPTED", 503)

    tasks: list[asyncio.Task] = []
    try:
        receiving = asyncio.create_task(upload())
        transcribing = asyncio.create_task(download())
        tasks.extend((receiving, transcribing))
        done, _ = await asyncio.wait(tasks, return_when=asyncio.FIRST_COMPLETED)
        if receiving not in done:
            transcribing.result()
            if not stopped.is_set():
                raise AppError("Speech stream ended early.", "DICTATION_INTERRUPTED", 503)
            # A fast provider may deliver its final before speech_end's send
            # coroutine returns. Wait for that send, rather than lose a valid final.
            await asyncio.wait_for(asyncio.shield(receiving), FINAL_TIMEOUT)
        if not receiving.result():
            return
        # Keep observing cancel/disconnect during provider finalization.
        cancelled = asyncio.create_task(ws.receive())
        tasks.append(cancelled)
        done, _ = await asyncio.wait((transcribing, cancelled), timeout=FINAL_TIMEOUT, return_when=asyncio.FIRST_COMPLETED)
        if cancelled in done:
            return
        if transcribing not in done:
            raise AppError("Transcription timed out. Please start another dictation.", "DICTATION_TIMEOUT", 503)
        await ws.send_json(message("final", text=transcribing.result()))
    finally:
        for task in tasks:
            task.cancel()
        await asyncio.gather(*tasks, return_exceptions=True)


@router.websocket("/realtime")
async def realtime_dictation(ws: WebSocket) -> None:
    origin = ws.headers.get("origin")
    if origin and origin.rstrip("/") not in {value.rstrip("/") for value in settings.CORS_ORIGINS}:
        await ws.close(code=1008)
        return
    await ws.accept()
    request: RealtimeStart | None = None
    try:
        async with asyncio.timeout(AUTH_TIMEOUT):
            raw = await ws.receive_text()
            if len(raw) > 4096:
                raise invalid_audio("Invalid dictation session request.")
            request = RealtimeStart.model_validate_json(raw)
            user_id = await authenticate_realtime(request.token)
        gate = get_realtime_gate()
        async with gate.hold(user_id, ttl_seconds=CONNECT_TIMEOUT + settings.SARVAM_REALTIME_MAX_SECONDS + FINAL_TIMEOUT + 10):
            await gate.check_realtime_rate(user_id)
            async with asyncio.timeout(CONNECT_TIMEOUT + settings.SARVAM_REALTIME_MAX_SECONDS + FINAL_TIMEOUT + 5):
                async with AsyncExitStack() as stack:
                    async with asyncio.timeout(CONNECT_TIMEOUT):
                        upstream = await stack.enter_async_context(connect_sarvam_realtime(request.languageCode, request.mode))
                        await upstream.start()
                    await relay_turn(ws, upstream, request)
    except WebSocketDisconnect:
        pass
    except Exception as exc:
        if isinstance(exc, AppError):
            error = {"code": exc.code, "message": exc.message}
        elif isinstance(exc, (ValidationError, ValueError)):
            error = {"code": "DICTATION_INVALID_REQUEST", "message": "Invalid dictation settings. Reload the editor and try again."}
        elif isinstance(exc, TimeoutError):
            error = {"code": "DICTATION_TIMEOUT", "message": "Live dictation timed out. Please try again."}
        else:
            logger.warning("Realtime dictation failed: type=%s", type(exc).__name__)
            error = {"code": "DICTATION_UNAVAILABLE", "message": "Live dictation is temporarily unavailable. Please try again."}
        with suppress(WebSocketDisconnect, RuntimeError, OSError):
            await ws.send_json({"version": 1, "requestId": request.requestId if request else None, "type": "error", **error})
    finally:
        if ws.application_state != WebSocketState.DISCONNECTED:
            with suppress(WebSocketDisconnect, RuntimeError, OSError):
                await ws.close()
