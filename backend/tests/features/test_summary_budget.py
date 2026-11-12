from types import SimpleNamespace as NS
from unittest.mock import AsyncMock

import pytest

from app.core.exceptions import ValidationError
from app.features.summaries import generation
from app.features.summaries.models import SummaryRunStatus


def task(*, budget=1_000, max_input_bytes=1_000, max_output_tokens=100):
    return NS(
        max_input_bytes=max_input_bytes,
        max_output_tokens=max_output_tokens,
        run_budget_paise=budget,
    )


def route(model="gemini-test"):
    return NS(model=model)


def configure_pricing(monkeypatch):
    monkeypatch.setattr(generation.settings, "GEMINI_API_KEY", "test-key")
    monkeypatch.setattr(generation.settings, "GEMINI_ALLOWED_MODELS", ["gemini-test"])
    monkeypatch.setattr(generation.settings, "DRAFT_PRICING_VALID_UNTIL", "2099-01-01")
    monkeypatch.setattr(generation.settings, "DRAFT_PRICING_MODEL", "gemini-test")
    monkeypatch.setattr(generation.settings, "DRAFT_INPUT_PAISE_PER_MILLION", 1_000)
    monkeypatch.setattr(generation.settings, "DRAFT_OUTPUT_PAISE_PER_MILLION", 1_000)


def test_summary_budget_estimate_is_conservative_and_bounded(monkeypatch):
    configure_pricing(monkeypatch)
    output = generation.SummaryGenerationService._validate_pricing_and_budget(
        task_policy=task(), route=route(), input_tokens=100
    )
    assert output == 100


def test_summary_budget_blocks_before_provider_dispatch(monkeypatch):
    configure_pricing(monkeypatch)
    with pytest.raises(ValidationError, match="reservation exceeds"):
        generation.SummaryGenerationService._validate_pricing_and_budget(
            task_policy=task(budget=1), route=route(), input_tokens=1_000
        )


def test_summary_budget_requires_current_model_matched_pricing(monkeypatch):
    configure_pricing(monkeypatch)
    monkeypatch.setattr(generation.settings, "DRAFT_PRICING_MODEL", "other-model")
    with pytest.raises(ValidationError, match="model-matched pricing"):
        generation.SummaryGenerationService._validate_pricing_and_budget(
            task_policy=task(), route=route(), input_tokens=100
        )


@pytest.mark.asyncio
async def test_over_budget_summary_stays_pending_without_queue_intent(monkeypatch):
    configure_pricing(monkeypatch)
    case_id = __import__("uuid").uuid4()
    run = NS(case_id=case_id, status=SummaryRunStatus.pending, input_tokens=None)
    service = object.__new__(generation.SummaryGenerationService)
    service.db = NS(commit=AsyncMock(), refresh=AsyncMock())
    service._run_for_user = AsyncMock(return_value=run)
    service._authorize_and_collect = AsyncMock(return_value=([], task(budget=1)))
    service._validate_summary_reservation = AsyncMock(
        side_effect=ValidationError("Estimated reservation exceeds the chamber summary budget")
    )

    with pytest.raises(ValidationError, match="reservation exceeds"):
        await service.authorize_submission(
            case_id=case_id, run_id=__import__("uuid").uuid4(), user=NS()
        )

    assert run.status == SummaryRunStatus.pending
    service.db.commit.assert_not_awaited()
