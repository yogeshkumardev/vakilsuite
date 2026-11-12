"""Public v1 response envelopes. Keep these aligned with the actual wire format."""

import uuid
from typing import Any, Generic, Literal, TypeVar

from pydantic import BaseModel, ConfigDict

from app.features.auth.schemas import SessionResponse
from app.features.cases.schemas import (
    CaseAccessResponse, CaseDetailResponse, CaseNumberResponse, CaseResponse,
    CaseSectionResponse, PaginationMeta, PartyResponse,
)
from app.features.documents.schemas import DocumentResponse
from app.features.users.schemas import LawyerProfileResponse, MunshiResponse

T = TypeVar("T")


class SuccessResponse(BaseModel, Generic[T]):
    success: Literal[True]
    data: T


class EmptyData(BaseModel):
    model_config = ConfigDict(extra="forbid")


class ErrorDetail(BaseModel):
    code: str
    message: str
    details: dict[str, Any]


class ErrorResponse(BaseModel):
    success: Literal[False]
    error: ErrorDetail


class MessageData(BaseModel):
    message: str


class RefreshData(BaseModel):
    access_token: str
    # Browser responses omit refresh_token; native responses include it.
    refresh_token: str | None = None
    token_type: Literal["bearer"]
    session_id: uuid.UUID


class AuthData(RefreshData):
    user: LawyerProfileResponse


class SessionsData(BaseModel):
    sessions: list[SessionResponse]


class MunshiData(BaseModel):
    user: MunshiResponse


class MunshisData(BaseModel):
    users: list[MunshiResponse]


class CaseData(BaseModel):
    case: CaseDetailResponse


class CasesData(BaseModel):
    cases: list[CaseResponse]
    pagination: PaginationMeta


class PermissionsData(BaseModel):
    can_edit: bool


class AccessData(BaseModel):
    access: CaseAccessResponse


class CaseNumberData(BaseModel):
    case_number: CaseNumberResponse


class SectionData(BaseModel):
    section: CaseSectionResponse


class SectionsData(BaseModel):
    sections: list[CaseSectionResponse]


class PartyData(BaseModel):
    party: PartyResponse


class DocumentsData(BaseModel):
    documents: list[DocumentResponse]


class HealthResponse(BaseModel):
    status: Literal["ok"]


ERROR_RESPONSES = {
    code: {"model": ErrorResponse}
    for code in (401, 403, 404, 409, 413, 422, 429, 500, 503)
}
