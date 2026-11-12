"""Reproducible approved-source manifest for summaries, OKF and retrieval."""
from __future__ import annotations
import uuid
from dataclasses import dataclass
from app.features.revisions.eligibility import EligibilityResult, SourceDependency
from app.features.revisions.models import WorkingDocumentRevision

@dataclass(frozen=True)
class ApprovedSourceManifest:
    revision_id: uuid.UUID
    revision_sha256: str
    block_offsets: tuple[dict[str, object], ...]
    file_dependencies: tuple[SourceDependency, ...]
    included: bool
    reasons: tuple[str, ...]

def build_approved_source_manifest(*, revision: WorkingDocumentRevision, dependencies: tuple[SourceDependency, ...], eligibility: EligibilityResult) -> ApprovedSourceManifest:
    """Create a manifest only from server-derived revision/source metadata."""
    eligible = eligibility.eligible and eligibility.revision_id == revision.id and eligibility.revision_hash == revision.content_sha256
    return ApprovedSourceManifest(
        revision_id=revision.id,
        revision_sha256=revision.content_sha256,
        block_offsets=tuple(revision.source_map),
        file_dependencies=dependencies,
        included=eligible,
        reasons=tuple(reason.value for reason in eligibility.reasons),
    )
