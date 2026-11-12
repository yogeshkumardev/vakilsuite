import io
import json

import pytest
from docx import Document

from app.features.draft_anonymization.service import (
    Detection,
    Finding,
    anonymize,
    extract_docx,
    repair_detected_spans,
    substitute,
)


def docx_bytes():
    doc = Document()
    doc.add_paragraph("Alice seeks relief under Section 482 CrPC.")
    doc.add_table(rows=1, cols=1).cell(0, 0).text = "Alice"
    doc.sections[0].header.paragraphs[0].text = "Private header"
    stream = io.BytesIO()
    doc.save(stream)
    return stream.getvalue()


def test_extract_includes_tables_and_headers():
    texts = list(extract_docx(docx_bytes()).values())
    assert "Alice" in texts
    assert "Private header" in texts


def test_replacement_preserves_law_and_repeated_identity():
    blocks = {"a": "Alice invokes Section 482", "b": "Alice"}
    findings = [
        Finding(
            block_id=b, start=0, end=5, quote="Alice", entity_id="p1", category="PERSON"
        )
        for b in blocks
    ]
    assert substitute(blocks, findings) == {
        "a": "[PERSON_1] invokes Section 482",
        "b": "[PERSON_1]",
    }
    findings[0].quote = "Wrong"
    with pytest.raises(ValueError, match="INVALID_SOURCE_SPAN"):
        substitute(blocks, findings)


def test_audit_uncertainty_quarantines_and_never_publishes():
    class Detector:
        def detect(self, blocks, *, audit=False):
            return Detection(findings=[], uncertain=audit)

    result = anonymize(docx_bytes(), Detector())
    assert result["status"] == "quarantined"
    assert not result["publication_allowed"]


def test_second_pass_tokens_cannot_collide():
    finding = Finding(
        block_id="a", start=12, end=15, quote="Bob", entity_id="b", category="PERSON"
    )
    assert (
        substitute({"a": "[PERSON_1]  Bob"}, [finding])["a"] == "[PERSON_1]  [PERSON_2]"
    )


def test_exact_quote_can_repair_model_offset_but_forces_review():
    detection = Detection(
        findings=[
            Finding(
                block_id="a",
                start=99,
                end=104,
                quote="Alice",
                entity_id="person-a",
                category="PERSON",
            )
        ],
        uncertain=False,
    )
    repaired = repair_detected_spans({"a": "Alice seeks relief."}, detection)
    assert repaired.findings[0].start == 0
    assert repaired.findings[0].end == 5
    assert repaired.uncertain


def test_approval_is_required_and_bound_to_exact_output(tmp_path):
    import json
    from app.features.draft_anonymization.review import (
        prepare_review,
        approve,
        export_review,
    )

    (tmp_path / "result.json").write_text(
        json.dumps({"markdown": "Reviewed sample with [PERSON_1]. " * 10})
    )
    prepare_review(tmp_path)
    with pytest.raises(FileNotFoundError):
        export_review(tmp_path)
    approve(tmp_path, "owner", global_consent=False, privacy_confirmed=True)
    target = export_review(tmp_path)
    assert json.loads((target / "metadata.json").read_text())["scope"] == "private"
    (tmp_path / "review.md").write_text("Changed sample. " * 15)
    with pytest.raises(FileNotFoundError):
        export_review(tmp_path)


def test_structure_keeps_table_boundaries():
    from app.features.draft_anonymization.service import render_blocks

    layout = []
    blocks = extract_docx(docx_bytes(), layout=layout)
    rendered = render_blocks(blocks, layout)
    assert "Table 1, row 1, cell 1" in rendered
    assert "word/header1.xml" in rendered


@pytest.mark.parametrize("source", ["Alice met Alice", "AliceAlice"])
def test_ambiguous_offsets_are_never_guessed(source):
    detection = Detection(
        findings=[
            Finding(
                block_id="a",
                start=99,
                end=104,
                quote="Alice",
                entity_id="p1",
                category="PERSON",
            )
        ],
        uncertain=False,
    )
    issues = []
    result = repair_detected_spans({"a": source}, detection, issues=issues)
    assert result.uncertain
    assert not result.findings
    assert issues == ["AMBIGUOUS_SOURCE_SPAN_REQUIRES_MANUAL_REDACTION"]


def test_gemini_adapter_validation_progress_and_call_bound(monkeypatch, tmp_path):
    from types import SimpleNamespace
    from unittest.mock import Mock
    from app.integrations.ai import draft_anonymizer as adapter
    from app.features.draft_anonymization.costs import DraftBudget

    monkeypatch.setattr(
        adapter,
        "settings",
        SimpleNamespace(
            GEMINI_API_KEY="synthetic-key",
            GEMINI_MODEL="test-model",
            GEMINI_ALLOWED_MODELS=["test-model"],
            DRAFT_ANONYMIZATION_THINKING_LEVEL="minimal",
            DRAFT_ANONYMIZATION_DETECTION_TOKENS=8192,
            DRAFT_ANONYMIZATION_AUDIT_TOKENS=2048,
        ),
    )
    client = Mock()
    monkeypatch.setattr(adapter, "check_pricing", lambda _: None)
    client.models.generate_content.return_value = SimpleNamespace(
        candidates=[SimpleNamespace(finish_reason="STOP")],
        text='{"findings": [], "uncertain": false}',
        response_id="synthetic-response",
        usage_metadata=None,
    )
    monkeypatch.setattr(adapter.genai, "Client", Mock(return_value=client))
    progress = []
    detector = adapter.GeminiDraftDetector(
        budget=DraftBudget(tmp_path / "costs.sqlite3", "draft", 1_000_000_000),
        on_progress=progress.append,
    )
    assert not detector.detect({"a": "Synthetic"}).uncertain
    detector.detect({"a": "Synthetic"}, audit=True)
    with pytest.raises(ValueError, match="CALL_LIMIT"):
        detector.detect({"a": "Synthetic"})
    assert client.models.generate_content.call_count == 2
    assert [item["stage"] for item in progress] == ["detection", "audit"]
    assert len(detector.attempts) == 2
    calls = client.models.generate_content.call_args_list
    assert calls[0].kwargs["config"].max_output_tokens == 8192
    assert calls[1].kwargs["config"].max_output_tokens == 2048
    assert calls[0].kwargs["config"].thinking_config.thinking_level.value == "MINIMAL"
    client.models.generate_content.return_value.text = (
        '{"findings": [], "uncertain": false, "extra": true}'
    )
    detector.calls = 0
    from pydantic import ValidationError

    with pytest.raises(ValidationError):
        detector.detect({"a": "Synthetic"})
    # Budget rejection must happen before the SDK sends anything.
    before = client.models.generate_content.call_count
    detector.calls = 0
    detector.budget.limit = 1
    with pytest.raises(ValueError, match="DRAFT_BUDGET_EXCEEDED"):
        detector.detect({"a": "Synthetic"})
    assert client.models.generate_content.call_count == before


def test_provider_response_is_checkpointed_before_validation(monkeypatch, tmp_path):
    from types import SimpleNamespace
    from unittest.mock import Mock
    from pydantic import ValidationError
    from app.integrations.ai import draft_anonymizer as adapter
    from app.features.draft_anonymization.costs import DraftBudget

    monkeypatch.setattr(
        adapter,
        "settings",
        SimpleNamespace(
            GEMINI_API_KEY="synthetic-key",
            GEMINI_MODEL="test-model",
            GEMINI_ALLOWED_MODELS=["test-model"],
            DRAFT_ANONYMIZATION_THINKING_LEVEL="minimal",
            DRAFT_ANONYMIZATION_DETECTION_TOKENS=8192,
            DRAFT_ANONYMIZATION_AUDIT_TOKENS=2048,
        ),
    )
    response = Mock()
    monkeypatch.setattr(adapter, "check_pricing", lambda _: None)
    response.usage_metadata = SimpleNamespace(
        prompt_token_count=100,
        candidates_token_count=10,
        thoughts_token_count=20,
        total_token_count=130,
    )
    response.response_id = "synthetic"
    response.candidates = [SimpleNamespace(finish_reason="STOP")]
    response.text = '{"findings": "invalid", "uncertain": false}'
    response.model_dump.return_value = {"synthetic": True}
    client = Mock()
    client.models.generate_content.return_value = response
    monkeypatch.setattr(adapter.genai, "Client", Mock(return_value=client))
    checkpoints = []
    budget = DraftBudget(tmp_path / "costs.sqlite3", "draft", 1_000_000_000)
    detector = adapter.GeminiDraftDetector(
        budget=budget, on_response=checkpoints.append
    )
    with pytest.raises(ValidationError):
        detector.detect({"a": "Synthetic"})
    assert checkpoints == [
        {"stage": "detection", "call": 1, "response": {"synthetic": True}}
    ]
    assert client.models.generate_content.call_count == 1
    assert detector.attempts[0]["thinking_tokens"] == 20
    assert detector.attempts[0]["billable_output_tokens"] == 30
    assert budget.summary()["unknown_attempts"] == 0
    response.candidates = [SimpleNamespace(finish_reason="MAX_TOKENS")]
    with pytest.raises(ValueError, match="INCOMPLETE_PROVIDER_OUTPUT"):
        detector.detect({"a": "Synthetic"}, audit=True)
    assert len(detector.attempts) == 2
    assert budget.summary()["attempt_count"] == 2


def test_unresolved_repeated_quote_forces_quarantine_even_if_audit_is_clean():
    doc = Document()
    doc.add_paragraph("Alice met Alice")
    stream = io.BytesIO()
    doc.save(stream)

    class Detector:
        def detect(self, blocks, *, audit=False):
            if audit:
                return Detection(findings=[], uncertain=False)
            return Detection(
                findings=[
                    Finding(
                        block_id=next(iter(blocks)),
                        start=99,
                        end=104,
                        quote="Alice",
                        entity_id="p1",
                        category="PERSON",
                    )
                ],
                uncertain=False,
            )

    result = anonymize(stream.getvalue(), Detector())
    assert result["status"] == "quarantined"
    assert not result["publication_allowed"]
    assert result["unresolved_span_count"] == 1
    assert (
        "AMBIGUOUS_SOURCE_SPAN_REQUIRES_MANUAL_REDACTION"
        in result["quarantine_reasons"]
    )


def test_compact_transport_computes_unicode_end_and_preserves_validation():
    from app.integrations.ai.draft_anonymizer import decode_detection

    payload = {
        "findings": [{"b": "a", "s": 2, "q": "राम", "e": "p1", "c": "PERSON"}],
        "uncertain": False,
    }
    result = decode_detection(json.dumps(payload))
    assert result.findings[0].end == 2 + len("राम")
    assert substitute({"a": "  राम"}, result.findings)["a"] == "  [PERSON_1]"
    payload["findings"][0]["c"] = "INVALID"
    with pytest.raises(ValueError):
        decode_detection(json.dumps(payload))


def test_compact_transport_rejects_extra_fields_and_coerced_offsets():
    from app.integrations.ai.draft_anonymizer import decode_detection

    finding = {"b": "a", "s": "0", "q": "Alice", "e": "p1", "c": "PERSON"}
    with pytest.raises(ValueError):
        decode_detection(json.dumps({"findings": [finding], "uncertain": False}))
    finding.update(s=0, end=5)
    with pytest.raises(ValueError):
        decode_detection(json.dumps({"findings": [finding], "uncertain": False}))


def test_adjacent_address_split_preserves_source_and_identity():
    blocks = {"a": "Lives at House 7", "b": "River Road, Town. Next sentence."}
    finding = Finding(
        block_id="a",
        start=99,
        end=100,
        quote="House 7\nRiver Road, Town.",
        entity_id="address1",
        category="ADDRESS",
    )
    issues = []
    fixed = repair_detected_spans(
        blocks, Detection(findings=[finding], uncertain=False), issues=issues
    )
    assert len(fixed.findings) == 2
    assert fixed.uncertain
    assert issues == ["ADJACENT_PARAGRAPH_SPAN_REPAIRED"]
    assert substitute(blocks, fixed.findings) == {
        "a": "Lives at [ADDRESS_1]",
        "b": "[ADDRESS_1] Next sentence.",
    }


@pytest.mark.parametrize(
    "blocks,quote",
    [
        ({"a": "House 7", "b": "Unrelated", "c": "River Road"}, "House 7\nRiver Road"),
        ({"a": "House 7", "b": "River Road"}, "House 8\nRiver Road"),
        ({"a": "House 7", "b": "River Road"}, "House 7 River Road"),
    ],
)
def test_cross_block_repair_never_guesses_or_skips_text(blocks, quote):
    finding = Finding(
        block_id="a", start=0, end=1, quote=quote, entity_id="a1", category="ADDRESS"
    )
    fixed = repair_detected_spans(
        blocks, Detection(findings=[finding], uncertain=False)
    )
    with pytest.raises(ValueError, match="INVALID_SOURCE_SPAN"):
        substitute(blocks, fixed.findings)


@pytest.mark.parametrize("boundary", ["part", "cell"])
def test_cross_block_repair_rejects_document_part_or_cell_boundary(boundary):
    blocks = {"a": "House 7", "b": "River Road"}
    layout = [
        {"block_id": k, "part": "word/document.xml", "table": 0, "row": 0, "cell": 0}
        for k in blocks
    ]
    layout[1][boundary] = "different"
    finding = Finding(
        block_id="a",
        start=0,
        end=1,
        quote="House 7\nRiver Road",
        entity_id="a1",
        category="ADDRESS",
    )
    fixed = repair_detected_spans(
        blocks, Detection(findings=[finding], uncertain=False), layout=layout
    )
    with pytest.raises(ValueError, match="INVALID_SOURCE_SPAN"):
        substitute(blocks, fixed.findings)
