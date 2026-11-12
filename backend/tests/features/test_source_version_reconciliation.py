import uuid
from types import SimpleNamespace as NS
from unittest.mock import AsyncMock

import pytest

from app.features.documents.models import (
    DocumentContentClassification,
    UploadStatus,
)
from app.features.documents.service import DocumentService
from app.features.documents.source_service import OriginalSourceService
from app.features.documents.verification import VerifiedFile


def verified_file():
    return VerifiedFile(
        detected_mime_type="image/jpeg",
        sha256_hex="a" * 64,
        page_count=None,
        content_classification=DocumentContentClassification.not_applicable,
        page_classification_hints=None,
    )


def uploaded_document():
    return NS(
        id=uuid.uuid4(),
        case_id=uuid.uuid4(),
        chamber_id=uuid.uuid4(),
        r2_key="private/image.jpg",
        r2_bucket="bucket",
        original_filename="photo.jpg",
        mime_type="image/jpeg",
        file_size_bytes=1024,
        uploaded_by=uuid.uuid4(),
        upload_status=UploadStatus.uploaded,
    )


@pytest.mark.asyncio
async def test_uploaded_legacy_image_gets_verified_file_version(monkeypatch):
    db = NS(scalar=AsyncMock(return_value=None))
    service = DocumentService(db)
    created = NS()
    service.repo.create_file_version = AsyncMock(return_value=created)
    document = uploaded_document()

    async def inline(fn, *args):
        return fn(*args)

    monkeypatch.setattr("app.features.documents.service.asyncio.to_thread", inline)
    monkeypatch.setattr(service, "_verify_uploaded_object", lambda _: verified_file())

    result = await service.ensure_verified_current_version(document)

    assert result is created
    values = service.repo.create_file_version.await_args.kwargs
    assert values["document_id"] == document.id
    assert values["upload_status"] == UploadStatus.uploaded
    assert values["detected_mime_type"] == "image/jpeg"
    assert values["sha256_hex"] == "a" * 64


@pytest.mark.asyncio
async def test_incomplete_image_version_is_reverified_before_source_workspace(monkeypatch):
    version = NS(
        upload_status=UploadStatus.pending,
        sha256_hex=None,
        detected_mime_type=None,
        page_count=None,
        content_classification=None,
        page_classification_hints=None,
    )
    db = NS(scalar=AsyncMock(return_value=version), flush=AsyncMock())
    service = DocumentService(db)

    async def inline(fn, *args):
        return fn(*args)

    monkeypatch.setattr("app.features.documents.service.asyncio.to_thread", inline)
    monkeypatch.setattr(service, "_verify_uploaded_object", lambda _: verified_file())

    assert await service.ensure_verified_current_version(uploaded_document()) is version
    assert version.upload_status == UploadStatus.uploaded
    assert version.detected_mime_type == "image/jpeg"
    assert version.sha256_hex == "a" * 64
    db.flush.assert_awaited_once()


@pytest.mark.asyncio
async def test_failed_or_quarantined_original_is_never_reactivated(monkeypatch):
    version = NS(upload_status=UploadStatus.quarantined)
    db = NS(scalar=AsyncMock(return_value=version))
    service = DocumentService(db)
    verify = AsyncMock()
    monkeypatch.setattr(service, "_verify_uploaded_object", verify)

    assert await service.ensure_verified_current_version(uploaded_document()) is version
    verify.assert_not_called()


@pytest.mark.asyncio
async def test_source_workspace_recovers_incomplete_mobile_image_version(monkeypatch):
    document = uploaded_document()
    pending = NS(
        upload_status=UploadStatus.pending,
        sha256_hex=None,
        detected_mime_type=None,
    )
    verified = NS(
        upload_status=UploadStatus.uploaded,
        sha256_hex="b" * 64,
        detected_mime_type="image/jpeg",
    )
    db = NS(scalar=AsyncMock(side_effect=[document, pending]))
    service = OriginalSourceService(db)

    class Cases:
        def __init__(self, _db):
            pass

        async def can_access(self, _case_id, _user_id):
            return True

    recovered = AsyncMock(return_value=verified)
    monkeypatch.setattr("app.features.documents.source_service.CaseRepository", Cases)
    monkeypatch.setattr("app.features.documents.source_service.require_capability", AsyncMock())
    monkeypatch.setattr(DocumentService, "ensure_verified_current_version", recovered)

    result_document, result_version = await service.authorized(
        document.id, NS(id=uuid.uuid4())
    )

    assert result_document is document
    assert result_version is verified
    recovered.assert_awaited_once_with(document)
