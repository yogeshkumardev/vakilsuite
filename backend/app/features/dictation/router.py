"""Authenticated short-turn dictation endpoint."""

from __future__ import annotations

import uuid
from functools import lru_cache
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, UploadFile
from starlette.concurrency import run_in_threadpool

from app.core.api_responses import ERROR_RESPONSES, SuccessResponse
from app.core.dependencies import CurrentUser
from app.core.exceptions import FileTooLargeError
from app.core.config import settings
from app.features.dictation.schemas import (
    DictationLanguage,
    DictationMode,
    DictationTranscription,
)
from app.features.dictation.service import DictationRequestGate, DictationService
from app.integrations.speech.sarvam import SarvamSpeechTranscriber

router = APIRouter(prefix="/dictation", tags=["Dictation"])


def get_dictation_service() -> DictationService:
    return DictationService(SarvamSpeechTranscriber())


@lru_cache(maxsize=1)
def get_dictation_gate() -> DictationRequestGate:
    return DictationRequestGate()


@router.post(
    "/transcriptions",
    response_model=SuccessResponse[DictationTranscription],
    responses=ERROR_RESPONSES,
    operation_id="dictation_create_transcription",
    summary="Transcribe one short editor-dictation recording",
)
async def create_transcription(
    current_user: CurrentUser,
    service: Annotated[DictationService, Depends(get_dictation_service)],
    gate: Annotated[DictationRequestGate, Depends(get_dictation_gate)],
    audio: Annotated[UploadFile, File(description="Audio recording under 30 seconds")],
    client_request_id: Annotated[uuid.UUID, Form()],
    language_code: Annotated[DictationLanguage, Form()] = DictationLanguage.hindi,
    mode: Annotated[DictationMode, Form()] = DictationMode.codemix,
) -> SuccessResponse[DictationTranscription]:
    content = await audio.read(settings.SARVAM_STT_MAX_BYTES + 1)
    await audio.close()
    if len(content) > settings.SARVAM_STT_MAX_BYTES:
        raise FileTooLargeError("Audio exceeds the dictation size limit")

    async with gate.hold(current_user.id):
        result = await run_in_threadpool(
            service.transcribe,
            audio=content,
            filename=audio.filename or "dictation-audio",
            content_type=audio.content_type or "",
            language_code=language_code,
            mode=mode,
        )

    return {
        "success": True,
        "data": DictationTranscription(
            transcript=result.transcript,
            language_code=result.language_code,
            provider=result.provider,
            model=result.model,
            provider_request_id=result.provider_request_id,
            client_request_id=client_request_id,
            latency_ms=result.latency_ms,
        ),
    }
