import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.features.documents.models import DocumentType, FileOrigin, UploadStatus


class PresignUploadRequest(BaseModel):
    client_upload_id: uuid.UUID | None = None
    filename: str = Field(..., min_length=1, max_length=500)
    mime_type: str = Field(..., min_length=1, max_length=100)
    document_type: DocumentType = DocumentType.other
    # Old clients omit this.  Treat their source as unknown rather than
    # inventing provenance; S04-05/06 will send the accurate source.
    origin: FileOrigin = FileOrigin.unknown
    file_size_bytes: int = Field(..., gt=0, le=52_428_800)


class ConfirmUploadRequest(BaseModel):
    pass


class UpdateDocumentRequest(BaseModel):
    document_type: DocumentType | None = None
    display_name: str | None = Field(None, max_length=500)


class DocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    case_id: uuid.UUID
    uploaded_by: uuid.UUID
    original_filename: str
    r2_key: str
    r2_bucket: str
    mime_type: str
    file_size_bytes: int
    document_type: DocumentType
    display_name: str | None
    upload_status: UploadStatus
    created_at: datetime
    updated_at: datetime


class PresignUploadResponse(BaseModel):
    already_uploaded: bool = False
    upload_url: str
    document_id: uuid.UUID
    r2_key: str
    expires_in_seconds: int = 900


class ConfirmUploadResponse(BaseModel):
    document: DocumentResponse


class ViewUrlResponse(BaseModel):
    url: str
    expires_at: datetime


class MultipartPartUrlRequest(BaseModel):
    part_numbers: list[int] = Field(..., min_length=1, max_length=100)


class MultipartPartUrl(BaseModel):
    part_number: int
    upload_url: str


class MultipartPartUrlResponse(BaseModel):
    expires_in_seconds: int = 900
    parts: list[MultipartPartUrl]


class RecordMultipartPartRequest(BaseModel):
    part_number: int = Field(..., ge=1, le=10_000)
    etag: str = Field(..., min_length=1, max_length=512)
    size_bytes: int = Field(..., gt=0)


class CompleteMultipartUploadRequest(BaseModel):
    pass


class AnnexureCreateRequest(BaseModel):
    slot_code: str = Field(..., min_length=1, max_length=32, pattern=r"^[A-Za-z0-9_-]+$")
    label: str = Field(..., min_length=1, max_length=500)


class AnnexureAssignRequest(BaseModel):
    file_version_id: uuid.UUID
    first_page: int | None = Field(None, ge=1)
    last_page: int | None = Field(None, ge=1)


class EnqueueExtractionRequest(BaseModel):
    idempotency_key: str = Field(min_length=8, max_length=128)


class ExtractionJobResponse(BaseModel):
    id: uuid.UUID
    status: str
    route: str
    manifest_digest: str


class ExtractionJobStatusResponse(BaseModel):
    id: uuid.UUID
    status: str
    attempt_count: int
    error_message: str | None
    route: str
