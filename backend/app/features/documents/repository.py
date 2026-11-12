import uuid
from datetime import UTC, datetime

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.documents.models import (
    DocumentContentClassification,
    Document,
    DocumentFileVersion,
    DocumentUploadSession,
    DocumentUploadPart,
    UploadSessionStatus,
    UploadStatus,
)
from app.features.documents.schemas import UpdateDocumentRequest


def _utcnow() -> datetime:
    return datetime.now(UTC).replace(tzinfo=None)


class DocumentRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, **values) -> Document:
        document = Document(**values)
        self.session.add(document)
        await self.session.flush()
        return document

    async def get_by_id(self, document_id: uuid.UUID) -> Document | None:
        result = await self.session.execute(select(Document).where(Document.id == document_id, Document.deleted_at.is_(None)))
        return result.scalar_one_or_none()

    async def list_for_case(self, case_id: uuid.UUID) -> list[Document]:
        result = await self.session.execute(
            select(Document).where(Document.case_id == case_id, Document.deleted_at.is_(None)).order_by(Document.created_at.desc())
        )
        return list(result.scalars().all())

    async def confirm_upload(self, document: Document) -> Document:
        document.upload_status = UploadStatus.uploaded
        document.updated_at = _utcnow()
        await self.session.flush()
        return document

    async def create_file_version(self, **values) -> DocumentFileVersion:
        version = DocumentFileVersion(**values)
        self.session.add(version)
        await self.session.flush()
        return version

    async def create_upload_session(self, **values) -> DocumentUploadSession:
        session = DocumentUploadSession(**values)
        self.session.add(session)
        await self.session.flush()
        return session

    async def mark_initial_upload_result(
        self,
        document_id: uuid.UUID,
        *,
        succeeded: bool,
        quarantined: bool = False,
        detected_mime_type: str | None = None,
        sha256_hex: str | None = None,
        page_count: int | None = None,
        content_classification: DocumentContentClassification | None = None,
        page_classification_hints: list[dict[str, object]] | None = None,
    ) -> None:
        now = _utcnow()
        file_status = (
            UploadStatus.uploaded
            if succeeded
            else UploadStatus.quarantined if quarantined else UploadStatus.failed
        )
        session_status = (
            UploadSessionStatus.uploaded if succeeded else UploadSessionStatus.failed
        )
        version_values = {"upload_status": file_status}
        if succeeded:
            version_values.update(
                detected_mime_type=detected_mime_type,
                sha256_hex=sha256_hex,
                page_count=page_count,
                content_classification=content_classification,
                page_classification_hints=page_classification_hints,
            )
        await self.session.execute(
            update(DocumentFileVersion)
            .where(
                DocumentFileVersion.document_id == document_id,
                DocumentFileVersion.version_number == 1,
            )
            .values(**version_values)
        )
        await self.session.execute(
            update(DocumentUploadSession)
            .where(DocumentUploadSession.document_id == document_id)
            .values(
                status=session_status,
                completed_at=now if succeeded else None,
            )
        )

    async def get_upload_session(self, document_id: uuid.UUID) -> DocumentUploadSession | None:
        result = await self.session.execute(
            select(DocumentUploadSession).where(DocumentUploadSession.document_id == document_id)
        )
        return result.scalar_one_or_none()

    async def record_multipart_part(self, **values) -> None:
        await self.session.execute(
            update(DocumentUploadPart)
            .where(
                DocumentUploadPart.upload_session_id == values["upload_session_id"],
                DocumentUploadPart.part_number == values["part_number"],
            )
            .values(etag=values["etag"], size_bytes=values["size_bytes"])
        )
        existing = await self.session.execute(
            select(DocumentUploadPart.id).where(
                DocumentUploadPart.upload_session_id == values["upload_session_id"],
                DocumentUploadPart.part_number == values["part_number"],
            )
        )
        if existing.scalar_one_or_none() is None:
            self.session.add(DocumentUploadPart(**values))
        await self.session.flush()

    async def list_multipart_parts(self, upload_session_id: uuid.UUID) -> list[DocumentUploadPart]:
        result = await self.session.execute(
            select(DocumentUploadPart)
            .where(DocumentUploadPart.upload_session_id == upload_session_id)
            .order_by(DocumentUploadPart.part_number)
        )
        return list(result.scalars())

    async def list_expired_multipart_sessions(self, now: datetime) -> list[DocumentUploadSession]:
        result = await self.session.execute(
            select(DocumentUploadSession)
            .where(
                DocumentUploadSession.status == UploadSessionStatus.pending,
                DocumentUploadSession.expires_at < now,
                DocumentUploadSession.multipart_upload_id.is_not(None),
            )
            .with_for_update(skip_locked=True)
        )
        return list(result.scalars())

    async def update(self, document: Document, data: UpdateDocumentRequest) -> Document:
        for key, value in data.model_dump(exclude_none=True).items():
            setattr(document, key, value)
        document.updated_at = _utcnow()
        await self.session.flush()
        return document

    async def soft_delete(self, document: Document) -> None:
        document.deleted_at = _utcnow()
        document.updated_at = _utcnow()
        await self.session.flush()
