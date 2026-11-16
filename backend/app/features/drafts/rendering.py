"""Deterministic DOCX rendering for structured court drafts."""

from __future__ import annotations

import io
import re
from typing import Any

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK
from docx.oxml.ns import qn
from docx.shared import Inches, Pt

DEVANAGARI = re.compile(r"[\u0900-\u097F]+")


def _set_fonts(run, *, devanagari: bool, size_pt: float) -> None:
    family = "Mangal" if devanagari else "Times New Roman"
    run.font.name = family
    run.font.size = Pt(size_pt)
    fonts = run._element.get_or_add_rPr().get_or_add_rFonts()
    fonts.set(qn("w:ascii"), "Times New Roman")
    fonts.set(qn("w:hAnsi"), "Times New Roman")
    fonts.set(qn("w:cs"), "Mangal")


def _add_script_runs(paragraph, text: str, *, bold: bool, italic: bool, size_pt: float) -> None:
    position = 0
    for match in DEVANAGARI.finditer(text):
        for fragment, is_devanagari in ((text[position:match.start()], False), (match.group(), True)):
            if fragment:
                run = paragraph.add_run(fragment)
                run.bold, run.italic = bold, italic
                _set_fonts(run, devanagari=is_devanagari, size_pt=size_pt)
        position = match.end()
    if position < len(text):
        run = paragraph.add_run(text[position:])
        run.bold, run.italic = bold, italic
        _set_fonts(run, devanagari=False, size_pt=size_pt)


def _rules(snapshot: dict[str, Any]) -> dict[str, Any]:
    rules = snapshot.get("rules", {})
    return {key: value.get("value") for key, value in rules.items() if isinstance(value, dict)}


def _line_format(line: str, code: str) -> tuple[WD_ALIGN_PARAGRAPH, float]:
    """Determine alignment and line spacing for a single line."""
    upper = line.upper().strip()
    if not upper:
        return WD_ALIGN_PARAGRAPH.JUSTIFY, 2.0

    # 1. Centered lines (Court headers, stars, title, prayer heading, etc.)
    if (
        upper.startswith("*")
        or upper in {"IN", "VERSUS", "AFFIDAVIT", "P R A Y E R", "PRAYER", "VERIFICATION", "I N D E X", "INDEX"}
        or upper.startswith("IN THE HIGH COURT")
        or upper.startswith("CRIMINAL MISC. BAIL APPLICATION")
        or upper.startswith("(UNDER SECTION")
        or upper.startswith("( UNDER SECTION")
        or upper.startswith("ANNEXURE NO.")
        or upper.startswith("PARCHA")
    ):
        return WD_ALIGN_PARAGRAPH.CENTER, 1.0

    # 2. Advocate footer blocks
    if code.endswith("_advocate_footer") or code == "advocate_footer":
        if upper.startswith("DATED"):
            return WD_ALIGN_PARAGRAPH.LEFT, 1.0
        return WD_ALIGN_PARAGRAPH.RIGHT, 1.0

    # 3. Right-aligned lines (District, jail details, deponent/advocate labels)
    if (
        (upper.startswith("DISTRICT") and not upper.startswith("DISTRICT JAIL"))
        or upper.startswith("(IN JAIL SINCE")
        or upper.startswith("DISTRICT JAIL")
        or upper.startswith("DATE OF OCCURRENCE")
        or upper in {"(DEPONENT)", "DEPONENT"}
        or upper.endswith("DEPONENT")
        or upper.endswith("ADVOCATE")
        or upper.endswith("OATH COMMISSIONER")
        or (upper.startswith("CASE CRIME NO.") and "UNDER SECTION" not in upper and "POLICE STATION" not in upper)
    ):
        return WD_ALIGN_PARAGRAPH.RIGHT, 1.0

    # 4. Short lead-in lines (like "To,")
    if len(line) <= 10 and line.endswith(","):
        return WD_ALIGN_PARAGRAPH.JUSTIFY, 1.0

    # 5. Default: Justified body text with court double spacing
    return WD_ALIGN_PARAGRAPH.JUSTIFY, 2.0


def render_court_draft_docx(content: dict[str, Any], rule_snapshot: dict[str, Any], *, title: str) -> bytes:
    """Render only the stored structured components and their saved format snapshot."""
    rules = _rules(rule_snapshot)
    page = rules.get("page.size") or {"width_in": 8.05, "height_in": 14}
    margins = rules.get("margins")
    if not isinstance(margins, dict):
        raise ValueError("Draft rule snapshot has no concrete margins")
    document = Document()
    document.core_properties.title = title
    section = document.sections[0]
    section.page_width, section.page_height = Inches(float(page["width_in"])), Inches(float(page["height_in"]))
    section.top_margin, section.right_margin = Inches(float(margins["top_in"])), Inches(float(margins["right_in"]))
    section.bottom_margin, section.left_margin = Inches(float(margins["bottom_in"])), Inches(float(margins["left_in"]))
    english = rules.get("font.english", {"size_pt": 14})
    size_pt = float(english.get("size_pt", 14))
    bold_roles, italic_roles = set(rules.get("bold.roles", [])), set(rules.get("italic.roles", []))

    # Page break markers for distinct court documents
    all_codes = [c.get("code") for c in content.get("components", []) if isinstance(c, dict)]
    has_app_crime = "application_crime_header" in all_codes
    has_aff_header = "affidavit_court_header" in all_codes

    page_break_starters = {
        "application_crime_header",
        "affidavit_court_header",
        "annexure_paper",
        "annexure_cover",
        "parcha",
    }
    if not has_app_crime:
        page_break_starters.add("application")
    if not has_aff_header:
        page_break_starters.add("affidavit")

    for component in content.get("components", []):
        code = component.get("code", "")
        if component.get("mode") == "table":
            columns = component.get("columns", [])
            table = document.add_table(rows=1, cols=max(1, len(columns)))
            table.style = "Table Grid"
            col_widths = [0.6, 2.8, 0.9, 0.7, 0.8] if len(columns) == 5 else None
            header_titles = {
                "sl_no": "Sl.\nNo",
                "particulars": "Particulars",
                "date": "Date",
                "annex": "Annex",
                "pages": "Pages",
            }
            for col_idx, (cell, column) in enumerate(zip(table.rows[0].cells, columns)):
                if col_widths and col_idx < len(col_widths):
                    cell.width = Inches(col_widths[col_idx])
                paragraph = cell.paragraphs[0]
                paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER if str(column) != "particulars" else WD_ALIGN_PARAGRAPH.LEFT
                title_text = header_titles.get(str(column), str(column).replace("_", " ").title())
                _add_script_runs(paragraph, title_text, bold=True, italic=False, size_pt=12.0)
            for row in component.get("rows", []):
                cells = table.add_row().cells
                for col_idx, (cell, value) in enumerate(zip(cells, row)):
                    if col_widths and col_idx < len(col_widths):
                        cell.width = Inches(col_widths[col_idx])
                    paragraph = cell.paragraphs[0]
                    paragraph.alignment = WD_ALIGN_PARAGRAPH.LEFT if col_idx == 1 else WD_ALIGN_PARAGRAPH.CENTER
                    paragraph.paragraph_format.line_spacing = 1
                    _add_script_runs(paragraph, str(value), bold=False, italic=False, size_pt=12.0)
            continue

        if code in page_break_starters:
            document.add_paragraph().add_run().add_break(WD_BREAK.PAGE)

        for item in component.get("paragraphs", []):
            role = str(item.get("role", "body"))
            for line in str(item.get("text", "")).splitlines():
                line = line.strip()
                if not line:
                    continue
                paragraph = document.add_paragraph()
                alignment, line_spacing = _line_format(line, code)
                paragraph.alignment = alignment
                paragraph.paragraph_format.line_spacing = line_spacing
                _add_script_runs(
                    paragraph,
                    line,
                    bold=code in bold_roles or role == "prayer",
                    italic=role in italic_roles and role != "prayer",
                    size_pt=size_pt,
                )
    output = io.BytesIO()
    document.save(output)
    return output.getvalue()
