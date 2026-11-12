import uuid
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from sqlalchemy.dialects import postgresql

from app.core.exceptions import ForbiddenError
from app.features.legal_research.service import LegalResearchService


@pytest.mark.asyncio
async def test_listing_scoped_bounded_and_preserves_stale_status():
    case = SimpleNamespace(id=uuid.uuid4(), chamber_id=uuid.uuid4())
    row = SimpleNamespace(id=uuid.uuid4(), context_hash="a" * 64,
                          references_json=[], is_stale=True)
    db = SimpleNamespace(scalars=AsyncMock(return_value=[row]))
    service = LegalResearchService(db)
    service._case = AsyncMock(return_value=case)
    result = await service.list_manifests(case_id=case.id, user=object(), offset=50)
    assert result[0].is_stale
    query = db.scalars.call_args.args[0]
    sql = str(query.compile(dialect=postgresql.dialect(), compile_kwargs={"literal_binds": True}))
    assert str(case.id) in sql and str(case.chamber_id) in sql
    assert "LIMIT 50 OFFSET 50" in sql


@pytest.mark.asyncio
async def test_denied_case_never_lists_manifests():
    db = SimpleNamespace(scalars=AsyncMock())
    service = LegalResearchService(db)
    service._case = AsyncMock(side_effect=ForbiddenError("Denied"))
    with pytest.raises(ForbiddenError):
        await service.list_manifests(case_id=uuid.uuid4(), user=object())
    db.scalars.assert_not_awaited()
