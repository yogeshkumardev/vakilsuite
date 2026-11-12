from types import SimpleNamespace as NS

import pytest
from pydantic import ValidationError

from app.core.exceptions import ConflictError
from app.features.okf_exports.authorities import validate_chain, text_hash
from app.features.okf_exports.schemas import PrepareOkfExportPreviewRequest


def chain():
    return dict(case=NS(id=1, chamber_id=2), reference=dict(review_version=3,
                proposition_id="4", proposition_hash=text_hash("proposition")),
        review=NS(case_id=1, chamber_id=2, action="approved", version=3, proposition_id=4),
        proposition=NS(id=4, case_id=1, chamber_id=2, text="proposition",
                       text_hash=text_hash("proposition"), passage_id=5, authority_version_id=6),
        passage=NS(id=5, authority_version_id=6, text="passage", text_hash=text_hash("passage"),
                   start_offset=0, end_offset=7, locator_valid=True),
        version=NS(id=6, authority_id=7, normalized_text="passage text"),
        authority=NS(id=7, chamber_id=2, current_version_id=6))


def test_valid_current_review_chain():
    validate_chain(**chain())


@pytest.mark.parametrize("object_name,field,value", [
    ("review", "action", "revoked"), ("review", "version", 4),
    ("proposition", "chamber_id", 9), ("proposition", "text", "modified"),
    ("authority", "current_version_id", 8), ("passage", "text", "different"),
    ("passage", "locator_valid", False), ("passage", "start_offset", -1),
])
def test_changed_or_cross_scope_authority_rejected(object_name, field, value):
    args = chain()
    setattr(args[object_name], field, value)
    with pytest.raises(ConflictError):
        validate_chain(**args)


def test_manifest_hash_required_with_id():
    import uuid
    with pytest.raises(ValidationError):
        PrepareOkfExportPreviewRequest(summary_run_id=uuid.uuid4(), expected_summary_result_hash="a"*64,
            bundle_id="s528_curated_01", bundle_version="1.0.0", template_entry_id="quashing-template",
            confirmed_findings=[dict(section="case_identification", finding_index=0)],
            authority_manifest_id=uuid.uuid4())
