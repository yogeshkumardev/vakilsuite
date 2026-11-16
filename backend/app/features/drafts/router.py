import uuid

from fastapi import APIRouter, Query
from fastapi.responses import RedirectResponse

from app.core.api_responses import ERROR_RESPONSES, SuccessResponse
from app.core.dependencies import CurrentUser, DB
from app.features.drafts.schemas import (
    AdvocateCourtRegistrationUpdate,
    AdvocateProfileResponse,
    AdvocateProfileUpdate,
    CreateCourtDraftRequest,
    CourtDraftResponse,
    CourtDraftGenerationResponse,
    CourtDraftEditorResponse,
    CourtDraftExportResponse,
    ReadinessResponse,
    EnqueueCourtDraftExportRequest,
    StartCourtDraftGenerationRequest,
    UpdateCourtDraftRequest,
)
from app.features.drafts.service import CourtDraftService

router = APIRouter(prefix="/cases", tags=["Court drafts"])
profile_router = APIRouter(prefix="/profile", tags=["Advocate profile"])


@profile_router.get("", response_model=SuccessResponse[AdvocateProfileResponse], operation_id="drafts_get_advocate_profile", responses=ERROR_RESPONSES)
async def get_advocate_profile(current_user: CurrentUser, db: DB):
    return {"success": True, "data": await CourtDraftService(db).profile(current_user)}


@profile_router.patch("", response_model=SuccessResponse[AdvocateProfileResponse], operation_id="drafts_update_advocate_profile", responses=ERROR_RESPONSES)
async def update_advocate_profile(body: AdvocateProfileUpdate, current_user: CurrentUser, db: DB):
    return {"success": True, "data": await CourtDraftService(db).update_profile(user=current_user, body=body)}


@profile_router.put("/court-registrations/{court_code}", response_model=SuccessResponse[AdvocateProfileResponse], operation_id="drafts_update_advocate_court_registration", responses=ERROR_RESPONSES)
async def update_advocate_court_registration(court_code: str, body: AdvocateCourtRegistrationUpdate, current_user: CurrentUser, db: DB):
    return {"success": True, "data": await CourtDraftService(db).update_court_registration(user=current_user, court_code=court_code, body=body)}


@router.get("/{case_id}/draft-readiness", response_model=SuccessResponse[ReadinessResponse], operation_id="drafts_readiness", responses=ERROR_RESPONSES)
async def draft_readiness(case_id: uuid.UUID, current_user: CurrentUser, db: DB, draft_type: str = Query("regular_bail_483_bnss")):
    return {"success": True, "data": await CourtDraftService(db).readiness(case_id=case_id, user=current_user, draft_type=draft_type)}


@router.post("/{case_id}/court-drafts", status_code=201, response_model=SuccessResponse[CourtDraftResponse], operation_id="drafts_create_court_draft", responses=ERROR_RESPONSES)
async def create_court_draft(case_id: uuid.UUID, body: CreateCourtDraftRequest, current_user: CurrentUser, db: DB):
    return {"success": True, "data": await CourtDraftService(db).create(case_id=case_id, user=current_user, body=body)}


@router.get("/{case_id}/court-drafts/{draft_id}", response_model=SuccessResponse[CourtDraftResponse], operation_id="drafts_get_court_draft", responses=ERROR_RESPONSES)
async def get_court_draft(case_id: uuid.UUID, draft_id: uuid.UUID, current_user: CurrentUser, db: DB):
    return {"success": True, "data": await CourtDraftService(db).get(case_id=case_id, draft_id=draft_id, user=current_user)}


@router.patch("/{case_id}/court-drafts/{draft_id}", response_model=SuccessResponse[CourtDraftResponse], operation_id="drafts_update_court_draft", responses=ERROR_RESPONSES)
async def update_court_draft(case_id: uuid.UUID, draft_id: uuid.UUID, body: UpdateCourtDraftRequest, current_user: CurrentUser, db: DB):
    return {"success": True, "data": await CourtDraftService(db).update(case_id=case_id, draft_id=draft_id, user=current_user, body=body)}


@router.post("/{case_id}/court-drafts/{draft_id}/generate", status_code=202, response_model=SuccessResponse[CourtDraftGenerationResponse], operation_id="drafts_generate_court_draft", responses=ERROR_RESPONSES)
async def generate_court_draft(case_id: uuid.UUID, draft_id: uuid.UUID, body: StartCourtDraftGenerationRequest, current_user: CurrentUser, db: DB):
    job, _created = await CourtDraftService(db).start_generation(case_id=case_id, draft_id=draft_id, user=current_user, expected_content_hash=body.expected_content_hash, idempotency_key=body.idempotency_key)
    from app.worker.tasks.court_draft_generation import generate_court_draft
    generate_court_draft.delay(str(job.id))
    return {"success": True, "data": CourtDraftGenerationResponse(id=job.id, status=job.status.value, draft_id=draft_id)}


@router.post("/{case_id}/court-drafts/{draft_id}/word-editor", response_model=SuccessResponse[CourtDraftEditorResponse], operation_id="drafts_materialize_court_draft_word_editor", responses=ERROR_RESPONSES)
async def materialize_court_draft_word_editor(case_id: uuid.UUID, draft_id: uuid.UUID, current_user: CurrentUser, db: DB):
    working_document_id = await CourtDraftService(db).materialize_word_editor(case_id=case_id, draft_id=draft_id, user=current_user)
    return {"success": True, "data": CourtDraftEditorResponse(working_document_id=working_document_id)}


@router.post("/{case_id}/court-drafts/{draft_id}/exports", status_code=202, response_model=SuccessResponse[CourtDraftExportResponse], operation_id="drafts_enqueue_court_draft_export", responses=ERROR_RESPONSES)
async def enqueue_court_draft_export(case_id: uuid.UUID, draft_id: uuid.UUID, body: EnqueueCourtDraftExportRequest, current_user: CurrentUser, db: DB):
    job, created = await CourtDraftService(db).enqueue_export(case_id=case_id, draft_id=draft_id, user=current_user, expected_content_hash=body.expected_content_hash, idempotency_key=body.idempotency_key, acknowledge_compliance_warnings=body.acknowledge_compliance_warnings)
    if created:
        from app.worker.tasks.export_court_draft import export_court_draft
        export_court_draft.delay(str(job.id))
    return {"success": True, "data": CourtDraftExportResponse(id=job.id, status=job.status.value, draft_id=draft_id, artifact_ready=job.status.value == "succeeded")}


@router.get("/{case_id}/court-drafts/{draft_id}/exports/{job_id}/download", operation_id="drafts_download_court_draft_export", response_class=RedirectResponse, responses=ERROR_RESPONSES)
async def download_court_draft_export(case_id: uuid.UUID, draft_id: uuid.UUID, job_id: uuid.UUID, current_user: CurrentUser, db: DB):
    from app.core.config import settings
    from app.core.exceptions import NotFoundError
    from app.features.chambers.audit import ChamberAuditEventType
    from app.features.chambers.audit_service import record_audit_event
    from app.features.documents.storage import get_r2_client
    from app.features.drafts.models import DraftDownload
    from app.features.jobs.models import JobStatus
    from app.features.jobs.service import get_job
    draft = await CourtDraftService(db).get(case_id=case_id, draft_id=draft_id, user=current_user)
    job = await get_job(db, job_id, current_user.id)
    if draft.status == "stale" or job.job_type != "court_draft_export" or str(job.payload.get("draft_id")) != str(draft_id) or job.status != JobStatus.succeeded or job.payload.get("content_hash") != draft.content_hash:
        raise NotFoundError("Export artifact not found")
    key = str((job.result_summary or {}).get("r2_key") or "")
    if not key:
        raise NotFoundError("Export artifact not found")
    download = DraftDownload(court_draft_id=draft.id, export_job_id=job.id, chamber_id=draft.chamber_id, downloaded_by_user_id=current_user.id, content_hash=draft.content_hash)
    db.add(download)
    await record_audit_event(db, chamber_id=draft.chamber_id, actor_user_id=current_user.id, event_type=ChamberAuditEventType.draft_downloaded, resource_type="court_draft", resource_id=draft.id, metadata={"format": "docx"})
    await db.commit()
    url = get_r2_client().generate_presigned_url("get_object", Params={"Bucket": settings.R2_BUCKET_NAME, "Key": key}, ExpiresIn=300)
    return RedirectResponse(url=url, status_code=307, headers={"Cache-Control": "no-store", "Referrer-Policy": "no-referrer"})
