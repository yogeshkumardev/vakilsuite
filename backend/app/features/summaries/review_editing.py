"""Local human editing: preserve provider output and source identities; no AI calls."""

import copy
import hashlib
import json

from app.core.exceptions import ValidationError


def effective_payload(run):
    return getattr(run, "review_payload", None) or run.result_payload


def effective_hash(run):
    return getattr(run, "review_hash", None) or run.result_hash


def recover_review_payload(payload):
    if not payload:
        return None, None
    if payload.get("schema_version") != "case-summary-unverified-v1":
        return copy.deepcopy(payload), None
    raw = payload.get("raw_text", "").strip()
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[-1].rsplit("```", 1)[0]
    notice = None
    try:
        parsed = json.loads(raw)
    except (ValueError, TypeError):
        from pydantic_core import from_json

        try:
            parsed = from_json(raw, allow_partial=True)
        except (ValueError, TypeError):
            return None, None
        notice = (
            "The saved AI response ended early. Only recovered content is shown. "
            "Check every original document and complete missing information before approving."
        )
        # A trailing empty object is an unfinished container, not a finding.
        # Preserve every actual text/citation; invalid source metadata still blocks approval.
        if isinstance(parsed, dict) and isinstance(parsed.get("sections"), list):
            for section in parsed["sections"]:
                if isinstance(section, dict) and isinstance(
                    section.get("findings"), list
                ):
                    section["findings"] = [f for f in section["findings"] if f != {}]
    if not isinstance(parsed, dict) or not isinstance(
        parsed.get("sections"), (list, dict)
    ):
        return None, notice
    return parsed, notice


def editable_payload(payload):
    return recover_review_payload(payload)[0]


def text_blocks(payload):
    """Stable paths bind text edits to existing citations, never client supplied sources."""
    from app.features.summaries.structured import SECTION_TITLES

    blocks = []

    def get_structured_title(path, default_title):
        if not path:
            return default_title
        if path[0] == "sections" and len(path) >= 2 and isinstance(path[1], str):
            sec_key = path[1]
            sec_title = SECTION_TITLES.get(sec_key, sec_key.replace("_", " ").title())
            if len(path) >= 3 and isinstance(path[2], str) and path[2] not in {
                "findings", "sentences", "facts", "items", "incident_factual", "procedural_court"
            }:
                sub = path[2].replace("_", " ").title()
                return f"{sec_title} — {sub}"
            return sec_title
        if path[0] == "additional_sections" and len(path) >= 2 and isinstance(path[1], str):
            sec_name = str(path[1]).replace("_", " ").title()
            return f"Additional Remarks — {sec_name}"
        if path[0] == "uncertainties":
            return "Uncertainties"
        return default_title

    def walk(value, path, title):
        if isinstance(value, dict):
            if value.get("name"):
                title = str(value.get("name")).replace("_", " ")
            else:
                title = get_structured_title(path, title)
            for key, child in value.items():
                child_path = [*path, key]
                if (key in {
                    "text",
                    "description",
                    "instruction",
                    "research_required",
                    "source_wording",
                } or (path and path[0] == "additional_sections")) and isinstance(child, str):
                    block_title = get_structured_title(path, title)
                    blocks.append(
                        {"id": json.dumps(child_path), "title": block_title, "text": child}
                    )
                elif key not in {"citations", "validation_report"}:
                    walk(child, child_path, title)
        elif isinstance(value, list):
            for index, child in enumerate(value):
                child_path = [*path, index]
                if path and path[-1] == "uncertainties" and isinstance(child, str):
                    blocks.append(
                        {
                            "id": json.dumps(child_path),
                            "title": "Uncertainties",
                            "text": child,
                        }
                    )
                else:
                    walk(child, child_path, title)

    walk(payload, [], "Case summary")
    return blocks


def apply_edits(payload, state):
    """Accept text/format edits inside all original source-bound review blocks."""
    if len(json.dumps(state).encode()) > 2 * 1024 * 1024:
        raise ValidationError("Summary exceeds the 2 MiB editor limit")
    expected_blocks = text_blocks(payload)
    expected = {block["id"] for block in expected_blocks}
    root = state.get("root")
    if not isinstance(root, dict) or root.get("type") != "root":
        raise ValidationError("Invalid summary editor root")
    children = root.get("children", [])
    if not expected or not isinstance(children, list):
        raise ValidationError("No editable summary content is available")
    edited = copy.deepcopy(payload)
    seen = set()
    allowed = {"paragraph", "text", "linebreak", "heading", "quote", "list", "listitem"}

    def text(node, depth=0):
        if depth > 50 or not isinstance(node, dict) or node.get("type") not in allowed:
            raise ValidationError("Unsupported summary formatting")
        if node["type"] == "text":
            if not isinstance(node.get("text"), str):
                raise ValidationError("Invalid summary text")
            return node["text"]
        if node["type"] == "linebreak":
            return "\n"
        children = node.get("children")
        if not isinstance(children, list):
            raise ValidationError("Invalid summary formatting children")
        return "".join(text(child, depth + 1) for child in children) + "\n"

    for index, block in enumerate(children):
        if not isinstance(block, dict) or not isinstance(block.get("children"), list):
            raise ValidationError("Invalid summary section")
        ident = block.get("blockId")
        if not isinstance(ident, str):
            raise ValidationError("Invalid summary source binding")
        if (
            block.get("type") != "summary-review-block"
            or ident not in expected
            or ident in seen
            or index >= len(expected_blocks)
            or ident != expected_blocks[index]["id"]
            or block.get("title", expected_blocks[index]["title"])
            != expected_blocks[index]["title"]
        ):
            raise ValidationError(
                "Keep edits inside their source-linked sections; reload if a section was removed"
            )
        seen.add(ident)
        value = "".join(text(child) for child in block.get("children", [])).strip()
        if not value or len(value) > 5000:
            raise ValidationError(
                "Each summary item needs between 1 and 5,000 characters"
            )
        path = json.loads(ident)
        target = edited
        for key in path[:-1]:
            target = target[key]
        target[path[-1]] = value
    if seen != expected:
        raise ValidationError(
            "A source-linked section was removed. Undo that change before saving"
        )
    digest = hashlib.sha256(
        json.dumps(
            {"payload": edited, "editor": state}, sort_keys=True, ensure_ascii=False
        ).encode()
    ).hexdigest()
    return edited, digest
