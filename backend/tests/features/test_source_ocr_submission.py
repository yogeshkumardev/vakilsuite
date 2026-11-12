import asyncio
import uuid
from datetime import UTC, datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from fastapi import BackgroundTasks, Response

from app.features.documents import router as document_router
from app.features.documents import source_ocr as ocr
from app.features.jobs.models import JobStatus


def job(status=JobStatus.queued):
    now = datetime.now(UTC).replace(tzinfo=None)
    return SimpleNamespace(
        id=uuid.uuid4(),
        job_type=ocr.JOB_TYPE,
        status=status,
        case_id=uuid.uuid4(),
        attempt_count=0,
        max_attempts=4,
        result_summary=None,
        error_message=None,
        queued_at=now,
        started_at=None,
        completed_at=None,
        created_at=now,
        updated_at=now,
    )


@pytest.mark.asyncio
async def test_submit_builds_job_dto_before_background_dispatch(monkeypatch):
    queued = job()
    db = SimpleNamespace(refresh=AsyncMock())
    submit = AsyncMock(return_value=ocr.OcrSubmission(job=queued, enqueue=True))
    monkeypatch.setattr(
        document_router, "SourceOcrService", lambda _db: SimpleNamespace(submit=submit)
    )

    tasks = BackgroundTasks()
    response = Response(status_code=202)
    result = await document_router.submit_source_ocr(
        queued.case_id,
        ocr.OcrSubmitRequest(
            page_number=0,
            expected_source_sha256="a" * 64,
            expected_quote_hash="b" * 64,
        ),
        SimpleNamespace(id=uuid.uuid4()),
        db,
        response,
        tasks,
    )

    db.refresh.assert_awaited_once_with(queued)
    assert result["data"].updated_at == queued.updated_at
    assert len(tasks.tasks) == 1
    assert tasks.tasks[0].args == (queued.id,)


@pytest.mark.asyncio
async def test_concurrent_submit_creates_one_job_and_one_delivery_intent(monkeypatch):
    lock = asyncio.Lock()
    shared = SimpleNamespace(job=None, created=0)
    owner = SimpleNamespace(id=uuid.uuid4())
    document = SimpleNamespace(id=uuid.uuid4(), chamber_id=uuid.uuid4(), case_id=uuid.uuid4())
    version = SimpleNamespace(id=uuid.uuid4())
    quote = {"model": "fixture"}
    created = job()

    class Db:
        async def commit(self):
            if lock.locked():
                lock.release()

    async def existing_request(_document_id, _owner, _body):
        await lock.acquire()
        return document, version, shared.job

    async def get_or_create(_db, **_kwargs):
        shared.created += 1
        shared.job = created
        return created, True

    monkeypatch.setattr(ocr, "get_or_create_job", get_or_create)
    services = [ocr.SourceOcrService(Db()), ocr.SourceOcrService(Db())]
    for service in services:
        service.existing_request = existing_request
        service.prepare = AsyncMock(return_value=(document, version, b"", quote))
    monkeypatch.setattr(ocr, "digest", lambda _value: "b" * 64)
    body = ocr.OcrSubmitRequest(
        page_number=0,
        expected_source_sha256="a" * 64,
        expected_quote_hash="b" * 64,
    )

    first, second = await asyncio.gather(
        *(service.submit(document.id, owner, body) for service in services)
    )

    assert shared.created == 1
    assert [first.enqueue, second.enqueue].count(True) == 1
    assert first.job is second.job is created
    assert sum(service.prepare.await_count for service in services) == 1
