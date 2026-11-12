import json

import pytest

from app.features.documents.page_provenance import page_paths, pages_with_provenance
from app.features.documents.typing_layout import repair_saved_tables, typed_page_children, typed_page_text
from app.features.revisions.lexical import validate_editor_document


TABLE = '''<table><thead><tr><th colspan="3">(x) Address(पता):</th></tr></thead>
<tbody><tr><td>1</td><td>वर्तमान पता<br/>ग्राम</td><td></td></tr>
<tr><td>2</td><td>स्थायी पता</td><td>उत्तर प्रदेश &amp; भारत</td></tr></tbody></table>'''


def test_mixed_page_preserves_text_tables_empty_cells_and_page_provenance():
    children = typed_page_children("Before\n\n" + TABLE + "\n\nAfter")
    assert [node["type"] for node in children] == ["paragraph", "table", "paragraph"]
    table = children[1]
    assert table["children"][0]["children"][0]["colSpan"] == 3
    assert table["children"][0]["children"][0]["headerState"] == 1
    cells = table["children"][1]["children"]
    assert cells[2]["children"][0]["children"] == []
    assert cells[1]["children"][0]["children"][1]["type"] == "linebreak"
    text = typed_page_text(children)
    assert "वर्तमान पता\nग्राम" in text
    assert "उत्तर प्रदेश & भारत" in text
    assert "<table>" not in text
    editor = pages_with_provenance(
        [{"page_number": 1, "text": text}, {"page_number": 2, "text": "Second page"}],
        formatted_pages={1: children},
    )
    validated = validate_editor_document(editor)
    assert "उत्तर प्रदेश & भारत" in validated.normalized_text
    assert set(page_paths(editor, 2, require_complete=True).values()) == {1, 2}
    assert "table" in json.dumps(editor)


def test_rowspan_is_preserved():
    children = typed_page_children('<table><tr><td rowspan="2">A</td><td>B</td></tr>'
                                   '<tr><td>C</td></tr></table>')
    assert children[0]["type"] == "table"
    assert children[0]["children"][0]["children"][0]["rowSpan"] == 2


@pytest.mark.parametrize("text", [
    "Plain Hindi हिन्दी 123 < 456",
    "<table><tr><td>Unclosed table",
    '<table><tr><td colspan="999999">A</td></tr></table>',
    '<table><tr><td><script>alert(1)</script>Keep text</td></tr></table>',
    '<table><tr><td><table><tr><td>Nested</td></tr></table></td></tr></table>',
])
def test_unsupported_output_is_literal_reviewable_text_not_discarded_or_executed(text):
    children = typed_page_children(text)
    assert all(child["type"] == "paragraph" for child in children)
    assert typed_page_text(children).replace("\n\n", "") == text.replace("\n\n", "")


def test_untrusted_attributes_are_not_imported():
    children = typed_page_children('<table onclick="bad()"><tr><td style="color:red" '
                                   'onmouseover="bad()"><b>Safe text</b></td></tr></table>')
    serialized = json.dumps(children)
    assert children[0]["type"] == "table"
    assert "bad()" not in serialized and "color:red" not in serialized
    assert typed_page_text(children) == "Safe text"


CONTINUATION_TABLE = '''<table><tbody>
<tr><td></td><td></td><td>स्थायी पता: ग्राम<br/>भारत</td><td></td></tr>
<tr><td>2</td><td>गवाह</td><td></td><td></td><td></td><td>पता</td><td>गवाह का प्रकार</td></tr>
</tbody></table>'''


def test_short_continuation_row_is_rendered_without_losing_or_moving_supplied_cells():
    children = typed_page_children(CONTINUATION_TABLE)
    assert children[0]["type"] == "table"
    rows = children[0]["children"]
    assert [len(row["children"]) for row in rows] == [7, 7]
    assert typed_page_text([rows[0]["children"][2]]) == "स्थायी पता: ग्राम\nभारत"
    assert typed_page_text([rows[1]["children"][6]]) == "गवाह का प्रकार"
    assert all(cell["children"][0]["children"] == [] for cell in rows[0]["children"][4:])


def test_page_end_rowspan_is_bounded_to_this_page():
    children = typed_page_children('<table><tr><td rowspan="3">A</td><td>B</td></tr></table>')
    assert children[0]["type"] == "table"
    assert children[0]["children"][0]["children"][0]["rowSpan"] == 1
    assert typed_page_text(children) == "A\nB"


def test_rowspan_gap_is_filled_without_duplicate_or_overlapping_cells():
    children = typed_page_children('<table><tr><td>A</td><td rowspan="2">B</td><td>C</td></tr>'
                                   '<tr><td>D</td></tr></table>')
    rows = children[0]["children"]
    assert len(rows[1]["children"]) == 2  # D, then empty col 3; col 2 belongs to B.
    assert rows[0]["children"][1]["rowSpan"] == 2
    assert typed_page_text([rows[1]]) == "D\n"


def test_existing_saved_output_repairs_only_matching_raw_tables_once():
    from copy import deepcopy
    from app.features.documents.extraction_mapping import _paragraph

    editor = pages_with_provenance([
        {"page_number": 1, "text": "Lawyer's edited text"},
        {"page_number": 2, "text": CONTINUATION_TABLE},
    ], formatted_pages={1: typed_page_children(TABLE) + [_paragraph("Lawyer's edited text")]})
    before = deepcopy(editor)
    repaired, changed = repair_saved_tables(editor, {2: CONTINUATION_TABLE})
    assert changed == {2}
    assert editor == before  # Pure conversion does not mutate caller state.
    assert repaired["editorState"]["root"]["children"][0] == before["editorState"]["root"]["children"][0]
    assert repaired["editorState"]["root"]["children"][1]["children"][0]["type"] == "table"
    assert set(page_paths(repaired, 2, require_complete=True).values()) == {1, 2}
    assert repair_saved_tables(repaired, {2: CONTINUATION_TABLE}) == (repaired, set())
    assert repair_saved_tables(editor, {2: CONTINUATION_TABLE.replace("गवाह", "Different")}) == (editor, set())


def test_saved_table_manual_formatting_is_not_overwritten():
    editor = pages_with_provenance([{"page_number": 1, "text": CONTINUATION_TABLE}])
    editor["editorState"]["root"]["children"][0]["children"][0]["children"][0]["format"] = 1
    assert repair_saved_tables(editor, {1: CONTINUATION_TABLE}) == (editor, set())


def test_saved_provider_comment_cleanup_preserves_other_content_and_is_idempotent():
    from app.features.documents.typing_layout import repair_saved_commentary

    comment = "This image contains no discernible text."
    editor = pages_with_provenance([{"page_number": 1, "text": f"Header\n{comment}\nPrinted text"},
                                    {"page_number": 2, "text": "Lawyer's correction"}])
    originals = {1: f"Old header before lawyer edit\n{comment}\nPrinted text", 2: comment}
    repaired, changed = repair_saved_commentary(editor, originals)
    assert changed == {1}
    assert "Header\nPrinted text" in validate_editor_document(repaired).normalized_text
    assert repaired["editorState"]["root"]["children"][1] == editor["editorState"]["root"]["children"][1]
    assert repair_saved_commentary(repaired, originals) == (repaired, set())
    assert repair_saved_commentary(editor, {1: "Different output"}) == (editor, set())
