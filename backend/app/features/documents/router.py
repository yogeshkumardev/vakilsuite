from app.core.api_responses import ERROR_RESPONSES, SuccessResponse, DocumentsData, EmptyData
from app.features.documents.schemas import ConfirmUploadResponse, MultipartPartUrlResponse, PresignUploadResponse, ViewUrlResponse
import uuid

from fastapi import APIRouter, BackgroundTasks, Response, status

from app.core.dependencies import CurrentUser, DB
from app.features.documents.schemas import (
    ConfirmUploadRequest,
    PresignUploadRequest,
    UpdateDocumentRequest,
    MultipartPartUrlRequest,
    RecordMultipartPartRequest,
    AnnexureCreateRequest,
    AnnexureAssignRequest,
    EnqueueExtractionRequest,
    ExtractionJobResponse, ExtractionJobStatusResponse,
)
from app.features.documents.service import DocumentService
from app.features.documents.extraction_jobs import enqueue_document_extraction, cancel_document_extraction
from app.features.jobs.service import get_job

from app.features.documents.source_ocr import SourceOcrService, OcrPageRequest, OcrSubmitRequest, OcrQuote, digest
from app.features.jobs.models import JobStatus
from app.features.jobs.schemas import JobOut
from app.features.documents.source_service import OriginalSourceService
from app.features.documents.source_schemas import OriginalSourceResponse, SourceOcrStatusResponse, ReviewOriginalRequest, SaveSourceEditorRequest, ReviewSourceEditorRequest

router = APIRouter(tags=["Documents"])


@router.post("/documents/{document_id}/summary-source", response_model=SuccessResponse[OriginalSourceResponse], operation_id="documents_prepare_summary_source", responses=ERROR_RESPONSES)
async def prepare_original_source(document_id: uuid.UUID, current_user: CurrentUser, db: DB):
    return {"success": True, "data": await OriginalSourceService(db).inspect(document_id, current_user)}


@router.get("/documents/{document_id}/summary-source/ocr-status", response_model=SuccessResponse[SourceOcrStatusResponse], operation_id="documents_source_ocr_status", responses=ERROR_RESPONSES)
async def get_source_ocr_status(document_id: uuid.UUID, current_user: CurrentUser, db: DB):
    return {"success": True, "data": await OriginalSourceService(db).ocr_status(document_id, current_user)}


@router.post("/documents/{document_id}/summary-source/review", response_model=SuccessResponse[OriginalSourceResponse], operation_id="documents_review_summary_source", responses=ERROR_RESPONSES)
async def review_original_source(document_id: uuid.UUID, body: ReviewOriginalRequest, current_user: CurrentUser, db: DB):
    return {"success": True, "data": await OriginalSourceService(db).review(document_id, current_user, body)}



@router.post("/cases/{case_id}/documents/presign", status_code=201, response_model=SuccessResponse[PresignUploadResponse], operation_id="documents_presign", responses=ERROR_RESPONSES)
async def presign_upload(
    case_id: uuid.UUID, body: PresignUploadRequest, current_user: CurrentUser, db: DB
):
    result = await DocumentService(db).presign_upload(case_id, body, current_user)
    return {"success": True, "data": result.model_dump()}


@router.post("/documents/{document_id}/confirm-upload", response_model=SuccessResponse[ConfirmUploadResponse], operation_id="documents_confirm_upload", responses=ERROR_RESPONSES)
async def confirm_upload(
    document_id: uuid.UUID,
    body: ConfirmUploadRequest,
    current_user: CurrentUser,
    db: DB,
):
    del body
    result = await DocumentService(db).confirm_upload(document_id, current_user)
    return {"success": True, "data": result.model_dump()}


@router.post("/documents/{document_id}/extractions", status_code=202, response_model=SuccessResponse[ExtractionJobResponse], operation_id="documents_enqueue_extraction", responses=ERROR_RESPONSES)
async def enqueue_extraction(document_id: uuid.UUID, body: EnqueueExtractionRequest, current_user: CurrentUser, db: DB):
    job, _created = await enqueue_document_extraction(db, document_id=document_id, user=current_user, idempotency_key=body.idempotency_key)
    return {"success": True, "data": ExtractionJobResponse(id=job.id, status=job.status.value, route=str(job.payload["route"]), manifest_digest=str(job.payload["manifest_digest"]))}


@router.get("/documents/{document_id}/extractions/{job_id}", response_model=SuccessResponse[ExtractionJobStatusResponse], operation_id="documents_get_extraction", responses=ERROR_RESPONSES)
async def get_extraction(document_id: uuid.UUID, job_id: uuid.UUID, current_user: CurrentUser, db: DB):
    job = await get_job(db, job_id, current_user.id)
    if job.job_type != "document_extraction":
        from app.core.exceptions import NotFoundError
        raise NotFoundError("Extraction job not found")
    return {"success": True, "data": ExtractionJobStatusResponse(id=job.id, status=job.status.value, attempt_count=job.attempt_count, error_message=job.error_message, route=str(job.payload.get("route", "")))}


@router.post("/documents/{document_id}/extractions/{job_id}/cancel", response_model=SuccessResponse[ExtractionJobStatusResponse], operation_id="documents_cancel_extraction", responses=ERROR_RESPONSES)
async def cancel_extraction(document_id: uuid.UUID, job_id: uuid.UUID, current_user: CurrentUser, db: DB):
    job = await cancel_document_extraction(db, document_id=document_id, job_id=job_id, user=current_user)
    return {"success": True, "data": ExtractionJobStatusResponse(id=job.id, status=job.status.value, attempt_count=job.attempt_count, error_message=job.error_message, route=str(job.payload.get("route", "")))}


@router.post("/documents/{document_id}/multipart/initiate", response_model=SuccessResponse[EmptyData], operation_id="documents_multipart_initiate", responses=ERROR_RESPONSES)
async def initiate_multipart_upload(document_id: uuid.UUID, current_user: CurrentUser, db: DB):
    await DocumentService(db).initiate_multipart_upload(document_id, current_user)
    return {"success": True, "data": {}}


@router.post("/documents/{document_id}/multipart/part-urls", response_model=SuccessResponse[MultipartPartUrlResponse], operation_id="documents_multipart_part_urls", responses=ERROR_RESPONSES)
async def multipart_part_urls(document_id: uuid.UUID, body: MultipartPartUrlRequest, current_user: CurrentUser, db: DB):
    result = await DocumentService(db).get_multipart_part_urls(document_id, body.part_numbers, current_user)
    return {"success": True, "data": result.model_dump()}


@router.put("/documents/{document_id}/multipart/parts", response_model=SuccessResponse[EmptyData], operation_id="documents_multipart_record_part", responses=ERROR_RESPONSES)
async def record_multipart_part(document_id: uuid.UUID, body: RecordMultipartPartRequest, current_user: CurrentUser, db: DB):
    await DocumentService(db).record_multipart_part(document_id, part_number=body.part_number, etag=body.etag, size_bytes=body.size_bytes, current_user=current_user)
    return {"success": True, "data": {}}


@router.post("/documents/{document_id}/multipart/complete", response_model=SuccessResponse[EmptyData], operation_id="documents_multipart_complete", responses=ERROR_RESPONSES)
async def complete_multipart_upload(document_id: uuid.UUID, current_user: CurrentUser, db: DB):
    await DocumentService(db).complete_multipart_upload(document_id, current_user)
    return {"success": True, "data": {}}


@router.post("/cases/{case_id}/annexures", status_code=201, response_model=SuccessResponse[EmptyData], operation_id="annexures_create", responses=ERROR_RESPONSES)
async def create_annexure(case_id: uuid.UUID, body: AnnexureCreateRequest, current_user: CurrentUser, db: DB):
    await DocumentService(db).create_annexure(case_id, body.slot_code, body.label, current_user)
    return {"success": True, "data": {}}


@router.put("/annexures/{annexure_id}/assignment", response_model=SuccessResponse[EmptyData], operation_id="annexures_assign_version", responses=ERROR_RESPONSES)
async def assign_annexure(annexure_id: uuid.UUID, body: AnnexureAssignRequest, current_user: CurrentUser, db: DB):
    await DocumentService(db).assign_annexure(annexure_id, body.file_version_id, body.first_page, body.last_page, current_user)
    return {"success": True, "data": {}}


@router.get("/cases/{case_id}/documents", response_model=SuccessResponse[DocumentsData], operation_id="documents_list", responses=ERROR_RESPONSES)
async def list_documents(case_id: uuid.UUID, current_user: CurrentUser, db: DB):
    documents = await DocumentService(db).list_documents(case_id, current_user)
    return {
        "success": True,
        "data": {"documents": [document.model_dump() for document in documents]},
    }


@router.get("/documents/{document_id}", response_model=SuccessResponse[ConfirmUploadResponse], operation_id="documents_get", responses=ERROR_RESPONSES)
async def get_document(document_id: uuid.UUID, current_user: CurrentUser, db: DB):
    document = await DocumentService(db).get_document(document_id, current_user)
    return {"success": True, "data": {"document": document.model_dump()}}


@router.patch("/documents/{document_id}", response_model=SuccessResponse[ConfirmUploadResponse], operation_id="documents_update", responses=ERROR_RESPONSES)
async def update_document(
    document_id: uuid.UUID,
    body: UpdateDocumentRequest,
    current_user: CurrentUser,
    db: DB,
):
    document = await DocumentService(db).update_document(document_id, body, current_user)
    return {"success": True, "data": {"document": document.model_dump()}}


@router.get("/documents/{document_id}/view-url", response_model=SuccessResponse[ViewUrlResponse], operation_id="documents_view_url", responses=ERROR_RESPONSES)
async def get_view_url(document_id: uuid.UUID, current_user: CurrentUser, db: DB):
    result = await DocumentService(db).get_view_url(document_id, current_user)
    return {"success": True, "data": result.model_dump()}


@router.delete("/documents/{document_id}", response_model=SuccessResponse[EmptyData], operation_id="documents_delete", responses=ERROR_RESPONSES)
async def delete_document(document_id: uuid.UUID, current_user: CurrentUser, db: DB):
    await DocumentService(db).delete_document(document_id, current_user)
    return {"success": True, "data": {}}


@router.post("/documents/{document_id}/summary-source/ocr-quote", response_model=SuccessResponse[OcrQuote], operation_id="documents_source_ocr_quote", responses=ERROR_RESPONSES)
async def quote_source_ocr(document_id: uuid.UUID, body: OcrPageRequest, current_user: CurrentUser, db: DB):
    quote=await SourceOcrService(db).quote(document_id,current_user,body)
    return {"success":True,"data":OcrQuote(quote_hash=digest(quote),model=quote['model'],estimated_reservation_paise=quote['estimated_reservation_paise'])}


@router.post("/documents/{document_id}/summary-source/ocr", status_code=status.HTTP_202_ACCEPTED, response_model=SuccessResponse[JobOut], operation_id="documents_source_ocr_submit", responses=ERROR_RESPONSES)
async def submit_source_ocr(document_id: uuid.UUID, body: OcrSubmitRequest, current_user: CurrentUser, db: DB, response: Response, background_tasks: BackgroundTasks):
    submission = await SourceOcrService(db).submit(document_id, current_user, body)
    # SQLAlchemy may load server-managed updated_at lazily after commit. Build
    # the public DTO while this request session is still alive.
    await db.refresh(submission.job)
    result = JobOut.model_validate(submission.job)
    if submission.enqueue:
        from app.worker.tasks.source_ocr import dispatch_queued_source_ocr

        # Starlette runs this only after the HTTP response has been sent. The
        # durable job commit and the serializable DTO already exist by then.
        background_tasks.add_task(dispatch_queued_source_ocr, result.id)
    if result.status not in (JobStatus.queued, JobStatus.running):
        response.status_code = status.HTTP_200_OK
    return {"success": True, "data": result}


@router.post('/documents/{document_id}/summary-source/editor',response_model=SuccessResponse[OriginalSourceResponse],operation_id='documents_save_source_editor',responses=ERROR_RESPONSES)
async def save_source_editor(document_id: uuid.UUID,body: SaveSourceEditorRequest,current_user: CurrentUser,db: DB):
    return {'success':True,'data':await OriginalSourceService(db).save_editor(document_id,current_user,body)}


@router.post('/documents/{document_id}/summary-source/editor-review',response_model=SuccessResponse[OriginalSourceResponse],operation_id='documents_review_source_editor',responses=ERROR_RESPONSES)
async def review_source_editor(document_id: uuid.UUID,body: ReviewSourceEditorRequest,current_user: CurrentUser,db: DB):
    return {'success':True,'data':await OriginalSourceService(db).save_editor(document_id,current_user,body,review=True)}


@router.post('/documents/{document_id}/summary-source/editor-repair',response_model=SuccessResponse[OriginalSourceResponse],operation_id='documents_repair_source_provenance',responses=ERROR_RESPONSES)
async def repair_source_editor(document_id: uuid.UUID, body: ReviewSourceEditorRequest, current_user: CurrentUser, db: DB):
    return {"success":True,"data":await OriginalSourceService(db).repair_editor(document_id,current_user,body)}
