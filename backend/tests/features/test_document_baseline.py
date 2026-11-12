import json
import uuid
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock

import pytest

from app.core.exceptions import ForbiddenError, NotFoundError, ValidationError
from app.features.documents.models import UploadStatus
from app.features.documents.models import DocumentContentClassification
from app.features.documents.schemas import DocumentResponse, UpdateDocumentRequest
from app.features.documents.service import DocumentService


def harness(monkeypatch, *, can_edit=True, can_access=True):
    fixture = json.loads((Path(__file__).parents[1] / "fixtures/baseline.json").read_text())
    document = SimpleNamespace(**DocumentResponse.model_validate(fixture["confirm_response"]["data"]["document"]).model_dump())
    service = DocumentService(AsyncMock())
    case = SimpleNamespace(id=document.case_id, chamber_id=uuid.uuid4())
    service.db.execute.return_value = Mock(scalar_one_or_none=Mock(return_value=case))
    service.repo.get_by_id = AsyncMock(return_value=document)
    service.repo.confirm_upload = AsyncMock(return_value=document)
    service.repo.mark_initial_upload_result = AsyncMock()
    service._verify_uploaded_object = Mock(
        return_value=SimpleNamespace(
            detected_mime_type=document.mime_type,
            sha256_hex="a" * 64,
            page_count=1,
            content_classification=DocumentContentClassification.digital,
            page_classification_hints=[{"page_number": 1, "text_layer": "present"}],
        )
    )
    service.case_repo.can_edit = AsyncMock(return_value=can_edit)
    service.case_repo.can_access = AsyncMock(return_value=can_access)
    storage = Mock()
    storage.generate_presigned_url.return_value = "https://storage.example.invalid/original.pdf"
    monkeypatch.setattr("app.features.documents.service._get_r2_client", lambda: storage)
    return service, document, storage, SimpleNamespace(id=uuid.uuid4())


@pytest.mark.asyncio
async def test_confirmation_verifies_and_can_be_retried(monkeypatch):
    service, document, storage, user = harness(monkeypatch)
    for _ in range(2):
        result = await service.confirm_upload(document.id, user)
        assert set(result.model_dump()) == {"document"}
        assert result.document.upload_status == UploadStatus.uploaded
    assert service._verify_uploaded_object.call_count == 2


@pytest.mark.asyncio
async def test_outsider_cannot_read_or_sign_original(monkeypatch):
    service, document, storage, user = harness(monkeypatch, can_access=False)
    for operation in (service.get_document, service.get_view_url):
        with pytest.raises(NotFoundError):
            await operation(document.id, user)
    storage.generate_presigned_url.assert_not_called()


@pytest.mark.asyncio
async def test_read_only_user_cannot_confirm_update_or_delete(monkeypatch):
    service, document, storage, user = harness(monkeypatch, can_edit=False)
    with pytest.raises(ForbiddenError):
        await service.confirm_upload(document.id, user)
    with pytest.raises(ForbiddenError):
        await service.delete_document(document.id, user)
    with pytest.raises(ForbiddenError):
        await service.update_document(document.id, UpdateDocumentRequest(display_name="Denied"), user)
    storage.head_object.assert_not_called()
    storage.delete_object.assert_not_called()


@pytest.mark.asyncio
async def test_document_removal_is_soft_and_does_not_break_reviewed_provenance(monkeypatch):
    service, document, storage, user = harness(monkeypatch)
    service.repo.soft_delete = AsyncMock()

    await service.delete_document(document.id, user)

    service.repo.soft_delete.assert_awaited_once_with(document)
    storage.delete_object.assert_not_called()
    service.db.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_original_requires_confirmed_upload(monkeypatch):
    service, document, storage, user = harness(monkeypatch)
    document.upload_status = UploadStatus.pending
    with pytest.raises(ValidationError):
        await service.get_view_url(document.id, user)
    storage.generate_presigned_url.assert_not_called()
    document.upload_status = UploadStatus.uploaded
    assert (await service.get_view_url(document.id, user)).url.startswith("https://")
