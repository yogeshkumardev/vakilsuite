from __future__ import annotations

import json
import shutil
from pathlib import Path

import pytest

from app.features.knowledge_bundles.loader import BundleValidationError, verify_bundle


ROOT = Path(__file__).resolve().parents[2]
BUNDLE = ROOT / "okf_bundles" / "s01_synthetic_legal"


def test_synthetic_okf_bundle_is_hash_verified_and_complete() -> None:
    bundle = verify_bundle(BUNDLE)

    assert bundle.bundle_id == "s01_synthetic_legal"
    assert bundle.okf_spec_version == "0.2"
    assert {entry.kind for entry in bundle.entries} == {"source", "template", "annexure"}
    assert all(entry.frontmatter["status"] == "stable" for entry in bundle.entries)


def test_changed_content_is_rejected(tmp_path: Path) -> None:
    copied = tmp_path / "bundle"
    shutil.copytree(BUNDLE, copied)
    facts = copied / "sources" / "approved-facts.md"
    facts.write_text(facts.read_text() + "\nchanged", encoding="utf-8")

    with pytest.raises(BundleValidationError, match="SHA-256 mismatch"):
        verify_bundle(copied)


def test_manifest_path_traversal_is_rejected(tmp_path: Path) -> None:
    copied = tmp_path / "bundle"
    shutil.copytree(BUNDLE, copied)
    manifest_path = copied / "BUNDLE_MANIFEST.json"
    manifest = json.loads(manifest_path.read_text())
    manifest["entries"][0]["path"] = "../outside.md"
    manifest_path.write_text(json.dumps(manifest), encoding="utf-8")

    with pytest.raises(BundleValidationError, match="invalid bundle manifest"):
        verify_bundle(copied)
