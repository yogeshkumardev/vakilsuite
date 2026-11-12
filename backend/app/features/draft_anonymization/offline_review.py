"""Prepare private, unaudited review artifacts from a saved provider response."""

import hashlib
import json
import os
import re
from pathlib import Path

from app.features.draft_anonymization.service import (
    extract_docx,
    obvious_findings,
    repair_detected_spans,
    substitute,
)
from app.integrations.ai.draft_anonymizer import decode_detection


def build_review(data: bytes, checkpoint: dict) -> dict:
    if checkpoint.get("stage") != "detection" or checkpoint.get("call") != 1:
        raise ValueError("DETECTION_CHECKPOINT_REQUIRED")
    response = checkpoint["response"]
    candidates = response.get("candidates", [])
    if len(candidates) != 1 or candidates[0].get("finish_reason") != "STOP":
        raise ValueError("COMPLETE_DETECTION_REQUIRED")
    text = "".join(
        p.get("text", "")
        for p in candidates[0]["content"]["parts"]
        if not p.get("thought")
    )
    detection = decode_detection(text)
    layout = []
    source = extract_docx(data, layout=layout)
    masked = substitute(source, obvious_findings(source))
    issues = []
    repaired = repair_detected_spans(masked, detection, issues=issues, layout=layout)
    output = substitute(masked, repaired.findings)
    locations = {entry["block_id"]: entry for entry in layout}
    unresolved = []
    for index, finding in enumerate(detection.findings):
        source_block = masked.get(finding.block_id)
        if source_block is None:
            raise ValueError("INVALID_SOURCE_SPAN")
        if source_block[finding.start : finding.end] == finding.quote:
            continue
        matches = [
            m.start()
            for m in re.finditer("(?=" + re.escape(finding.quote) + ")", source_block)
        ]
        if len(matches) > 1:
            unresolved.append(
                {
                    "issue_id": f"finding-{index + 1}",
                    "location": locations[finding.block_id],
                    "category": finding.category,
                    "entity_id": finding.entity_id,
                    "quote": finding.quote,
                    "claimed_start": finding.start,
                    "candidate_spans": [
                        {"start": start, "end": start + len(finding.quote)}
                        for start in matches
                    ],
                    "source_block_after_direct_id_masking": source_block,
                    "reason": "AMBIGUOUS_SOURCE_SPAN",
                    "action": "Original DOCX se correct occurrence/identity verify karein; review.md mein consistent placeholder se replace karein. Har occurrence ko bina verify kiye same entity na maanein.",
                }
            )
    markdown = [
        "# Private draft review — unaudited",
        "Is file mein PII reh sakti hai. Independent audit pending; knowledge ingestion approved nahi hai.",
    ]
    for block, value in output.items():
        markdown.extend(
            [f'<a id="{block}"></a>\n<!-- source block: {block} -->', value]
        )
    markdown.extend(
        ["## Data Quality Flags", "QUARANTINED — AUDIT_NOT_RUN", *sorted(set(issues))]
    )
    return {
        "status": "quarantined",
        "audit_status": "not_run",
        "publication_allowed": False,
        "input_sha256": hashlib.sha256(data).hexdigest(),
        "markdown": "\n\n".join(markdown) + "\n",
        "blocks": output,
        "layout": layout,
        "unresolved": unresolved,
        "resolved_span_count": len(repaired.findings),
        "adjacent_span_repairs": issues.count("ADJACENT_PARAGRAPH_SPAN_REPAIRED"),
        "quarantine_reasons": ["AUDIT_NOT_RUN", *sorted(set(issues))],
    }


def _fenced(value: str) -> str:
    fence = "`" * max(
        3, 1 + max((len(m.group()) for m in re.finditer(r"`+", value)), default=0)
    )
    return f"{fence}text\n{value}\n{fence}"


def write_review(target: Path, result: dict, provenance: dict) -> None:
    # Exclusive directory creation protects prior reviewer edits.
    target.mkdir(mode=0o700)
    report = [
        "# Private unresolved-span review report",
        "Audit pending. Quotes/context below may contain real identities; keep this report private.",
        "Offsets refer to extracted text after direct-ID masking (Python character offsets), not Word page numbers.",
        f"Unresolved findings: {len(result['unresolved'])}",
        "In issues ke alawa poore original aur output ka privacy/meaning review bhi karein.",
    ]
    for item in result["unresolved"]:
        block = item["location"]["block_id"]
        report.extend(
            [
                f"## {item['issue_id']} — [{block}](review.md#{block})",
                f"Location: {json.dumps(item['location'])}",
                f"Category: {item['category']}; entity reference: {item['entity_id']}",
                "Quoted text:",
                _fenced(item["quote"]),
                f"Candidate spans: {json.dumps(item['candidate_spans'])}",
                "Source context (direct IDs masked):",
                _fenced(item["source_block_after_direct_id_masking"]),
                item["action"],
                "Reviewer decision: PENDING",
            ]
        )
    result = {**result, "provenance": provenance}
    for name, content in {
        "result.json": json.dumps(result, ensure_ascii=False, indent=2),
        "review.md": result["markdown"],
        "REVIEW_REPORT.md": "\n\n".join(report) + "\n",
    }.items():
        fd = os.open(target / name, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(fd, "w", encoding="utf-8") as stream:
            stream.write(content)
