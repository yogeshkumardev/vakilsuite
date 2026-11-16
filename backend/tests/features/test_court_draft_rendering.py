import io

from docx import Document
from docx.oxml.ns import qn
from docx.enum.text import WD_ALIGN_PARAGRAPH

from app.features.court_rules import get_format_spec
from app.features.drafts.compliance import validate_court_draft_docx
from app.features.drafts.rendering import render_court_draft_docx


def test_physical_court_draft_renderer_uses_saved_rules_and_reports_placeholders() -> None:
    snapshot = get_format_spec("allahabad_hc", "allahabad", __import__("datetime").date(2026, 11, 14), "physical", "en").model_dump(mode="json")
    content = {"components": [
        {"code": "proforma", "mode": "template", "paragraphs": [{"role": "body", "text": "English हिन्दी [● lawyer confirm karein ●]"}]},
        {"code": "authority_extract", "mode": "template", "paragraphs": [{"role": "extract", "text": "Extract text"}]},
        {"code": "index", "mode": "table", "columns": ["serial_number", "description"]},
    ]}
    data = render_court_draft_docx(content, snapshot, title="Test bail")
    document = Document(io.BytesIO(data))
    section = document.sections[0]
    assert round(section.left_margin.inches, 2) == 1.75
    assert round(section.top_margin.inches, 2) == 1.5
    fonts = document.paragraphs[0].runs[1]._element.rPr.rFonts
    assert fonts.get(qn("w:cs")) == "Mangal"
    assert document.paragraphs[1].runs[0].italic is True
    assert all(run.bold for run in document.tables[0].cell(0, 0).paragraphs[0].runs)
    report = validate_court_draft_docx(data, content, snapshot)
    assert report.overall == "warning"
    assert next(check for check in report.checks if check.code == "placeholders").status == "warning"


def test_bail_sections_use_separate_lines_and_page_boundaries() -> None:
    snapshot = get_format_spec("allahabad_hc", "allahabad", __import__("datetime").date(2026, 11, 15), "efiling", "en").model_dump(mode="json")
    content = {"components": [
        {"code": "proforma", "mode": "template", "paragraphs": [{"role": "body", "text": "IN THE HIGH COURT OF JUDICATURE AT ALLAHABAD\nDISTRICT: Rampur"}]},
        {"code": "index", "mode": "table", "columns": ["sl_no", "particulars", "date", "annex", "pages"], "rows": [["1", "FIR", "", "01", "3"]]},
        {"code": "application", "mode": "hybrid", "paragraphs": [{"role": "body", "text": "TO,\nVerified facts."}]},
        {"code": "affidavit", "mode": "repeat", "paragraphs": [{"role": "body", "text": "AFFIDAVIT\nI solemnly affirm."}]},
    ]}
    document = Document(io.BytesIO(render_court_draft_docx(content, snapshot, title="Test")))
    assert document.paragraphs[0].alignment == WD_ALIGN_PARAGRAPH.CENTER
    assert document.paragraphs[1].alignment == WD_ALIGN_PARAGRAPH.RIGHT
    assert len(document.tables[0].columns) == 5
    assert document.tables[0].rows[1].cells[1].text == "FIR"
    assert len(document.element.body.xpath('.//w:br[@w:type="page"]')) == 2


def test_each_annexure_cover_starts_on_its_own_page() -> None:
    snapshot = get_format_spec("allahabad_hc", "allahabad", __import__("datetime").date(2026, 11, 15), "physical", "en").model_dump(mode="json")
    content = {"components": [{"code": "annexure_cover", "mode": "repeat", "paragraphs": [
        {"role": "body", "text": "ANNEXURE NO.-01: FIR"},
        {"role": "body", "text": "ANNEXURE NO.-02: Order"},
    ]}]}
    document = Document(io.BytesIO(render_court_draft_docx(content, snapshot, title="Covers")))
    assert len(document.element.body.xpath('.//w:br[@w:type="page"]')) == 2
