from __future__ import annotations

import uuid

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.features.clients.models import Client, ClientCaseLink


class ClientRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, client: Client) -> Client:
        self.db.add(client)
        await self.db.flush()
        return client

    async def get(self, *, chamber_id: uuid.UUID, client_id: uuid.UUID) -> Client | None:
        return await self.db.scalar(
            select(Client).where(Client.id == client_id, Client.chamber_id == chamber_id)
        )

    async def list(
        self, *, chamber_id: uuid.UUID, search: str | None, limit: int
    ) -> list[Client]:
        statement = select(Client).where(Client.chamber_id == chamber_id)
        if search:
            needle = f"%{search}%"
            statement = statement.where(
                or_(
                    Client.normalized_name.ilike(needle),
                    func.coalesce(Client.phone, "").ilike(needle),
                    func.coalesce(Client.email, "").ilike(needle),
                )
            )
        statement = statement.order_by(Client.normalized_name, Client.id).limit(limit)
        return list((await self.db.scalars(statement)).all())

    async def get_link(
        self, *, case_id: uuid.UUID, client_id: uuid.UUID
    ) -> ClientCaseLink | None:
        return await self.db.scalar(
            select(ClientCaseLink).where(
                ClientCaseLink.case_id == case_id, ClientCaseLink.client_id == client_id
            )
        )

    async def create_link(self, link: ClientCaseLink) -> ClientCaseLink:
        self.db.add(link)
        await self.db.flush()
        return link

    async def list_case_links(self, *, case_id: uuid.UUID) -> list[ClientCaseLink]:
        rows = await self.db.scalars(
            select(ClientCaseLink)
            .options(selectinload(ClientCaseLink.client))
            .where(ClientCaseLink.case_id == case_id)
            .order_by(ClientCaseLink.linked_at, ClientCaseLink.id)
        )
        return list(rows)
