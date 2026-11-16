"""Select cited summary facts and validate affidavit prose against that selection."""

from __future__ import annotations

from typing import Any


SKIP_SECTIONS = {
    "case_identification", "case_overview", "executive_summary",
    "missing_information", "advocate_review_checklist", "advocate_actions",
    "potential_prosecution_points", "prosecution_arguments", "legal_issues",
}


def cited_affidavit_findings(summary: dict[str, Any]) -> list[dict[str, Any]]:
    sections = summary.get("sections")
    if not isinstance(sections, (list, dict)):
        return []
    pairs = (
        [(str(section.get("name", "")), section) for section in sections if isinstance(section, dict)]
        if isinstance(sections, list) else list(sections.items())
    )
    findings: list[dict[str, Any]] = []
    seen_text: set[str] = set()

    def visit(value: Any, section: str, path: str) -> None:
        if isinstance(value, dict):
            text, citations = value.get("text"), value.get("citations")
            if isinstance(text, str) and text.strip() and isinstance(citations, list) and citations:
                normalized = " ".join(text.lower().split())
                if normalized not in seen_text:
                    seen_text.add(normalized)
                    findings.append({
                        "id": str(value.get("id") or path), "section": section,
                        "text": text.strip(), "status": str(value.get("status") or value.get("finding_type") or "source_statement"),
                        "citations": citations,
                    })
                return
            for key, child in value.items():
                if key != "citations":
                    visit(child, section, f"{path}.{key}")
        elif isinstance(value, list):
            for index, child in enumerate(value):
                visit(child, section, f"{path}.{index}")

    for section, data in pairs:
        if section not in SKIP_SECTIONS:
            visit(data, section, section)
    if len(findings) > 50:
        raise ValueError("The approved summary has more than 50 distinct affidavit findings")
    identifiers = [finding["id"] for finding in findings]
    if len(identifiers) != len(set(identifiers)):
        raise ValueError("The approved summary has duplicate affidavit finding IDs")
    return findings


def bind_affidavit_paragraphs(
    generated: list[dict[str, str]], findings: list[dict[str, Any]], *, first_number: int = 6,
    revision_hashes: dict[str, str] | None = None,
) -> list[dict[str, Any]]:
    """Require one ordered prose paragraph per sourced finding; keep provenance out of prose."""
    if [item.get("finding_id") for item in generated] != [item["id"] for item in findings]:
        raise ValueError("Gemini omitted, duplicated or reordered a cited affidavit finding")
    result = []
    for number, (paragraph, finding) in enumerate(zip(generated, findings, strict=True), first_number):
        prose = paragraph.get("text", "").strip()
        if not prose or len(prose) > 2500 or "\n" in prose:
            raise ValueError("Gemini returned an invalid affidavit paragraph")
        citations = []
        for citation in finding["citations"]:
            cited = dict(citation)
            revision_id = str(cited.get("source_revision_id") or cited.get("file_version_id") or "")
            if revision_hashes is not None:
                if revision_id not in revision_hashes:
                    raise ValueError("Affidavit citation does not belong to the approved summary sources")
                cited["source_revision_hash"] = revision_hashes[revision_id]
            citations.append(cited)
        result.append({
            "role": "body", "text": f"{number}. {prose}", "editable": True,
            "source_fact_ids": [finding["id"]], "citations": citations,
            "source_status": finding["status"],
        })
    return result


def source_revision_hashes(snapshot: list[dict]) -> dict[str, str]:
    hashes = {}
    for entry in snapshot:
        if entry.get("kind") == "original_pdf":
            hashes[str(entry["revision_id"])] = str(entry["sha256"])
        else:
            hashes[str(entry["revision_id"])] = str(entry["revision_sha256"])
    return hashes
