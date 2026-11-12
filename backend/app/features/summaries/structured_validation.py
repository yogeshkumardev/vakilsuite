"""Manifest-bound validation shared by generation, review and source navigation."""

from .structured import StructuredSummary
from .semantic_validation import _support_reason


def validate_structured(payload: StructuredSummary, records: list[dict]) -> dict:
    allowed = {str(r["source_revision_id"]): r for r in records}
    issues = []
    facts = list(payload.facts())
    for fact in facts:
        support = []
        for cite in fact.citations:
            record = allowed.get(cite.source_revision_id)
            if record is None or cite.document_id != record.get(
                "original_document_id", record["source_document_id"]
            ):
                raise ValueError(
                    "Citation must identify an authorized original document"
                )
            if cite.file_version_id != record.get("file_version_id"):
                raise ValueError("Citation file version does not match manifest")
            if any(
                record.get("page_paths", {}).get(p) != cite.page_number
                for p in cite.source_paths
            ):
                raise ValueError("Citation lacks valid original page provenance")
            support.extend(
                record.get("source_blocks", {}).get(p, "") for p in cite.source_paths
            )
        reason = _support_reason(fact.text, "\n".join(support))
        if reason:
            issues.append(
                {
                    "finding_id": fact.id,
                    "reason": reason,
                    "requires_advocate_review": True,
                }
            )
    return {
        "total_findings": len(facts),
        "supported_findings": len(facts) - len(issues),
        "needs_advocate_review": len(issues),
        "issues": issues,
    }


def parse_summary(value):
    from .contracts import CaseSummaryPayload

    if value.get("schema_version") == "case-summary-v2":
        return StructuredSummary.model_validate(value)
    return CaseSummaryPayload.model_validate(value)
