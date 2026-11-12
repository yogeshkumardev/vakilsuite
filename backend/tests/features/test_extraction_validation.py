import pytest
from pydantic import ValidationError

from app.features.documents.extraction_validation import ExtractionOutput, ExtractionValidationError, validate_extraction_output

SHA = "a" * 64

def output(**changes):
    base = {"source_file_version_id": "version-1", "source_sha256": SHA, "completed_pages": [1, 2], "blocks": [{"page_number": 1, "text": "verified text"}]}
    base.update(changes)
    return ExtractionOutput.model_validate(base)

def test_accepts_complete_authorized_output():
    assert validate_extraction_output(output(), file_version_id="version-1", sha256=SHA, page_count=2).completed_pages == [1, 2]

@pytest.mark.parametrize("changes", [{"truncated": True}, {"refusal_reason": "policy"}, {"completed_pages": [1]}])
def test_rejects_partial_or_refused_output(changes):
    with pytest.raises(ExtractionValidationError):
        validate_extraction_output(output(**changes), file_version_id="version-1", sha256=SHA, page_count=2)

def test_rejects_source_hash_mismatch():
    with pytest.raises(ExtractionValidationError):
        validate_extraction_output(output(source_sha256="b" * 64), file_version_id="version-1", sha256=SHA, page_count=2)

def test_schema_rejects_extra_fields():
    with pytest.raises(ValidationError):
        ExtractionOutput.model_validate({**output().model_dump(), "made_up": True})
