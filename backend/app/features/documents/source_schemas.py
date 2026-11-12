import uuid
from pydantic import BaseModel, ConfigDict, Field


class SourcePage(BaseModel):
    page_number: int
    text: str
    native: bool
    nontext_images: bool = False
    reason: str
    ocr_status: str | None = None
    ocr_error: str | None = None


class OriginalSourceResponse(BaseModel):
    file_version_id: uuid.UUID
    source_sha256: str
    mode: str
    pages: list[SourcePage]
    page_count: int = 0
    editor_document: dict | None = None
    ocr_can_restart: bool = False
    ocr_can_retry: bool = False
    ocr_retry_may_charge: bool = False
    ocr_attempt_count: int = 0
    editor_version: int = 1
    working_document_id: uuid.UUID | None = None
    ocr_status: str | None = None
    ocr_error: str | None = None


class SourceOcrStatusResponse(BaseModel):
    """Small, storage-free view of the current full-document typing job."""

    job_id: uuid.UUID | None = None
    status: str | None = None
    error: str | None = None
    can_restart: bool = False
    can_retry: bool = False
    retry_may_charge: bool = False
    attempt_count: int = 0


class ReviewOriginalRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    expected_source_sha256: str = Field(pattern=r"^[a-f0-9]{64}$")
    page_texts: dict[int, str] = Field(max_length=500)
    confirmed: bool


class SaveSourceEditorRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    expected_source_sha256: str = Field(pattern=r"^[a-f0-9]{64}$")
    expected_editor_version: int = Field(ge=1)
    editor_document: dict


class ReviewSourceEditorRequest(SaveSourceEditorRequest):
    confirmed: bool
