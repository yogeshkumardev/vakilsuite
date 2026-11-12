import base64
import binascii
import io
import re
from collections.abc import Iterable
from typing import Any

from docx import Document
from docx.document import Document as DocumentType
from docx.enum.table import WD_CELL_VERTICAL_ALIGNMENT, WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK
from docx.image.exceptions import (
    InvalidImageStreamError,
    UnexpectedEndOfFileError,
    UnrecognizedImageError,
)
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.opc.constants import RELATIONSHIP_TYPE
from docx.shared import Inches, Mm, Pt, RGBColor
from docx.table import _Cell
from docx.text.paragraph import Paragraph
from docx.text.run import Run

from app.features.exports.errors import ExportInputError
from app.features.exports.schemas import PersistedEditorDocumentIn

SUPPORTED_NODE_TYPES = {
    "root",
    "source-page",
    "paragraph",
    "heading",
    "quote",
    "list",
    "listitem",
    "table",
    "tablerow",
    "tablecell",
    "text",
    "linebreak",
    "tab",
    "horizontalrule",
    "page-break",
    "link",
    "autolink",
    "image",
}
MAX_NODES = 5_000
MAX_DEPTH = 32
MAX_TEXT_CHARS = 500_000
MAX_IMAGE_BYTES = 5 * 1024 * 1024
DEFAULT_FONT = "Noto Sans Devanagari"

PAGE_SIZES_MM = {
    "A4": (210, 297),
    "A3": (297, 420),
    "Legal": (216, 356),
    "Letter": (216, 279),
}
FONT_MAP = {
    "Times New Roman": "Liberation Serif",
    "Georgia": "Liberation Serif",
    "Arial": "Liberation Sans",
    "Calibri": "Liberation Sans",
    "Courier New": "Liberation Mono",
    "Mangal": DEFAULT_FONT,
    "Noto Sans Devanagari": DEFAULT_FONT,
}
ALIGNMENTS = {
    "left": WD_ALIGN_PARAGRAPH.LEFT,
    "center": WD_ALIGN_PARAGRAPH.CENTER,
    "right": WD_ALIGN_PARAGRAPH.RIGHT,
    "justify": WD_ALIGN_PARAGRAPH.JUSTIFY,
}
DATA_IMAGE_PATTERN = re.compile(
    r"^data:(image/(?:png|jpeg|gif));base64,([A-Za-z0-9+/=\r\n]+)$"
)


def _children(node: dict[str, Any]) -> list[dict[str, Any]]:
    value = node.get("children", [])
    if not isinstance(value, list) or not all(isinstance(item, dict) for item in value):
        raise ExportInputError("Every Lexical children field must be an array of nodes")
    return value


def validate_editor_document(document: PersistedEditorDocumentIn) -> dict[str, Any]:
    root = document.editor_state.get("root")
    if not isinstance(root, dict) or root.get("type") != "root":
        raise ExportInputError("Lexical editor state must contain a root node")

    node_count = 0
    text_count = 0

    def visit(node: dict[str, Any], depth: int) -> None:
        nonlocal node_count, text_count
        if depth > MAX_DEPTH:
            raise ExportInputError("Document nesting is too deep")
        node_count += 1
        if node_count > MAX_NODES:
            raise ExportInputError("Document contains too many nodes")

        node_type = node.get("type")
        if node_type not in SUPPORTED_NODE_TYPES:
            raise ExportInputError(
                f"Unsupported editor node: {node_type or 'missing type'}",
                {"node_type": node_type},
            )
        if node.get("version") != 1:
            raise ExportInputError("Only Lexical node version 1 is supported")
        if node_type == "text":
            text = node.get("text")
            if not isinstance(text, str):
                raise ExportInputError("Text nodes must contain text")
            text_count += len(text)
            if text_count > MAX_TEXT_CHARS:
                raise ExportInputError("Document text is too large")
        if node_type == "image":
            _decode_image(node)
        if node_type == "tablecell":
            col_span = node.get("colSpan", 1)
            row_span = node.get("rowSpan", 1)
            header_state = node.get("headerState", 0)
            if not isinstance(col_span, int) or not isinstance(row_span, int):
                raise ExportInputError("Table cell spans must be integers")
            if col_span != 1 or row_span != 1:
                raise ExportInputError("Merged table cells are not supported in this export POC")
            if not isinstance(header_state, int):
                raise ExportInputError("Table cell header state must be an integer")
        for child in _children(node):
            visit(child, depth + 1)

    visit(root, 0)
    return root


def _set_font(run: Run, font_name: str = DEFAULT_FONT) -> None:
    run.font.name = font_name
    fonts = run._element.get_or_add_rPr().get_or_add_rFonts()
    for attribute in ("ascii", "hAnsi", "eastAsia"):
        fonts.set(qn(f"w:{attribute}"), font_name)
    # Hindi is a complex script. Latin-only Liberation fonts must not be
    # selected for Devanagari merely because a run also contains English.
    fonts.set(qn("w:cs"), DEFAULT_FONT)


def _parse_style(style: Any) -> dict[str, str]:
    if not isinstance(style, str) or len(style) > 1_000:
        return {}
    parsed: dict[str, str] = {}
    for declaration in style.split(";"):
        if ":" not in declaration:
            continue
        key, value = declaration.split(":", 1)
        parsed[key.strip().lower()] = value.strip()
    return parsed


def _hex_color(value: str | None) -> str | None:
    if value and re.fullmatch(r"#[0-9a-fA-F]{6}", value):
        return value[1:].upper()
    return None


def _shade_run(run: Run, color: str) -> None:
    shading = OxmlElement("w:shd")
    shading.set(qn("w:fill"), color)
    run._element.get_or_add_rPr().append(shading)


def _apply_text_format(run: Run, node: dict[str, Any]) -> None:
    value = node.get("format", 0)
    format_mask = value if isinstance(value, int) else 0
    run.bold = bool(format_mask & 1)
    run.italic = bool(format_mask & 2)
    run.font.strike = bool(format_mask & 4)
    run.underline = bool(format_mask & 8)
    if format_mask & 16:
        _set_font(run, "Liberation Mono")
    else:
        _set_font(run)
    run.font.subscript = bool(format_mask & 32)
    run.font.superscript = bool(format_mask & 64)

    styles = _parse_style(node.get("style"))
    requested_font = styles.get("font-family", "").split(",")[0].strip(" '\"")
    if requested_font:
        _set_font(run, FONT_MAP.get(requested_font, DEFAULT_FONT))
    size_match = re.fullmatch(r"(\d+(?:\.\d+)?)pt", styles.get("font-size", ""))
    if size_match:
        run.font.size = Pt(min(72, max(8, float(size_match.group(1)))))
    color = _hex_color(styles.get("color"))
    if color:
        run.font.color.rgb = RGBColor.from_string(color)
    background = _hex_color(styles.get("background-color"))
    if background:
        _shade_run(run, background)


def _add_hyperlink(paragraph: Paragraph, node: dict[str, Any]) -> None:
    url = node.get("url")
    if not isinstance(url, str) or not re.match(r"^(?:https?://|mailto:)", url):
        raise ExportInputError("Links must use http, https or mailto")
    relationship_id = paragraph.part.relate_to(
        url, RELATIONSHIP_TYPE.HYPERLINK, is_external=True
    )
    hyperlink = OxmlElement("w:hyperlink")
    hyperlink.set(qn("r:id"), relationship_id)
    for child in _children(node):
        if child.get("type") != "text":
            raise ExportInputError("Links may contain text nodes only")
        run = paragraph.add_run(child["text"])
        _apply_text_format(run, child)
        run.font.color.rgb = RGBColor(5, 99, 193)
        run.underline = True
        paragraph._p.remove(run._r)
        hyperlink.append(run._r)
    paragraph._p.append(hyperlink)


def _render_inline(paragraph: Paragraph, nodes: Iterable[dict[str, Any]]) -> None:
    for node in nodes:
        node_type = node.get("type")
        if node_type == "text":
            run = paragraph.add_run(node["text"])
            _apply_text_format(run, node)
        elif node_type == "linebreak":
            paragraph.add_run().add_break(WD_BREAK.LINE)
        elif node_type == "tab":
            paragraph.add_run("\t")
        elif node_type in {"link", "autolink"}:
            _add_hyperlink(paragraph, node)
        else:
            raise ExportInputError(f"Unsupported inline editor node: {node_type}")


def _apply_paragraph_format(paragraph: Paragraph, node: dict[str, Any]) -> None:
    alignment = node.get("format")
    if isinstance(alignment, str) and alignment in ALIGNMENTS:
        paragraph.alignment = ALIGNMENTS[alignment]
    indent = node.get("indent", 0)
    if isinstance(indent, int) and 0 < indent <= 20:
        paragraph.paragraph_format.left_indent = Inches(0.25 * indent)
    styles = _parse_style(node.get("style"))
    line_height = styles.get("line-height")
    state = node.get("$")
    if isinstance(state, dict) and state.get("lineSpacing") in {"1", "1.15", "1.5", "2"}:
        line_height = state["lineSpacing"]
    if line_height:
        try:
            paragraph.paragraph_format.line_spacing = min(3.0, max(1.0, float(line_height)))
        except ValueError:
            pass


def _add_paragraph(
    container: DocumentType | _Cell,
    node: dict[str, Any],
    *,
    existing: Paragraph | None = None,
) -> Paragraph:
    node_type = node["type"]
    tag = node.get("tag")
    style = None
    if node_type == "heading" and tag in {"h1", "h2", "h3", "h4"}:
        style = f"Heading {tag[1:]}"
    paragraph = existing or container.add_paragraph(style=style)
    if existing is not None and style:
        paragraph.style = style
    _apply_paragraph_format(paragraph, node)
    _render_inline(paragraph, _children(node))

    if node_type == "heading":
        paragraph.paragraph_format.keep_with_next = True
    elif node_type == "quote":
        paragraph.paragraph_format.left_indent = Mm(10)
        paragraph.paragraph_format.right_indent = Mm(5)
        for run in paragraph.runs:
            run.italic = True
    return paragraph


def _add_rule(container: DocumentType | _Cell) -> None:
    paragraph = container.add_paragraph()
    borders = OxmlElement("w:pBdr")
    bottom = OxmlElement("w:bottom")
    bottom.set(qn("w:val"), "single")
    bottom.set(qn("w:sz"), "6")
    bottom.set(qn("w:space"), "1")
    bottom.set(qn("w:color"), "808080")
    borders.append(bottom)
    paragraph._p.get_or_add_pPr().append(borders)


def _decode_image(node: dict[str, Any]) -> tuple[bytes, str]:
    source = node.get("src")
    if not isinstance(source, str):
        raise ExportInputError("Image node is missing its source")
    match = DATA_IMAGE_PATTERN.fullmatch(source)
    if not match:
        raise ExportInputError(
            "Remote image URLs are not fetched during export; upload the image into the editor"
        )
    try:
        data = base64.b64decode(match.group(2), validate=True)
    except (binascii.Error, ValueError) as exc:
        raise ExportInputError("Image data is invalid") from exc
    if not data or len(data) > MAX_IMAGE_BYTES:
        raise ExportInputError("Each embedded image must be between 1 byte and 5 MB")
    return data, match.group(1)


def _add_image(container: DocumentType | _Cell, node: dict[str, Any]) -> None:
    data, _mime = _decode_image(node)
    paragraph = container.add_paragraph()
    alignment = node.get("alignment", "center")
    paragraph.alignment = ALIGNMENTS.get(alignment, WD_ALIGN_PARAGRAPH.CENTER)
    width = node.get("width")
    width_inches = 6.0
    if isinstance(width, (int, float)) and 40 <= width <= 2_000:
        width_inches = min(6.0, width / 96)
    try:
        paragraph.add_run().add_picture(io.BytesIO(data), width=Inches(width_inches))
    except (InvalidImageStreamError, UnexpectedEndOfFileError, UnrecognizedImageError) as exc:
        raise ExportInputError("Embedded image format could not be exported") from exc


def _render_list(
    container: DocumentType | _Cell,
    node: dict[str, Any],
    *,
    depth: int = 0,
) -> None:
    list_type = node.get("listType")
    ordered = list_type == "number"
    start = node.get("start", 1)
    number = start if isinstance(start, int) and start > 0 else 1
    for item in _children(node):
        if item.get("type") != "listitem":
            raise ExportInputError("List nodes may contain list items only")
        paragraph = container.add_paragraph()
        _apply_paragraph_format(paragraph, item)
        paragraph.paragraph_format.left_indent = Inches(0.25 + 0.25 * depth)
        paragraph.paragraph_format.first_line_indent = Inches(-0.2)
        prefix = f"{number}. " if ordered else "• "
        prefix_run = paragraph.add_run(prefix)
        _set_font(prefix_run)
        nested_lists: list[dict[str, Any]] = []
        for child in _children(item):
            if child.get("type") in {"paragraph", "heading", "quote"}:
                _render_inline(paragraph, _children(child))
            elif child.get("type") == "list":
                nested_lists.append(child)
            elif child.get("type") in {"text", "linebreak", "tab", "link", "autolink"}:
                _render_inline(paragraph, [child])
            else:
                raise ExportInputError("Unsupported block inside a list item")
        for nested in nested_lists:
            _render_list(container, nested, depth=depth + 1)
        number += 1


def _render_table(container: DocumentType | _Cell, node: dict[str, Any]) -> None:
    rows = _children(node)
    if not rows or any(row.get("type") != "tablerow" for row in rows):
        raise ExportInputError("Tables must contain rows")
    row_cells = [_children(row) for row in rows]
    column_count = max((len(cells) for cells in row_cells), default=0)
    if column_count == 0 or len(rows) > 100 or column_count > 20:
        raise ExportInputError("Tables must contain 1-100 rows and 1-20 columns")
    if any(len(cells) != column_count for cells in row_cells):
        raise ExportInputError("Every table row must have the same number of cells")

    table = container.add_table(rows=len(rows), cols=column_count)
    table.style = "Table Grid"
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    for row_index, cells in enumerate(row_cells):
        for column_index, cell_node in enumerate(cells):
            if cell_node.get("type") != "tablecell":
                raise ExportInputError("Table rows may contain table cells only")
            cell = table.cell(row_index, column_index)
            cell.vertical_alignment = WD_CELL_VERTICAL_ALIGNMENT.TOP
            blocks = _children(cell_node)
            first = cell.paragraphs[0]
            if not blocks:
                continue
            for block_index, block in enumerate(blocks):
                existing = first if block_index == 0 and block.get("type") in {
                    "paragraph", "heading", "quote"
                } else None
                _render_block(cell, block, existing=existing)
            if cell_node.get("headerState", 0):
                for paragraph in cell.paragraphs:
                    for run in paragraph.runs:
                        run.bold = True


def _render_block(
    container: DocumentType | _Cell,
    node: dict[str, Any],
    *,
    existing: Paragraph | None = None,
) -> None:
    node_type = node.get("type")
    if node_type == "source-page":
        for child in node.get("children", []):
            _render_block(container, child)
    elif node_type in {"paragraph", "heading", "quote"}:
        _add_paragraph(container, node, existing=existing)
    elif node_type == "list":
        _render_list(container, node)
    elif node_type == "table":
        _render_table(container, node)
    elif node_type == "horizontalrule":
        _add_rule(container)
    elif node_type == "page-break":
        paragraph = container.add_paragraph()
        paragraph.add_run().add_break(WD_BREAK.PAGE)
    elif node_type == "image":
        _add_image(container, node)
    else:
        raise ExportInputError(f"Unsupported top-level editor node: {node_type}")


def _configure_document(document: DocumentType, payload: PersistedEditorDocumentIn) -> None:
    layout = payload.page_layout
    width, height = PAGE_SIZES_MM[layout.page_size]
    if layout.orientation == "landscape":
        width, height = height, width
    section = document.sections[0]
    section.page_width = Mm(width)
    section.page_height = Mm(height)
    section.top_margin = Mm(layout.margin_top)
    section.right_margin = Mm(layout.margin_right)
    section.bottom_margin = Mm(layout.margin_bottom)
    section.left_margin = Mm(layout.margin_left)

    normal = document.styles["Normal"]
    normal.font.name = DEFAULT_FONT
    normal.font.size = Pt(12)
    normal.paragraph_format.space_after = Pt(6)
    normal.paragraph_format.line_spacing = 1.5
    fonts = normal.element.get_or_add_rPr().get_or_add_rFonts()
    for attribute in ("ascii", "hAnsi", "eastAsia", "cs"):
        fonts.set(qn(f"w:{attribute}"), DEFAULT_FONT)

    for level, size in ((1, 18), (2, 16), (3, 14), (4, 12)):
        style = document.styles[f"Heading {level}"]
        style.font.name = DEFAULT_FONT
        style.font.size = Pt(size)
        style.font.bold = True
        style.paragraph_format.keep_with_next = True


def render_docx(payload: PersistedEditorDocumentIn, title: str) -> bytes:
    root = validate_editor_document(payload)
    document = Document()
    document.core_properties.title = title
    document.core_properties.subject = "VakilSuite legal document export"
    _configure_document(document, payload)
    for node in _children(root):
        _render_block(document, node)
    output = io.BytesIO()
    document.save(output)
    return output.getvalue()
