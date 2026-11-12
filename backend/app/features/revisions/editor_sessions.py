"""Restricted, short-lived transport for the Android WebView editor host."""
from __future__ import annotations

import hashlib
import secrets
import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.features.revisions.models import EditorBootstrapSession
from app.features.revisions.schemas import (
    EditorBootstrapResponse,
    EditorSessionRevisionRequest,
    WorkingDocumentDetailResponse,
    WorkingDocumentRevisionResponse,
)
from app.features.revisions.service import WorkingDocumentService
from app.features.users.models import User

_BOOTSTRAP_TTL = timedelta(minutes=5)


def _now() -> datetime:
    return datetime.now(UTC).replace(tzinfo=None)


def _hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


class EditorSessionService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.documents = WorkingDocumentService(db)

    async def create_bootstrap(self, *, working_document_id: uuid.UUID, user: User) -> EditorBootstrapResponse:
        document = await self.documents.repo.get_locked(working_document_id)
        if document is None:
            raise NotFoundError("Working document not found")
        await self.documents._require_editable_case(document.case_id, user)
        token = secrets.token_urlsafe(32)
        session = EditorBootstrapSession(
            working_document_id=document.id,
            case_id=document.case_id,
            chamber_id=document.chamber_id,
            user_id=user.id,
            token_sha256=_hash(token),
            expires_at=_now() + _BOOTSTRAP_TTL,
        )
        self.db.add(session)
        await self.db.commit()
        await self.db.refresh(session)
        return EditorBootstrapResponse(session_id=session.id, token=token, expires_at=session.expires_at)

    async def consume(self, *, session_id: uuid.UUID, token: str) -> WorkingDocumentDetailResponse:
        session = await self._validate(session_id, token)
        user = await self.db.get(User, session.user_id)
        if user is None or not user.is_active:
            raise NotFoundError("Editor session not found")
        session.last_used_at = _now()
        detail = await self.documents.get_detail(session.working_document_id, user)
        await self.db.commit()
        return detail

    async def save_revision(self, *, session_id: uuid.UUID, token: str, body: EditorSessionRevisionRequest) -> WorkingDocumentRevisionResponse:
        session = await self._validate(session_id, token)
        user = await self.db.get(User, session.user_id)
        if user is None or not user.is_active:
            raise NotFoundError("Editor session not found")
        session.last_used_at = _now()
        return await self.documents.create_revision(session.working_document_id, body, user)

    async def _validate(self, session_id: uuid.UUID, token: str) -> EditorBootstrapSession:
        session = await self.db.scalar(
            select(EditorBootstrapSession).where(
                EditorBootstrapSession.id == session_id,
                EditorBootstrapSession.token_sha256 == _hash(token),
            )
        )
        if session is None or session.expires_at <= _now():
            raise NotFoundError("Editor session not found")
        return session
