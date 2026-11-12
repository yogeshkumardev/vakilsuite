from types import SimpleNamespace
from unittest.mock import Mock
import pytest
from app.features.draft_anonymization.costs import DraftBudget
from app.integrations.ai import deepseek_draft_anonymizer as adapter


def test_deepseek_controls_account_invalid_json_and_share_budget(tmp_path, monkeypatch):
    monkeypatch.setattr(
        adapter, "settings", SimpleNamespace(DEEPSEEK_API_KEY="synthetic")
    )
    client = Mock()
    factory = Mock(return_value=client)
    monkeypatch.setattr(adapter, "OpenAI", factory)
    response = SimpleNamespace(
        id="synthetic",
        usage=SimpleNamespace(
            prompt_tokens=100, completion_tokens=50, total_tokens=150
        ),
        choices=[
            SimpleNamespace(
                finish_reason="stop",
                message=SimpleNamespace(content='{"findings":[],"uncertain":false}'),
            )
        ],
    )
    client.chat.completions.create.return_value = response
    path = tmp_path / "costs.sqlite3"
    budget = DraftBudget(
        path,
        "draft",
        100_000_000,
        input_rate=300,
        output_rate=1200,
        pricing_version="test",
    )
    detector = adapter.DeepSeekDraftDetector(budget=budget, model="deepseek-flash")
    assert not detector.detect({"a": "synthetic"}).uncertain
    assert factory.call_args.kwargs["max_retries"] == 0
    request = client.chat.completions.create.call_args.kwargs
    assert request["extra_body"] == {"thinking": {"type": "disabled"}}
    assert detector.attempts[0]["estimated_usd"] == 0.00009
    response.choices[0].message.content = "invalid"
    with pytest.raises(ValueError):
        detector.detect({"a": "synthetic"}, audit=True)
    assert len(detector.attempts) == 2
    with pytest.raises(ValueError, match="CALL_LIMIT"):
        detector.detect({"a": "synthetic"})
    assert DraftBudget(path, "draft", 100_000_000).summary()["attempt_count"] == 2
