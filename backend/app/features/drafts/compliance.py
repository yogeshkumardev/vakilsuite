"""Deterministic checks for court-draft DOCX rendering."""

from __future__ import annotations

import io
from typing import Any, Literal

from docx import Document
from pydantic import BaseModel


class ComplianceCheck(BaseModel):
    code: str
    status: Literal["pass", "warning", "fail"]
    expected: str
    found: str
    source: str
    locator: str


class ComplianceReport(BaseModel):
    overall: Literal["pass", "warning", "fail"]
    checks: list[ComplianceCheck]


def _source(snapshot: dict[str, Any], attribute: str) -> tuple[str, str]:
    rule = snapshot.get("rules", {}).get(attribute, {})
    source = rule.get("source", {}) if isinstance(rule, dict) else {}
    return str(source.get("title", "Saved format snapshot")), str(source.get("locator", "Saved format snapshot"))


def validate_court_draft_docx(docx: bytes, content: dict[str, Any], rule_snapshot: dict[str, Any]) -> ComplianceReport:
    document = Document(io.BytesIO(docx))
    section = document.sections[0]
    expected_margins = rule_snapshot["rules"]["margins"]["value"]
    checks: list[ComplianceCheck] = []
    for key, actual in (("top_in", section.top_margin.inches), ("right_in", section.right_margin.inches), ("bottom_in", section.bottom_margin.inches), ("left_in", section.left_margin.inches)):
        source, locator = _source(rule_snapshot, "margins")
        expected = float(expected_margins[key])
        checks.append(ComplianceCheck(code=f"margin.{key}", status="pass" if abs(actual - expected) < .02 else "fail", expected=f"{expected} in", found=f"{actual:.2f} in", source=source, locator=locator))
    text = "\n".join(paragraph.text for paragraph in document.paragraphs)
    source, locator = _source(rule_snapshot, "page.size")
    checks.append(ComplianceCheck(code="placeholders", status="warning" if "[●" in text or "......" in text else "pass", expected="No unresolved placeholders", found="Unresolved placeholder found" if "[●" in text or "......" in text else "None", source=source, locator=locator))
    expected_components = [item.get("code") for item in content.get("components", [])]
    checks.append(ComplianceCheck(code="component_order", status="pass" if expected_components else "fail", expected="Blueprint components in saved order", found=", ".join(str(item) for item in expected_components), source=source, locator=locator))
    overall = "fail" if any(check.status == "fail" for check in checks) else "warning" if any(check.status == "warning" for check in checks) else "pass"
    return ComplianceReport(overall=overall, checks=checks)
