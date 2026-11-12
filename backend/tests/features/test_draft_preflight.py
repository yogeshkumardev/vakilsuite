import pytest

from app.core.exceptions import ConflictError, ValidationError
from app.features.okf_exports.preflight import DraftField, DraftPreflightRequest, check_draft_inputs


def payload():
    return {"application": {"template": {"bundle_id": "s528_curated_01"},
        "confirmed_facts": [{"id": "fact-1", "text": "Source statement", "citations": [{"source_document_id": "doc-1"}]}]}}


def test_gaps_explicit_and_no_generation():
    result = check_draft_inputs(payload(), "a"*64, DraftPreflightRequest(expected_manifest_sha256="a"*64))
    assert result.missing_fields == list(DraftField)
    assert not result.generation_available


def test_complete_references_are_not_legal_approval():
    result = check_draft_inputs(payload(), "a"*64, DraftPreflightRequest(
        expected_manifest_sha256="a"*64, fact_bindings={field: ["fact-1"] for field in DraftField}))
    assert result.reference_coverage_complete and not result.generation_available
    assert result.warnings


@pytest.mark.parametrize("ids", [["foreign-fact"], ["fact-1", "fact-1"], ["fact-1"] * 21])
def test_bad_references_rejected(ids):
    with pytest.raises(ValidationError):
        check_draft_inputs(payload(), "a"*64, DraftPreflightRequest(
            expected_manifest_sha256="a"*64, fact_bindings={DraftField.parties: ids}))


def test_wrong_hash_and_category_rejected():
    body = DraftPreflightRequest(expected_manifest_sha256="b"*64)
    with pytest.raises(ConflictError):
        check_draft_inputs(payload(), "a"*64, body)
    data = payload()
    data["application"]["template"]["bundle_id"] = "bail"
    with pytest.raises(ValidationError):
        check_draft_inputs(data, "b"*64, body)
