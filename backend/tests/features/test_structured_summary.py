"""Synthetic contract, citation and downstream compatibility regression tests."""

from copy import deepcopy
from types import SimpleNamespace as NS
import pytest
from pydantic import ValidationError
from app.features.summaries.structured import StructuredSummary, SECTION_TITLES
from app.features.summaries.structured_validation import (
    validate_structured,
    parse_summary,
)
from app.features.summaries.presentation import present_summary
from app.features.documents.page_provenance import pages_with_provenance, page_paths
from app.features.revisions.lexical import validate_editor_document
from app.features.okf_exports.service import OkfExportPreviewService
from app.features.okf_exports.schemas import ConfirmedFindingSelection
from app.features.summaries.identity import summary_cache_key
from tests.features.test_summary_validation import source_bound_payload


def citation():
    return {
        "document_id": "original-1",
        "file_version_id": "version-1",
        "source_revision_id": "revision-1",
        "page_number": 1,
        "source_paths": ["page:1"],
    }


def fact(ident, text="A statement was recorded.", status="documented"):
    return {"id": ident, "text": text, "status": status, "citations": [citation()]}


def fixture(language="en-IN", count=160):
    missing = {"availability": "not_available", "findings": []}
    text = " ".join(["अभिलेख" if language == "hi-IN" else "record"] * count)
    allegation = fact("allegation", "An assault is alleged.", "alleged")
    event = {
        "event_id": "fir",
        "date_time": {
            "source_wording": "1 January 2025",
            "normalized_date": "2025-01-01",
            "time": None,
            "precision": "exact",
        },
        "event": fact("event", "FIR registration is recorded."),
        "persons_involved": deepcopy(missing),
        "event_status": "documented",
        "legal_significance": {
            "text": "Examine procedural chronology.",
            "basis_fact_ids": ["event"],
            "verification": "requires_verification",
        },
        "conflict_id": None,
    }
    return {
        "schema_version": "case-summary-v2",
        "output_language": language,
        "uncertainties": [],
        "sections": {
            "case_overview": {
                k: deepcopy(missing)
                for k in [
                    "case_title",
                    "case_numbers",
                    "court_and_bench",
                    "petitioner_applicant_accused",
                    "complainant_opposite_party",
                    "fir_number_and_police_station",
                    "applicable_provisions",
                    "current_case_stage",
                    "relief_sought",
                ]
            },
            "executive_summary": {"sentences": [fact("executive", text)]},
            "chronological_timeline": {
                "incident_factual": [event],
                "procedural_court": [],
            },
            "parties_and_roles": {"parties": []},
            "prosecution_version": {
                "availability": "available",
                "findings": [allegation],
            },
            "applicant_version": deepcopy(missing),
            "witness_analysis": {"witnesses": []},
            "evidence_analysis": {
                "materials": deepcopy(missing),
                "observations": [],
                "allegation_evidence_defence_matrix": [
                    {
                        "allegation_fact_id": "allegation",
                        "supporting_fact_ids": [],
                        "defence_fact_ids": [],
                        "defence_observation": {
                            "text": "Check identification against the record.",
                            "basis_fact_ids": ["allegation"],
                            "verification": "requires_verification",
                        },
                        "research_required": "Obtain witness statements.",
                    }
                ],
            },
            "contradictions": {"conflicts": []},
            "legal_provisions": {
                "record_mentioned": deepcopy(missing),
                "ai_suggested": [],
            },
            "legal_issues": {"observations": []},
            "defence_grounds": {"observations": []},
            "prosecution_arguments": {"observations": []},
            "missing_information": {
                "items": [
                    {
                        "description": "Witness statements not supplied.",
                        "related_fact_ids": ["allegation"],
                        "availability": "not_supplied",
                    }
                ]
            },
            "advocate_actions": {
                "actions": [
                    {
                        "category": "obtain_documents",
                        "instruction": "Obtain statements.",
                        "related_fact_ids": ["allegation"],
                    }
                ]
            },
        },
    }


def records():
    return [
        {
            "source_document_id": "original-1",
            "file_version_id": "version-1",
            "source_revision_id": "revision-1",
            "page_paths": {"page:1": 1},
            "source_blocks": {},
        }
    ]


@pytest.mark.parametrize("language", ["en-IN", "hi-IN"])
@pytest.mark.parametrize(
    "count,valid", [(149, False), (150, True), (250, True), (251, False)]
)
def test_executive_word_boundaries(language, count, valid):
    if valid:
        assert StructuredSummary.model_validate(fixture(language, count))
    else:
        with pytest.raises(ValidationError):
            StructuredSummary.model_validate(fixture(language, count))


def test_required_sections_exact_and_unknown_fields_rejected():
    value = fixture()
    value["sections"].pop("applicant_version")
    with pytest.raises(ValidationError):
        StructuredSummary.model_validate(value)
    value = fixture()
    value["sections"]["executive_summary"]["confirmed"] = True
    with pytest.raises(ValidationError):
        StructuredSummary.model_validate(value)


def test_all_facts_have_original_pages_and_only_manifest_sources():
    payload = StructuredSummary.model_validate(fixture()).canonicalize()
    assert validate_structured(payload, records())["needs_advocate_review"] == 3
    payload.sections.executive_summary.sentences[0].citations[0].page_number = 2
    with pytest.raises(ValueError, match="page provenance"):
        validate_structured(payload, records())
    value = fixture()
    value["sections"]["executive_summary"]["sentences"][0]["citations"][0][
        "page_number"
    ] = None
    with pytest.raises(ValidationError):
        StructuredSummary.model_validate(value)


def test_analysis_references_must_exist_and_cannot_claim_verification():
    value = fixture()
    analysis = value["sections"]["evidence_analysis"][
        "allegation_evidence_defence_matrix"
    ][0]["defence_observation"]
    analysis["basis_fact_ids"] = ["invented"]
    with pytest.raises(ValidationError):
        StructuredSummary.model_validate(value)
    analysis["basis_fact_ids"] = ["allegation"]
    analysis["verification"] = "verified"
    with pytest.raises(ValidationError):
        StructuredSummary.model_validate(value)


def test_rendering_has_fixed_sections_both_timelines_and_matrix():
    payload = StructuredSummary.model_validate(fixture()).canonicalize()
    view = present_summary(payload)
    assert [s.key for s in view.sections] == list(SECTION_TITLES)
    assert [s.number for s in view.sections] == list(range(1, 16))
    row = next(b for b in view.sections[2].blocks if b.kind == "timeline")
    assert len(row.cells) == 7
    assert any(b.title == "Procedural Court" for b in view.sections[2].blocks)
    assert any(b.kind == "matrix" for b in view.sections[7].blocks)
    assert all(
        s.page_number == 1
        for b in view.sections[7].blocks
        for c in b.cells
        for s in c.sources
    )


def test_legacy_and_v2_export_identity_and_epistemic_status():
    legacy = source_bound_payload()
    assert parse_summary(legacy.model_dump(mode="json")).sections
    payload = StructuredSummary.model_validate(fixture()).canonicalize()
    allegation = payload.sections.prosecution_version.findings[0]
    selected = [ConfirmedFindingSelection(finding_id=allegation.id)]
    facts = OkfExportPreviewService._confirmed_facts(payload, selected)
    assert facts[0]["finding_type"] == "alleged"
    assert facts[0]["citations"][0]["document_id"] == "original-1"
    assert OkfExportPreviewService._analysis_context(payload, []) == []
    assert (
        OkfExportPreviewService._analysis_context(payload, facts)[0]["status"]
        == "ai_suggestion_requires_verification"
    )
    with pytest.raises(Exception):
        OkfExportPreviewService._confirmed_facts(
            payload,
            [ConfirmedFindingSelection(section="executive_summary", finding_index=0)],
        )


def test_scan_page_metadata_survives_formatting_but_not_unmapped_paste():
    doc = pages_with_provenance(
        [
            {"page_number": 1, "text": "पहला पृष्ठ"},
            {"page_number": 2, "text": "Second page"},
        ]
    )
    validated = validate_editor_document(doc)
    assert set(page_paths(doc, 2, require_complete=True).values()) == {1, 2}
    leaf = doc["editorState"]["root"]["children"][0]["children"][0]["children"][0]
    leaf["format"] = 1
    assert set(page_paths(doc, 2, require_complete=True)) == {
        x["path"] for x in validated.source_map
    }
    paragraph = deepcopy(doc["editorState"]["root"]["children"][0]["children"][0])
    doc["editorState"]["root"]["children"].append(paragraph)
    with pytest.raises(Exception, match="Review every original page"):
        page_paths(doc, 2, require_complete=True)


def test_dates_are_not_invented_and_conflicts_are_not_resolved():
    value = fixture()
    event = value["sections"]["chronological_timeline"]["incident_factual"][0]
    event["date_time"]["precision"] = "unknown"
    with pytest.raises(ValidationError):
        StructuredSummary.model_validate(value)
    event["date_time"]["normalized_date"] = None
    event["event_status"] = "disputed"
    event["event"]["status"] = "disputed"
    event["conflict_id"] = "conflict-1"
    payload = StructuredSummary.model_validate(value).canonicalize()
    assert (
        payload.sections.chronological_timeline.incident_factual[0].conflict_id
        == "conflict-1"
    )


def test_cache_identity_separates_version_and_language():
    import uuid

    args = dict(
        chamber_id=uuid.uuid4(),
        case_id=uuid.uuid4(),
        source_manifest_hash="a" * 64,
        prompt_version="v4",
        policy_version=1,
    )
    assert summary_cache_key(
        **args, schema_version="v2", output_language="en-IN"
    ) != summary_cache_key(**args, schema_version="v2", output_language="hi-IN")


@pytest.mark.asyncio
async def test_source_navigation_rejects_cross_manifest_before_storage():
    from app.features.summaries.source_navigation import resolve_source

    payload = StructuredSummary.model_validate(fixture()).canonicalize()
    run = NS(result_payload=payload.model_dump(mode="json"), dependency_snapshot=[])
    with pytest.raises(Exception, match="not part of this summary"):
        await resolve_source(
            NS(), run=run, user=NS(), finding_id="fact_0001", citation_index=0
        )


@pytest.mark.asyncio
@pytest.mark.parametrize("mutation", [None, "hash", "case", "version", "page"])
async def test_original_link_is_authorized_and_pinned(monkeypatch, mutation):
    from unittest.mock import AsyncMock, Mock
    from app.features.summaries import source_navigation as nav
    from app.core.exceptions import ConflictError

    payload = StructuredSummary.model_validate(fixture()).canonicalize()
    run = NS(
        case_id="case-1",
        result_payload=payload.model_dump(mode="json"),
        dependency_snapshot=[
            dict(
                kind="original_pdf",
                document_id="original-1",
                file_version_id="version-1",
                revision_id="revision-1",
                sha256="hash-1",
            )
        ],
    )
    document = NS(case_id="case-1", original_filename="Synthetic FIR.pdf")
    version = NS(
        id="version-1",
        sha256_hex="hash-1",
        page_count=2,
        r2_bucket="private",
        r2_key="original-key",
        detected_mime_type="application/pdf",
    )
    if mutation == "hash":
        version.sha256_hex = "changed"
    if mutation == "case":
        document.case_id = "foreign"
    if mutation == "version":
        version.id = "replaced"
    if mutation == "page":
        run.result_payload["sections"]["executive_summary"]["sentences"][0][
            "citations"
        ][0]["page_number"] = 3
    authorize = AsyncMock(return_value=(document, version))
    monkeypatch.setattr(nav.OriginalSourceService, "authorized", authorize)
    storage = Mock()
    storage.generate_presigned_url.return_value = (
        "https://storage.invalid/private-original"
    )
    monkeypatch.setattr(nav, "get_r2_client", lambda: storage)

    async def inline_call(function, *args, **kwargs):
        return function(*args, **kwargs)

    monkeypatch.setattr(nav.asyncio, "to_thread", inline_call)

    if mutation:
        with pytest.raises(ConflictError):
            await nav.resolve_source(
                NS(), run=run, user=NS(), finding_id="fact_0001", citation_index=0
            )
        storage.generate_presigned_url.assert_not_called()
    else:
        result = await nav.resolve_source(
            NS(), run=run, user=NS(), finding_id="fact_0001", citation_index=0
        )
        assert result.page_number == 1
        assert result.filename == "Synthetic FIR.pdf"
        storage.generate_presigned_url.assert_called_once_with(
            "get_object",
            Params={"Bucket": "private", "Key": "original-key"},
            ExpiresIn=300,
        )
    authorize.assert_awaited_once()


@pytest.mark.parametrize("structured", [False, True])
def test_provider_dispatch_preserves_original_pdf_without_extraction(
    monkeypatch, structured
):
    import base64
    import httpx
    import json
    from app.integrations.ai import gemini
    from app.integrations.ai.gemini import GeminiAdapter
    from app.features.summaries.prompt import STRUCTURED_INSTRUCTION, SYSTEM_INSTRUCTION

    adapter = GeminiAdapter.__new__(GeminiAdapter)
    adapter.model = "gemini-test"
    calls = []
    payload = (
        StructuredSummary.model_validate(fixture())
        if structured
        else source_bound_payload()
    )

    def respond(request):
        calls.append(json.loads(request.content))
        return httpx.Response(200, json={
            "candidates": [{"finishReason": "STOP", "content": {"parts": [{"text": payload.model_dump_json()}]}}],
            "usageMetadata": {"promptTokenCount": 10, "candidatesTokenCount": 20},
            "responseId": "synthetic-request",
        })

    real_client = httpx.Client
    monkeypatch.setattr(gemini.settings, "GEMINI_API_KEY", "test-key")
    monkeypatch.setattr(
        gemini.httpx, "Client",
        lambda **kwargs: real_client(transport=httpx.MockTransport(respond), **kwargs),
    )
    outcome = adapter.summarize_case(
        contents="Synthetic authorized manifest",
        max_output_tokens=2000,
        pdf_sources=[
            dict(
                source_document_id="original-1",
                source_revision_id="revision-1",
                data=b"synthetic-pdf",
            )
        ],
        structured=structured,
    )
    assert outcome[0] == payload
    assert len(calls) == 1
    instruction = calls[0]["systemInstruction"]["parts"][0]["text"]
    assert instruction.startswith(
        STRUCTURED_INSTRUCTION if structured else SYSTEM_INSTRUCTION
    )
    if structured:
        assert "Required nested JSON shape" in instruction
    parts = calls[0]["contents"][0]["parts"]
    assert base64.b64decode(parts[2]["inlineData"]["data"]) == b"synthetic-pdf"
    assert parts[2]["inlineData"]["mimeType"] == "application/pdf"
    config = calls[0]["generationConfig"]
    if structured:
        assert config["responseMimeType"] == "application/json"
        assert "responseJsonSchema" not in config
        assert "responseSchema" not in config
        # All nested fields and local validation constraints reach the model.
        declared = json.loads(instruction.split("Do not treat this as a source of case facts:\n", 1)[1])
        expected_schema = StructuredSummary.model_json_schema()
        # additional_sections is excluded from the prompt – it is a server-side capture field
        expected_schema.get("properties", {}).pop("additional_sections", None)
        req = expected_schema.get("required")
        if isinstance(req, list) and "additional_sections" in req:
            req.remove("additional_sections")
        assert declared == expected_schema
        assert "page_number may be null" not in calls[0]["systemInstruction"]["parts"][0]["text"]
    else:
        assert config["responseJsonSchema"]["type"] == "object"


def test_summary_wire_schema_is_small_typed_and_has_no_decoding_bounds():
    from app.integrations.ai.gemini import _case_summary_response_schema
    from app.features.summaries.contracts import CaseSummaryPayload

    schema = _case_summary_response_schema()

    def verify(node):
        assert set(node) <= {"type", "properties", "items", "required"}
        assert "type" in node
        if node["type"] == "object":
            assert node["properties"]
            assert set(node["required"]) == set(node["properties"])
            for child in node["properties"].values():
                verify(child)
        if node["type"] == "array":
            verify(node["items"])

    verify(schema)
    finding = schema["properties"]["sections"]["items"]["properties"]["findings"]["items"]
    assert "confirmed" not in finding["properties"]
    citation = finding["properties"]["citations"]["items"]
    assert set(citation["properties"]) == {
        "source_document_id", "source_revision_id", "page_number", "source_paths", "page_reference_note",
    }
    # Dropping decoding bounds must not weaken application/source validation.
    value = source_bound_payload().model_dump(mode="json")
    value["sections"][0]["findings"][0]["citations"] = []
    with pytest.raises(ValidationError):
        CaseSummaryPayload.model_validate(value)


def test_summary_http_400_is_safe_and_not_retried(monkeypatch, caplog):
    import httpx
    from app.integrations.ai import gemini
    from app.integrations.ai.gemini import GeminiAdapter
    from app.integrations.ai.contracts import ProviderError, ProviderErrorCode

    adapter = GeminiAdapter.__new__(GeminiAdapter)
    adapter.model = "gemini-test"
    calls = []

    def respond(request):
        calls.append(request)
        return httpx.Response(400, json={
            "error": {"code": 400, "message": "private document contents", "status": "INVALID_ARGUMENT"}
        })

    real_client = httpx.Client
    monkeypatch.setattr(gemini.settings, "GEMINI_API_KEY", "test-key")
    monkeypatch.setattr(
        gemini.httpx, "Client",
        lambda **kwargs: real_client(transport=httpx.MockTransport(respond), **kwargs),
    )
    outcome = adapter.summarize_case(contents="synthetic", max_output_tokens=100)

    assert isinstance(outcome, ProviderError)
    assert outcome.error_code == ProviderErrorCode.invalid_input
    assert not outcome.retryable
    assert len(calls) == 1
    assert "private document contents" not in caplog.text


def test_summary_http_schema_error_logs_safe_reason_and_field_only(caplog):
    import httpx
    from app.integrations.ai.gemini import _log_summary_http_error

    response = httpx.Response(400, json={"error": {
        "message": "Schema produces a constraint with too many states. secret-document secret-key",
        "details": [{"fieldViolations": [{
            "field": "generation_config.response_json_schema.properties.secret-document",
            "description": "secret-document secret-key",
        }]}],
    }})
    _log_summary_http_error(response)

    assert "status=400" in caplog.text
    assert "response_schema_too_complex" in caplog.text
    assert "responseJsonSchema" in caplog.text
    assert "secret-document" not in caplog.text
    assert "secret-key" not in caplog.text


@pytest.mark.parametrize("scenario", ["empty_sections", "private_extra", "extra_section", "extra_nested", "truncated", "thought"])
def test_summary_response_is_complete_validated_and_safe(monkeypatch, caplog, scenario):
    import httpx
    import json
    from app.integrations.ai import gemini
    from app.features.summaries.structured import UnverifiedSummary

    adapter = gemini.GeminiAdapter.__new__(gemini.GeminiAdapter)
    adapter.model = "gemini-test"
    value = fixture()
    if scenario == "empty_sections":
        value["sections"] = {name: {} for name in SECTION_TITLES}
    if scenario == "private_extra":
        value["private-document-secret"] = "private-content-secret"
    if scenario == "extra_section":
        value["sections"]["private-document-secret"] = {"note": "private-content-secret"}
    if scenario == "extra_nested":
        value["sections"]["case_overview"]["private-document-secret"] = "private-content-secret"
    parts = [{"text": json.dumps(value)}]
    if scenario == "thought":
        parts.insert(0, {"thought": True, "text": "private-reasoning-secret"})
    calls = []

    def respond(request):
        calls.append(request)
        return httpx.Response(200, json={
            "candidates": [{"finishReason": "MAX_TOKENS" if scenario == "truncated" else "STOP",
                            "content": {"parts": parts}}],
            "usageMetadata": {"promptTokenCount": 123, "candidatesTokenCount": 456},
            "responseId": "response-fixture",
        })

    real_client = httpx.Client
    monkeypatch.setattr(gemini.httpx, "Client", lambda **kwargs: real_client(
        transport=httpx.MockTransport(respond), **kwargs))
    result = adapter.summarize_case(contents="synthetic", max_output_tokens=100, structured=True)
    assert len(calls) == 1
    if scenario in {"thought", "extra_section", "private_extra", "extra_nested"}:
        if scenario == "extra_section":
            extra_data = value["sections"].pop("private-document-secret")
        if scenario == "private_extra":
            value.pop("private-document-secret")
        if scenario == "extra_nested":
            value["sections"]["case_overview"].pop("private-document-secret")
        expected = StructuredSummary.model_validate(value)
        if scenario == "extra_section":
            expected.additional_sections = {"private-document-secret": extra_data}
        assert result[0] == expected
    else:
        assert isinstance(result[0], UnverifiedSummary)
        assert result[0].reason == ("incomplete_output" if scenario == "truncated" else "invalid_format")
        assert result[0].raw_text == json.dumps(value)
        assert result[1:] == (123, 456, "response-fixture")
    if scenario == "empty_sections":
        assert "case_title" in caplog.text and "missing" in caplog.text
    if scenario == "private_extra":
        assert "repaired" in caplog.text or isinstance(result[0], StructuredSummary)
    assert "private-document-secret" not in caplog.text
    assert "private-content-secret" not in caplog.text
    assert "private-reasoning-secret" not in caplog.text


def test_invalid_json_summary_is_preserved_without_another_provider_call(monkeypatch):
    import httpx
    from app.integrations.ai import gemini
    from app.features.summaries.structured import UnverifiedSummary

    adapter = gemini.GeminiAdapter.__new__(gemini.GeminiAdapter)
    adapter.model = "gemini-test"
    calls = []

    def respond(request):
        calls.append(request)
        return httpx.Response(200, json={
            "candidates": [{"finishReason": "STOP", "content": {"parts": [{"text": '{"sections":'}]}}],
            "usageMetadata": {"promptTokenCount": 24904, "candidatesTokenCount": 26408},
            "responseId": "charged-response",
        })

    real_client = httpx.Client
    monkeypatch.setattr(gemini.httpx, "Client", lambda **kwargs: real_client(
        transport=httpx.MockTransport(respond), **kwargs))
    result = adapter.summarize_case(contents="synthetic", max_output_tokens=32768, structured=True)

    assert len(calls) == 1
    assert isinstance(result[0], UnverifiedSummary)
    assert result[0].raw_text == '{"sections":'
    assert result[1:] == (24904, 26408, "charged-response")


def test_eleven_document_summary_uses_one_bounded_provider_call(monkeypatch):
    import httpx
    import json
    from app.integrations.ai import gemini
    from app.features.summaries.contracts import CaseSummaryPayload

    adapter = gemini.GeminiAdapter.__new__(gemini.GeminiAdapter)
    adapter.model = "gemini-test"
    payload = source_bound_payload().model_dump(mode="json")
    payload["sections"] = payload["sections"][:2]
    calls = []

    def respond(request):
        body = json.loads(request.content)
        calls.append(body)
        # Catch the real regression at the outbound boundary: nested maxItems
        # and Pydantic references must not re-enter the decoding grammar.
        wire_schema = json.dumps(body["generationConfig"]["responseJsonSchema"])
        assert all(key not in wire_schema for key in ('"maxItems"', '"minItems"', '"$ref"', '"$defs"', '"anyOf"'))
        assert len([part for part in body["contents"][0]["parts"] if "inlineData" in part]) == 11
        assert "Allowed section name values:" in body["systemInstruction"]["parts"][0]["text"]
        assert "Allowed finding_type values:" in body["systemInstruction"]["parts"][0]["text"]
        return httpx.Response(200, json={
            "candidates": [{"finishReason": "STOP", "content": {"parts": [{"text": json.dumps(payload)}]}}],
            "usageMetadata": {"promptTokenCount": 500, "candidatesTokenCount": 700},
            "responseId": "simple-response",
        })

    real_client = httpx.Client
    monkeypatch.setattr(gemini.httpx, "Client", lambda **kwargs: real_client(
        transport=httpx.MockTransport(respond), **kwargs))
    result = adapter.summarize_case(
        contents="synthetic", max_output_tokens=12288,
        pdf_sources=[{
            "source_document_id": f"synthetic-{i}",
            "source_revision_id": f"version-{i}",
            "data": b"synthetic-pdf",
        } for i in range(11)],
    )

    assert len(calls) == 1
    assert calls[0]["generationConfig"]["maxOutputTokens"] == 12288
    assert isinstance(result[0], CaseSummaryPayload)
    assert len(result[0].sections) == 2
    assert result[1:] == (500, 700, "simple-response")


def test_unresolved_model_fact_links_are_removed_without_changing_source_facts():
    import json
    from app.integrations.ai.gemini import _validate_summary_response

    value = fixture()
    value["sections"]["chronological_timeline"]["incident_factual"][0][
        "legal_significance"
    ]["basis_fact_ids"] = ["missing-fact"]
    value["sections"]["evidence_analysis"]["allegation_evidence_defence_matrix"][0][
        "supporting_fact_ids"
    ] = ["missing-fact", "executive"]
    original_citation = value["sections"]["executive_summary"]["sentences"][0]["citations"]

    result = _validate_summary_response(json.dumps(value), StructuredSummary)

    assert result.sections.chronological_timeline.incident_factual[0].legal_significance is None
    assert result.sections.evidence_analysis.allegation_evidence_defence_matrix[0].supporting_fact_ids == ["executive"]
    assert result.sections.executive_summary.sentences[0].citations[0].model_dump() == original_citation[0]
    assert any("omitted" in note for note in result.uncertainties)


@pytest.mark.asyncio
async def test_unverified_paid_output_cannot_be_approved(monkeypatch):
    import uuid
    from unittest.mock import AsyncMock
    from app.core.exceptions import ConflictError
    from app.features.summaries import review_service
    from app.features.summaries.models import SummaryRunStatus
    from app.features.summaries.schemas import DecideSummaryReviewRequest

    service = review_service.SummaryReviewService(NS())
    case_id, run_id, user_id = (uuid.uuid4() for _ in range(3))
    service.preparation._require_readable_case = AsyncMock(return_value=NS(chamber_id=uuid.uuid4()))
    monkeypatch.setattr(review_service, "require_capability", AsyncMock())
    service._get_run = AsyncMock(return_value=NS(
        status=SummaryRunStatus.pending_review,
        result_hash="a" * 64,
        result_payload={"schema_version": "case-summary-unverified-v1", "raw_text": "{partial"},
        review_version=1,
    ))
    body = DecideSummaryReviewRequest(
        action="approve", expected_result_hash="a" * 64, expected_review_version=1,
    )

    with pytest.raises(ConflictError, match="cannot be approved"):
        await service.decide(case_id=case_id, run_id=run_id, body=body, user=NS(id=user_id))


@pytest.mark.asyncio
async def test_unverified_paid_output_is_persisted_for_review():
    import uuid
    from unittest.mock import AsyncMock
    from app.features.summaries.generation import SummaryGenerationService
    from app.features.summaries.models import SummaryProviderAttempt, SummaryRunStatus
    from app.features.summaries.structured import UnverifiedSummary
    from app.features.users.models import User

    run_id, attempt_id, user_id = (uuid.uuid4() for _ in range(3))
    run = NS(id=run_id, created_by_user_id=user_id, result_payload=None,
             result_hash=None, validation_report=None, input_tokens=None,
             output_tokens=None, provider_request_id=None, status=SummaryRunStatus.running,
             completed_at=None)
    attempt = NS(status="submitted", output_hash=None, provider_request_id=None,
                 completed_at=None)

    async def get(model, _ident, **_kwargs):
        return attempt if model is SummaryProviderAttempt else NS(id=user_id) if model is User else None

    db = NS(scalar=AsyncMock(return_value=run), get=get, commit=AsyncMock())
    service = SummaryGenerationService(db)
    service._authorize_and_collect = AsyncMock(return_value=([], None))
    payload = UnverifiedSummary(raw_text='{ "sections":', reason="invalid_format")

    result = await service._publish_if_current(
        run_id=run_id, attempt_id=attempt_id, payload=payload,
        validation_report=service._unverified_report(), input_tokens=123,
        output_tokens=456, provider_request_id="charged-response",
    )

    assert result == "pending_review"
    assert run.status == SummaryRunStatus.pending_review
    assert run.result_payload == payload.model_dump(mode="json")
    assert (run.input_tokens, run.output_tokens, run.provider_request_id) == (123, 456, "charged-response")
    assert attempt.status == "succeeded" and attempt.output_hash == run.result_hash
    db.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_summary_detail_lists_all_manifest_documents_for_bulk_review():
    import uuid
    from datetime import UTC, datetime
    from unittest.mock import AsyncMock
    from app.features.summaries.review_service import SummaryReviewService
    from app.features.summaries.models import SummaryRunStatus

    case_id, original_id, scanned_id = (uuid.uuid4() for _ in range(3))
    calls = 0

    async def scalars(_statement):
        nonlocal calls
        calls += 1
        return [] if calls == 1 else [
            NS(id=original_id, original_filename="digital.pdf"),
            NS(id=scanned_id, original_filename="scanned.pdf"),
        ]

    db = NS(scalar=AsyncMock(return_value=1), scalars=scalars)
    run = NS(
        id=uuid.uuid4(), case_id=case_id, status=SummaryRunStatus.pending_review,
        source_manifest_hash="a" * 64, prompt_version="allahabad-criminal-summary-v5",
        policy_version=1, schema_version="case-summary-v2", output_language="en-IN",
        created_at=datetime.now(UTC), completed_at=None,
        dependency_snapshot=[
            {"kind": "original_pdf", "document_id": str(original_id)},
            {"file_dependencies": [{"original_document_id": str(scanned_id)}]},
        ],
        provider=None, model=None, provider_request_id=None, input_tokens=None,
        output_tokens=None, result_hash=None, result_payload=None,
        validation_report=None, error_code=None, review_version=1,
        reviewed_by_user_id=None, reviewed_at=None, review_comment=None,
    )

    detail = await SummaryReviewService(db)._detail(run)

    assert {item.filename for item in detail.review_documents} == {"digital.pdf", "scanned.pdf"}
    assert detail.source_count == 2


def test_empty_httpx_timeout_is_classified_without_retry():
    import httpx
    from app.integrations.ai.gemini import GeminiAdapter
    from app.integrations.ai.contracts import ProviderErrorCode

    result = GeminiAdapter.__new__(GeminiAdapter)._map_exception(httpx.ReadTimeout(""))
    assert result.error_code == ProviderErrorCode.timeout
    assert result.outcome_unknown and not result.retryable


@pytest.mark.asyncio
async def test_failed_summary_persists_billed_provider_usage():
    from unittest.mock import AsyncMock
    from app.features.summaries.generation import SummaryGenerationService
    from app.features.summaries.models import SummaryRun, SummaryProviderAttempt, SummaryRunStatus
    from app.integrations.ai.contracts import ProviderError, ProviderErrorCode, ProviderName

    run = NS(status=SummaryRunStatus.running, input_tokens=99, output_tokens=None,
             error_code=None, provider_request_id=None)
    attempt = NS(status="submitted", error_code=None, outcome_unknown=False,
                 provider_request_id=None, completed_at=None)

    async def get(model, _ident, **_kwargs):
        return run if model is SummaryRun else attempt if model is SummaryProviderAttempt else None

    db = NS(get=get, commit=AsyncMock())
    failure = ProviderError(
        provider=ProviderName.gemini, error_code=ProviderErrorCode.invalid_response,
        message="Invalid response", retryable=False, provider_request_id="request-1",
        input_tokens=123, output_tokens=456,
    )
    await SummaryGenerationService(db)._record_provider_failure(
        run_id="run-1", attempt_id="attempt-1", error=failure,
    )
    assert run.status == SummaryRunStatus.failed
    assert (run.input_tokens, run.output_tokens, run.provider_request_id) == (123, 456, "request-1")
    assert attempt.status == "failed" and attempt.provider_request_id == "request-1"
    db.commit.assert_awaited_once()
