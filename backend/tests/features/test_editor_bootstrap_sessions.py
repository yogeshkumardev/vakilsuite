import uuid
from datetime import datetime, timedelta
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock

import pytest

from app.core.exceptions import NotFoundError
from app.features.revisions.editor_sessions import EditorSessionService, _hash
from app.main import app


@pytest.mark.asyncio
async def test_bootstrap_persists_only_a_hash_and_expires_quickly():
    db = AsyncMock()
    db.add = Mock()
    async def assign_id(session):
        session.id = uuid.uuid4()
    db.refresh = AsyncMock(side_effect=assign_id)
    service = EditorSessionService(db)
    document = SimpleNamespace(id=uuid.uuid4(), case_id=uuid.uuid4(), chamber_id=uuid.uuid4())
    user = SimpleNamespace(id=uuid.uuid4())
    service.documents.repo.get_locked = AsyncMock(return_value=document)
    service.documents._require_editable_case = AsyncMock()
    result = await service.create_bootstrap(working_document_id=document.id, user=user)
    saved = db.add.call_args.args[0]
    assert saved.working_document_id == document.id
    assert saved.user_id == user.id
    assert saved.token_sha256 == _hash(result.token)
    assert saved.token_sha256 != result.token
    assert datetime.now() < saved.expires_at <= datetime.now() + timedelta(minutes=6)


@pytest.mark.asyncio
async def test_invalid_or_expired_bootstrap_token_is_not_authorized():
    db = AsyncMock()
    service = EditorSessionService(db)
    db.scalar = AsyncMock(return_value=None)
    with pytest.raises(NotFoundError):
        await service._validate(uuid.uuid4(), "x" * 43)


def test_editor_bootstrap_routes_are_scoped_and_named():
    paths = app.openapi()["paths"]
    assert paths["/api/v1/working-documents/{document_id}/editor-bootstrap"]["post"]["operationId"] == "working_documents_create_editor_bootstrap"
    assert paths["/api/v1/editor-sessions/{session_id}/consume"]["post"]["operationId"] == "editor_sessions_consume"
    assert paths["/api/v1/editor-sessions/{session_id}/revisions"]["post"]["operationId"] == "editor_sessions_create_revision"
