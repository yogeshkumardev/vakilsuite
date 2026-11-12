import uuid
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from app.features.summaries.invalidation import invalidate_summaries_for_revision
from app.features.summaries.models import SummaryRunStatus


@pytest.mark.asyncio
async def test_revision_invalidation_marks_runs_stale_but_keeps_records():
    run = SimpleNamespace(id=uuid.uuid4(), status=SummaryRunStatus.pending_review)
    db = AsyncMock()
    db.scalars = AsyncMock(side_effect=[[run.id], [run]])
    stale = await invalidate_summaries_for_revision(db, revision_id=uuid.uuid4())
    assert stale == [run.id]
    assert run.status == SummaryRunStatus.stale
    db.flush.assert_awaited_once()
