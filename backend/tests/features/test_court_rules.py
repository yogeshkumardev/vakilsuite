from __future__ import annotations

from datetime import date
from pathlib import Path

import pytest
import yaml

from app.features.court_rules import RuleCoverageError, get_format_spec


ROOT = Path(__file__).resolve().parents[3]


def test_allahabad_efiling_rules_apply_from_effective_date() -> None:
    spec = get_format_spec("allahabad_hc", "allahabad", date(2026, 11, 12), "efiling", "en")

    assert spec.font_for("latin") == {"family": "Times New Roman", "size_pt": 14}
    assert spec.value_for("page.size")["name"] == "Legal"
    assert spec.value_for("margins")["left_in"] == 1.75
    assert spec.value_for("italic.prayer") is False


def test_rules_before_effective_date_fail_closed() -> None:
    with pytest.raises(RuleCoverageError, match="Missing required rules"):
        get_format_spec("allahabad_hc", "allahabad", date(2026, 11, 11), "efiling", "en")


def test_physical_legal_size_and_quarter_margin_use_confirmed_measurements() -> None:
    spec = get_format_spec("allahabad_hc", "lucknow", date(2026, 11, 12), "physical", "mixed")

    assert spec.value_for("page.size")["name"] == "Legal"
    assert spec.value_for("margin.quarter_rule")["exact_inches"] == 1.75
    assert spec.value_for("margins") == {
        "top_in": 1.5,
        "bottom_in": 1,
        "left_in": 1.75,
        "right_in": 0.5,
    }
    assert not spec.warnings


def test_rank_then_newest_effective_date_resolves_conflict(tmp_path: Path) -> None:
    source = ROOT / "courts" / "allahabad"
    target = tmp_path / "allahabad"
    target.mkdir()
    (target / "court.yaml").write_text((source / "court.yaml").read_text())
    data = yaml.safe_load((source / "rules.yaml").read_text())
    data["rules"].append(
        {
            "attribute": "line_spacing",
            "value": "single",
            "class": "mandatory",
            "authority_rank": 2,
            "effective_from": "2026-11-12",
            "source": {"title": "lower authority", "file": "test.pdf", "locator": "p. 1"},
            "status": "verified",
        }
    )
    data["rules"].append(
        {
            "attribute": "line_spacing",
            "value": "1.5",
            "class": "mandatory",
            "authority_rank": 1,
            "effective_from": "2026-12-01",
            "source": {"title": "newer authority", "file": "test.pdf", "locator": "p. 2"},
            "status": "verified",
        }
    )
    (target / "rules.yaml").write_text(yaml.safe_dump(data, sort_keys=False))

    spec = get_format_spec(
        "allahabad_hc", "allahabad", date(2026, 12, 1), "efiling", "en", courts_root=tmp_path
    )

    assert spec.value_for("line_spacing") == "1.5"
    assert any("line_spacing: conflicting" in warning for warning in spec.warnings)
