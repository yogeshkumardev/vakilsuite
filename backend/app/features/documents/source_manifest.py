"""Immutable, provider-safe extraction input manifests; no file bytes or signed URLs."""

from dataclasses import dataclass
import hashlib
import json
from app.features.documents.models import DocumentFileVersion, UploadStatus
from app.core.exceptions import ConflictError


@dataclass(frozen=True)
class VerifiedExtractionManifest:
    file_version_id: str
    sha256: str
    page_count: int | None
    classification: str
    digest: str


def build_verified_manifest(version: DocumentFileVersion) -> VerifiedExtractionManifest:
    if (
        version.upload_status != UploadStatus.uploaded
        or not version.sha256_hex
        or not version.r2_key
        or version.content_classification.value in {"unknown", "not_applicable"}
    ):
        raise ConflictError(
            "Document file version is not verified and extraction-eligible"
        )
    payload = {
        "file_version_id": str(version.id),
        "sha256": version.sha256_hex,
        "page_count": version.page_count,
        "classification": version.content_classification.value,
    }
    digest = hashlib.sha256(
        json.dumps(payload, sort_keys=True, separators=(",", ":")).encode()
    ).hexdigest()
    return VerifiedExtractionManifest(**payload, digest=digest)
