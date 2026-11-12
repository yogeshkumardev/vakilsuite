from app.core.api_responses import (
    ERROR_RESPONSES, SuccessResponse, PermissionsData, CaseData, CasesData, EmptyData,
    AccessData, CaseNumberData, SectionData, SectionsData, PartyData,
)
import uuid
from typing import Optional

from fastapi import APIRouter, Header, Query

from app.core.dependencies import CurrentUser, DB
from app.features.cases.models import CaseStatus, CaseType
from app.features.cases.schemas import (
    CaseAccessGrantRequest,
    CaseCreateRequest,
    CaseNumberCreateRequest,
    CaseNumberUpdateRequest,
    CaseSectionCreateRequest,
    CaseUpdateRequest,
    PartyCreateRequest,
    PartyUpdateRequest,
    ProceedingCreateRequest,
    ProceedingResponse,
    MatterCreateRequest,
    MatterResponse,
)
from app.features.cases.service import CaseService

router = APIRouter(prefix="/cases", tags=["Cases"])
case_numbers_router = APIRouter(prefix="/case-numbers", tags=["Case Numbers"])
case_sections_router = APIRouter(prefix="/case-sections", tags=["Case Sections"])
parties_router = APIRouter(prefix="/parties", tags=["Parties"])
matters_router = APIRouter(prefix="/matters", tags=["Matters"])


@router.get("/{case_id}/permissions", response_model=SuccessResponse[PermissionsData], operation_id="cases_permissions", responses=ERROR_RESPONSES)
async def case_permissions(case_id: uuid.UUID, current_user: CurrentUser, db: DB):
    service = CaseService(db)
    await service.get_case(case_id, current_user)
    return {"success": True, "data": {"can_edit": await service.repo.can_edit(case_id, current_user.id)}}


@router.post("", status_code=201, summary="Create a new case", response_model=SuccessResponse[CaseData], operation_id="cases_create", responses=ERROR_RESPONSES)
async def create_case(
    body: CaseCreateRequest,
    current_user: CurrentUser,
    db: DB,
    x_chamber_id: uuid.UUID | None = Header(default=None),
):
    case = await CaseService(db).create_case(body, current_user, x_chamber_id)
    return {"success": True, "data": {"case": case.model_dump()}}


@router.get("", summary="List cases", response_model=SuccessResponse[CasesData], operation_id="cases_list", responses=ERROR_RESPONSES)
async def list_cases(
    current_user: CurrentUser,
    db: DB,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
    status: Optional[CaseStatus] = Query(default=None),
    case_type: Optional[CaseType] = Query(default=None),
    search: Optional[str] = Query(default=None, max_length=200),
    x_chamber_id: uuid.UUID | None = Header(default=None),
):
    if x_chamber_id is not None:
        from app.features.chambers.permissions import ChamberCapability
        from app.features.chambers.service import require_capability

        await require_capability(
            db,
            chamber_id=x_chamber_id,
            user_id=current_user.id,
            capability=ChamberCapability.case_read,
        )
    cases, pagination = await CaseService(db).list_cases(
        current_user,
        page=page,
        limit=limit,
        status=status,
        case_type=case_type,
        search=search,
        chamber_id=x_chamber_id,
    )
    return {
        "success": True,
        "data": {
            "cases": [case.model_dump() for case in cases],
            "pagination": pagination.model_dump(),
        },
    }


@matters_router.get("/{matter_id}", response_model=SuccessResponse[CaseData], operation_id="matters_get", responses=ERROR_RESPONSES)
async def get_matter(matter_id: uuid.UUID, current_user: CurrentUser, db: DB):
    # Compatibility bridge: Matter ID is the unchanged legacy Case UUID.
    matter = await CaseService(db).get_case(matter_id, current_user)
    return {"success": True, "data": {"case": matter.model_dump()}}


@matters_router.post("", status_code=201, response_model=SuccessResponse[MatterResponse], operation_id="matters_create_pre_filing", responses=ERROR_RESPONSES)
async def create_pre_filing_matter(
    body: MatterCreateRequest,
    current_user: CurrentUser,
    db: DB,
    x_chamber_id: uuid.UUID | None = Header(default=None),
):
    matter = await CaseService(db).create_pre_filing_matter(body, current_user, x_chamber_id)
    return {"success": True, "data": matter}


@router.get("/{case_id}", summary="Get case detail", response_model=SuccessResponse[CaseData], operation_id="cases_get", responses=ERROR_RESPONSES)
async def get_case(case_id: uuid.UUID, current_user: CurrentUser, db: DB):
    case = await CaseService(db).get_case(case_id, current_user)
    return {"success": True, "data": {"case": case.model_dump()}}


@router.patch("/{case_id}", summary="Update case", response_model=SuccessResponse[CaseData], operation_id="cases_update", responses=ERROR_RESPONSES)
async def update_case(
    case_id: uuid.UUID,
    body: CaseUpdateRequest,
    current_user: CurrentUser,
    db: DB,
):
    case = await CaseService(db).update_case(case_id, body, current_user)
    return {"success": True, "data": {"case": case.model_dump()}}


@router.delete("/{case_id}", summary="Archive case", response_model=SuccessResponse[EmptyData], operation_id="cases_archive", responses=ERROR_RESPONSES)
async def archive_case(case_id: uuid.UUID, current_user: CurrentUser, db: DB):
    await CaseService(db).archive_case(case_id, current_user)
    return {"success": True, "data": {}}


@router.post("/{case_id}/soft-delete", summary="Soft-delete case and its documents", response_model=SuccessResponse[EmptyData], operation_id="cases_soft_delete", responses=ERROR_RESPONSES)
async def delete_case(case_id: uuid.UUID, current_user: CurrentUser, db: DB):
    await CaseService(db).delete_case(case_id, current_user)
    return {"success": True, "data": {}}


@router.post("/{case_id}/access", status_code=201, summary="Grant case access", response_model=SuccessResponse[AccessData], operation_id="cases_grant_access", responses=ERROR_RESPONSES)
async def grant_access(
    case_id: uuid.UUID,
    body: CaseAccessGrantRequest,
    current_user: CurrentUser,
    db: DB,
):
    access = await CaseService(db).grant_access(case_id, body, current_user)
    return {"success": True, "data": {"access": access.model_dump()}}


@router.delete("/{case_id}/access/{user_id}", summary="Revoke case access", response_model=SuccessResponse[EmptyData], operation_id="cases_revoke_access", responses=ERROR_RESPONSES)
async def revoke_access(
    case_id: uuid.UUID,
    user_id: uuid.UUID,
    current_user: CurrentUser,
    db: DB,
):
    await CaseService(db).revoke_access(case_id, user_id, current_user)
    return {"success": True, "data": {}}


@router.post("/{case_id}/numbers", status_code=201, summary="Add case number", response_model=SuccessResponse[CaseNumberData], operation_id="case_numbers_create", responses=ERROR_RESPONSES)
async def add_case_number(
    case_id: uuid.UUID,
    body: CaseNumberCreateRequest,
    current_user: CurrentUser,
    db: DB,
):
    number = await CaseService(db).add_case_number(case_id, body, current_user)
    return {"success": True, "data": {"case_number": number.model_dump()}}


@case_numbers_router.patch("/{number_id}", summary="Update case number", response_model=SuccessResponse[CaseNumberData], operation_id="case_numbers_update", responses=ERROR_RESPONSES)
async def update_case_number(
    number_id: uuid.UUID,
    body: CaseNumberUpdateRequest,
    current_user: CurrentUser,
    db: DB,
):
    number = await CaseService(db).update_case_number(number_id, body, current_user)
    return {"success": True, "data": {"case_number": number.model_dump()}}


@case_numbers_router.delete("/{number_id}", summary="Delete case number", response_model=SuccessResponse[EmptyData], operation_id="case_numbers_delete", responses=ERROR_RESPONSES)
async def delete_case_number(number_id: uuid.UUID, current_user: CurrentUser, db: DB):
    await CaseService(db).delete_case_number(number_id, current_user)
    return {"success": True, "data": {}}


@router.post("/{case_id}/sections", status_code=201, summary="Add section", response_model=SuccessResponse[SectionData], operation_id="case_sections_create", responses=ERROR_RESPONSES)
async def add_section(
    case_id: uuid.UUID,
    body: CaseSectionCreateRequest,
    current_user: CurrentUser,
    db: DB,
):
    section = await CaseService(db).add_section(case_id, body, current_user)
    return {"success": True, "data": {"section": section.model_dump()}}


@router.get("/{case_id}/sections/history", summary="Section history", response_model=SuccessResponse[SectionsData], operation_id="case_sections_history", responses=ERROR_RESPONSES)
async def get_sections_history(
    case_id: uuid.UUID,
    current_user: CurrentUser,
    db: DB,
):
    sections = await CaseService(db).get_sections_history(case_id, current_user)
    return {"success": True, "data": {"sections": [s.model_dump() for s in sections]}}


@case_sections_router.delete("/{section_id}", summary="Soft-remove section", response_model=SuccessResponse[SectionData], operation_id="case_sections_remove", responses=ERROR_RESPONSES)
async def remove_section(section_id: uuid.UUID, current_user: CurrentUser, db: DB):
    section = await CaseService(db).remove_section(section_id, current_user)
    return {"success": True, "data": {"section": section.model_dump()}}


@router.post("/{case_id}/parties", status_code=201, summary="Add party", response_model=SuccessResponse[PartyData], operation_id="parties_create", responses=ERROR_RESPONSES)
async def add_party(
    case_id: uuid.UUID,
    body: PartyCreateRequest,
    current_user: CurrentUser,
    db: DB,
):
    party = await CaseService(db).add_party(case_id, body, current_user)
    return {"success": True, "data": {"party": party.model_dump()}}


@router.get("/{case_id}/proceedings", response_model=SuccessResponse[list[ProceedingResponse]], operation_id="proceedings_list", responses=ERROR_RESPONSES)
async def list_proceedings(case_id: uuid.UUID, current_user: CurrentUser, db: DB):
    return {"success": True, "data": await CaseService(db).list_proceedings(case_id, current_user)}


@router.post("/{case_id}/proceedings", status_code=201, response_model=SuccessResponse[ProceedingResponse], operation_id="proceedings_create", responses=ERROR_RESPONSES)
async def create_proceeding(case_id: uuid.UUID, body: ProceedingCreateRequest, current_user: CurrentUser, db: DB):
    return {"success": True, "data": await CaseService(db).create_proceeding(case_id, body, current_user)}


@parties_router.patch("/{party_id}", summary="Update party", response_model=SuccessResponse[PartyData], operation_id="parties_update", responses=ERROR_RESPONSES)
async def update_party(
    party_id: uuid.UUID,
    body: PartyUpdateRequest,
    current_user: CurrentUser,
    db: DB,
):
    party = await CaseService(db).update_party(party_id, body, current_user)
    return {"success": True, "data": {"party": party.model_dump()}}


@parties_router.delete("/{party_id}", summary="Delete party", response_model=SuccessResponse[EmptyData], operation_id="parties_delete", responses=ERROR_RESPONSES)
async def delete_party(party_id: uuid.UUID, current_user: CurrentUser, db: DB):
    await CaseService(db).delete_party(party_id, current_user)
    return {"success": True, "data": {}}
