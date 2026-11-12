"""Exercise summary editor migrations in a rolled-back isolated local schema."""

import asyncio
import importlib.util
import uuid
from pathlib import Path
from alembic.migration import MigrationContext
from alembic.operations import Operations
from sqlalchemy import text
from app.db.session import engine


async def main():
    name = "review_migration_" + uuid.uuid4().hex
    ident = uuid.uuid4()
    async with engine.connect() as connection:
        transaction = await connection.begin()
        try:
            await connection.execute(text(f"CREATE SCHEMA {name}"))
            await connection.execute(text(f"SET LOCAL search_path TO {name}"))
            await connection.execute(
                text("CREATE TABLE summary_runs (id uuid PRIMARY KEY)")
            )
            await connection.execute(text("CREATE TABLE users (id uuid PRIMARY KEY)"))
            await connection.execute(
                text("INSERT INTO summary_runs VALUES (:id)"), {"id": ident}
            )
            modules = []
            for filename in (
                "4b8c6d7e8f90_summary_review_editor.py",
                "4c9d7e8f901a_summary_review_edit_history.py",
            ):
                path = (
                    Path(__file__).resolve().parents[1]
                    / "app/db/migrations/versions"
                    / filename
                )
                spec = importlib.util.spec_from_file_location(filename, path)
                module = importlib.util.module_from_spec(spec)
                spec.loader.exec_module(module)
                modules.append(module)

            def check(sync):
                with Operations.context(MigrationContext.configure(sync)):
                    for module in modules:
                        module.upgrade()
                    row = sync.execute(
                        text(
                            "SELECT id, review_hash, review_payload, review_editor_state FROM summary_runs"
                        )
                    ).one()
                    assert tuple(row) == (ident, None, None, None)
                    assert (
                        sync.execute(
                            text("SELECT count(*) FROM summary_review_edits")
                        ).scalar_one()
                        == 0
                    )
                    for module in reversed(modules):
                        module.downgrade()
                    assert (
                        sync.execute(text("SELECT id FROM summary_runs")).scalar_one()
                        == ident
                    )

            await connection.run_sync(check)
            print("Isolated schema upgrade/downgrade passed; existing row preserved.")
        finally:
            await transaction.rollback()
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
