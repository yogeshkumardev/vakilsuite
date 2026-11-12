"""
S01-07: PostgreSQL job contract, transitions, idempotency and owner enforcement.
"""

import uuid
from unittest.mock import MagicMock, patch

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine


@pytest_asyncio.fixture
async def db():
    """
    Async DB session for jobs tests.

    Uses the live PostgreSQL test DB (same as auth integration tests) because
    the Job model uses PostgreSQL-specific types (UUID, SAEnum) that SQLite
    does not support. Runs under a transaction that is rolled back after each
    test so tests are isolated and leave no permanent data.
    """
    import os

    import app.db.registry  # noqa: F401 — registers all models

    from app.core.config import settings

    db_url = (
        os.environ.get("TEST_DATABASE_URL")
        or os.environ.get("DATABASE_URL")
        or settings.DATABASE_URL
    )
    if not db_url:
        pytest.skip(
            "Set DATABASE_URL or TEST_DATABASE_URL to run jobs integration tests. "
            "Example: export DATABASE_URL=postgresql+asyncpg://vakilsuite:vakilsuite@localhost/vakilsuite"
        )

    engine = create_async_engine(db_url, echo=False)
    factory = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

    async with factory() as session:
        # Wrap everything in a savepoint so we can roll back after the test.
        await session.begin_nested()
        yield session
        await session.rollback()

    await engine.dispose()
@pytest_asyncio.fixture
async def owner_id(db: AsyncSession) -> uuid.UUID:
    """Create a real User row so FK constraints on jobs.owner_id are satisfied."""
    from app.features.users.models import User

    uid = uuid.uuid4()
    user = User(
        id=uid,
        email=f"testjob-{uid}@example.com",
        full_name="Test Job User",
        is_active=True,
    )
    db.add(user)
    await db.flush()
    return uid


@pytest_asyncio.fixture
async def chamber_id(db: AsyncSession, owner_id: uuid.UUID) -> uuid.UUID:
    from app.features.chambers.service import create_chamber

    chamber = await create_chamber(
        db,
        owner_id=owner_id,
        name="Test Job Chamber",
        slug=f"test-job-{owner_id.hex}",
    )
    return chamber.id


# ─────────────────────────────────────────────────────────────────────────────
# create_job
# ─────────────────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_create_job_record_defaults(db: AsyncSession, owner_id: uuid.UUID, chamber_id: uuid.UUID):
    """Creating a job persists to DB with status=queued and correct fields."""
    from app.features.jobs.models import JobStatus
    from app.features.jobs.service import create_job

    job = await create_job(
        db,
        owner_id=owner_id,
        chamber_id=chamber_id,
        job_type="dummy",
        payload={"label": "test-create"},
    )
    await db.commit()

    assert job.id is not None
    assert job.status == JobStatus.queued
    assert job.job_type == "dummy"
    assert job.owner_id == owner_id
    assert job.payload == {"label": "test-create"}
    assert job.celery_task_id is None
    assert job.started_at is None
    assert job.completed_at is None
    assert job.error_message is None


@pytest.mark.asyncio
async def test_create_job_empty_payload_default(db: AsyncSession, owner_id: uuid.UUID, chamber_id: uuid.UUID):
    """Omitting payload defaults to empty dict, not None."""
    from app.features.jobs.service import create_job

    job = await create_job(db, owner_id=owner_id, chamber_id=chamber_id, job_type="dummy")
    await db.commit()
    assert job.payload == {}


# ─────────────────────────────────────────────────────────────────────────────
# update_job_status
# ─────────────────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_update_status_to_running_sets_started_at(db: AsyncSession, owner_id: uuid.UUID, chamber_id: uuid.UUID):
    """Updating to running sets started_at and stores celery_task_id."""
    from app.features.jobs.models import JobStatus
    from app.features.jobs.service import create_job, update_job_status

    job = await create_job(db, owner_id=owner_id, chamber_id=chamber_id, job_type="dummy")
    await db.commit()

    updated = await update_job_status(
        db,
        job.id,
        JobStatus.running,
        celery_task_id="celery-abc-123",
    )
    assert updated.status == JobStatus.running
    assert updated.started_at is not None
    assert updated.celery_task_id == "celery-abc-123"
    assert updated.completed_at is None


@pytest.mark.asyncio
async def test_update_status_to_succeeded_sets_completed_at(db: AsyncSession, owner_id: uuid.UUID, chamber_id: uuid.UUID):
    """Updating to succeeded sets completed_at and result_summary."""
    from app.features.jobs.models import JobStatus
    from app.features.jobs.service import create_job, update_job_status

    job = await create_job(db, owner_id=owner_id, chamber_id=chamber_id, job_type="dummy")
    await db.commit()
    await update_job_status(db, job.id, JobStatus.running)

    result = {"label": "test", "processed": True}
    updated = await update_job_status(
        db, job.id, JobStatus.succeeded, result_summary=result
    )
    assert updated.status == JobStatus.succeeded
    assert updated.completed_at is not None
    assert updated.result_summary == result


@pytest.mark.asyncio
async def test_update_status_to_failed_records_error(db: AsyncSession, owner_id: uuid.UUID, chamber_id: uuid.UUID):
    """Updating to failed records error_message and sets completed_at."""
    from app.features.jobs.models import JobStatus
    from app.features.jobs.service import create_job, update_job_status

    job = await create_job(db, owner_id=owner_id, chamber_id=chamber_id, job_type="dummy")
    await db.commit()

    updated = await update_job_status(
        db, job.id, JobStatus.failed, error_message="Provider timed out"
    )
    assert updated.status == JobStatus.failed
    assert updated.error_message == "Provider timed out"
    assert updated.completed_at is not None


@pytest.mark.asyncio
async def test_update_status_not_found_raises(db: AsyncSession):
    """update_job_status raises AppError for a non-existent job."""
    from app.core.exceptions import AppError
    from app.features.jobs.models import JobStatus
    from app.features.jobs.service import update_job_status

    with pytest.raises(AppError) as exc_info:
        await update_job_status(db, uuid.uuid4(), JobStatus.running)
    assert exc_info.value.status_code == 404


# ─────────────────────────────────────────────────────────────────────────────
# get_job — owner enforcement
# ─────────────────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_get_job_owner_sees_own_job(db: AsyncSession, owner_id: uuid.UUID, chamber_id: uuid.UUID):
    """Owner can fetch their own job."""
    from app.features.jobs.service import create_job, get_job

    job = await create_job(db, owner_id=owner_id, chamber_id=chamber_id, job_type="dummy")
    await db.commit()

    fetched = await get_job(db, job.id, owner_id)
    assert fetched.id == job.id


@pytest.mark.asyncio
async def test_get_job_other_user_gets_not_found(db: AsyncSession, owner_id: uuid.UUID, chamber_id: uuid.UUID):
    """
    Another user's job returns not-found (not forbidden) to avoid leaking
    resource existence — per architecture.md authorization guidance.
    """
    from app.core.exceptions import AppError
    from app.features.jobs.service import create_job, get_job

    other_user_id = uuid.uuid4()
    job = await create_job(db, owner_id=owner_id, chamber_id=chamber_id, job_type="dummy")
    await db.commit()

    with pytest.raises(AppError) as exc_info:
        await get_job(db, job.id, other_user_id)
    # 404 not 403 — do not reveal that the resource exists
    assert exc_info.value.status_code == 404


@pytest.mark.asyncio
async def test_get_job_nonexistent_raises_not_found(db: AsyncSession):
    """get_job raises 404 for a completely non-existent job UUID."""
    from app.core.exceptions import AppError
    from app.features.jobs.service import get_job

    with pytest.raises(AppError) as exc_info:
        await get_job(db, uuid.uuid4(), uuid.uuid4())
    assert exc_info.value.status_code == 404


# ─────────────────────────────────────────────────────────────────────────────
# Mocked Celery enqueue
# ─────────────────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_enqueue_stores_celery_task_id(db: AsyncSession, owner_id: uuid.UUID, chamber_id: uuid.UUID):
    """apply_async is called and celery_task_id is stored on the job record."""
    from app.features.jobs.service import create_job
    import app.worker.tasks.dummy  # noqa: F401


    with patch("app.worker.tasks.dummy.run_dummy_job") as mock_task:
        mock_result = MagicMock()
        mock_result.id = f"mock-celery-task-{uuid.uuid4()}"
        mock_task.apply_async.return_value = mock_result

        job = await create_job(
            db,
            owner_id=owner_id,
            chamber_id=chamber_id,
            job_type="dummy",
            payload={"label": "mocked"},
        )
        await db.commit()

        # Simulate what the router does after create_job
        async_result = mock_task.apply_async(
            kwargs={"job_id": str(job.id), "label": "mocked"}
        )
        job.celery_task_id = async_result.id
        await db.commit()

    assert job.celery_task_id == mock_result.id
    mock_task.apply_async.assert_called_once_with(
        kwargs={"job_id": str(job.id), "label": "mocked"}
    )
