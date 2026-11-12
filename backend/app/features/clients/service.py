from __future__ import annotations

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictError, NotFoundError
from app.features.cases.repository import CaseRepository
from app.features.chambers.permissions import ChamberCapability
from app.features.chambers.service import resolve_capable_chamber
from app.features.clients.models import Client, ClientCaseLink
from app.features.clients.repository import ClientRepository
from app.features.clients.schemas import (
    ClientCaseLinkCreateIn,
    ClientCaseLinkOut,
    ClientCreateIn,
    ClientOut,
    ClientUpdateIn,
    normalize_search_text,
)
from app.features.users.models import User


class ClientService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = ClientRepository(db)
        self.case_repo = CaseRepository(db)

    async def list_clients(
        self, *, current_user: User, chamber_id: uuid.UUID, search: str | None, limit: int
    ) -> list[ClientOut]:
        chamber = await resolve_capable_chamber(
            self.db,
            user_id=current_user.id,
            capability=ChamberCapability.case_read,
            chamber_id=chamber_id,
        )
        rows = await self.repo.list(
            chamber_id=chamber.id,
            search=normalize_search_text(search) if search else None,
            limit=limit,
        )
        return [ClientOut.model_validate(row) for row in rows]

    async def create_client(
        self, *, current_user: User, chamber_id: uuid.UUID, data: ClientCreateIn
    ) -> ClientOut:
        chamber = await resolve_capable_chamber(
            self.db,
            user_id=current_user.id,
            capability=ChamberCapability.case_write,
            chamber_id=chamber_id,
        )
        client = await self.repo.create(
            Client(
                chamber_id=chamber.id,
                full_name=data.full_name,
                normalized_name=normalize_search_text(data.full_name),
                phone=data.phone,
                email=str(data.email) if data.email else None,
                address=data.address,
                notes=data.notes,
                created_by_user_id=current_user.id,
            )
        )
        await self.db.commit()
        await self.db.refresh(client)
        return ClientOut.model_validate(client)

    async def update_client(
        self,
        *,
        current_user: User,
        chamber_id: uuid.UUID,
        client_id: uuid.UUID,
        data: ClientUpdateIn,
    ) -> ClientOut:
        chamber = await resolve_capable_chamber(
            self.db,
            user_id=current_user.id,
            capability=ChamberCapability.case_write,
            chamber_id=chamber_id,
        )
        client = await self.repo.get(chamber_id=chamber.id, client_id=client_id)
        if client is None:
            raise NotFoundError("Client not found")
        changes = data.model_dump(exclude_unset=True)
        if "full_name" in changes:
            client.full_name = changes["full_name"]
            client.normalized_name = normalize_search_text(changes["full_name"])
        for field in ("phone", "email", "address", "notes"):
            if field in changes:
                value = changes[field]
                setattr(client, field, str(value) if field == "email" and value else value)
        await self.db.commit()
        await self.db.refresh(client)
        return ClientOut.model_validate(client)

    async def _editable_case_in_chamber(
        self, *, current_user: User, chamber_id: uuid.UUID, case_id: uuid.UUID
    ):
        await resolve_capable_chamber(
            self.db,
            user_id=current_user.id,
            capability=ChamberCapability.case_write,
            chamber_id=chamber_id,
        )
        case = await self.case_repo.get_by_id_simple(case_id)
        if case is None or case.chamber_id != chamber_id or not await self.case_repo.can_edit(case_id, current_user.id):
            raise NotFoundError("Case not found")
        return case

    async def link_client(
        self,
        *,
        current_user: User,
        chamber_id: uuid.UUID,
        case_id: uuid.UUID,
        data: ClientCaseLinkCreateIn,
    ) -> ClientCaseLinkOut:
        await self._editable_case_in_chamber(
            current_user=current_user, chamber_id=chamber_id, case_id=case_id
        )
        client = await self.repo.get(chamber_id=chamber_id, client_id=data.client_id)
        if client is None:
            raise NotFoundError("Client not found")
        if await self.repo.get_link(case_id=case_id, client_id=client.id):
            raise ConflictError("Client is already linked to this case")
        link = await self.repo.create_link(
            ClientCaseLink(
                client_id=client.id,
                case_id=case_id,
                role=data.role,
                linked_by_user_id=current_user.id,
            )
        )
        await self.db.commit()
        link.client = client
        return ClientCaseLinkOut.model_validate(link)

    async def list_case_clients(
        self, *, current_user: User, chamber_id: uuid.UUID, case_id: uuid.UUID
    ) -> list[ClientCaseLinkOut]:
        # Case read access still prevents chamber colleagues from discovering
        # client identities attached to a case they cannot open.
        await resolve_capable_chamber(
            self.db,
            user_id=current_user.id,
            capability=ChamberCapability.case_read,
            chamber_id=chamber_id,
        )
        case = await self.case_repo.get_by_id_simple(case_id)
        if case is None or case.chamber_id != chamber_id or not await self.case_repo.can_access(case_id, current_user.id):
            raise NotFoundError("Case not found")
        return [ClientCaseLinkOut.model_validate(row) for row in await self.repo.list_case_links(case_id=case_id)]

    async def unlink_client(
        self,
        *,
        current_user: User,
        chamber_id: uuid.UUID,
        case_id: uuid.UUID,
        client_id: uuid.UUID,
    ) -> None:
        await self._editable_case_in_chamber(
            current_user=current_user, chamber_id=chamber_id, case_id=case_id
        )
        link = await self.repo.get_link(case_id=case_id, client_id=client_id)
        if link is None:
            raise NotFoundError("Client link not found")
        await self.db.delete(link)
        await self.db.commit()
