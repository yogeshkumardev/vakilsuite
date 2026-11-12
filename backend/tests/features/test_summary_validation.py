import pytest
from app.features.summaries.contracts import (
    CaseSummaryPayload,
    FindingType,
    SourceCitation,
    SummaryFinding,
    SummarySection,
    SummarySectionName,
)
from app.features.summaries.generation import SummaryGenerationService
from app.features.summaries.semantic_validation import validate_summary_semantics
from app.features.summaries.validation import StructuredSummary, validate_summary_sources

def valid():
    return StructuredSummary.model_validate({"purpose": "Case summary", "source_revision_ids": ["rev-a"], "claims": [{"text": "The order records a hearing date.", "source_revision_id": "rev-a", "source_paths": ["editorState.root.children.0"]}], "uncertainties": ["Date should be verified by lawyer"]})

def test_summary_requires_claim_citations_to_selected_sources():
    assert validate_summary_sources(valid(), eligible_revision_ids={"rev-a"}).purpose == "Case summary"

def test_rejects_non_eligible_source_even_if_model_returns_it():
    with pytest.raises(ValueError, match="not currently approved"):
        validate_summary_sources(valid(), eligible_revision_ids=set())

def test_rejects_claim_with_unselected_source():
    with pytest.raises(ValueError, match="Every claim"):
        StructuredSummary.model_validate({"purpose": "x", "source_revision_ids": ["rev-a"], "claims": [{"text": "x", "source_revision_id": "rev-b", "source_paths": ["path"]}]})


def source_bound_payload() -> CaseSummaryPayload:
    sections = [
        SummarySection(
            name=name,
            findings=[
                SummaryFinding(
                    text="The supplied record states this item.",
                    finding_type=FindingType.stated_fact,
                    citations=[
                        SourceCitation(
                            source_document_id="doc-a",
                            source_revision_id="rev-a",
                            source_paths=["editorState.root.children.0"],
                            finding_type=FindingType.stated_fact,
                        )
                    ],
                )
            ],
        )
        for name in SummarySectionName
    ]
    return CaseSummaryPayload(output_language="en-IN", sections=sections)


def test_case_summary_payload_keeps_authorized_citations():
    payload = source_bound_payload()
    SummaryGenerationService._validate_payload(
        payload,
        [{"source_document_id": "doc-a", "source_revision_id": "rev-a", "source_paths": ["editorState.root.children.0"], "source_blocks": {"editorState.root.children.0": "The supplied record states this item."}, "text": "record"}],
    )
    payload.sections[0].findings[0].citations[0].source_document_id = "other-doc"
    with pytest.raises(ValueError, match="unauthorized source"):
        SummaryGenerationService._validate_payload(
            payload,
            [{"source_document_id": "doc-a", "source_revision_id": "rev-a", "source_paths": ["editorState.root.children.0"], "source_blocks": {"editorState.root.children.0": "The supplied record states this item."}, "text": "record"}],
        )


def test_concise_summary_accepts_applicable_sections_without_internal_fact_ids():
    payload = source_bound_payload().model_dump(mode="json")
    payload["sections"] = payload["sections"][:2]
    payload["sections"][0]["findings"][0]["confirmed"] = True
    payload["sections"][0]["findings"][0]["requires_advocate_review"] = False
    payload["sections"][0]["findings"][0]["citations"][0].pop("finding_type")
    parsed = CaseSummaryPayload.model_validate(payload)

    assert len(parsed.sections) == 2
    assert parsed.sections[0].findings[0].citations[0].finding_type == FindingType.stated_fact
    assert not parsed.sections[0].findings[0].confirmed
    assert parsed.sections[0].findings[0].requires_advocate_review


def test_new_summary_runs_use_concise_bounded_contract():
    import uuid
    from app.features.summaries.schemas import PrepareSummaryRunRequest
    from app.features.summaries.prompt import SIMPLE_PROMPT_VERSION

    request = PrepareSummaryRunRequest(original_pdf_sources=[{
        "document_id": uuid.uuid4(), "file_version_id": uuid.uuid4(), "sha256": "a" * 64,
    }])
    assert request.prompt_version == SIMPLE_PROMPT_VERSION
    assert SummaryGenerationService._output_cap(request.prompt_version) == 12_288


def test_scanned_source_citation_uses_original_document_for_document_review():
    payload = source_bound_payload()
    payload.sections = payload.sections[:1]
    citation = payload.sections[0].findings[0].citations[0]
    record = {
        "source_document_id": "working-scan", "original_document_id": "original-scan",
        "source_revision_id": "rev-a", "source_paths": ["editorState.root.children.0"],
        "page_paths": {"editorState.root.children.0": 1},
        "source_blocks": {"editorState.root.children.0": "The supplied record states this item."},
    }
    citation.source_document_id = "working-scan"
    citation.page_number = 1
    SummaryGenerationService._validate_payload(payload, [record])

    assert citation.source_document_id == "original-scan"


def test_semantic_validation_flags_an_uncited_date_for_lawyer_review():
    payload = source_bound_payload()
    payload.sections[0].findings[0].text = "The hearing was on 12/10/2026."
    report = validate_summary_semantics(
        payload,
        source_blocks={("rev-a", "editorState.root.children.0"): "The hearing was on 11/10/2026."},
    )
    assert report.needs_advocate_review >= 1
    assert any("12/10/2026" in issue["reason"] for issue in report.issues)
