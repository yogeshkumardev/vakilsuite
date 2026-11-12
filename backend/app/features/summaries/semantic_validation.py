"""Conservative deterministic checks for unreviewed provider summaries."""

from __future__ import annotations

import re
from dataclasses import dataclass

from app.features.summaries.contracts import CaseSummaryPayload

_DATE_RE = re.compile(
    r"\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b|\b\d{1,2}\s+(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{4}\b",
    re.IGNORECASE,
)
_AMOUNT_RE = re.compile(r"(?:₹|Rs\.?|INR)\s?\d[\d,]*(?:\.\d{1,2})?", re.IGNORECASE)
_NUMBER_RE = re.compile(r"\b\d{2,}\b")


@dataclass(frozen=True)
class SummaryValidationReport:
    total_findings: int
    supported_findings: int
    needs_advocate_review: int
    issues: list[dict[str, object]]

    def as_json(self) -> dict[str, object]:
        return {
            "total_findings": self.total_findings,
            "supported_findings": self.supported_findings,
            "needs_advocate_review": self.needs_advocate_review,
            "issues": self.issues,
        }


def validate_summary_semantics(
    payload: CaseSummaryPayload, *, source_blocks: dict[tuple[str, str], str]
) -> SummaryValidationReport:
    """Flag claims without conservative source support; never call them verified."""
    issues: list[dict[str, object]] = []
    total = supported = 0
    for section in payload.sections:
        for index, finding in enumerate(section.findings):
            total += 1
            cited_text = "\n".join(
                source_blocks.get((citation.source_revision_id, path), "")
                for citation in finding.citations
                for path in citation.source_paths
            )
            reason = _support_reason(finding.text, cited_text)
            if reason is None:
                supported += 1
            else:
                issues.append(
                    {
                        "section": section.name.value,
                        "finding_index": index,
                        "finding_type": finding.finding_type.value,
                        "reason": reason,
                        "requires_advocate_review": True,
                    }
                )
    return SummaryValidationReport(
        total_findings=total,
        supported_findings=supported,
        needs_advocate_review=len(issues),
        issues=issues,
    )


def _support_reason(finding: str, cited_text: str) -> str | None:
    if not cited_text.strip():
        return "Cited source block has no readable text"
    normalized_source = _normalize(cited_text)
    if _normalize(finding) in normalized_source:
        return None
    factual_tokens = [
        *_DATE_RE.findall(finding),
        *_AMOUNT_RE.findall(finding),
        *_NUMBER_RE.findall(finding),
    ]
    missing = [
        token for token in factual_tokens if _normalize(token) not in normalized_source
    ]
    if missing:
        return "Cited text does not contain: " + ", ".join(sorted(set(missing))[:5])
    return "Finding is paraphrased or inferential; lawyer must confirm it against the cited source"


def _normalize(value: str) -> str:
    return re.sub(r"[^\w\u0900-\u097f]+", "", value).casefold()
