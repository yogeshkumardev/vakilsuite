"""Deterministic validation for local, immutable OKF input bundles.

The loader never discovers files dynamically and never performs retrieval. A
caller supplies an explicit manifest path; every listed Markdown byte stream is
hashed before it can be selected as context.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any

import yaml

from app.features.knowledge_bundles.contracts import (
    BundleManifest,
    VerifiedBundle,
    VerifiedBundleEntry,
)


class BundleValidationError(ValueError):
    """Raised for unsafe, stale, malformed, or changed local bundle content."""


def _sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def capture_bundle(bundle_root: Path, *, template_entry_id: str) -> dict:
    """Capture exact bounded knowledge bytes; never treat them as case evidence."""
    root = bundle_root.resolve()
    verified = verify_bundle(root)
    if verified.bundle_id.startswith("s01_"):
        raise BundleValidationError("Synthetic bundle cannot supply draft context")
    if not any(e.id == template_entry_id and e.kind == "template" for e in verified.entries):
        raise BundleValidationError("Selected template is missing")
    entries = []
    total = 0
    for entry in verified.entries:
        if entry.kind == "template" and entry.id != template_entry_id:
            continue
        path = (root / entry.path).resolve()
        if root not in path.parents:
            raise BundleValidationError("Unsafe snapshot path")
        with path.open("rb") as stream:
            content = stream.read(256_001)
        total += len(content)
        if len(content) > 256_000 or total > 512_000:
            raise BundleValidationError("Knowledge context exceeds byte budget")
        if _sha256(content) != entry.sha256:
            raise BundleValidationError("Bundle changed during context capture")
        entries.append({"id": entry.id, "kind": entry.kind,
                        "sha256": entry.sha256, "content": content.decode("utf-8")})
    if _sha256((root / "BUNDLE_MANIFEST.json").read_bytes()) != verified.manifest_sha256:
        raise BundleValidationError("Manifest changed during context capture")
    return {"format": "vakilsuite-knowledge-snapshot/v1",
            "bundle_id": verified.bundle_id, "bundle_version": verified.version,
            "manifest_sha256": verified.manifest_sha256,
            "template_entry_id": template_entry_id, "entries": entries,
            "authority": "drafting_guidance_only", "case_evidence": False}


def _load_frontmatter(content: bytes, *, path: str) -> dict[str, Any]:
    try:
        text = content.decode("utf-8")
    except UnicodeDecodeError as exc:
        raise BundleValidationError(f"{path}: must be UTF-8") from exc
    if not text.startswith("---\n"):
        raise BundleValidationError(f"{path}: missing YAML frontmatter")
    end = text.find("\n---\n", 4)
    if end == -1:
        raise BundleValidationError(f"{path}: frontmatter is not closed")
    try:
        metadata = yaml.safe_load(text[4:end])
    except yaml.YAMLError as exc:
        raise BundleValidationError(f"{path}: invalid YAML frontmatter") from exc
    if not isinstance(metadata, dict):
        raise BundleValidationError(f"{path}: frontmatter must be an object")
    if not isinstance(metadata.get("type"), str) or not metadata["type"].strip():
        raise BundleValidationError(f"{path}: frontmatter requires a non-empty type")
    return metadata


def verify_bundle(bundle_root: Path) -> VerifiedBundle:
    """Verify an explicit bundle manifest and every listed Markdown artifact."""
    bundle_root = bundle_root.resolve()
    manifest_path = bundle_root / "BUNDLE_MANIFEST.json"
    if not manifest_path.is_file():
        raise BundleValidationError("BUNDLE_MANIFEST.json is required")
    with manifest_path.open("rb") as stream:
        raw_manifest = stream.read(128_001)
    if len(raw_manifest) > 128_000:
        raise BundleValidationError("Bundle manifest exceeds byte limit")
    try:
        manifest = BundleManifest.model_validate(json.loads(raw_manifest))
    except (json.JSONDecodeError, ValueError) as exc:
        raise BundleValidationError("invalid bundle manifest") from exc

    verified_entries: list[VerifiedBundleEntry] = []
    total_bytes = 0
    for entry in manifest.entries:
        file_path = (bundle_root / entry.path).resolve()
        if bundle_root not in file_path.parents or not file_path.is_file():
            raise BundleValidationError(f"{entry.id}: manifest path does not exist safely")
        with file_path.open("rb") as stream:
            content = stream.read(256_001)
        total_bytes += len(content)
        if len(content) > 256_000 or total_bytes > 2_000_000:
            raise BundleValidationError("Bundle content exceeds byte limit")
        actual_hash = _sha256(content)
        if actual_hash != entry.sha256:
            raise BundleValidationError(f"{entry.id}: SHA-256 mismatch")
        frontmatter = _load_frontmatter(content, path=entry.path)
        if frontmatter.get("id") != entry.id:
            raise BundleValidationError(f"{entry.id}: frontmatter id must match manifest")
        if frontmatter.get("status") != "stable":
            raise BundleValidationError(f"{entry.id}: only stable entries can be selected")
        verified_entries.append(
            VerifiedBundleEntry(
                id=entry.id,
                path=entry.path,
                kind=entry.kind,
                sha256=actual_hash,
                frontmatter=frontmatter,
            )
        )
    return VerifiedBundle(
        bundle_id=manifest.bundle_id,
        version=manifest.version,
        manifest_sha256=_sha256(raw_manifest),
        okf_spec_version=manifest.okf_spec_version,
        okf_spec_commit=manifest.okf_spec_commit,
        entries=tuple(verified_entries),
    )
