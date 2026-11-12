from __future__ import annotations

import uuid

from fastapi import APIRouter, Header
from sqlalchemy import select
from fastapi.responses import RedirectResponse

from app.core.api_responses import ERROR_RESPONSES, SuccessResponse
from app.core.dependencies import CurrentUser, DB
from app.core.exceptions import NotFoundError
from app.features.revisions.schemas import (
    CreateRevisionRequest,
    CreateWorkingDocumentRequest,
    DecideRevisionRequest,
    EditorBootstrapResponse,
    EditorSessionConsumeRequest,
    EditorSessionRevisionRequest,
    EnqueueRevisionExportRequest,
    ExportJobResponse,
    ReviewInboxItem,
    EligibilityResponse,
    ResolveEligibilityRequest,
    SubmitRevisionRequest,
    WorkingDocumentDetailResponse,
    WorkingDocumentRevisionResponse,
    WorkingDocumentSummaryResponse,
)
from app.features.revisions.eligibility import SourceDependency, SourceEligibilityResolver
from app.features.revisions.editor_sessions import EditorSessionService
from app.features.revisions.service import WorkingDocumentService
from app.features.exports.durable import enqueue_revision_export
from app.features.jobs.service import get_job
from app.features.documents.storage import get_r2_client
from app.core.config import settings
from app.features.revisions.models import WorkingDocument, WorkingDocumentRevision, RevisionStatus
from app.features.chambers.service import resolve_capable_chamber
from app.features.chambers.permissions import ChamberCapability


case_router = APIRouter(prefix="/cases", tags=["Working Documents"])
router = APIRouter(prefix="/working-documents", tags=["Working Documents"])
editor_sessions_router = APIRouter(prefix="/editor-sessions", tags=["Editor Sessions"])

@case_router.get("/review-inbox", response_model=SuccessResponse[list[ReviewInboxItem]], operation_id="working_documents_review_inbox", responses=ERROR_RESPONSES)
async def review_inbox(current_user: CurrentUser, db: DB, x_chamber_id: uuid.UUID | None = Header(default=None)):
    chamber = await resolve_capable_chamber(db, user_id=current_user.id, capability=ChamberCapability.review_decide, chamber_id=x_chamber_id)
    rows = await db.execute(select(WorkingDocumentRevision, WorkingDocument).join(WorkingDocument, WorkingDocument.id == WorkingDocumentRevision.working_document_id).where(WorkingDocumentRevision.chamber_id == chamber.id, WorkingDocumentRevision.status == RevisionStatus.submitted, WorkingDocument.deleted_at.is_(None)).order_by(WorkingDocumentRevision.created_at).limit(100))
    return {"success": True, "data": [ReviewInboxItem(revision_id=r.id, working_document_id=d.id, case_id=d.case_id, title=d.title, revision_number=r.revision_number, content_sha256=r.content_sha256, created_at=r.created_at) for r, d in rows.tuples()]}


@case_router.post(
    "/{case_id}/working-documents",
    status_code=201,
    response_model=SuccessResponse[WorkingDocumentDetailResponse],
    operation_id="working_documents_create",
    responses=ERROR_RESPONSES,
)
async def create_working_document(case_id: uuid.UUID, body: CreateWorkingDocumentRequest, current_user: CurrentUser, db: DB):
    return {"success": True, "data": await WorkingDocumentService(db).create(case_id, body, current_user)}


@case_router.get(
    "/{case_id}/working-documents",
    response_model=SuccessResponse[list[WorkingDocumentSummaryResponse]],
    operation_id="working_documents_list_for_case",
    responses=ERROR_RESPONSES,
)
async def list_working_documents(case_id: uuid.UUID, current_user: CurrentUser, db: DB):
    return {"success": True, "data": await WorkingDocumentService(db).list_for_case(case_id, current_user)}


@router.get(
    "/{document_id}",
    response_model=SuccessResponse[WorkingDocumentDetailResponse],
    operation_id="working_documents_get",
    responses=ERROR_RESPONSES,
)
async def get_working_document(document_id: uuid.UUID, current_user: CurrentUser, db: DB):
    return {"success": True, "data": await WorkingDocumentService(db).get_detail(document_id, current_user)}


@router.post("/{document_id}/exports", status_code=202, response_model=SuccessResponse[ExportJobResponse], operation_id="working_documents_enqueue_export", responses=ERROR_RESPONSES)
async def enqueue_export(document_id: uuid.UUID, body: EnqueueRevisionExportRequest, current_user: CurrentUser, db: DB):
    job, created = await enqueue_revision_export(db, document_id=document_id, revision_id=body.revision_id, expected_hash=body.expected_content_sha256, output_format=body.output_format, idempotency_key=body.idempotency_key, user=current_user)
    if created:
        from app.worker.tasks.export_working_document import run_working_document_export
        task_id = str(uuid.uuid4())
        job.celery_task_id = task_id
        await db.commit()
        run_working_document_export.apply_async(kwargs={"job_id": str(job.id)}, task_id=task_id)
    return {"success": True, "data": ExportJobResponse(id=job.id, status=job.status.value, output_format=body.output_format, revision_id=body.revision_id, artifact_ready=job.status.value == "succeeded")}


@router.get(
    "/{document_id}/exports/{job_id}/download",
    operation_id="working_documents_download_export",
    response_class=RedirectResponse,
    responses={
        200: {
            "description": "Short-lived redirect to an authorized working-document export",
            "content": {
                "application/octet-stream": {
                    "schema": {"type": "string", "format": "binary"}
                }
            },
        },
        **ERROR_RESPONSES,
    },
)
async def download_export(document_id: uuid.UUID, job_id: uuid.UUID, current_user: CurrentUser, db: DB):
    job = await get_job(db, job_id, current_user.id)
    if job.job_type != "working_document_export" or str(job.payload.get("working_document_id")) != str(document_id) or job.status.value != "succeeded":
        raise NotFoundError("Export artifact not found")
    from app.features.exports.review_gate import require_reviewed_export
    await require_reviewed_export(db, document_id=document_id,
        revision_id=uuid.UUID(job.payload["revision_id"]),
        expected_hash=job.payload["revision_hash"], user=current_user)
    key = str((job.result_summary or {}).get("r2_key") or "")
    if not key:
        raise NotFoundError("Export artifact not found")
    url = get_r2_client().generate_presigned_url("get_object", Params={"Bucket": settings.R2_BUCKET_NAME, "Key": key}, ExpiresIn=300)
    return RedirectResponse(url=url, status_code=307, headers={"Cache-Control": "no-store", "Referrer-Policy": "no-referrer"})


@router.post(
    "/{document_id}/revisions",
    status_code=201,
    response_model=SuccessResponse[WorkingDocumentRevisionResponse],
    operation_id="working_documents_create_revision",
    responses=ERROR_RESPONSES,
)
async def create_working_document_revision(document_id: uuid.UUID, body: CreateRevisionRequest, current_user: CurrentUser, db: DB):
    return {"success": True, "data": await WorkingDocumentService(db).create_revision(document_id, body, current_user)}


@router.post(
    "/{document_id}/revisions/{revision_id}/submit",
    response_model=SuccessResponse[WorkingDocumentRevisionResponse],
    operation_id="working_documents_submit_revision",
    responses=ERROR_RESPONSES,
)
async def submit_working_document_revision(
    document_id: uuid.UUID,
    revision_id: uuid.UUID,
    body: SubmitRevisionRequest,
    current_user: CurrentUser,
    db: DB,
):
    return {
        "success": True,
        "data": await WorkingDocumentService(db).submit_revision(
            document_id, revision_id, body, current_user
        ),
    }


@router.post(
    "/{document_id}/revisions/{revision_id}/decision",
    response_model=SuccessResponse[WorkingDocumentRevisionResponse],
    operation_id="working_documents_decide_revision",
    responses=ERROR_RESPONSES,
)
async def decide_working_document_revision(
    document_id: uuid.UUID,
    revision_id: uuid.UUID,
    body: DecideRevisionRequest,
    current_user: CurrentUser,
    db: DB,
):
    return {
        "success": True,
        "data": await WorkingDocumentService(db).decide_revision(
            document_id, revision_id, body, current_user
        ),
    }


@router.post(
    "/{document_id}/eligibility",
    response_model=SuccessResponse[EligibilityResponse],
    operation_id="working_documents_resolve_eligibility",
    responses=ERROR_RESPONSES,
)
async def resolve_working_document_eligibility(
    document_id: uuid.UUID,
    body: ResolveEligibilityRequest,
    current_user: CurrentUser,
    db: DB,
):
    result = await SourceEligibilityResolver(db).resolve(
        user=current_user,
        working_document_id=document_id,
        revision_id=body.revision_id,
        expected_revision_sha256=body.expected_revision_sha256,
        sources=tuple(
            SourceDependency(
                file_version_id=source.file_version_id,
                expected_sha256=source.expected_sha256,
                first_page=source.first_page,
                last_page=source.last_page,
            )
            for source in body.sources
        ),
    )
    return {
        "success": True,
        "data": EligibilityResponse(
            eligible=result.eligible,
            reasons=[reason.value for reason in result.reasons],
            revision_id=result.revision_id,
            revision_hash=result.revision_hash,
        ),
    }


@router.post(
    "/{document_id}/editor-bootstrap",
    response_model=SuccessResponse[EditorBootstrapResponse],
    operation_id="working_documents_create_editor_bootstrap",
    responses=ERROR_RESPONSES,
)
async def create_editor_bootstrap(document_id: uuid.UUID, current_user: CurrentUser, db: DB):
    return {
        "success": True,
        "data": await EditorSessionService(db).create_bootstrap(
            working_document_id=document_id, user=current_user
        ),
    }


@editor_sessions_router.post(
    "/{session_id}/consume",
    response_model=SuccessResponse[WorkingDocumentDetailResponse],
    operation_id="editor_sessions_consume",
    responses=ERROR_RESPONSES,
)
async def consume_editor_session(session_id: uuid.UUID, body: EditorSessionConsumeRequest, db: DB):
    return {"success": True, "data": await EditorSessionService(db).consume(session_id=session_id, token=body.token)}


@editor_sessions_router.post(
    "/{session_id}/revisions",
    status_code=201,
    response_model=SuccessResponse[WorkingDocumentRevisionResponse],
    operation_id="editor_sessions_create_revision",
    responses=ERROR_RESPONSES,
)
async def save_editor_session_revision(
    session_id: uuid.UUID,
    body: EditorSessionRevisionRequest,
    db: DB,
    x_editor_bootstrap_token: str | None = Header(default=None),
):
    if not x_editor_bootstrap_token:
        raise NotFoundError("Editor session not found")
    return {
        "success": True,
        "data": await EditorSessionService(db).save_revision(
            session_id=session_id, token=x_editor_bootstrap_token, body=body
        ),
    }
