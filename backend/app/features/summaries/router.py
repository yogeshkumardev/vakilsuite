"""Authenticated source-selection APIs for S07 summary preparation."""

from __future__ import annotations

import uuid
from app.features.summaries.models import DocumentFactCard
from app.core.exceptions import NotFoundError
from app.features.summaries.fact_cards import card_source_view
from app.features.cases.repository import CaseRepository
from .source_navigation import SummarySourceView, resolve_source

from fastapi import APIRouter

from app.core.api_responses import ERROR_RESPONSES, SuccessResponse
from app.core.dependencies import CurrentUser, DB
from app.features.summaries.schemas import (
    DecideSummaryReviewRequest,
    SaveSummaryEditorRequest,
    PrepareSummaryRunRequest,
    SummaryRunDetailResponse,
    SummaryRunResponse,
    SummarySourceCandidateResponse,
    FactCardCoverageResponse,
    RetryFactCardRequest,
    SubmitSummaryRunResponse,
)
from app.features.summaries.generation import SummaryGenerationService
from app.features.summaries.review_service import SummaryReviewService
from app.features.summaries.service import SummaryPreparationService


router = APIRouter(prefix="/cases", tags=["Summaries"])


@router.get(
    "/{case_id}/summary-source-candidates",
    response_model=SuccessResponse[list[SummarySourceCandidateResponse]],
    operation_id="summaries_list_source_candidates",
    responses=ERROR_RESPONSES,
)
async def list_summary_source_candidates(
    case_id: uuid.UUID, current_user: CurrentUser, db: DB
):
    return {
        "success": True,
        "data": await SummaryPreparationService(db).candidates(
            case_id=case_id, user=current_user
        ),
    }


@router.get("/{case_id}/fact-card-coverage", response_model=SuccessResponse[list[FactCardCoverageResponse]], operation_id="summaries_fact_card_coverage", responses=ERROR_RESPONSES)
async def fact_card_coverage(case_id: uuid.UUID, current_user: CurrentUser, db: DB):
    return {"success": True, "data": await SummaryPreparationService(db).fact_card_coverage(case_id=case_id, user=current_user)}


@router.get("/{case_id}/fact-cards/{card_id}/sources/{section_index}/{finding_index}/{citation_index}", response_model=SuccessResponse[SummarySourceView], operation_id="summaries_fact_card_source", responses=ERROR_RESPONSES)
async def fact_card_source(case_id: uuid.UUID, card_id: uuid.UUID, section_index: int, finding_index: int, citation_index: int, current_user: CurrentUser, db: DB):
    if not await CaseRepository(db).can_access(case_id, current_user.id):
        raise NotFoundError("Fact card not found")
    card = await db.get(DocumentFactCard, card_id)
    if card is None or card.case_id != case_id:
        raise NotFoundError("Fact card not found")
    return {"success": True, "data": await card_source_view(db, card=card, user=current_user, section_index=section_index, finding_index=finding_index, citation_index=citation_index)}


@router.get(
    "/{case_id}/summary-runs",
    response_model=SuccessResponse[list[SummaryRunResponse]],
    operation_id="summaries_list_runs",
    responses=ERROR_RESPONSES,
)
async def list_summary_runs(case_id: uuid.UUID, current_user: CurrentUser, db: DB):
    return {
        "success": True,
        "data": await SummaryPreparationService(db).list_runs(
            case_id=case_id, user=current_user
        ),
    }


@router.post(
    "/{case_id}/summary-runs",
    status_code=201,
    response_model=SuccessResponse[SummaryRunResponse],
    operation_id="summaries_prepare_run",
    responses=ERROR_RESPONSES,
)
async def prepare_summary_run(
    case_id: uuid.UUID,
    body: PrepareSummaryRunRequest,
    current_user: CurrentUser,
    db: DB,
):
    return {
        "success": True,
        "data": await SummaryPreparationService(db).prepare(
            case_id=case_id, body=body, user=current_user
        ),
    }


@router.post(
    "/{case_id}/summary-runs/{run_id}/submit",
    status_code=202,
    response_model=SuccessResponse[SubmitSummaryRunResponse],
    operation_id="summaries_submit_run",
    responses=ERROR_RESPONSES,
)
async def submit_summary_run(
    case_id: uuid.UUID, run_id: uuid.UUID, current_user: CurrentUser, db: DB
):
    run = await SummaryGenerationService(db).authorize_submission(
        case_id=case_id, run_id=run_id, user=current_user
    )
    from app.worker.tasks.summary_generation import (
        dispatch_fact_card_deliveries,
        generate_summary_run,
    )
    if run.schema_version == "case-summary-v3":
        dispatch_fact_card_deliveries.delay(str(run.id))
    generate_summary_run.delay(str(run.id))
    return {
        "success": True,
        "data": SubmitSummaryRunResponse(id=run.id, status=run.status.value),
    }


@router.post("/{case_id}/summary-runs/{run_id}/fact-cards/{card_id}/retry", status_code=202, response_model=SuccessResponse[SubmitSummaryRunResponse], operation_id="summaries_retry_fact_card", responses=ERROR_RESPONSES)
async def retry_fact_card(
    case_id: uuid.UUID,
    run_id: uuid.UUID,
    card_id: uuid.UUID,
    current_user: CurrentUser,
    db: DB,
    body: RetryFactCardRequest,
):
    await SummaryGenerationService(db).authorize_card_retry(
        case_id=case_id,
        run_id=run_id,
        card_id=card_id,
        user=current_user,
        acknowledge_provider_outcome_unknown=body.acknowledge_provider_outcome_unknown,
    )
    from app.worker.tasks.summary_generation import dispatch_fact_card_deliveries
    dispatch_fact_card_deliveries.delay(str(run_id))
    return {"success": True, "data": SubmitSummaryRunResponse(id=run_id, status="running")}


@router.post(
    "/{case_id}/summary-runs/{run_id}/resume-fact-card-deliveries",
    status_code=202,
    response_model=SuccessResponse[SubmitSummaryRunResponse],
    operation_id="summaries_resume_fact_card_deliveries",
    responses=ERROR_RESPONSES,
)
async def resume_fact_card_deliveries(
    case_id: uuid.UUID, run_id: uuid.UUID, current_user: CurrentUser, db: DB
):
    run, _ = await SummaryGenerationService(db).resume_pending_fact_card_deliveries(
        case_id=case_id, run_id=run_id, user=current_user
    )
    from app.worker.tasks.summary_generation import dispatch_fact_card_deliveries

    dispatch_fact_card_deliveries.delay(str(run.id))
    return {"success": True, "data": SubmitSummaryRunResponse(id=run.id, status=run.status.value)}


@router.post("/{case_id}/summary-runs/{run_id}/regenerate-incomplete", status_code=202, response_model=SuccessResponse[SubmitSummaryRunResponse], operation_id="summaries_regenerate_incomplete", responses=ERROR_RESPONSES)
async def regenerate_incomplete(case_id: uuid.UUID, run_id: uuid.UUID, current_user: CurrentUser, db: DB):
    prepared = await SummaryPreparationService(db).prepare_synthesis_retry(case_id=case_id, run_id=run_id, user=current_user)
    run = await SummaryGenerationService(db).authorize_submission(case_id=case_id, run_id=prepared.id, user=current_user)
    from app.worker.tasks.summary_generation import generate_summary_run
    generate_summary_run.delay(str(run.id))
    return {"success": True, "data": SubmitSummaryRunResponse(id=run.id, status=run.status.value)}


@router.get(
    "/{case_id}/summary-runs/{run_id}",
    response_model=SuccessResponse[SummaryRunDetailResponse],
    operation_id="summaries_get_run",
    responses=ERROR_RESPONSES,
)
async def get_summary_run(
    case_id: uuid.UUID, run_id: uuid.UUID, current_user: CurrentUser, db: DB
):
    return {
        "success": True,
        "data": await SummaryReviewService(db).get_detail(
            case_id=case_id, run_id=run_id, user=current_user
        ),
    }


@router.post(
    "/{case_id}/summary-runs/{run_id}/review",
    response_model=SuccessResponse[SummaryRunDetailResponse],
    operation_id="summaries_review_decide",
    responses=ERROR_RESPONSES,
)
async def decide_summary_review(
    case_id: uuid.UUID,
    run_id: uuid.UUID,
    body: DecideSummaryReviewRequest,
    current_user: CurrentUser,
    db: DB,
):
    return {
        "success": True,
        "data": await SummaryReviewService(db).decide(
            case_id=case_id, run_id=run_id, body=body, user=current_user
        ),
    }


@router.get(
    "/{case_id}/summary-runs/{run_id}/sources/{finding_id}/{citation_index}",
    response_model=SuccessResponse[SummarySourceView],
    operation_id="summaries_open_original_source",
    responses=ERROR_RESPONSES,
)
async def open_summary_original(
    case_id: uuid.UUID,
    run_id: uuid.UUID,
    finding_id: str,
    citation_index: int,
    current_user: CurrentUser,
    db: DB,
):
    review = SummaryReviewService(db)
    await review.preparation._require_readable_case(case_id, current_user)
    run = await review._get_run(case_id=case_id, run_id=run_id)
    if not run.result_payload:
        from app.core.exceptions import NotFoundError

        raise NotFoundError("Summary output not found")
    return {
        "success": True,
        "data": await resolve_source(
            db,
            run=run,
            user=current_user,
            finding_id=finding_id,
            citation_index=citation_index,
        ),
    }


@router.patch(
    "/{case_id}/summary-runs/{run_id}/editor",
    response_model=SuccessResponse[SummaryRunDetailResponse],
    operation_id="summaries_save_review_editor", responses=ERROR_RESPONSES,
)
async def save_summary_editor(case_id: uuid.UUID, run_id: uuid.UUID,
                              body: SaveSummaryEditorRequest, current_user: CurrentUser, db: DB):
    return {"success": True, "data": await SummaryReviewService(db).save_editor(
        case_id=case_id, run_id=run_id, body=body, user=current_user)}
