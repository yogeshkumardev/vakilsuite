import io
import subprocess
from pathlib import Path

import pytest
from docx import Document
from docx.oxml.ns import qn

from app.core.exceptions import AppError
from app.features.exports.libreoffice import LibreOfficeConverter
from app.features.exports.renderer import render_docx
from app.features.exports.schemas import PersistedEditorDocumentIn, RenderExportRequest
from app.features.exports.service import ExportService


def editor_document(*children, page_size="A4", orientation="portrait"):
    return PersistedEditorDocumentIn.model_validate(
        {
            "schemaVersion": 1,
            "editorState": {
                "root": {"type": "root", "version": 1, "children": list(children)}
            },
            "pageLayout": {
                "pageSize": page_size,
                "orientation": orientation,
                "marginTop": 25,
                "marginRight": 20,
                "marginBottom": 25,
                "marginLeft": 35,
            },
        }
    )


def text(value, *, formatting=0, style=""):
    return {
        "type": "text",
        "version": 1,
        "text": value,
        "format": formatting,
        "style": style,
    }


def paragraph(*children, alignment="justify", style=""):
    return {
        "type": "paragraph",
        "version": 1,
        "format": alignment,
        "indent": 0,
        "style": style,
        "children": list(children),
    }


def test_docx_preserves_hindi_layout_rich_text_lists_page_break_and_table():
    payload = editor_document(
        {
            "type": "heading",
            "version": 1,
            "tag": "h1",
            "format": "center",
            "indent": 0,
            "style": "",
            "children": [text("माननीय न्यायालय")],
        },
        paragraph(
            text("प्रार्थी ", formatting=1),
            text("बनाम राज्य", formatting=2, style="color: #123456; font-size: 14pt"),
        ),
        {
            "type": "list",
            "version": 1,
            "listType": "number",
            "start": 1,
            "children": [
                {
                    "type": "listitem",
                    "version": 1,
                    "children": [paragraph(text("पहला तथ्य"), alignment="left")],
                }
            ],
        },
        {"type": "page-break", "version": 1},
        {
            "type": "table",
            "version": 1,
            "children": [
                {
                    "type": "tablerow",
                    "version": 1,
                    "children": [
                        {
                            "type": "tablecell",
                            "version": 1,
                            "headerState": 1,
                            "colSpan": 1,
                            "rowSpan": 1,
                            "children": [paragraph(text("धारा"))],
                        },
                        {
                            "type": "tablecell",
                            "version": 1,
                            "headerState": 1,
                            "colSpan": 1,
                            "rowSpan": 1,
                            "children": [paragraph(text("विवरण"))],
                        },
                    ],
                }
            ],
        },
    )

    rendered = render_docx(payload, "निर्यात परीक्षण")
    assert rendered.startswith(b"PK")
    document = Document(io.BytesIO(rendered))
    all_text = "\n".join(paragraph.text for paragraph in document.paragraphs)
    assert "माननीय न्यायालय" in all_text
    assert "प्रार्थी बनाम राज्य" in all_text
    assert "1. पहला तथ्य" in all_text
    assert document.tables[0].cell(0, 0).text == "धारा"
    assert document.tables[0].cell(0, 1).text == "विवरण"

    section = document.sections[0]
    assert round(section.left_margin.mm) == 35
    assert round(section.right_margin.mm) == 20
    assert document.core_properties.title == "निर्यात परीक्षण"
    body_xml = document._element.body.xml
    assert 'w:type="page"' in body_xml
    assert "Noto Sans Devanagari" in body_xml


def test_export_rejects_unknown_nodes_remote_images_and_merged_cells():
    with pytest.raises(AppError, match="Unsupported editor node"):
        render_docx(
            editor_document({"type": "video", "version": 1, "children": []}),
            "Bad node",
        )
    with pytest.raises(AppError, match="Remote image URLs"):
        render_docx(
            editor_document(
                {
                    "type": "image",
                    "version": 1,
                    "src": "https://example.com/client-file.png",
                }
            ),
            "Remote image",
        )
    with pytest.raises(AppError, match="Merged table cells"):
        render_docx(
            editor_document(
                {
                    "type": "tablecell",
                    "version": 1,
                    "colSpan": 2,
                    "children": [],
                }
            ),
            "Merged cell",
        )


def test_export_rejects_malformed_table_metadata_as_input_error():
    with pytest.raises(AppError, match="spans must be integers") as exc_info:
        render_docx(
            editor_document(
                {
                    "type": "tablecell",
                    "version": 1,
                    "colSpan": "not-a-number",
                    "children": [],
                }
            ),
            "Malformed cell",
        )
    assert exc_info.value.status_code == 422


def test_page_layout_rejects_unusable_printable_area():
    with pytest.raises(ValueError, match="printable width"):
        PersistedEditorDocumentIn.model_validate(
            {
                "schemaVersion": 1,
                "editorState": {
                    "root": {"type": "root", "version": 1, "children": []}
                },
                "pageLayout": {
                    "pageSize": "A4",
                    "orientation": "portrait",
                    "marginTop": 25,
                    "marginRight": 90,
                    "marginBottom": 25,
                    "marginLeft": 90,
                },
            }
        )


def test_libreoffice_converter_uses_isolated_profile_and_validates_pdf(tmp_path):
    observed: list[str] = []

    def fake_runner(command, **kwargs):
        observed.extend(command)
        outdir = Path(command[command.index("--outdir") + 1])
        (outdir / "document.pdf").write_bytes(b"%PDF-1.7\nsynthetic")
        assert kwargs["timeout"] == 12
        assert kwargs["check"] is False
        return subprocess.CompletedProcess(command, 0, b"", b"")

    converter = LibreOfficeConverter(
        binary="/usr/bin/libreoffice", timeout_seconds=12, runner=fake_runner
    )
    result = converter.convert(b"PK-synthetic-docx")
    assert result.startswith(b"%PDF-")
    assert "--headless" in observed
    assert "pdf:writer_pdf_Export" in observed
    assert any(value.startswith("-env:UserInstallation=file://") for value in observed)


def test_export_service_returns_safe_download_name():
    request = RenderExportRequest.model_validate(
        {
            "title": "अर्जी",
            "file_name": '../unsafe:"name"',
            "output_format": "docx",
            "document": editor_document(paragraph(text("content"))).model_dump(
                by_alias=True
            ),
        }
    )
    artifact = ExportService().render(request)
    assert artifact.file_name == "unsafe-name.docx"
    assert artifact.content.startswith(b"PK")


def test_font_fallback_and_line_spacing_survive_export():
    document = Document(io.BytesIO(render_docx(editor_document(
        {**paragraph(text("Hindi प्रार्थी", style='font-family: "Arial", "Noto Sans Devanagari", serif')), "$": {"lineSpacing": "2"}},
        {"type": "list", "version": 1, "listType": "bullet", "children": [
            {"type": "listitem", "version": 1, "$": {"lineSpacing": "1.15"}, "children": [text("पहला तथ्य")]},
        ]},
    ), "Font and spacing")))
    first, listed = document.paragraphs
    assert first.paragraph_format.line_spacing == 2
    assert listed.paragraph_format.line_spacing == 1.15
    assert "पहला तथ्य" in listed.text
    fonts = first.runs[0]._element.rPr.rFonts
    assert fonts.get(qn("w:ascii")) == "Liberation Sans"
    assert fonts.get(qn("w:cs")) == "Noto Sans Devanagari"


def test_missing_libreoffice_returns_actionable_error(monkeypatch):
    monkeypatch.setattr("app.features.exports.libreoffice.shutil.which", lambda _: None)
    with pytest.raises(AppError, match="LibreOffice Writer on the backend server"):
        LibreOfficeConverter().convert(b"unused")
