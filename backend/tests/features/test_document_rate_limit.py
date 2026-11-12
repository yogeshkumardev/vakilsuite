"""Opening/polling/saving sources must never spend the paid-action quota."""
from unittest.mock import AsyncMock

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from app.middleware import rate_limit


@pytest.fixture
def client(monkeypatch):
    redis = AsyncMock()
    redis.incr.return_value = 31
    monkeypatch.setattr(rate_limit.RateLimitMiddleware, "_get_redis", AsyncMock(return_value=redis))
    monkeypatch.setattr(rate_limit, "decode_access_token", lambda _: {"sub": "test-user"})
    app = FastAPI()
    app.add_middleware(rate_limit.RateLimitMiddleware)

    @app.api_route("/{path:path}", methods=["POST", "GET"])
    def operation(path: str):
        return {"success": True, "data": {"called": True}}

    with TestClient(app) as client:
        yield client, redis


@pytest.mark.parametrize("path", [
    "documents/doc/summary-source", "documents/doc/summary-source/editor",
    "documents/doc/summary-source/editor-review", "documents/doc/summary-source/editor-repair",
    "documents/doc/confirm-upload", "cases/case/documents/presign",
    "cases/case/summary-runs", "cases/case/okf-contexts", "cases/case/okf-export-preview",
])
def test_document_work_remains_available_when_ai_quota_exhausted(client, path):
    http, redis = client
    for _ in range(35):
        response = http.post(f"/api/v1/{path}", headers={"Authorization": "Bearer test"}, json={})
        assert response.status_code == 200
    redis.incr.assert_not_awaited()


@pytest.mark.parametrize("path", [
    "documents/doc/summary-source/ocr", "documents/doc/summary-source/ocr-quote",
    "documents/doc/extractions", "cases/case/summary-runs/run/submit",
    "cases/case/okf-contexts/context/draft-generation", "cases/case/okf-contexts/context/draft-quote",
    "cases/case/legal-research/runs/run/submit", "dictation/transcriptions",
])
def test_processing_limit_returns_actionable_429_not_uncaught_500(client, path):
    http, redis = client
    response = http.post(f"/api/v1/{path}", headers={"Authorization": "Bearer test"})
    assert response.status_code == 429
    assert response.json()["error"]["code"] == "AI_RATE_LIMITED"
    assert int(response.headers["Retry-After"]) > 0
    assert "ai_actions_v2" in redis.incr.call_args.args[0]
    redis.incr.reset_mock()
    assert http.get(f"/api/v1/{path}", headers={"Authorization": "Bearer test"}).status_code == 200
    redis.incr.assert_not_awaited()


def test_processing_within_quota_and_redis_outage(client):
    http, redis = client
    redis.incr.return_value = 1
    assert http.post("/api/v1/documents/doc/summary-source/ocr", headers={"Authorization": "Bearer test"}).status_code == 200
    redis.expire.assert_awaited_once()
    redis.incr.side_effect = ConnectionError()
    assert http.post("/api/v1/documents/doc/summary-source/ocr", headers={"Authorization": "Bearer test"}).status_code == 200


@pytest.mark.asyncio
@pytest.mark.parametrize("status,delivered", [("queued", True), ("running", False), ("succeeded", False), ("failed", False)])
async def test_typing_submission_delivers_only_committed_queued_jobs(monkeypatch, status, delivered):
    import uuid
    from types import SimpleNamespace
    from app.worker.tasks import source_ocr
    from app.features.jobs.models import JobStatus
    thread = AsyncMock()
    monkeypatch.setattr(source_ocr.asyncio, "to_thread", thread)
    from contextlib import asynccontextmanager
    job = SimpleNamespace(id=uuid.uuid4(), status=JobStatus(status), payload={}, leased_until=None)
    db = SimpleNamespace(scalar=AsyncMock(return_value=job), commit=AsyncMock())
    @asynccontextmanager
    async def session():
        yield db
    monkeypatch.setattr(source_ocr, "worker_session", session)
    await source_ocr.dispatch_queued_source_ocr(job.id)
    assert thread.await_count == int(delivered)
    if delivered:
        assert thread.call_args.args[1] == str(job.id)
        job.leased_until = None
        thread.side_effect = ConnectionError()
        await source_ocr.dispatch_queued_source_ocr(job.id)
        assert job.status == JobStatus.queued
