"""Storage-independent, bounded DOCX de-identification with exact-span replacement."""

from __future__ import annotations

import hashlib
import io
import re
from typing import Literal, Protocol
from zipfile import ZipFile
from xml.etree import ElementTree as ET

from pydantic import BaseModel, ConfigDict, Field

VERSION = "draft-anonymization-v1"
W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"


class Finding(BaseModel):
    model_config = ConfigDict(extra="forbid")
    block_id: str
    start: int = Field(ge=0)
    # Gemini structured output accepts JSON Schema ``minimum`` but not
    # ``exclusiveMinimum``.  ``ge=1`` enforces the same valid offset range
    # as the old ``gt=0`` while keeping the provider schema portable.
    end: int = Field(ge=1)
    quote: str = Field(min_length=1)
    entity_id: str = Field(pattern=r"^[A-Za-z0-9_-]{1,80}$")
    category: Literal[
        "PERSON",
        "ADDRESS",
        "CONTACT",
        "IDENTIFIER",
        "CASE_NUMBER",
        "EVENT_DATE",
        "AMOUNT",
        "AGE",
        "LOCATION",
        "SENSITIVE_FACT",
    ]


class Detection(BaseModel):
    model_config = ConfigDict(extra="forbid")
    findings: list[Finding] = Field(max_length=2000)
    uncertain: bool


class Detector(Protocol):
    def detect(self, blocks: dict[str, str], *, audit: bool = False) -> Detection: ...


def repair_detected_spans(
    blocks: dict[str, str],
    detection: Detection,
    *,
    issues: list[str] | None = None,
    layout: list[dict] | None = None,
) -> Detection:
    """Repair only provably stale model offsets, never model text.

    Models occasionally count Unicode or formatting boundaries differently.  A
    finding remains usable only when its exact quote exists in the named source
    block exactly once. Ambiguous repeated quotes are left unchanged in the
    private draft and force quarantine for manual correction.
    A missing quote is deliberately left untouched and is
    rejected later by :func:`substitute`.
    """
    repaired = False
    findings: list[Finding] = []
    for finding in detection.findings:
        source = blocks.get(finding.block_id)
        if source is None or source[finding.start : finding.end] == finding.quote:
            findings.append(finding)
            continue

        positions = [
            match.start() for match in re.finditer(re.escape(finding.quote), source)
        ]
        if not positions:
            split = split_adjacent_quote(blocks, finding, layout=layout)
            if split:
                findings.extend(split)
                repaired = True
                if issues is not None:
                    issues.append("ADJACENT_PARAGRAPH_SPAN_REPAIRED")
                continue
            findings.append(finding)
            continue
        if len(positions) != 1:
            repaired = True
            if issues is not None:
                issues.append("AMBIGUOUS_SOURCE_SPAN_REQUIRES_MANUAL_REDACTION")
            continue
        start = positions[0]
        findings.append(
            finding.model_copy(
                update={"start": start, "end": start + len(finding.quote)}
            )
        )
        repaired = True
    return Detection(findings=findings, uncertain=detection.uncertain or repaired)


def split_adjacent_quote(
    blocks: dict[str, str], finding: Finding, *, layout: list[dict] | None = None
) -> list[Finding]:
    """Split a verbatim newline-joined quote across at most eight adjacent blocks.

    No whitespace normalization, fuzzy matching, or searching other document
    locations. The match must start inside the claimed block and remain in the
    same document part/table cell when extraction layout is available.
    """
    if "\n" not in finding.quote or finding.block_id not in blocks:
        return []
    keys = list(blocks)
    index = keys.index(finding.block_id)
    window = keys[index : index + 8]
    if layout is not None:
        groups = {
            item["block_id"]: tuple(
                item.get(k) for k in ("part", "table", "row", "cell")
            )
            for item in layout
        }
        if finding.block_id not in groups:
            return []
        safe = []
        for key in window:
            if groups.get(key) != groups[finding.block_id]:
                break
            safe.append(key)
        window = safe
    joined = "\n".join(blocks[key] for key in window)
    positions = [
        match.start()
        for match in re.finditer("(?=" + re.escape(finding.quote) + ")", joined)
        if match.start() < len(blocks[finding.block_id])
    ]
    if len(positions) != 1:
        return []
    start = positions[0]
    end = start + len(finding.quote)
    spans = []
    cursor = 0
    for key in window:
        block_end = cursor + len(blocks[key])
        left, right = max(start, cursor), min(end, block_end)
        if left < right:
            spans.append(
                finding.model_copy(
                    update={
                        "block_id": key,
                        "start": left - cursor,
                        "end": right - cursor,
                        "quote": blocks[key][left - cursor : right - cursor],
                    }
                )
            )
        cursor = block_end + 1
    return spans if len(spans) >= 2 else []


def extract_docx(data: bytes, *, layout: list | None = None) -> dict[str, str]:
    if len(data) > 10 * 1024 * 1024:
        raise ValueError("INPUT_TOO_LARGE")
    blocks: dict[str, str] = {}
    with ZipFile(io.BytesIO(data)) as archive:
        entries = archive.infolist()
        if len(entries) > 500 or sum(e.file_size for e in entries) > 30 * 1024 * 1024:
            raise ValueError("ARCHIVE_LIMIT")
        if len({e.filename for e in entries}) != len(entries):
            raise ValueError("DUPLICATE_ARCHIVE_PART")
        for entry in entries:
            name = entry.filename
            if name.startswith("/") or ".." in name.split("/"):
                raise ValueError("UNSAFE_ARCHIVE_PATH")
            if name.startswith(("word/media/", "word/embeddings/")) or name.endswith(
                "vbaProject.bin"
            ):
                raise ValueError("UNSUPPORTED_EMBEDDED_CONTENT")
        parts = ["word/document.xml"] + sorted(
            n
            for n in archive.namelist()
            if re.fullmatch(
                r"word/(header\d+|footer\d+|footnotes|endnotes|comments)\.xml", n
            )
        )
        for part in parts:
            raw = archive.read(part)
            if b"<!DOCTYPE" in raw or b"<!ENTITY" in raw:
                raise ValueError("UNSAFE_XML")
            root = ET.fromstring(raw)
            parents = {child: parent for parent in root.iter() for child in parent}
            if any(
                next(root.iter(tag), None) is not None
                for tag in (W + "ins", W + "del", W + "altChunk")
            ):
                raise ValueError("UNSUPPORTED_REVISIONS_OR_CONTENT")
            for paragraph in root.iter(W + "p"):
                # Include each text run once, including nested text-box paragraphs.
                if next(paragraph.iter(W + "txbxContent"), None) is not None:
                    raise ValueError("TEXT_BOX_REQUIRES_REVIEW")
                text = "".join(node.text or "" for node in paragraph.iter(W + "t"))
                if text.strip():
                    block_id = f"b{len(blocks):05d}"
                    blocks[block_id] = text
                    if layout is not None:
                        node = paragraph
                        cell = row = table = None
                        while node in parents:
                            node = parents[node]
                            if node.tag == W + "tc":
                                cell = node
                            if node.tag == W + "tr":
                                row = node
                            if node.tag == W + "tbl":
                                table = node
                        layout.append(
                            {
                                "block_id": block_id,
                                "part": part,
                                "table": list(root.iter(W + "tbl")).index(table)
                                if table is not None
                                else None,
                                "row": list(table.iter(W + "tr")).index(row)
                                if table is not None and row is not None
                                else None,
                                "cell": list(row.iter(W + "tc")).index(cell)
                                if row is not None and cell is not None
                                else None,
                            }
                        )
    if not blocks or sum(map(len, blocks.values())) > 80_000:
        raise ValueError("EMPTY_OR_OVERSIZED_TEXT")
    return blocks


PATTERNS = (
    ("CONTACT", r"[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}"),
    ("IDENTIFIER", r"\b[A-Z]{5}\d{4}[A-Z]\b"),
    ("IDENTIFIER", r"\b\d{4}[ -]\d{4}[ -]\d{4}\b"),
    ("CONTACT", r"(?<!\d)(?:\+91[ -]?)?[6-9]\d{9}(?!\d)"),
)


def obvious_findings(blocks: dict[str, str]) -> list[Finding]:
    findings = []
    for block_id, text in blocks.items():
        for category, pattern in PATTERNS:
            for match in re.finditer(pattern, text):
                findings.append(
                    Finding(
                        block_id=block_id,
                        start=match.start(),
                        end=match.end(),
                        quote=match.group(),
                        entity_id=hashlib.sha256(
                            match.group().casefold().encode()
                        ).hexdigest(),
                        category=category,
                    )
                )
    return findings


def substitute(blocks: dict[str, str], findings: list[Finding]) -> dict[str, str]:
    tokens: dict[tuple[str, str], str] = {}
    counts: dict[str, int] = {}
    for text in blocks.values():
        for category, number in re.findall(r"\[([A-Z_]+)_(\d+)\]", text):
            counts[category] = max(counts.get(category, 0), int(number))
    output = dict(blocks)
    by_block: dict[str, list[Finding]] = {}
    for finding in findings:
        source = blocks.get(finding.block_id)
        if source is None or source[finding.start : finding.end] != finding.quote:
            raise ValueError("INVALID_SOURCE_SPAN")
        by_block.setdefault(finding.block_id, []).append(finding)
    for block_id in blocks:
        cursor = 0
        pieces = []
        for finding in sorted(
            by_block.get(block_id, []), key=lambda f: (f.start, f.end)
        ):
            if finding.start < cursor:
                raise ValueError("OVERLAPPING_SOURCE_SPANS")
            key = (finding.category, finding.entity_id)
            if key not in tokens:
                counts[finding.category] = counts.get(finding.category, 0) + 1
                tokens[key] = f"[{finding.category}_{counts[finding.category]}]"
            pieces.extend([blocks[block_id][cursor : finding.start], tokens[key]])
            cursor = finding.end
        pieces.append(blocks[block_id][cursor:])
        output[block_id] = "".join(pieces)
    return output


def anonymize(data: bytes, detector: Detector) -> dict:
    layout: list = []
    blocks = extract_docx(data, layout=layout)
    # Direct identifiers are removed locally before the first provider request.
    masked = substitute(blocks, obvious_findings(blocks))
    span_issues: list[str] = []
    first = repair_detected_spans(
        masked, detector.detect(masked), issues=span_issues, layout=layout
    )
    sanitized = substitute(masked, first.findings)
    # Audit never substitutes text; preserve every audit finding, including
    # ambiguous spans, as evidence that manual review is required.
    audit = detector.detect(sanitized, audit=True)
    leaked = bool(obvious_findings(sanitized)) or bool(audit.findings)
    # Deterministic repeated-alias leak check supplements the independent audit.
    leaked |= any(
        f.quote.casefold() in text.casefold()
        for f in first.findings
        for text in sanitized.values()
    )
    quarantine_reasons = sorted(set(span_issues))
    if first.uncertain:
        quarantine_reasons.append("DETECTION_UNCERTAIN_OR_OFFSETS_REPAIRED")
    if audit.uncertain:
        quarantine_reasons.append("AUDIT_UNCERTAIN_OR_OFFSETS_REPAIRED")
    if leaked:
        quarantine_reasons.append("POTENTIAL_IDENTIFIERS_REMAIN")
    status = (
        "quarantined"
        if leaked or first.uncertain or audit.uncertain
        else "review_pending"
    )
    body = render_blocks(sanitized, layout)
    legend = sorted(set(re.findall(r"\[[A-Z_]+_\d+\]", body)))
    markdown = (
        body
        + "\n\n## Placeholder Legend\n\n"
        + "\n".join(legend)
        + "\n\n## Data Quality Flags\n\n"
        + status
        + "\n"
        + "\n".join(quarantine_reasons)
        + "\n"
    )
    return {
        "schema_version": VERSION,
        "input_sha256": hashlib.sha256(data).hexdigest(),
        "output_sha256": hashlib.sha256(markdown.encode()).hexdigest(),
        "status": status,
        "blocks": sanitized,
        "layout": layout,
        "markdown": markdown,
        "publication_allowed": False,
        "finding_count": len(first.findings),
        "audit_findings": len(audit.findings),
        "quarantine_reasons": quarantine_reasons,
        "unresolved_span_count": span_issues.count(
            "AMBIGUOUS_SOURCE_SPAN_REQUIRES_MANUAL_REDACTION"
        ),
        "adjacent_span_repairs": span_issues.count("ADJACENT_PARAGRAPH_SPAN_REPAIRED"),
    }


def render_blocks(blocks: dict[str, str], layout: list[dict]) -> str:
    """Keep paragraph order and explicit table/cell boundaries in readable Markdown."""
    rendered = []
    previous = None
    for item in layout:
        group = (item["part"], item["table"], item["row"], item["cell"])
        if group != previous and item["table"] is not None:
            rendered.append(
                f"\n**Table {item['table'] + 1}, row {item['row'] + 1}, cell {item['cell'] + 1}**\n"
            )
        if previous is None or previous[0] != item["part"]:
            rendered.append(f"\n## {item['part']}\n")
        rendered.append(blocks[item["block_id"]])
        previous = group
    return "\n\n".join(rendered)
