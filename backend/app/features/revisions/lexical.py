"""Validation and deterministic text projection for the supported Lexical schema.

This boundary intentionally accepts structured editor state, not HTML.  It is
shared-contract logic: clients may construct it, but the server is the only
authority that accepts it and derives normalized text/source offsets.
"""
from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from app.core.exceptions import ValidationError


EDITOR_DOCUMENT_SCHEMA_VERSION = 1
MAX_EDITOR_DOCUMENT_BYTES = 2 * 1024 * 1024
MAX_EDITOR_NODES = 20_000
MAX_NORMALIZED_TEXT_CHARS = 1_000_000
MAX_EDITOR_DEPTH = 100

_CONTAINER_TYPES = {
    "root", "paragraph", "heading", "quote", "list", "listitem", "link", "autolink",
    "table", "tablerow", "tablecell", "source-page",
}
_LEAF_TYPES = {"text", "linebreak", "horizontalrule", "image", "page-break"}
_SUPPORTED_NODE_TYPES = _CONTAINER_TYPES | _LEAF_TYPES
_BLOCK_TYPES = {"paragraph", "heading", "quote", "listitem", "tablecell", "tablerow", "horizontalrule", "image", "page-break"}


@dataclass(frozen=True)
class ValidatedEditorDocument:
    editor_document: dict[str, object]
    normalized_text: str
    source_map: list[dict[str, object]]
    content_sha256: str


def _invalid(message: str) -> None:
    raise ValidationError(message)


def validate_editor_document(value: object) -> ValidatedEditorDocument:
    """Validate v1 editor JSON and project text without trusting client offsets."""
    if not isinstance(value, dict):
        _invalid("editor_document must be an object")

    try:
        canonical = json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    except (TypeError, ValueError):
        _invalid("editor_document must contain JSON-compatible values")
    if len(canonical.encode("utf-8")) > MAX_EDITOR_DOCUMENT_BYTES:
        _invalid("editor_document exceeds the 2 MiB limit")

    if set(value) != {"schemaVersion", "editorState", "pageLayout"}:
        _invalid("editor_document must contain schemaVersion, editorState and pageLayout only")
    if value.get("schemaVersion") != EDITOR_DOCUMENT_SCHEMA_VERSION:
        _invalid("Unsupported editor_document schemaVersion")
    editor_state = value.get("editorState")
    if not isinstance(editor_state, dict) or not isinstance(editor_state.get("root"), dict):
        _invalid("editor_document.editorState.root is required")
    _validate_page_layout(value.get("pageLayout"))

    fragments: list[str] = []
    source_map: list[dict[str, object]] = []
    node_count = 0
    normalized_length = 0

    def append_fragment(fragment: str) -> None:
        nonlocal normalized_length
        fragments.append(fragment)
        normalized_length += len(fragment)

    def append_separator() -> None:
        if fragments and not fragments[-1].endswith("\n"):
            append_fragment("\n")

    def walk(node: object, path: tuple[str | int, ...], depth: int) -> None:
        nonlocal node_count
        if depth > MAX_EDITOR_DEPTH:
            _invalid("editor_document nesting is too deep")
        if not isinstance(node, dict):
            _invalid("Each Lexical node must be an object")
        node_type = node.get("type")
        if not isinstance(node_type, str) or node_type not in _SUPPORTED_NODE_TYPES:
            _invalid(f"Unsupported Lexical node type: {node_type!r}")
        node_count += 1
        if node_count > MAX_EDITOR_NODES:
            _invalid("editor_document contains too many nodes")

        if node_type == "text":
            text = node.get("text")
            if not isinstance(text, str):
                _invalid("Text nodes require a string text value")
            normalized = text.replace("\r\n", "\n").replace("\r", "\n")
            start = normalized_length
            append_fragment(normalized)
            end = normalized_length
            source_map.append({"path": _format_path(path), "start": start, "end": end})
            if end > MAX_NORMALIZED_TEXT_CHARS:
                _invalid("editor_document text exceeds the 1,000,000 character limit")
            return

        if node_type == "source-page":
            page = node.get("pageNumber")
            if isinstance(page, bool) or not isinstance(page, int) or not 1 <= page <= 500:
                _invalid("Source page assignment must be between 1 and 500")
        children = node.get("children")
        if node_type in _CONTAINER_TYPES:
            if not isinstance(children, list):
                _invalid(f"{node_type} nodes require a children array")
            for index, child in enumerate(children):
                walk(child, (*path, "children", index), depth + 1)
            if node_type in _BLOCK_TYPES:
                append_separator()
            return

        if children is not None:
            _invalid(f"{node_type} nodes cannot have children")
        if node_type == "image":
            source = node.get("src")
            if not isinstance(source, str) or not source.strip():
                _invalid("Image nodes require a non-empty src")
        if node_type == "linebreak":
            append_fragment("\n")

    root = editor_state["root"]
    walk(root, ("editorState", "root"), 0)
    # Keep block separators exactly as projected. Trimming here would make a
    # source-map end offset point past the returned normalized text.
    normalized_text = "".join(fragments)
    return ValidatedEditorDocument(
        editor_document=json.loads(canonical),
        normalized_text=normalized_text,
        source_map=source_map,
        content_sha256=hashlib.sha256(canonical.encode("utf-8")).hexdigest(),
    )


def _format_path(path: tuple[str | int, ...]) -> str:
    return ".".join(str(part) for part in path)


def _validate_page_layout(value: object) -> None:
    if not isinstance(value, dict):
        _invalid("editor_document.pageLayout must be an object")
    if value.get("pageSize") not in {"A4", "A3", "Legal", "Letter"}:
        _invalid("editor_document.pageLayout.pageSize is invalid")
    if value.get("orientation") not in {"portrait", "landscape"}:
        _invalid("editor_document.pageLayout.orientation is invalid")
    for field in ("marginTop", "marginRight", "marginBottom", "marginLeft"):
        margin = value.get(field)
        if not isinstance(margin, (int, float)) or isinstance(margin, bool) or not 0 <= margin <= 100:
            _invalid(f"editor_document.pageLayout.{field} must be a number between 0 and 100")
