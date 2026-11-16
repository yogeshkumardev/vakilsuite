from types import SimpleNamespace as NS
from unittest.mock import Mock

from app.features.blueprints import get_blueprint
from app.features.drafts.service import CourtDraftService, _missing_fields, _render, _word_editor_document
from app.features.revisions.lexical import validate_editor_document
from app.features.drafts.compliance import validate_court_draft_docx
from app.features.drafts.rendering import render_court_draft_docx
from app.integrations.ai.gemini import GeminiAdapter


def test_template_rendering_has_visible_placeholders_for_missing_values() -> None:
    assert _render("Case Crime [[case.case_crime_number]]", {"case": {}}) == "Case Crime [● lawyer confirm karein ●]"


def test_readiness_detects_missing_deponent_variation_fields() -> None:
    blueprint = get_blueprint("regular_bail_483_bnss", "allahabad_hc", "allahabad", "efiling", "en")
    missing = _missing_fields(blueprint.required_inputs, {"case": {}, "applicants": [], "deponents": [], "advocate": {}})
    assert "deponents.capacity" in missing
    assert "deponents.for_applicant_ids" in missing


def test_assembly_uses_yaml_variant_and_never_fabricates_case_facts() -> None:
    blueprint = get_blueprint("regular_bail_483_bnss", "allahabad_hc", "allahabad", "efiling", "en")
    data = {
        "case": {"application_number": "12", "application_year": "2026", "district": "Prayagraj", "case_crime_number": "44", "case_crime_year": "2026", "police_station": "Civil Lines", "offence_sections": "BNS 1", "jail_district": "Prayagraj", "custody_since": "01.01.2026", "occurrence_date": "02.01.2026"},
        "applicants": [{"full_name": "Applicant", "relation_label": "son", "relation_name": "Parent", "address": "Address"}],
        "deponents": [{"full_name": "Brother", "age_years": 30, "relation_label": "son", "relation_name": "Parent", "address": "Address", "religion": "X", "occupation": "Y", "capacity": "representative", "relationship_to_applicant": "brother"}],
        "advocate": {"full_name": "Advocate"}, "verification": {}, "annexures": [], "case_specific_affidavit_paragraphs": "",
    }
    output = CourtDraftService(None)._assemble(blueprint, data, NS(id="summary", review_hash="a" * 64, result_hash="a" * 64))
    affidavit = next(component for component in output["components"] if component["code"] == "affidavit")
    assert "brother of the applicant" in affidavit["paragraphs"][0]["text"]
    assert "this is the first Criminal" not in affidavit["paragraphs"][0]["text"]
    assert "[● lawyer confirm karein ●]" in affidavit["paragraphs"][0]["text"]
    assert affidavit["paragraphs"][1]["affidavit_narrative"] is True
    application = next(component for component in output["components"] if component["code"] == "application")
    # v4: prayer is now deterministic boilerplate (role=body), not an LLM prayer slot
    assert any("enlarge the Applicant on bail" in paragraph["text"] for paragraph in application["paragraphs"])
    assert all("invented" not in paragraph["text"] for paragraph in application["paragraphs"])


def test_cause_title_has_one_respondent_for_multiple_applicants() -> None:
    blueprint = get_blueprint("regular_bail_483_bnss", "allahabad_hc", "allahabad", "efiling", "en")
    applicant_component = next(component for component in blueprint.components if component.code == "cause_title_applicants")
    respondent_component = next(component for component in blueprint.components if component.code == "cause_title_respondent")
    assert applicant_component.mode == "repeat"
    assert respondent_component.mode == "template"


def test_deponent_links_must_reference_an_applicant() -> None:
    data = {"applicants": [{"full_name": "A"}], "deponents": [{"for_applicant_ids": ["unknown"]}]}
    try:
        CourtDraftService._validate_deponent_links(data)
    except Exception as exc:
        assert "unknown applicant" in str(exc)
    else:
        raise AssertionError("Expected invalid applicant link to be rejected")


def test_saved_draft_content_has_a_deterministic_compliance_report() -> None:
    blueprint = get_blueprint("regular_bail_483_bnss", "allahabad_hc", "allahabad", "efiling", "en")
    content = CourtDraftService(None)._assemble(blueprint, {
        "case": {}, "applicants": [], "deponents": [], "advocate": {}, "verification": {}, "annexures": []
    }, NS(id="summary", review_hash="a" * 64, result_hash="a" * 64))
    from app.features.court_rules import get_format_spec
    snapshot = get_format_spec("allahabad_hc", "allahabad", __import__("datetime").date(2026, 11, 15), "efiling", "en").model_dump(mode="json")
    report = validate_court_draft_docx(render_court_draft_docx(content, snapshot, title="Test"), content, snapshot)
    assert report.overall == "warning"
    assert any(item.code == "placeholders" for item in report.checks)


def test_gemini_court_draft_prose_is_limited_to_requested_slots(monkeypatch) -> None:
    from app.integrations.ai import gemini

    monkeypatch.setattr(gemini.settings, "GEMINI_MODEL", "gemini-test")
    monkeypatch.setattr(gemini.settings, "GEMINI_ALLOWED_MODELS", ["gemini-test"])
    response = NS(
        parsed={"facts": "Verified facts only.", "prayer": "Grant bail."},
        response_id="request-1",
        usage_metadata=NS(prompt_token_count=15, candidates_token_count=9),
    )
    client = Mock()
    client.models.generate_content.return_value = response

    result = GeminiAdapter(model="gemini-test", client=client).generate_court_draft_prose(
        summary={"findings": []}, slots=["facts", "prayer"], max_output_tokens=500
    )

    assert result == ({"facts": "Verified facts only.", "prayer": "Grant bail."}, 15, 9, "request-1")
    config = client.models.generate_content.call_args.kwargs["config"]
    assert config.response_mime_type == "application/json"


def test_gemini_court_draft_requests_one_cited_affidavit_paragraph_per_finding(monkeypatch) -> None:
    from app.integrations.ai import gemini

    monkeypatch.setattr(gemini.settings, "GEMINI_MODEL", "gemini-test")
    monkeypatch.setattr(gemini.settings, "GEMINI_ALLOWED_MODELS", ["gemini-test"])
    client = Mock()
    client.models.generate_content.return_value = NS(
        parsed={"facts": "FIR allegation.", "affidavit_paragraphs": [
            {"finding_id": "f1", "text": "That the FIR alleges an event."},
        ]},
        response_id="request-2",
        usage_metadata=NS(prompt_token_count=30, candidates_token_count=20),
    )
    result = GeminiAdapter(model="gemini-test", client=client).generate_court_draft_prose(
        summary={"sections": []}, slots=["facts"], max_output_tokens=500,
        affidavit_findings=[{"id": "f1", "section": "prosecution_allegations", "text": "FIR alleges an event.", "status": "allegation", "citations": [{"source_revision_id": "revision"}]}],
    )
    assert result[0]["affidavit_paragraphs"] == [
        {"finding_id": "f1", "text": "That the FIR alleges an event."},
    ]
    prompt = client.models.generate_content.call_args.kwargs["contents"]
    assert "Affidavit findings, in required order" in prompt
    assert "source_revision_id" not in prompt


def test_word_editor_handoff_preserves_court_docx_and_validates_revision_payload() -> None:
    blueprint = get_blueprint("regular_bail_483_bnss", "allahabad_hc", "allahabad", "efiling", "en")
    draft = NS(
        version=1,
        content=CourtDraftService(None)._assemble(blueprint, {
            "case": {}, "applicants": [], "deponents": [], "advocate": {}, "verification": {}, "annexures": []
        }, NS(id="summary", review_hash="a" * 64, result_hash="a" * 64)),
        rule_snapshot=__import__("app.features.court_rules", fromlist=["get_format_spec"]).get_format_spec(
            "allahabad_hc", "allahabad", __import__("datetime").date(2026, 11, 15), "efiling", "en"
        ).model_dump(mode="json"),
    )
    payload = _word_editor_document(draft)
    validated = validate_editor_document(payload)

    assert validated.normalized_text
    assert validated.editor_document["editorState"]["docx_base64"].startswith("UEsDB")
