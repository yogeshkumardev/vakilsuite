"""Explicit retries create a fresh run while duplicate clicks reuse active work."""

import uuid
from datetime import UTC, datetime
from types import SimpleNamespace as NS
from unittest.mock import AsyncMock, Mock

import pytest

from app.features.summaries.models import SummaryRunStatus
from app.features.summaries.schemas import PrepareSummaryRunRequest
from app.features.summaries.service import SummaryPreparationService


@pytest.mark.asyncio
async def test_failed_summary_prepare_creates_one_new_attempt(monkeypatch):
    from app.features.documents import source_eligibility
    from app.features.summaries import coverage, service as summary_service

    case_id, chamber_id, document_id, revision_id = (uuid.uuid4() for _ in range(4))
    case = NS(id=case_id, chamber_id=chamber_id)
    document = NS(id=document_id, case_id=case_id, document_kind="original_source")
    revision = NS(
        id=revision_id,
        working_document_id=document_id,
        content_sha256="a" * 64,
        source_map=[{"path": "page:1", "start": 0, "end": 4}],
    )
    eligibility = NS(
        eligible=True, revision_id=revision_id, revision_hash="a" * 64,
        reasons=[],
    )
    failed = NS(status=SummaryRunStatus.failed)
    add = Mock()
    scalar_calls = 0

    async def scalar(_statement):
        nonlocal scalar_calls
        scalar_calls += 1
        return case_id if scalar_calls % 2 else failed if scalar_calls == 2 else add.call_args.args[0]

    async def flush():
        run = add.call_args.args[0]
        run.id = uuid.uuid4()
        run.created_at = datetime.now(UTC).replace(tzinfo=None)

    db = NS(
        scalar=scalar, add=add, add_all=Mock(), flush=flush,
        commit=AsyncMock(), refresh=AsyncMock(),
    )
    service = SummaryPreparationService(db)
    service._require_editable_case = AsyncMock(return_value=case)
    service.working_documents.get = AsyncMock(return_value=document)
    service.working_documents.get_revision = AsyncMock(return_value=revision)
    service.eligibility.resolve = AsyncMock(return_value=eligibility)
    monkeypatch.setattr(source_eligibility, "original_page_metadata", AsyncMock(return_value={"page_paths": {"page:1": 1}}))
    monkeypatch.setattr(coverage, "require_case_coverage", AsyncMock())
    monkeypatch.setattr(summary_service, "get_policy_output", AsyncMock(return_value=NS(version=3)))

    body = PrepareSummaryRunRequest(sources=[{
        "working_document_id": document_id,
        "revision_id": revision_id,
        "expected_revision_sha256": "a" * 64,
    }])
    first = await service.prepare(case_id=case_id, body=body, user=NS(id=uuid.uuid4()))
    second = await service.prepare(case_id=case_id, body=body, user=NS(id=uuid.uuid4()))

    assert first.id == second.id
    assert first.status == second.status == "pending"
    add.assert_called_once()
    db.commit.assert_awaited_once()
