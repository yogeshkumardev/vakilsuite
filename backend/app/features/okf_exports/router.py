"""Case-scoped deterministic OKF preview endpoints."""

from __future__ import annotations

import uuid
from pydantic import BaseModel
from app.features.jobs.schemas import JobOut
from .generation import (
    DraftGenerationService,
    DraftGenerationRequest,
    SubmitDraftRequest,
    fingerprint,
)

from fastapi import APIRouter

from app.core.api_responses import ERROR_RESPONSES, SuccessResponse
from app.core.dependencies import CurrentUser, DB

from .schemas import (
    OkfExportPreviewResponse,
    OkfAnnexureCandidateResponse,
    OkfTemplateOptionResponse,
    PrepareOkfExportPreviewRequest,
)
from .service import OkfExportPreviewService
from .schemas import SaveOkfContextRequest, OkfContextResponse
from .snapshots import OkfContextService
from .preflight import DraftPreflightRequest, DraftPreflightResponse, check_draft_inputs


router = APIRouter(prefix="/cases", tags=["OKF exports"])


@router.post(
    "/{case_id}/okf-contexts/{snapshot_id}/draft-preflight",
    response_model=SuccessResponse[DraftPreflightResponse],
    operation_id="okf_contexts_draft_preflight",
    responses=ERROR_RESPONSES,
)
async def draft_preflight(
    case_id: uuid.UUID,
    snapshot_id: uuid.UUID,
    body: DraftPreflightRequest,
    current_user: CurrentUser,
    db: DB,
):
    service = OkfContextService(db)
    await service.preparation._require_editable_case(case_id, current_user)
    context = await service.read(
        case_id=case_id, snapshot_id=snapshot_id, user=current_user
    )
    return {
        "success": True,
        "data": check_draft_inputs(context.payload, context.manifest_sha256, body),
    }


@router.post(
    "/{case_id}/okf-contexts",
    response_model=SuccessResponse[OkfContextResponse],
    operation_id="okf_contexts_save",
    responses=ERROR_RESPONSES,
)
async def save_okf_context(
    case_id: uuid.UUID, body: SaveOkfContextRequest, current_user: CurrentUser, db: DB
):
    return {
        "success": True,
        "data": await OkfContextService(db).save(
            case_id=case_id, body=body, user=current_user
        ),
    }


@router.get(
    "/{case_id}/okf-contexts/{snapshot_id}",
    response_model=SuccessResponse[OkfContextResponse],
    operation_id="okf_contexts_read",
    responses=ERROR_RESPONSES,
)
async def read_okf_context(
    case_id: uuid.UUID, snapshot_id: uuid.UUID, current_user: CurrentUser, db: DB
):
    return {
        "success": True,
        "data": await OkfContextService(db).read(
            case_id=case_id, snapshot_id=snapshot_id, user=current_user
        ),
    }


@router.get(
    "/{case_id}/okf-templates",
    response_model=SuccessResponse[list[OkfTemplateOptionResponse]],
    operation_id="okf_exports_list_templates",
    responses=ERROR_RESPONSES,
)
async def list_okf_templates(case_id: uuid.UUID, current_user: CurrentUser, db: DB):
    return {
        "success": True,
        "data": await OkfExportPreviewService(db).list_templates(
            case_id=case_id, user=current_user
        ),
    }


@router.get(
    "/{case_id}/okf-annexure-candidates",
    response_model=SuccessResponse[list[OkfAnnexureCandidateResponse]],
    operation_id="okf_exports_list_annexure_candidates",
    responses=ERROR_RESPONSES,
)
async def list_okf_annexure_candidates(
    case_id: uuid.UUID, current_user: CurrentUser, db: DB
):
    return {
        "success": True,
        "data": await OkfExportPreviewService(db).annexure_candidates(
            case_id=case_id, user=current_user
        ),
    }


@router.post(
    "/{case_id}/okf-export-preview",
    response_model=SuccessResponse[OkfExportPreviewResponse],
    operation_id="okf_exports_prepare_preview",
    responses=ERROR_RESPONSES,
)
async def prepare_okf_export_preview(
    case_id: uuid.UUID,
    body: PrepareOkfExportPreviewRequest,
    current_user: CurrentUser,
    db: DB,
):
    return {
        "success": True,
        "data": await OkfExportPreviewService(db).preview(
            case_id=case_id, body=body, user=current_user
        ),
    }


class DraftQuoteResponse(BaseModel):
    quote_hash: str
    estimated_reservation_paise: int
    model: str


@router.post(
    "/{case_id}/okf-contexts/{snapshot_id}/draft-quote",
    response_model=SuccessResponse[DraftQuoteResponse],
    operation_id="okf_draft_quote",
)
async def draft_quote(
    case_id: uuid.UUID,
    snapshot_id: uuid.UUID,
    body: DraftGenerationRequest,
    current_user: CurrentUser,
    db: DB,
):
    _, _, _, quote = await DraftGenerationService(db).prepare(
        case_id=case_id, snapshot_id=snapshot_id, user=current_user, body=body
    )
    return {
        "success": True,
        "data": dict(
            quote_hash=fingerprint(quote),
            estimated_reservation_paise=quote["estimated_reservation_paise"],
            model=quote["model"],
        ),
    }


@router.post(
    "/{case_id}/okf-contexts/{snapshot_id}/draft-generation",
    response_model=SuccessResponse[JobOut],
    operation_id="okf_draft_submit",
)
async def draft_submit(
    case_id: uuid.UUID,
    snapshot_id: uuid.UUID,
    body: SubmitDraftRequest,
    current_user: CurrentUser,
    db: DB,
):
    job = await DraftGenerationService(db).submit(
        case_id=case_id, snapshot_id=snapshot_id, user=current_user, body=body
    )
    await db.refresh(job)
    return {"success": True, "data": JobOut.model_validate(job)}


@router.get(
    "/{case_id}/okf-contexts/{snapshot_id}/draft-generation",
    response_model=SuccessResponse[JobOut | None],
    operation_id="okf_draft_status",
)
async def draft_status(
    case_id: uuid.UUID, snapshot_id: uuid.UUID, current_user: CurrentUser, db: DB
):
    job = await DraftGenerationService(db).current(
        case_id=case_id, snapshot_id=snapshot_id, user=current_user
    )
    if job is None:
        return {"success": True, "data": None}
    await db.refresh(job)
    return {"success": True, "data": JobOut.model_validate(job)}
