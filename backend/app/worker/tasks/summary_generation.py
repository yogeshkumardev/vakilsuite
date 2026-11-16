"""At-least-once Celery delivery for an explicitly submitted summary run."""
from __future__ import annotations

import asyncio
import uuid
from datetime import UTC, datetime, timedelta
from sqlalchemy import select

from app.worker.database import worker_session
from app.features.summaries.generation import SummaryGenerationService
from app.worker.celery_app import celery_app
from app.features.summaries.models import (
    DocumentFactCard,
    FactCardDelivery,
    SummaryRun,
    SummaryRunStatus,
)


# A card may legitimately wait for the full provider deadline (five minutes under
# the chamber policy).  After that deadline plus a short persistence margin, its
# outcome cannot be safely inferred.  It is blocked, never automatically retried.
UNKNOWN_PROVIDER_OUTCOME_AFTER = timedelta(minutes=6)
FACT_CARD_DELIVERY_LEASE = timedelta(seconds=75)
MAX_FACT_CARD_DELIVERY_ATTEMPTS = 5


async def _execute(run_id: uuid.UUID) -> str:
    async with worker_session() as db:
        return await SummaryGenerationService(db).execute(run_id=run_id)


async def _execute_card(card_id: uuid.UUID, run_id: uuid.UUID) -> str:
    async with worker_session() as db:
        return await SummaryGenerationService(db).execute_card(card_id=card_id, run_id=run_id)


def reserve_fact_card_delivery(delivery: FactCardDelivery, card: DocumentFactCard, *, now: datetime) -> bool:
    """Lease one committed intent; this never changes provider-call state."""
    if delivery.status != "queued" or card.status != "pending":
        return False
    if delivery.leased_until is not None and delivery.leased_until > now:
        return False
    if delivery.delivery_attempt_count >= MAX_FACT_CARD_DELIVERY_ATTEMPTS:
        delivery.status = "failed"
        delivery.error_code = "WORKER_DELIVERY_EXHAUSTED"
        delivery.completed_at = now
        card.status = "failed"
        card.error_code = "WORKER_DELIVERY_EXHAUSTED"
        return False
    delivery.delivery_attempt_count += 1
    delivery.leased_until = now + FACT_CARD_DELIVERY_LEASE
    return True


async def _dispatch_pending_fact_card_deliveries(run_id: uuid.UUID | None = None) -> dict[str, object]:
    """Lease committed intents, then publish broker messages after the commit."""
    now = datetime.now(UTC).replace(tzinfo=None)
    async with worker_session() as db:
        statement = (
            select(FactCardDelivery, DocumentFactCard)
            .join(DocumentFactCard, DocumentFactCard.id == FactCardDelivery.document_fact_card_id)
            .join(SummaryRun, SummaryRun.id == FactCardDelivery.summary_run_id)
            .where(
                FactCardDelivery.status == "queued",
                SummaryRun.status == SummaryRunStatus.running,
            )
            .where(
                (FactCardDelivery.leased_until.is_(None))
                | (FactCardDelivery.leased_until <= now)
            )
            .order_by(FactCardDelivery.created_at)
            .limit(100)
            .with_for_update(skip_locked=True)
        )
        if run_id is not None:
            statement = statement.where(FactCardDelivery.summary_run_id == run_id)
        rows = (await db.execute(statement)).all()
        delivery_ids: list[uuid.UUID] = []
        failed_run_ids: set[uuid.UUID] = set()
        for delivery, card in rows:
            if reserve_fact_card_delivery(delivery, card, now=now):
                delivery_ids.append(delivery.id)
            elif delivery.status == "failed":
                failed_run_ids.add(delivery.summary_run_id)
        await db.commit()
    for delivery_id in delivery_ids:
        try:
            generate_document_fact_card.delay(str(delivery_id))
        except Exception:
            # The lease deliberately expires. Beat will try again without
            # changing the card into a provider-running state.
            pass
    for failed_run_id in failed_run_ids:
        try:
            generate_summary_run.delay(str(failed_run_id))
        except Exception:
            pass
    return {"enqueued": len(delivery_ids), "delivery_failed_runs": len(failed_run_ids)}


async def _execute_delivery(delivery_id: uuid.UUID) -> tuple[str, uuid.UUID | None]:
    async with worker_session() as db:
        delivery = await db.get(FactCardDelivery, delivery_id, with_for_update=True)
        if delivery is None:
            return "missing", None
        run = await db.get(SummaryRun, delivery.summary_run_id)
        if run is None:
            delivery.status = "failed"
            delivery.error_code = "DELIVERY_SOURCE_MISSING"
            delivery.completed_at = datetime.now(UTC).replace(tzinfo=None)
            await db.commit()
            return "failed", None
        if delivery.status != "queued":
            card = await db.get(DocumentFactCard, delivery.document_fact_card_id)
            return card.status, run.id
        status = await SummaryGenerationService(db).execute_card(
            card_id=delivery.document_fact_card_id, run_id=run.id
        )
        delivery = await db.get(FactCardDelivery, delivery_id, with_for_update=True)
        if delivery is not None and status != "pending":
            delivery.status = "completed"
            delivery.leased_until = None
            delivery.completed_at = datetime.now(UTC).replace(tzinfo=None)
            await db.commit()
        return status, run.id


@celery_app.task(bind=True, name="app.worker.tasks.summary_generation.generate_document_fact_card", acks_late=True, max_retries=0)
def generate_document_fact_card(self, delivery_id: str, legacy_run_id: str | None = None) -> dict[str, str]:
    """Execute one delivery intent; keep compatibility with already-queued tasks."""
    if legacy_run_id is not None:
        status = asyncio.run(_execute_card(uuid.UUID(delivery_id), uuid.UUID(legacy_run_id)))
        run_id = legacy_run_id
    else:
        status, run_uuid = asyncio.run(_execute_delivery(uuid.UUID(delivery_id)))
        run_id = str(run_uuid) if run_uuid is not None else None
    # Each map completion may wake the reducer. Its run lock and persisted
    # provider attempt make duplicate deliveries harmless.
    if run_id is not None:
        generate_summary_run.delay(run_id)
    return {"status": status}


@celery_app.task(name="app.worker.tasks.summary_generation.dispatch_fact_card_deliveries")
def dispatch_fact_card_deliveries(run_id: str | None = None) -> dict[str, object]:
    return asyncio.run(
        _dispatch_pending_fact_card_deliveries(
            uuid.UUID(run_id) if run_id is not None else None
        )
    )


async def _recover_unknown_cards() -> int:
    cutoff = datetime.now(UTC).replace(tzinfo=None) - UNKNOWN_PROVIDER_OUTCOME_AFTER
    async with worker_session() as db:
        cards = list(await db.scalars(select(DocumentFactCard).where(
            DocumentFactCard.status == "running",
            DocumentFactCard.updated_at < cutoff,
        ).with_for_update(skip_locked=True).limit(100)))
        for card in cards:
            card.status, card.error_code = "blocked", "PROVIDER_OUTCOME_UNKNOWN"
            deliveries = list(await db.scalars(select(FactCardDelivery).where(
                FactCardDelivery.document_fact_card_id == card.id,
                FactCardDelivery.status == "queued",
            ).with_for_update()))
            for delivery in deliveries:
                delivery.status = "completed"
                delivery.error_code = "PROVIDER_OUTCOME_UNKNOWN"
                delivery.leased_until = None
                delivery.completed_at = datetime.now(UTC).replace(tzinfo=None)
            runs = list(await db.scalars(select(SummaryRun).where(
                SummaryRun.case_id == card.case_id,
                SummaryRun.status == SummaryRunStatus.running,
            ).with_for_update()))
            for run in runs:
                if any(item.get("revision_id") == str(card.source_revision_id) for item in run.dependency_snapshot):
                    run.status, run.error_code = SummaryRunStatus.failed, "FACT_CARD_FAILED"
        await db.commit()
        return len(cards)


@celery_app.task(name="app.worker.tasks.summary_generation.recover_unknown_fact_cards")
def recover_unknown_fact_cards() -> dict[str, int]:
    return {"blocked": asyncio.run(_recover_unknown_cards())}


@celery_app.task(name="app.worker.tasks.summary_generation.recover_fact_card_deliveries")
def recover_fact_card_deliveries() -> dict[str, object]:
    return asyncio.run(_dispatch_pending_fact_card_deliveries())


@celery_app.task(
    bind=True,
    name="app.worker.tasks.summary_generation.generate_summary_run",
    acks_late=True,
    max_retries=0,
)
def generate_summary_run(self, run_id: str) -> dict[str, str]:
    # Provider outcome may be unknown on a timeout. Do not retry blindly; the
    # durable run/attempt records require an explicit later reconciliation.
    return {"status": asyncio.run(_execute(uuid.UUID(run_id)))}
