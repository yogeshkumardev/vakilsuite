"""Page assignments travel with source-page containers, never editable marker text."""

from copy import deepcopy

from app.core.exceptions import ValidationError


def page_paths(
    editor_document: dict, page_count: int, *, require_complete=False
) -> dict[str, int]:
    mapping = {}
    unmapped = []

    def walk(node, path, page=None):
        if node.get("type") == "source-page":
            if page is not None:
                raise ValidationError("Source page containers cannot be nested")
            page = node.get("pageNumber")
            if (
                isinstance(page, bool)
                or not isinstance(page, int)
                or not 1 <= page <= page_count
            ):
                raise ValidationError("Assign a valid original page to the source text")
        if node.get("type") == "text" and node.get("text", "").strip():
            if page is None:
                unmapped.append(path)
            else:
                mapping[path] = page
        for i, child in enumerate(node.get("children", [])):
            walk(child, f"{path}.children.{i}", page)

    walk(editor_document["editorState"]["root"], "editorState.root")
    if require_complete and (
        unmapped or set(mapping.values()) != set(range(1, page_count + 1))
    ):
        raise ValidationError(
            "Review every original page and assign all text before confirming (mark blank pages explicitly)"
        )
    return mapping


def pages_with_provenance(pages, *, formatted_pages=None):
    from .source_text import pages_editor
    from .extraction_mapping import _paragraph

    editor = pages_editor([])
    editor["editorState"]["root"]["children"] = [
        {
            "type": "source-page",
            "version": 1,
            "pageNumber": p["page_number"],
            "direction": None,
            "format": "",
            "indent": 0,
            "children": (formatted_pages or {}).get(p["page_number"], [_paragraph(p["text"])]),
        }
        for p in pages
    ]
    return editor


def stabilize_ordered_source_pages(editor_document: object, page_count: int) -> object:
    """Restore system-owned page labels on an otherwise intact source editor.

    The full-document review surface deliberately does not expose page-label
    controls. Its source-page containers are created in original-page order,
    so a client-side serialization glitch must not leave a lawyer unable to
    confirm an otherwise complete review. We only repair labels when every
    expected top-level container exists and all nonblank text is already
    inside one; arbitrary/unmapped content remains a validation failure.
    """
    if not isinstance(editor_document, dict):
        return editor_document
    editor_state = editor_document.get("editorState")
    root = editor_state.get("root") if isinstance(editor_state, dict) else None
    children = root.get("children") if isinstance(root, dict) else None
    if not isinstance(children, list):
        return editor_document

    source_pages = [
        child
        for child in children
        if isinstance(child, dict) and child.get("type") == "source-page"
    ]
    if len(source_pages) != page_count:
        return editor_document

    def has_nonblank_text(node: object) -> bool:
        if not isinstance(node, dict):
            return False
        if node.get("type") == "text" and str(node.get("text", "")).strip():
            return True
        node_children = node.get("children", [])
        return isinstance(node_children, list) and any(
            has_nonblank_text(child) for child in node_children
        )

    if any(
        isinstance(child, dict)
        and child.get("type") != "source-page"
        and has_nonblank_text(child)
        for child in children
    ):
        return editor_document

    stabilized = deepcopy(editor_document)
    stable_children = stabilized["editorState"]["root"]["children"]
    page_number = 0
    for child in stable_children:
        if isinstance(child, dict) and child.get("type") == "source-page":
            page_number += 1
            child["pageNumber"] = page_number
    return stabilized
