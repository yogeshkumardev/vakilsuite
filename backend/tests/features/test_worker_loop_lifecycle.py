import asyncio
from contextlib import asynccontextmanager
from datetime import UTC, datetime, timedelta
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock

import pytest
from sqlalchemy.pool import NullPool

from app.features.jobs.models import JobStatus
from app.worker import database
from app.worker.delivery import MAX_DELIVERIES, reserve_delivery


def test_three_consecutive_task_loops_dispose_their_own_engine(monkeypatch):
    engines = []

    def create(*args, **kwargs):
        assert kwargs["poolclass"] is NullPool
        engine = SimpleNamespace(loop=asyncio.get_running_loop(), dispose=AsyncMock())
        engines.append(engine)
        return engine

    monkeypatch.setattr(database, "create_async_engine", create)
    monkeypatch.setattr(database, "async_sessionmaker", lambda engine, **kw: engine)

    async def run(fail=False):
        async with database.worker_session_factory() as engine:
            assert engine.loop is asyncio.get_running_loop()
            if fail:
                raise RuntimeError("failure")

    for _ in range(3):
        asyncio.run(run())
    with pytest.raises(RuntimeError):
        asyncio.run(run(True))
    assert len({id(e.loop) for e in engines}) == 4
    for engine in engines:
        engine.dispose.assert_awaited_once()
        assert engine.loop.is_closed()


def job(status=JobStatus.queued, payload=None):
    return SimpleNamespace(
        status=status,
        payload=payload or {},
        leased_until=None,
        attempt_count=0,
        completed_at=None,
        error_message=None,
    )


def test_delivery_is_leased_backed_off_and_bounded():
    row = job()
    now = datetime.now(UTC).replace(tzinfo=None)
    delays = []
    for _ in range(MAX_DELIVERIES):
        assert reserve_delivery(row, now)
        delays.append((row.leased_until - now).total_seconds())
        assert not reserve_delivery(row, now)
        now = row.leased_until + timedelta(seconds=1)
    assert delays == sorted(delays)
    assert not reserve_delivery(row, now)
    assert row.status == JobStatus.failed
    assert row.error_message == "WORKER_DELIVERY_EXHAUSTED"
    assert row.attempt_count == 0


def test_unknown_paid_outcome_and_terminal_jobs_are_never_delivered():
    for status in (
        JobStatus.running,
        JobStatus.failed,
        JobStatus.succeeded,
        JobStatus.cancelled,
    ):
        row = job(status)
        assert not reserve_delivery(row)
        assert row.status == status
    assert reserve_delivery(
        job(JobStatus.running, {"response": {"text": "checkpoint"}})
    )


@pytest.mark.asyncio
async def test_task_records_infrastructure_error_and_reraises(monkeypatch):
    from app.worker.tasks import source_ocr

    @asynccontextmanager
    async def broken_session():
        raise RuntimeError("wrong loop")
        yield

    diagnostic = AsyncMock()
    monkeypatch.setattr(source_ocr, "worker_session", broken_session)
    monkeypatch.setattr(source_ocr, "record_worker_failure", diagnostic)
    with pytest.raises(RuntimeError, match="wrong loop"):
        await source_ocr.execute("unused")
    diagnostic.assert_awaited_once()


def test_terminal_ocr_failure_does_not_report_a_successful_celery_task(monkeypatch):
    from app.features.documents.source_ocr import OcrExecutionResult, OcrJobFailed
    from app.worker.tasks import source_ocr

    async def failed(_ident):
        return OcrExecutionResult(failure_code="OCR_REQUEST_REJECTED")

    retry = Mock()
    monkeypatch.setattr(source_ocr, "execute", failed)
    monkeypatch.setattr(source_ocr.transcribe_page, "retry", retry)

    with pytest.raises(OcrJobFailed, match="OCR_REQUEST_REJECTED"):
        source_ocr.transcribe_page.run("job-id")
    retry.assert_not_called()
