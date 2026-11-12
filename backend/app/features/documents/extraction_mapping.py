"""Map validated extraction output to supported Lexical JSON without approval."""
from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass

from app.features.documents.extraction_validation import ExtractionOutput


@dataclass(frozen=True)
class ExtractionAttemptProvenance:
    provider: str
    model: str
    provider_request_id: str | None
    manifest_digest: str
    output_sha256: str
    completed_pages: tuple[int, ...]
    uncertain_block_count: int


def _text_node(text: str) -> dict[str, object]:
    return {"detail": 0, "format": 0, "mode": "normal", "style": "", "text": text, "type": "text", "version": 1}


def _paragraph(text: str) -> dict[str, object]:
    return {"children": [_text_node(text)], "direction": None, "format": "", "indent": 0, "type": "paragraph", "version": 1}


def map_extraction_to_lexical(output: ExtractionOutput) -> dict[str, object]:
    """Return an unapproved review document; uncertainty remains visible text."""
    children: list[dict[str, object]] = []
    for page in output.completed_pages:
        children.append(_paragraph(f"[Source page {page}]") )
        for block in (item for item in output.blocks if item.page_number == page):
            prefix = "[Uncertain] " if block.uncertain else ""
            children.append(_paragraph(prefix + block.text))
        for table in (item for item in output.tables if item.page_number == page):
            for row in table.rows:
                children.append(_paragraph(" | ".join(row)))
    return {"schemaVersion": 1, "editorState": {"root": {"children": children, "direction": None, "format": "", "indent": 0, "type": "root", "version": 1}}, "pageLayout": {"pageSize": "A4", "orientation": "portrait", "marginTop": 20, "marginRight": 20, "marginBottom": 20, "marginLeft": 20}}


def build_attempt_provenance(output: ExtractionOutput, *, provider: str, model: str, manifest_digest: str, provider_request_id: str | None = None) -> ExtractionAttemptProvenance:
    serialized = json.dumps(output.model_dump(mode="json"), sort_keys=True, separators=(",", ":"))
    return ExtractionAttemptProvenance(provider=provider, model=model, provider_request_id=provider_request_id, manifest_digest=manifest_digest, output_sha256=hashlib.sha256(serialized.encode()).hexdigest(), completed_pages=tuple(output.completed_pages), uncertain_block_count=sum(block.uncertain for block in output.blocks))
