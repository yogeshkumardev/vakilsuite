"""Convert typed HTML tables to safe editor nodes, never render provider HTML.

Unsupported or malformed tables remain literal text for review. Only table
structure and spans are imported; links, styles and executable markup are not.
"""

import re
from copy import deepcopy
from html.parser import HTMLParser

from .extraction_mapping import _paragraph, _text_node


_TABLE = re.compile(r"<table\b[^>]*>.*?</table\s*>", re.I | re.S)


def _element(kind: str, children: list, **attrs) -> dict:
    return dict(type=kind, version=1, direction=None, format="", indent=0,
                children=children, **attrs)


def _cell_paragraph(text: str) -> dict:
    children = []
    for index, line in enumerate(text.strip().split("\n")):
        if index:
            children.append({"type": "linebreak", "version": 1})
        if line:
            children.append(_text_node(line))
    return _element("paragraph", children)


class _TableParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.rows = []
        self.row = None
        self.cell = None
        self.fragments = []
        self.stack = []

    def handle_starttag(self, tag, attrs):
        # Fail closed to literal text for unsupported structures, including
        # nested tables. Attribute values are never copied into the editor.
        parent = self.stack[-1] if self.stack else None
        allowed = {
            "table": {None}, "thead": {"table"}, "tbody": {"table"},
            "tfoot": {"table"}, "tr": {"table", "thead", "tbody", "tfoot"},
            "td": {"tr"}, "th": {"tr"},
        }
        if tag == "br" and self.cell is not None:
            self.fragments.append("\n")
            return
        if tag in {"b", "strong", "i", "em", "span", "p"} and self.cell is not None:
            if tag == "p" and self.fragments:
                self.fragments.append("\n")
        elif tag not in allowed or parent not in allowed[tag]:
            raise ValueError("Unsupported table structure")
        self.stack.append(tag)
        if tag == "tr":
            if len(self.rows) >= 500:
                raise ValueError("Table exceeds row limit")
            self.row = _element("tablerow", [])
        elif tag in {"td", "th"}:
            attributes = dict(attrs)
            spans = [int(attributes.get(name, "1")) for name in ("colspan", "rowspan")]
            if not all(1 <= span <= 100 for span in spans):
                raise ValueError("Unsupported table span")
            self.cell = _element("tablecell", [], headerState=1 if tag == "th" else 0,
                                 colSpan=spans[0], rowSpan=spans[1])
            self.fragments = []

    def handle_endtag(self, tag):
        if tag == "br":
            return
        if not self.stack or self.stack.pop() != tag:
            raise ValueError("Unbalanced table markup")
        if tag in {"td", "th"}:
            if len(self.row["children"]) >= 100:
                raise ValueError("Table exceeds column limit")
            self.cell["children"] = [_cell_paragraph("".join(self.fragments))]
            self.row["children"].append(self.cell)
            self.cell = None
        elif tag == "tr":
            if not self.row["children"]:
                raise ValueError("Empty table row")
            self.rows.append(self.row)
            self.row = None

    def handle_data(self, data):
        if self.cell is not None:
            # HTML source indentation is whitespace, whereas <br> is a break.
            self.fragments.append(re.sub(r"\s+", " ", data))
        elif data.strip():
            raise ValueError("Text outside table cells")

    def result(self):
        if self.stack or not self.rows:
            raise ValueError("Incomplete table markup")
        # OCR continuation rows often omit empty trailing cells, and a rowspan
        # can extend beyond the physical page. Keep all supplied cells in order,
        # bound spans to this page, and fill only empty grid slots. Never infer
        # missing text or merge independently extracted physical pages.
        occupied = set()
        placements = []
        for row_index, row in enumerate(self.rows):
            col = 0
            row_cells = {}
            for cell in row["children"]:
                while (row_index, col) in occupied:
                    col += 1
                cell["rowSpan"] = min(cell["rowSpan"], len(self.rows) - row_index)
                for y in range(row_index, row_index + cell["rowSpan"]):
                    for x in range(col, col + cell["colSpan"]):
                        if y >= len(self.rows) or x >= 100 or (y, x) in occupied:
                            raise ValueError("Invalid table grid")
                        occupied.add((y, x))
                row_cells[col] = cell
                col += cell["colSpan"]
            placements.append(row_cells)
        width = max(x for _, x in occupied) + 1
        for row_index, row in enumerate(self.rows):
            cells = placements[row_index]
            for col in range(width):
                if (row_index, col) not in occupied:
                    cells[col] = _element("tablecell", [_cell_paragraph("")],
                                          headerState=0, colSpan=1, rowSpan=1)
            row["children"] = [cells[col] for col in sorted(cells)]
        return _element("table", self.rows)


def typed_page_children(text: str) -> list[dict]:
    """Preserve text order and convert only complete supported HTML tables."""
    children = []
    start = 0
    for match in _TABLE.finditer(text):
        if prefix := text[start:match.start()].strip():
            children.append(_paragraph(prefix))
        try:
            parser = _TableParser()
            parser.feed(match.group())
            parser.close()
            children.append(parser.result())
        except (ValueError, TypeError):
            children.append(_paragraph(match.group()))
        start = match.end()
    if suffix := text[start:].strip():
        children.append(_paragraph(suffix))
    return children or [_paragraph(text)]


def typed_page_text(children: list[dict]) -> str:
    """Plain-text companion for source pages; structure lives in the editor."""
    def project(node):
        if node["type"] == "text":
            return node["text"]
        if node["type"] == "linebreak":
            return "\n"
        separator = "" if node["type"] == "paragraph" else "\n"
        return separator.join(project(child) for child in node.get("children", []))

    return "\n\n".join(project(child) for child in children)


def repair_saved_tables(editor: dict, provider_pages: dict[int, str]) -> tuple[dict, set[int]]:
    """Repair literal provider tables only, without regenerating the document.

    Caller must lock the current unreviewed source. Already rendered tables,
    formatted/manual text and edited HTML are retained. Exact provider matching
    prevents treating a lawyer's manually entered HTML example as OCR output.
    """
    repaired = deepcopy(editor)
    changed = set()
    for page in repaired["editorState"]["root"]["children"]:
        if page.get("type") != "source-page":
            continue
        number = page.get("pageNumber")
        original = provider_pages.get(number, "")
        if not original:
            continue
        children = []
        for node in page.get("children", []):
            leaves = node.get("children", [])
            plain = node.get("type") == "paragraph" and not node.get("format") and all(
                leaf.get("type") == "linebreak" or (
                    leaf.get("type") == "text" and not leaf.get("format") and not leaf.get("style")
                ) for leaf in leaves
            )
            text = "".join("\n" if leaf.get("type") == "linebreak" else leaf.get("text", "")
                           for leaf in leaves) if plain else ""
            tables = list(_TABLE.finditer(text))
            if tables and all(match.group() in original for match in tables):
                replacement = typed_page_children(text)
                if any(child["type"] == "table" for child in replacement):
                    children.extend(replacement)
                    changed.add(number)
                    continue
            children.append(node)
        page["children"] = children
    return repaired, changed


def repair_saved_commentary(editor: dict, provider_pages: dict[int, str]) -> tuple[dict, set[int]]:
    """Clean exact, unedited Sarvam commentary in an unreviewed source editor."""
    from app.integrations.document_typing.sarvam_output import NO_TEXT_EXTRACTED, strip_empty_image_comments

    repaired = deepcopy(editor)
    changed = set()
    for page in repaired["editorState"]["root"]["children"]:
        if page.get("type") != "source-page":
            continue
        number = page.get("pageNumber")
        original = provider_pages.get(number, "")
        if strip_empty_image_comments(original) == original:
            continue
        children = []
        for node in page.get("children", []):
            leaves = node.get("children", [])
            plain = node.get("type") == "paragraph" and not node.get("format") and all(
                leaf.get("type") == "linebreak" or (
                    leaf.get("type") == "text" and not leaf.get("format") and not leaf.get("style")
                ) for leaf in leaves
            )
            text = "".join("\n" if leaf.get("type") == "linebreak" else leaf.get("text", "")
                           for leaf in leaves) if plain else ""
            cleaned = strip_empty_image_comments(text)
            # The exact commentary is present in this provider page. Surrounding
            # prose may have been corrected since typing; preserve it verbatim.
            if cleaned != text:
                changed.add(number)
                if cleaned.strip():
                    children.append({**node, "children": [_text_node(cleaned)]})
            else:
                children.append(node)
        if number in changed and not typed_page_text(children).strip():
            children = [_paragraph(NO_TEXT_EXTRACTED)]
        page["children"] = children
    return repaired, changed
