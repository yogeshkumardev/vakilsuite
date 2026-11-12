from __future__ import annotations

import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.revisions.models import WorkingDocument, WorkingDocumentRevision


class WorkingDocumentRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_locked(self, document_id: uuid.UUID) -> WorkingDocument | None:
        return await self.db.scalar(
            select(WorkingDocument)
            .where(WorkingDocument.id == document_id, WorkingDocument.deleted_at.is_(None))
            .with_for_update()
        )

    async def get(self, document_id: uuid.UUID) -> WorkingDocument | None:
        return await self.db.scalar(
            select(WorkingDocument).where(
                WorkingDocument.id == document_id, WorkingDocument.deleted_at.is_(None)
            )
        )

    async def list_for_case(self, case_id: uuid.UUID) -> list[WorkingDocument]:
        return list(
            (await self.db.scalars(
                select(WorkingDocument)
                .where(WorkingDocument.case_id == case_id, WorkingDocument.deleted_at.is_(None))
                .order_by(WorkingDocument.updated_at.desc(), WorkingDocument.id.desc())
            )).all()
        )

    async def get_latest_revision(self, document_id: uuid.UUID) -> WorkingDocumentRevision | None:
        return await self.db.scalar(
            select(WorkingDocumentRevision)
            .where(WorkingDocumentRevision.working_document_id == document_id)
            .order_by(WorkingDocumentRevision.revision_number.desc())
            .limit(1)
        )

    async def get_by_client_mutation(
        self, document_id: uuid.UUID, client_mutation_id: uuid.UUID
    ) -> WorkingDocumentRevision | None:
        return await self.db.scalar(
            select(WorkingDocumentRevision).where(
                WorkingDocumentRevision.working_document_id == document_id,
                WorkingDocumentRevision.client_mutation_id == client_mutation_id,
            )
        )

    async def get_revision(self, document_id: uuid.UUID, revision_id: uuid.UUID) -> WorkingDocumentRevision | None:
        return await self.db.scalar(
            select(WorkingDocumentRevision).where(
                WorkingDocumentRevision.id == revision_id,
                WorkingDocumentRevision.working_document_id == document_id,
            )
        )

    async def get_next_revision_number(self, document_id: uuid.UUID) -> int:
        current = await self.db.scalar(
            select(func.max(WorkingDocumentRevision.revision_number)).where(
                WorkingDocumentRevision.working_document_id == document_id
            )
        )
        return (current or 0) + 1
