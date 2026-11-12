"""Opt-in end-to-end S01 POC: committed approval -> outbox -> worker resume."""

from __future__ import annotations

import os
import uuid
import asyncio

import pytest
from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

if os.environ.get("RUN_POSTGRES_CHECKPOINT_TESTS") != "1":
    pytest.skip("Set RUN_POSTGRES_CHECKPOINT_TESTS=1 for workflow outbox integration test", allow_module_level=True)

import app.db.registry  # noqa: F401 - register relationship targets for standalone test
from app.core.config import settings
from app.db.session import AsyncSessionLocal
from app.features.users.models import User
from app.features.chambers.service import create_chamber
from app.features.workflows.models import (
    WorkflowResumeIntent,
    WorkflowResumeIntentStatus,
    WorkflowRun,
    WorkflowRunStatus,
)
from app.features.workflows.poc import POC_GRAPH_VERSION
from app.features.workflows.runtime import start_poc_workflow
from app.features.workflows.service import (
    decide_review,
    get_or_create_poc_run,
    get_or_create_review,
)
from app.worker.tasks.workflow_resume import resume_workflow_poc


@pytest.mark.asyncio
async def test_committed_approval_resumes_once_via_durable_outbox() -> None:
    engine = create_async_engine(settings.DATABASE_URL)
    factory = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    owner_id = uuid.uuid4()
    run_id: uuid.UUID | None = None
    try:
        async with factory() as db:
            db.add(User(id=owner_id, full_name="Workflow POC", email=f"workflow-{owner_id}@example.test"))
            await db.flush()
            chamber = await create_chamber(
                db,
                owner_id=owner_id,
                name="Workflow POC Chamber",
                slug=f"workflow-poc-{owner_id.hex}",
            )
            run, created = await get_or_create_poc_run(
                db,
                owner_id=owner_id,
                chamber_id=chamber.id,
                idempotency_key=f"poc-{owner_id}",
                input_manifest_hash="a" * 64,
                graph_version=POC_GRAPH_VERSION,
            )
            assert created
            run_id = run.id
            await get_or_create_review(db, run=run, review_summary={"kind": "synthetic"})
            await db.commit()

        await start_poc_workflow(database_url=settings.DATABASE_URL, session_factory=AsyncSessionLocal, run=run)

        async with factory() as db:
            review, intent = await decide_review(
                db,
                run_id=run.id,
                owner_id=owner_id,
                approved=True,
                expected_version=1,
                idempotency_key=f"review-{owner_id}",
            )
            assert review.version == 2
            assert intent is not None
            intent_id = str(intent.id)
            await db.commit()

        # Celery executes this synchronous task outside the ASGI event loop.
        result = await asyncio.to_thread(resume_workflow_poc.run, intent_id)
        assert result["status"] == "processed"

        async with factory() as db:
            persisted_run = await db.get(WorkflowRun, run.id)
            persisted_intent = await db.get(WorkflowResumeIntent, uuid.UUID(intent_id))
            assert persisted_run is not None and persisted_run.status == WorkflowRunStatus.completed
            assert persisted_intent is not None and persisted_intent.status == WorkflowResumeIntentStatus.processed
            assert persisted_run.result_summary == {"artifact_id": f"artifact-{run.id}"}
    finally:
        if run_id is not None:
            async with factory.begin() as db:
                await db.execute(delete(WorkflowRun).where(WorkflowRun.id == run_id))
                await db.execute(delete(User).where(User.id == owner_id))
        await engine.dispose()
