import io
import json

from docx import Document
import pytest

from app.features.draft_anonymization.offline_review import build_review, write_review
from app.features.draft_anonymization.review import approve


def fixture():
    doc = Document()
    doc.add_paragraph("Alice met Alice")
    doc.add_paragraph("House 7")
    doc.add_paragraph("River Road")
    stream = io.BytesIO()
    doc.save(stream)
    payload = {
        "findings": [
            {"b": "b00000", "s": 99, "q": "Alice", "e": "p1", "c": "PERSON"},
            {
                "b": "b00001",
                "s": 0,
                "q": "House 7\nRiver Road",
                "e": "a1",
                "c": "ADDRESS",
            },
        ],
        "uncertain": False,
    }
    checkpoint = {
        "stage": "detection",
        "call": 1,
        "response": {
            "candidates": [
                {
                    "finish_reason": "STOP",
                    "content": {"parts": [{"text": json.dumps(payload)}]},
                }
            ]
        },
    }
    return stream.getvalue(), checkpoint


def test_offline_report_links_ambiguous_context_and_blocks_approval(
    tmp_path, monkeypatch
):
    from google import genai

    def forbidden(*args, **kwargs):
        raise AssertionError("No provider allowed")

    monkeypatch.setattr(genai, "Client", forbidden)
    data, checkpoint = fixture()
    result = build_review(data, checkpoint)
    assert result["audit_status"] == "not_run"
    assert result["adjacent_span_repairs"] == 1
    assert len(result["unresolved"]) == 1
    assert result["unresolved"][0]["candidate_spans"] == [
        {"start": 0, "end": 5},
        {"start": 10, "end": 15},
    ]
    target = tmp_path / "review"
    write_review(target, result, {"network_calls": 0})
    assert "review.md#b00000" in (target / "REVIEW_REPORT.md").read_text()
    assert (target / "review.md").stat().st_mode & 0o777 == 0o600
    with pytest.raises(ValueError, match="Independent audit"):
        approve(target, "reviewer", global_consent=False, privacy_confirmed=True)
    with pytest.raises(FileExistsError):
        write_review(target, result, {})


def test_incomplete_checkpoint_cannot_be_replayed():
    data, checkpoint = fixture()
    checkpoint["response"]["candidates"][0]["finish_reason"] = "MAX_TOKENS"
    with pytest.raises(ValueError, match="COMPLETE_DETECTION_REQUIRED"):
        build_review(data, checkpoint)
