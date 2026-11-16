from app.core.config import Settings


def test_managed_postgres_url_uses_asyncpg_for_api_runtime() -> None:
    settings = Settings(DATABASE_URL="postgresql://user:password@db.internal:5432/vakilsuite")

    assert settings.DATABASE_URL == "postgresql+asyncpg://user:password@db.internal:5432/vakilsuite"


def test_existing_async_database_url_is_preserved() -> None:
    url = "postgresql+asyncpg://user:password@db.internal:5432/vakilsuite"

    assert Settings(DATABASE_URL=url).DATABASE_URL == url
