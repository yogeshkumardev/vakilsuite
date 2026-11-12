"""PostgreSQL checkpointer construction without leaking SQLAlchemy URLs."""

from __future__ import annotations

from contextlib import asynccontextmanager

from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver


def _to_psycopg_url(database_url: str) -> str:
    """Translate SQLAlchemy PostgreSQL URL forms accepted by this project."""
    for prefix in ("postgresql+asyncpg://", "postgresql+psycopg://"):
        if database_url.startswith(prefix):
            return "postgresql://" + database_url.removeprefix(prefix)
    if database_url.startswith("postgresql://"):
        return database_url
    raise ValueError("LangGraph checkpointing requires a PostgreSQL DATABASE_URL")


@asynccontextmanager
async def postgres_checkpointer(database_url: str):
    """Yield a ready-to-use durable checkpointer; setup is safe to repeat."""
    async with AsyncPostgresSaver.from_conn_string(_to_psycopg_url(database_url)) as saver:
        await saver.setup()
        yield saver
