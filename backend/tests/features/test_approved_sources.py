import uuid
from types import SimpleNamespace
from app.features.revisions.approved_sources import build_approved_source_manifest
from app.features.revisions.eligibility import EligibilityReason, EligibilityResult, SourceDependency

def test_manifest_preserves_exact_revision_and_exclusion_reason():
    revision = SimpleNamespace(id=uuid.uuid4(), content_sha256="a" * 64, source_map=[{"path": "root.0", "start": 0, "end": 4}])
    dep = SourceDependency(file_version_id=uuid.uuid4(), expected_sha256="b" * 64, first_page=1, last_page=2)
    excluded = build_approved_source_manifest(revision=revision, dependencies=(dep,), eligibility=EligibilityResult(False, (EligibilityReason.revision_not_approved,), revision.id, revision.content_sha256))
    assert not excluded.included
    assert excluded.reasons == ("revision_not_approved",)
    assert excluded.file_dependencies[0].last_page == 2

def test_manifest_marks_exact_eligible_revision_included():
    revision = SimpleNamespace(id=uuid.uuid4(), content_sha256="a" * 64, source_map=[])
    included = build_approved_source_manifest(revision=revision, dependencies=(), eligibility=EligibilityResult(True, (EligibilityReason.eligible,), revision.id, revision.content_sha256))
    assert included.included
