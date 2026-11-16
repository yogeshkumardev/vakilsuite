"""Mark dependent summaries stale without deleting historical output metadata."""

from __future__ import annotations

import uuid
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.summaries.models import (
    SummaryRun,
    SummaryRunStatus,
    SummarySourceDependency,
)


async def invalidate_summaries_for_revision(
    db: AsyncSession, *, revision_id: uuid.UUID
) -> list[uuid.UUID]:
    """Durably invalidate every nonterminal/current summary tied to a revision."""
    run_ids = list(
        await db.scalars(
            select(SummarySourceDependency.summary_run_id).where(
                SummarySourceDependency.working_document_revision_id == revision_id
            )
        )
    )
    if not run_ids:
        return []
    runs = list(
        await db.scalars(
            select(SummaryRun).where(SummaryRun.id.in_(run_ids)).with_for_update()
        )
    )
    stale: list[uuid.UUID] = []
    for run in runs:
        if run.status != SummaryRunStatus.stale:
            run.status = SummaryRunStatus.stale
            stale.append(run.id)
    if stale:
        from app.features.drafts.models import CourtDraft
        await db.execute(update(CourtDraft).where(CourtDraft.summary_run_id.in_(stale)).values(status="stale", stale_reason="SUMMARY_CHANGED"))
    await db.flush()
    return stale


async def invalidate_summaries_for_case(
    db: AsyncSession, *, case_id: uuid.UUID
) -> list[uuid.UUID]:
    """Use for case/document/annexure lifecycle changes where exact dependency is unavailable."""
    runs = list(
        await db.scalars(
            select(SummaryRun).where(SummaryRun.case_id == case_id).with_for_update()
        )
    )
    stale: list[uuid.UUID] = []
    for run in runs:
        if run.status != SummaryRunStatus.stale:
            run.status = SummaryRunStatus.stale
            stale.append(run.id)
    if stale:
        from app.features.drafts.models import CourtDraft
        await db.execute(update(CourtDraft).where(CourtDraft.summary_run_id.in_(stale)).values(status="stale", stale_reason="SUMMARY_CHANGED"))
    await db.flush()
    return stale
