import uuid
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock

import pytest

from app.features.documents.models import UploadStatus
from app.features.revisions.eligibility import (
    EligibilityReason,
    SourceDependency,
    SourceEligibilityResolver,
)
from app.features.revisions.models import RevisionStatus


def resolver_harness(monkeypatch, *, latest=True, revision_status=RevisionStatus.approved):
    resolver = SourceEligibilityResolver(AsyncMock())
    chamber_id = uuid.uuid4()
    case_id = uuid.uuid4()
    working_document = SimpleNamespace(
        id=uuid.uuid4(), case_id=case_id, chamber_id=chamber_id
    )
    case = SimpleNamespace(id=case_id, chamber_id=chamber_id, deleted_at=None)
    revision = SimpleNamespace(
        id=uuid.uuid4(), content_sha256="a" * 64, status=revision_status
    )
    resolver.revision_repo.get = AsyncMock(return_value=working_document)
    resolver.revision_repo.get_revision = AsyncMock(return_value=revision)
    resolver.revision_repo.get_latest_revision = AsyncMock(
        return_value=revision if latest else SimpleNamespace(id=uuid.uuid4())
    )
    resolver.case_repo.can_access = AsyncMock(return_value=True)
    resolver.db.scalar = AsyncMock(return_value=case)
    monkeypatch.setattr("app.features.revisions.eligibility.require_capability", AsyncMock())
    return resolver, SimpleNamespace(id=uuid.uuid4()), working_document, revision, case


@pytest.mark.asyncio
async def test_only_current_approved_exact_hash_revision_is_eligible(monkeypatch):
    resolver, user, document, revision, _ = resolver_harness(monkeypatch)
    result = await resolver.resolve(
        user=user,
        working_document_id=document.id,
        revision_id=revision.id,
        expected_revision_sha256="a" * 64,
    )
    assert result.eligible
    assert result.reasons == (EligibilityReason.eligible,)


@pytest.mark.asyncio
async def test_pending_or_stale_revision_cannot_be_used_as_a_source(monkeypatch):
    resolver, user, document, revision, _ = resolver_harness(
        monkeypatch, latest=False, revision_status=RevisionStatus.submitted
    )
    result = await resolver.resolve(
        user=user,
        working_document_id=document.id,
        revision_id=revision.id,
        expected_revision_sha256="b" * 64,
    )
    assert not result.eligible
    assert set(result.reasons) == {
        EligibilityReason.revision_hash_mismatch,
        EligibilityReason.revision_not_approved,
        EligibilityReason.revision_is_not_current,
    }


@pytest.mark.asyncio
async def test_verified_source_requires_same_case_hash_upload_and_valid_coverage(monkeypatch):
    resolver, user, working_document, revision, case = resolver_harness(monkeypatch)
    source_id = uuid.uuid4()
    version = SimpleNamespace(
        id=source_id,
        chamber_id=working_document.chamber_id,
        upload_status=UploadStatus.uploaded,
        sha256_hex="c" * 64,
        page_count=2,
    )
    source_document = SimpleNamespace(
        case_id=case.id,
        chamber_id=working_document.chamber_id,
        deleted_at=None,
        upload_status=UploadStatus.uploaded,
    )
    resolver.db.execute = AsyncMock(return_value=Mock(one_or_none=Mock(return_value=(version, source_document))))
    source = SourceDependency(
        file_version_id=source_id,
        expected_sha256="c" * 64,
        first_page=1,
        last_page=3,
    )
    result = await resolver.resolve(
        user=user,
        working_document_id=working_document.id,
        revision_id=revision.id,
        expected_revision_sha256="a" * 64,
        sources=(source,),
    )
    assert not result.eligible
    assert result.reasons == (EligibilityReason.source_coverage_invalid,)


@pytest.mark.asyncio
async def test_source_hash_and_upload_state_are_rechecked_at_use_time(monkeypatch):
    resolver, user, working_document, revision, case = resolver_harness(monkeypatch)
    version = SimpleNamespace(
        chamber_id=working_document.chamber_id,
        upload_status=UploadStatus.failed,
        sha256_hex="d" * 64,
        page_count=1,
    )
    source_document = SimpleNamespace(
        case_id=case.id,
        chamber_id=working_document.chamber_id,
        deleted_at=None,
        upload_status=UploadStatus.uploaded,
    )
    resolver.db.execute = AsyncMock(return_value=Mock(one_or_none=Mock(return_value=(version, source_document))))
    result = await resolver.resolve(
        user=user,
        working_document_id=working_document.id,
        revision_id=revision.id,
        expected_revision_sha256="a" * 64,
        sources=(SourceDependency(file_version_id=uuid.uuid4(), expected_sha256="x" * 64),),
    )
    assert not result.eligible
    assert result.reasons == (EligibilityReason.source_not_uploaded,)
