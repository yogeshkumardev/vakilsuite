import logging
import math
import uuid
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ForbiddenError, NotFoundError, ValidationError
from app.features.cases.models import Case, CaseStatus, CaseType, MatterPhase, Proceeding
from app.features.cases.repository import CaseRepository
from app.features.chambers.permissions import ChamberCapability
from app.features.chambers.audit import ChamberAuditEventType
from app.features.chambers.audit_service import record_audit_event
from app.features.chambers.service import (
    get_active_membership,
    require_capability,
    resolve_capable_chamber,
)
from app.features.cases.schemas import (
    CaseAccessGrantRequest,
    CaseAccessResponse,
    CaseCreateRequest,
    CaseDetailResponse,
    CaseNumberCreateRequest,
    CaseNumberResponse,
    CaseNumberUpdateRequest,
    CaseResponse,
    CaseSectionCreateRequest,
    CaseSectionResponse,
    CaseUpdateRequest,
    PaginationMeta,
    PartyCreateRequest,
    PartyResponse,
    PartyUpdateRequest,
    ProceedingCreateRequest,
    ProceedingResponse,
    MatterCreateRequest,
    MatterResponse,
)
from app.features.users.models import User, UserRole
from app.features.users.repository import UserRepository

logger = logging.getLogger(__name__)


class CaseService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = CaseRepository(db)
        self.user_repo = UserRepository(db)

    async def _require_case_edit_access(self, case_id: uuid.UUID, user: User):
        case = await self.repo.get_by_id_simple(case_id)
        if not case:
            raise NotFoundError("Case not found")
        if not await self.repo.can_edit(case_id, user.id):
            raise ForbiddenError("No edit access")

        return case

    async def _require_case_manage_access(self, case_id: uuid.UUID, user: User):
        """Archive/delete are destructive lifecycle operations, not editing."""
        case = await self.repo.get_by_id_simple(case_id)
        if not case or case.chamber_id is None:
            raise NotFoundError("Case not found")
        await require_capability(
            self.db,
            chamber_id=case.chamber_id,
            user_id=user.id,
            capability=ChamberCapability.chamber_manage,
        )
        return case

    async def create_case(
        self,
        data: CaseCreateRequest,
        current_user: User,
        chamber_id: uuid.UUID | None = None,
    ):
        if current_user.role not in (UserRole.lawyer, UserRole.admin):
            raise ForbiddenError("Only lawyers can create cases")
        chamber = await resolve_capable_chamber(
            self.db,
            user_id=current_user.id,
            capability=ChamberCapability.case_write,
            chamber_id=chamber_id,
        )
        case = await self.repo.create(data, current_user.id, chamber.id)

        for number in data.case_numbers:
            await self.repo.add_case_number(case.id, number)
        for section in data.sections:
            await self.repo.add_section(case.id, section, current_user.id)
        for party in data.parties:
            await self.repo.add_party(case.id, party)

        await self.db.commit()
        created = await self.repo.get_by_id(case.id)
        logger.info("Case created: %s", case.id)
        return CaseDetailResponse.model_validate(created)

    async def create_pre_filing_matter(
        self, data: MatterCreateRequest, current_user: User, chamber_id: uuid.UUID | None
    ) -> MatterResponse:
        if current_user.role not in (UserRole.lawyer, UserRole.admin):
            raise ForbiddenError("Only lawyers can create matters")
        chamber = await resolve_capable_chamber(
            self.db, user_id=current_user.id, capability=ChamberCapability.case_write, chamber_id=chamber_id
        )
        matter = Case(
            lawyer_id=current_user.id,
            chamber_id=chamber.id,
            case_title=data.matter_title,
            case_type=CaseType.other,
            matter_phase=MatterPhase.pre_filing,
            notes=data.notes,
        )
        self.db.add(matter)
        await self.db.commit()
        await self.db.refresh(matter)
        return MatterResponse.model_validate(matter)

    async def list_cases(
        self,
        current_user: User,
        *,
        page: int = 1,
        limit: int = 20,
        status: Optional[CaseStatus] = None,
        case_type: Optional[CaseType] = None,
        search: Optional[str] = None,
        chamber_id: uuid.UUID | None = None,
    ):
        cases, total = await self.repo.list_for_lawyer(
            current_user.id,
            chamber_id=chamber_id,
            page=page,
            limit=limit,
            status=status,
            case_type=case_type,
            search=search,
        )
        pagination = PaginationMeta(
            page=page,
            limit=limit,
            total=total,
            total_pages=math.ceil(total / limit) if total else 0,
        )
        return [CaseResponse.model_validate(case) for case in cases], pagination

    async def get_case(self, case_id: uuid.UUID, current_user: User):
        if not await self.repo.can_access(case_id, current_user.id):
            raise NotFoundError("Case not found")

        case = await self.repo.get_by_id(case_id)
        if not case:
            raise NotFoundError("Case not found")

        return CaseDetailResponse.model_validate(case)

    async def update_case(
        self, case_id: uuid.UUID, data: CaseUpdateRequest, current_user: User
    ):
        case = await self._require_case_edit_access(case_id, current_user)
        await self.repo.update(case, data)
        await self.db.commit()

        updated = await self.repo.get_by_id(case_id)
        logger.info("Case updated: %s", case_id)
        return CaseDetailResponse.model_validate(updated)

    async def archive_case(self, case_id: uuid.UUID, current_user: User):
        case = await self._require_case_manage_access(case_id, current_user)
        await self.repo.archive(case)
        await record_audit_event(
            self.db,
            chamber_id=case.chamber_id,
            actor_user_id=current_user.id,
            event_type=ChamberAuditEventType.case_archived,
            resource_type="case",
            resource_id=case.id,
        )
        await self.db.commit()
        logger.info("Case archived: %s", case_id)

    async def delete_case(self, case_id: uuid.UUID, current_user: User):
        case = await self._require_case_manage_access(case_id, current_user)
        await self.repo.soft_delete(case)
        await record_audit_event(
            self.db,
            chamber_id=case.chamber_id,
            actor_user_id=current_user.id,
            event_type=ChamberAuditEventType.case_soft_deleted,
            resource_type="case",
            resource_id=case.id,
        )
        await self.db.commit()
        logger.info("Case and documents soft-deleted: %s", case_id)

    async def grant_access(
        self, case_id: uuid.UUID, data: CaseAccessGrantRequest, current_user: User
    ):
        case = await self._require_case_edit_access(case_id, current_user)

        target = await self.user_repo.get_by_id(data.user_id)
        if not target:
            raise NotFoundError("User not found")
        if target.role not in (UserRole.munshi, UserRole.lawyer):
            raise ValidationError("Invalid role")
        if data.user_id == current_user.id:
            raise ValidationError("Cannot grant self access")
        try:
            await get_active_membership(
                self.db, chamber_id=case.chamber_id, user_id=data.user_id
            )
        except NotFoundError:
            raise ValidationError("User must be an active member of this chamber")

        access = await self.repo.grant_access(data, case_id, current_user.id)
        if case.chamber_id is None:
            raise NotFoundError("Case not found")
        await record_audit_event(
            self.db,
            chamber_id=case.chamber_id,
            actor_user_id=current_user.id,
            event_type=ChamberAuditEventType.case_access_granted,
            resource_type="case",
            resource_id=case.id,
            subject_user_id=data.user_id,
            metadata={"can_edit": data.can_edit},
        )
        await self.db.commit()
        logger.info("Access granted: %s -> %s", case_id, data.user_id)
        return CaseAccessResponse.model_validate(access)

    async def revoke_access(
        self, case_id: uuid.UUID, user_id: uuid.UUID, current_user: User
    ):
        case = await self._require_case_edit_access(case_id, current_user)

        removed = await self.repo.revoke_access(case_id, user_id)
        if not removed:
            raise NotFoundError("Access not found")

        if case.chamber_id is None:
            raise NotFoundError("Case not found")
        await record_audit_event(
            self.db,
            chamber_id=case.chamber_id,
            actor_user_id=current_user.id,
            event_type=ChamberAuditEventType.case_access_revoked,
            resource_type="case",
            resource_id=case.id,
            subject_user_id=user_id,
        )

        await self.db.commit()

    async def add_case_number(
        self, case_id: uuid.UUID, data: CaseNumberCreateRequest, current_user: User
    ):
        await self._require_case_edit_access(case_id, current_user)
        number = await self.repo.add_case_number(case_id, data)
        await self.db.commit()
        return CaseNumberResponse.model_validate(number)

    async def update_case_number(
        self, number_id: uuid.UUID, data: CaseNumberUpdateRequest, current_user: User
    ):
        number = await self.repo.get_case_number(number_id)
        if not number:
            raise NotFoundError("Case number not found")

        await self._require_case_edit_access(number.case_id, current_user)
        number = await self.repo.update_case_number(number, data)
        await self.db.commit()
        return CaseNumberResponse.model_validate(number)

    async def delete_case_number(self, number_id: uuid.UUID, current_user: User):
        number = await self.repo.get_case_number(number_id)
        if not number:
            raise NotFoundError("Case number not found")

        case_id = number.case_id
        await self._require_case_edit_access(case_id, current_user)
        await self.repo.delete_case_number(number)
        await self.db.commit()

    async def add_section(
        self, case_id: uuid.UUID, data: CaseSectionCreateRequest, current_user: User
    ):
        await self._require_case_edit_access(case_id, current_user)
        section = await self.repo.add_section(case_id, data, current_user.id)
        await self.db.commit()
        return CaseSectionResponse.model_validate(section)

    async def remove_section(self, section_id: uuid.UUID, current_user: User):
        section = await self.repo.get_section(section_id)
        if not section:
            raise NotFoundError("Section not found")
        if not section.is_active:
            raise ValidationError("Already removed")

        case_id = section.case_id
        await self._require_case_edit_access(case_id, current_user)
        section = await self.repo.remove_section(section, current_user.id)
        await self.db.commit()
        return CaseSectionResponse.model_validate(section)

    async def get_sections_history(self, case_id: uuid.UUID, current_user: User):
        if not await self.repo.can_access(case_id, current_user.id):
            raise NotFoundError("Case not found")

        sections = await self.repo.get_sections_history(case_id)
        return [CaseSectionResponse.model_validate(section) for section in sections]

    async def add_party(
        self, case_id: uuid.UUID, data: PartyCreateRequest, current_user: User
    ):
        await self._require_case_edit_access(case_id, current_user)
        party = await self.repo.add_party(case_id, data)
        await self.db.commit()
        return PartyResponse.model_validate(party)

    async def update_party(
        self, party_id: uuid.UUID, data: PartyUpdateRequest, current_user: User
    ):
        party = await self.repo.get_party(party_id)
        if not party:
            raise NotFoundError("Party not found")

        await self._require_case_edit_access(party.case_id, current_user)
        party = await self.repo.update_party(party, data)
        await self.db.commit()
        return PartyResponse.model_validate(party)

    async def delete_party(self, party_id: uuid.UUID, current_user: User):
        party = await self.repo.get_party(party_id)
        if not party:
            raise NotFoundError("Party not found")

        case_id = party.case_id
        await self._require_case_edit_access(case_id, current_user)
        await self.repo.delete_party(party)
        await self.db.commit()

    async def create_proceeding(
        self, case_id: uuid.UUID, data: ProceedingCreateRequest, current_user: User
    ) -> ProceedingResponse:
        case = await self._require_case_edit_access(case_id, current_user)
        if case.chamber_id is None:
            raise NotFoundError("Matter not found")
        proceeding = Proceeding(
            matter_id=case.id,
            chamber_id=case.chamber_id,
            title=data.title,
            court_name=data.court_name,
            created_by_user_id=current_user.id,
        )
        self.db.add(proceeding)
        await self.db.commit()
        await self.db.refresh(proceeding)
        return ProceedingResponse.model_validate(proceeding)

    async def list_proceedings(
        self, case_id: uuid.UUID, current_user: User
    ) -> list[ProceedingResponse]:
        case = await self.get_case(case_id, current_user)
        from sqlalchemy import select

        rows = await self.db.scalars(
            select(Proceeding)
            .where(Proceeding.matter_id == case.id)
            .order_by(Proceeding.created_at, Proceeding.id)
        )
        return [ProceedingResponse.model_validate(row) for row in rows]
