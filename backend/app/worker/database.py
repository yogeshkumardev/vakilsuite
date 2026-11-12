"""Async database resources owned by one Celery invocation/event loop.

Never use the FastAPI pool from an asyncio.run() task or across a fork.
"""

from contextlib import asynccontextmanager

from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from app.core.config import settings


@asynccontextmanager
async def worker_session_factory():
    engine = create_async_engine(settings.DATABASE_URL, poolclass=NullPool)
    try:
        yield async_sessionmaker(engine, expire_on_commit=False)
    finally:
        await engine.dispose()


@asynccontextmanager
async def worker_session():
    async with worker_session_factory() as factory:
        async with factory() as session:
            yield session


# Sync task pools are process-local too. The child must not close sockets still
# owned by its parent; replacing the inherited pool is sufficient.
_sync_engines = []


def create_worker_sync_engine(*args, **kwargs):
    from sqlalchemy import create_engine

    engine = create_engine(*args, **kwargs)
    _sync_engines.append(engine)
    return engine


from celery.signals import worker_process_init  # noqa: E402


@worker_process_init.connect
def reset_inherited_pools(**kwargs):
    import sys

    for engine in _sync_engines:
        engine.dispose(close=False)
    # Some service imports load the API engine. Workers never use this pool,
    # but detach inherited connections without touching the parent's sockets.
    api_database = sys.modules.get("app.db.session")
    if api_database is not None:
        api_database.engine.sync_engine.dispose(close=False)
