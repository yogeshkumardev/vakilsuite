"""Map/reduce invariants without calling a paid provider."""

from types import SimpleNamespace as NS
from unittest.mock import AsyncMock
from datetime import UTC, datetime
import uuid

import pytest

from app.core.exceptions import ConflictError
from app.features.summaries import generation
from app.features.summaries.contracts import CaseSummaryPayload
from app.features.summaries.fact_cards import map_contents, synthesis_contents, validate_synthesis_citations
from app.worker.tasks.summary_generation import (
    FACT_CARD_DELIVERY_LEASE,
    MAX_FACT_CARD_DELIVERY_ATTEMPTS,
    reserve_fact_card_delivery,
)


def _payload(document_id: str, revision_id: str) -> CaseSummaryPayload:
    return CaseSummaryPayload.model_validate({
        "output_language": "en-IN", "uncertainties": [],
        "sections": [{"name": "documentary_evidence", "findings": [{
            "text": "The reviewed source records an event.",
            "finding_type": "documentary_evidence",
            "citations": [{"source_document_id": document_id,
                           "source_revision_id": revision_id,
                           "page_number": 2, "source_paths": ["page:2"],
                           "page_reference_note": "Original page 2"}],
        }]}],
    })


def test_synthesis_uses_only_cited_cards_and_rejects_new_citations():
    source_id, revision_id = str(uuid.uuid4()), str(uuid.uuid4())
    payload = _payload(source_id, revision_id)
    card = NS(content=payload.model_dump(mode="json"), status="ready")
    contents = synthesis_contents([card], "en-IN")
    assert "FACT CARDS" in contents
    assert "The reviewed source records an event" in contents
    validate_synthesis_citations(payload, [card])
    invented = _payload(str(uuid.uuid4()), revision_id)
    with pytest.raises(ValueError, match="citation"):
        validate_synthesis_citations(invented, [card])


def test_map_receives_only_one_document():
    first = str(uuid.uuid4())
    contents = map_contents({"source_document_id": first,
                             "source_revision_id": str(uuid.uuid4()),
                             "source_paths": ["page:2"],
                             "page_paths": {"page:2": 2},
                             "source_blocks": {"page:2": "Evidence from one source"},
                             "text": "Evidence from one source"}, "en-IN")
    assert "Evidence from one source" in contents
    assert "MAP STAGE" in contents


@pytest.mark.asyncio
async def test_blocked_card_retry_requires_explicit_charge_acknowledgement():
    case_id, chamber_id, revision_id = uuid.uuid4(), uuid.uuid4(), uuid.uuid4()
    source_sha256 = "a" * 64
    run = NS(
        id=uuid.uuid4(),
        case_id=case_id,
        chamber_id=chamber_id,
        status=generation.SummaryRunStatus.failed,
        error_code="FACT_CARD_FAILED",
        dependency_snapshot=[{"revision_id": str(revision_id), "sha256": source_sha256}],
    )
    card = NS(
        id=uuid.uuid4(),
        case_id=case_id,
        chamber_id=chamber_id,
        source_revision_id=revision_id,
        source_sha256=source_sha256,
        status="blocked",
        error_code="PROVIDER_OUTCOME_UNKNOWN",
    )
    db = NS(get=AsyncMock(return_value=card), commit=AsyncMock())
    service = generation.SummaryGenerationService(db)
    service._run_for_user = AsyncMock(return_value=run)
    service._authorize_and_collect = AsyncMock(return_value=([
        {"source_revision_id": str(revision_id), "sha256": source_sha256},
    ], NS()))
    service._ensure_pending_card_deliveries = AsyncMock(return_value=1)

    with pytest.raises(ConflictError, match="outcome is unknown"):
        await service.authorize_card_retry(
            case_id=case_id,
            run_id=run.id,
            card_id=card.id,
            user=NS(),
        )
    db.commit.assert_not_awaited()

    assert await service.authorize_card_retry(
        case_id=case_id,
        run_id=run.id,
        card_id=card.id,
        user=NS(),
        acknowledge_provider_outcome_unknown=True,
    ) is card
    assert card.status == "pending"
    assert run.status == generation.SummaryRunStatus.running
    db.commit.assert_awaited_once()


def test_fact_card_delivery_retries_broker_delivery_without_reopening_provider_state():
    now = datetime(2026, 11, 15, tzinfo=UTC).replace(tzinfo=None)
    card = NS(status="pending", error_code=None)
    delivery = NS(
        status="queued",
        leased_until=None,
        delivery_attempt_count=0,
        error_code=None,
        completed_at=None,
    )

    assert reserve_fact_card_delivery(delivery, card, now=now)
    assert delivery.delivery_attempt_count == 1
    assert delivery.leased_until == now + FACT_CARD_DELIVERY_LEASE
    # A duplicate dispatcher cannot enqueue while the durable lease is live.
    assert not reserve_fact_card_delivery(delivery, card, now=now)

    delivery.leased_until = now
    delivery.delivery_attempt_count = MAX_FACT_CARD_DELIVERY_ATTEMPTS
    assert not reserve_fact_card_delivery(delivery, card, now=now)
    assert delivery.status == "failed"
    assert card.status == "failed"
    assert card.error_code == "WORKER_DELIVERY_EXHAUSTED"


@pytest.mark.asyncio
async def test_v3_reduce_never_sends_original_pdf(monkeypatch):
    source_id, revision_id = str(uuid.uuid4()), str(uuid.uuid4())
    payload = _payload(source_id, revision_id)
    card = NS(content=payload.model_dump(mode="json"), status="ready")
    monkeypatch.setattr(generation, "cards_for_run", AsyncMock(return_value=[card]))
    calls = []

    class Adapter:
        def __init__(self, *, model):
            assert model == "test-model"

        def summarize_case(self, **kwargs):
            calls.append(kwargs)
            return payload, 50, 75, "provider-request"

    monkeypatch.setattr(generation, "GeminiAdapter", Adapter)
    db = NS(scalar=AsyncMock(return_value=None), add=lambda attempt: setattr(attempt, "id", uuid.uuid4()), commit=AsyncMock())
    service = generation.SummaryGenerationService(db)
    service._validate_payload = lambda *_: {}
    service._publish_if_current = AsyncMock(return_value="pending_review")
    run = NS(id=uuid.uuid4(), source_manifest_hash="a" * 64,
             output_language="en-IN", prompt_version="allahabad-criminal-summary-v6")
    policy = NS(max_input_bytes=100000, max_output_tokens=12288, deadline_seconds=60)
    assert await service._execute_synthesis(run, [{"source_document_id": source_id}], policy, NS(model="test-model")) == "pending_review"
    assert len(calls) == 1
    assert calls[0]["pdf_sources"] == []
    assert "FACT CARDS" in calls[0]["contents"]
