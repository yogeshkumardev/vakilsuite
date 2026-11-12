import uuid
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock

import pytest

from app.core.exceptions import ConflictError, ForbiddenError
from app.features.documents.models import UploadStatus
from app.features.documents.schemas import PresignUploadRequest
from app.features.documents.service import DocumentService


def harness(monkeypatch):
    service = DocumentService(AsyncMock())
    service._require_case_edit = AsyncMock(
        return_value=SimpleNamespace(chamber_id=uuid.uuid4())
    )
    records = {}

    async def create(**values):
        doc = SimpleNamespace(**values, upload_status=UploadStatus.pending)
        records[doc.id] = doc
        return doc

    service.repo.create = AsyncMock(side_effect=create)
    service.repo.get_by_id = AsyncMock(side_effect=lambda key: records.get(key))
    service.repo.create_file_version = AsyncMock(
        side_effect=lambda **values: SimpleNamespace(id=uuid.uuid4(), **values)
    )
    service.repo.create_upload_session = AsyncMock()
    r2 = Mock()
    r2.generate_presigned_url.return_value = "https://storage.example/upload"
    monkeypatch.setattr("app.features.documents.service._get_r2_client", lambda: r2)
    return service, records, r2


def request(**overrides):
    return PresignUploadRequest(**{
        "filename": "scan.pdf", "mime_type": "application/pdf", "file_size_bytes": 1200,
        **overrides,
    })


@pytest.mark.asyncio
async def test_retry_reuses_document_and_storage_key(monkeypatch):
    service, records, _ = harness(monkeypatch)
    case, user = uuid.uuid4(), SimpleNamespace(id=uuid.uuid4())
    body = request(client_upload_id=uuid.uuid4())
    first = await service.presign_upload(case, body, user)
    second = await service.presign_upload(case, body, user)
    assert first.document_id == second.document_id
    assert first.r2_key == second.r2_key
    assert len(records) == 1
    assert service.db.execute.await_count == 2
    assert service._require_case_edit.await_count == 2


@pytest.mark.asyncio
async def test_new_upload_creates_immutable_initial_version_and_session(monkeypatch):
    service, _, _ = harness(monkeypatch)
    case, user = uuid.uuid4(), SimpleNamespace(id=uuid.uuid4())
    body = request(client_upload_id=uuid.uuid4())

    result = await service.presign_upload(case, body, user)

    version_values = service.repo.create_file_version.await_args.kwargs
    session_values = service.repo.create_upload_session.await_args.kwargs
    assert version_values["document_id"] == result.document_id
    assert version_values["version_number"] == 1
    assert version_values["r2_key"] == result.r2_key
    assert version_values["declared_mime_type"] == body.mime_type
    assert session_values["document_id"] == result.document_id
    assert session_values["client_upload_id"] == body.client_upload_id


@pytest.mark.asyncio
async def test_completed_retry_cannot_overwrite_uploaded_object(monkeypatch):
    service, records, r2 = harness(monkeypatch)
    case, user = uuid.uuid4(), SimpleNamespace(id=uuid.uuid4())
    body = request(client_upload_id=uuid.uuid4())
    first = await service.presign_upload(case, body, user)
    records[first.document_id].upload_status = UploadStatus.uploaded
    second = await service.presign_upload(case, body, user)
    assert second.already_uploaded is True
    assert second.upload_url == ""
    assert r2.generate_presigned_url.call_count == 1


@pytest.mark.asyncio
async def test_changed_file_metadata_rejects_reused_id(monkeypatch):
    service, _, _ = harness(monkeypatch)
    case, user, upload_id = uuid.uuid4(), SimpleNamespace(id=uuid.uuid4()), uuid.uuid4()
    await service.presign_upload(case, request(client_upload_id=upload_id), user)
    with pytest.raises(ConflictError):
        await service.presign_upload(case, request(client_upload_id=upload_id, file_size_bytes=2200), user)


@pytest.mark.asyncio
async def test_upload_ids_are_scoped_to_user_and_case(monkeypatch):
    service, records, _ = harness(monkeypatch)
    case, user, upload_id = uuid.uuid4(), SimpleNamespace(id=uuid.uuid4()), uuid.uuid4()
    body = request(client_upload_id=upload_id)
    await service.presign_upload(case, body, user)
    await service.presign_upload(uuid.uuid4(), body, user)
    await service.presign_upload(case, body, SimpleNamespace(id=uuid.uuid4()))
    assert len(records) == 3


@pytest.mark.asyncio
async def test_retry_still_requires_case_edit_permission(monkeypatch):
    service, records, _ = harness(monkeypatch)
    service._require_case_edit.side_effect = ForbiddenError("Read-only case")
    with pytest.raises(ForbiddenError):
        await service.presign_upload(uuid.uuid4(), request(client_upload_id=uuid.uuid4()), SimpleNamespace(id=uuid.uuid4()))
    assert not records
    service.db.execute.assert_not_called()


@pytest.mark.asyncio
async def test_web_requests_without_upload_id_keep_existing_behavior(monkeypatch):
    service, records, _ = harness(monkeypatch)
    case, user = uuid.uuid4(), SimpleNamespace(id=uuid.uuid4())
    await service.presign_upload(case, request(), user)
    await service.presign_upload(case, request(), user)
    assert len(records) == 2
    service.db.execute.assert_not_called()
