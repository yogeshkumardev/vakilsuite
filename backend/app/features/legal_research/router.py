from __future__ import annotations

import uuid

from fastapi import APIRouter, Query

from app.core.api_responses import ERROR_RESPONSES, SuccessResponse
from app.core.dependencies import CurrentUser, DB
from app.features.legal_research.schemas import (
    AuthorityReviewResponse,
    CreatePropositionRequest,
    CreateResearchRunRequest,
    DecideAuthorityReviewRequest,
    LegalResearchConfigResponse,
    LegalResearchRunResponse,
    PropositionResponse,
    AuthorityPassageRequest,
    AuthorityPassageResponse,
    AuthorityResponse,
    FetchAuthorityRequest,
    CreateAuthorityManifestRequest,
    AuthorityManifestResponse,
)
from app.features.legal_research.service import LegalResearchService


router = APIRouter(prefix="/cases", tags=["Legal research"])


@router.get(
    "/{case_id}/legal-research/config",
    response_model=SuccessResponse[LegalResearchConfigResponse],
    operation_id="legal_research_get_config",
    responses=ERROR_RESPONSES,
)
async def get_config(case_id: uuid.UUID, current_user: CurrentUser, db: DB):
    return {"success": True, "data": await LegalResearchService(db).config(case_id=case_id, user=current_user)}


@router.post(
    "/{case_id}/legal-research/runs",
    status_code=201,
    response_model=SuccessResponse[LegalResearchRunResponse],
    operation_id="legal_research_create_run",
    responses=ERROR_RESPONSES,
)
async def create_run(case_id: uuid.UUID, body: CreateResearchRunRequest, current_user: CurrentUser, db: DB):
    return {"success": True, "data": await LegalResearchService(db).create_run(case_id=case_id, user=current_user, body=body)}

@router.get("/{case_id}/legal-research/runs", response_model=SuccessResponse[list[LegalResearchRunResponse]], operation_id="legal_research_list_runs", responses=ERROR_RESPONSES)
async def list_runs(case_id: uuid.UUID, current_user: CurrentUser, db: DB):
    return {"success": True, "data": await LegalResearchService(db).list_runs(case_id=case_id, user=current_user)}


@router.get("/{case_id}/legal-research/runs/{run_id}", response_model=SuccessResponse[LegalResearchRunResponse], operation_id="legal_research_get_run", responses=ERROR_RESPONSES)
async def get_run(case_id: uuid.UUID, run_id: uuid.UUID, current_user: CurrentUser, db: DB):
    return {"success": True, "data": await LegalResearchService(db).get_run(case_id=case_id, run_id=run_id, user=current_user)}


@router.post("/{case_id}/legal-research/runs/{run_id}/submit", response_model=SuccessResponse[LegalResearchRunResponse], operation_id="legal_research_submit_run", responses=ERROR_RESPONSES)
async def submit_run(case_id: uuid.UUID, run_id: uuid.UUID, current_user: CurrentUser, db: DB):
    return {"success": True, "data": await LegalResearchService(db).submit_run(case_id=case_id, run_id=run_id, user=current_user)}


@router.post("/{case_id}/legal-research/authorities/{upstream_document_id}/checks", response_model=SuccessResponse[AuthorityResponse], operation_id="legal_research_fetch_authority", responses=ERROR_RESPONSES)
async def fetch_authority(case_id: uuid.UUID, upstream_document_id: int, body: FetchAuthorityRequest, current_user: CurrentUser, db: DB):
    return {"success": True, "data": await LegalResearchService(db).fetch_authority(case_id=case_id, upstream_document_id=upstream_document_id, user=current_user, body=body)}

@router.get("/{case_id}/legal-research/authorities/{authority_id}", response_model=SuccessResponse[AuthorityResponse], operation_id="legal_research_get_authority", responses=ERROR_RESPONSES)
async def get_authority(case_id: uuid.UUID, authority_id: uuid.UUID, current_user: CurrentUser, db: DB):
    return {"success": True, "data": await LegalResearchService(db).get_authority(case_id=case_id, authority_id=authority_id, user=current_user)}


@router.post("/{case_id}/legal-research/authorities/{authority_id}/passages", status_code=201, response_model=SuccessResponse[AuthorityPassageResponse], operation_id="legal_research_create_passage", responses=ERROR_RESPONSES)
async def create_passage(case_id: uuid.UUID, authority_id: uuid.UUID, body: AuthorityPassageRequest, current_user: CurrentUser, db: DB):
    return {"success": True, "data": await LegalResearchService(db).create_passage(case_id=case_id, authority_id=authority_id, user=current_user, body=body)}


@router.get("/{case_id}/authority-manifests", response_model=SuccessResponse[list[AuthorityManifestResponse]], operation_id="legal_research_list_authority_manifests", responses=ERROR_RESPONSES)
async def list_authority_manifests(case_id: uuid.UUID, current_user: CurrentUser, db: DB,
                                   offset: int = Query(default=0, ge=0, le=100000)):
    return {"success": True, "data": await LegalResearchService(db).list_manifests(
        case_id=case_id, user=current_user, offset=offset)}


@router.post("/{case_id}/authority-manifests", status_code=201, response_model=SuccessResponse[AuthorityManifestResponse], operation_id="legal_research_create_authority_manifest", responses=ERROR_RESPONSES)
async def create_authority_manifest(case_id: uuid.UUID, body: CreateAuthorityManifestRequest, current_user: CurrentUser, db: DB):
    return {"success": True, "data": await LegalResearchService(db).create_manifest(case_id=case_id, user=current_user, body=body)}


@router.post("/{case_id}/legal-research/propositions", status_code=201, response_model=SuccessResponse[PropositionResponse], operation_id="legal_research_create_proposition", responses=ERROR_RESPONSES)
async def create_proposition(case_id: uuid.UUID, body: CreatePropositionRequest, current_user: CurrentUser, db: DB):
    return {"success": True, "data": await LegalResearchService(db).create_proposition(case_id=case_id, user=current_user, body=body)}


@router.post("/{case_id}/legal-research/reviews/{review_id}/decision", response_model=SuccessResponse[AuthorityReviewResponse], operation_id="legal_research_decide_review", responses=ERROR_RESPONSES)
async def decide_review(case_id: uuid.UUID, review_id: uuid.UUID, body: DecideAuthorityReviewRequest, current_user: CurrentUser, db: DB):
    return {"success": True, "data": await LegalResearchService(db).decide_review(case_id=case_id, review_id=review_id, user=current_user, body=body)}
