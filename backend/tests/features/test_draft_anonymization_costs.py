from concurrent.futures import ThreadPoolExecutor
from types import SimpleNamespace

import pytest

from app.features.draft_anonymization.costs import (
    DraftBudget,
    INPUT_RATE,
    OUTPUT_RATE,
    usage_counts,
)


def test_retry_and_audit_share_reserved_budget_after_restart(tmp_path):
    path = tmp_path / "costs.sqlite3"
    amount = 100 * INPUT_RATE + 100 * OUTPUT_RATE
    first = DraftBudget(path, "same-content", amount)
    first.reserve(100, 100, {"stage": "detection"})
    retry = DraftBudget(path, "same-content", amount)
    with pytest.raises(ValueError, match="DRAFT_BUDGET_EXCEEDED"):
        retry.reserve(1, 1, {"stage": "audit"})
    assert retry.summary()["unknown_attempts"] == 1


def test_measured_usage_includes_thinking_and_frees_unused_reservation(tmp_path):
    b = DraftBudget(tmp_path / "costs.sqlite3", "draft", 1_000_000)
    token = b.reserve(100, 100, {})
    usage = usage_counts(
        SimpleNamespace(
            prompt_token_count=10,
            candidates_token_count=5,
            thoughts_token_count=15,
            total_token_count=30,
        )
    )
    record = b.settle(token, usage)
    assert record["estimated_usd"] == (10 * INPUT_RATE + 20 * OUTPUT_RATE) / 1e9
    assert record["thinking_tokens"] == 15
    b.reserve(100, 100, {})


def test_missing_usage_keeps_full_reservation(tmp_path):
    b = DraftBudget(tmp_path / "costs.sqlite3", "draft", 1_000_000)
    token = b.reserve(100, 100, {})
    before = b.summary()["estimated_or_reserved_usd"]
    b.settle(token, None)
    assert b.summary()["estimated_or_reserved_usd"] == before
    assert b.summary()["unknown_attempts"] == 1


def test_concurrent_reservations_cannot_both_spend_same_budget(tmp_path):
    path = tmp_path / "costs.sqlite3"
    amount = 100 * INPUT_RATE + 100 * OUTPUT_RATE
    b = DraftBudget(path, "draft", amount)

    def reserve(_):
        try:
            b.reserve(100, 100, {})
            return True
        except ValueError:
            return False

    with ThreadPoolExecutor(max_workers=2) as executor:
        results = list(executor.map(reserve, range(2)))
    assert sum(results) == 1


def test_provider_usage_overrun_blocks_further_dispatch(tmp_path):
    b = DraftBudget(tmp_path / "costs.sqlite3", "draft", 1_000_000)
    token = b.reserve(1, 1, {})
    b.settle(token, {"prompt_tokens": 100, "billable_output_tokens": 100})
    with pytest.raises(ValueError, match="RECONCILIATION_REQUIRED"):
        b.reserve(1, 1, {})
