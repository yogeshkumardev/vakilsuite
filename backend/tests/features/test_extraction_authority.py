import uuid
from types import SimpleNamespace
from app.features.documents.extraction_authority import pending_review_handoff

def test_validated_extraction_handoff_is_never_auto_approved():
    job = SimpleNamespace(id=uuid.uuid4(), payload={"file_version_id": str(uuid.uuid4()), "manifest_digest": "a" * 64})
    handoff = pending_review_handoff(job=job)
    assert handoff.status == "pending_review"
