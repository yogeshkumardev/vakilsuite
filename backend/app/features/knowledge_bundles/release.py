"""Hash-bound local operator release of reviewed S528 template candidates."""

import hashlib
import json
import os
import shutil
import tempfile
from datetime import UTC, datetime
from pathlib import Path

import yaml

from app.features.knowledge_bundles.loader import _load_frontmatter, verify_bundle
from app.features.knowledge_bundles.s528_testing import prepare_test_context


def review_snapshot(batch: Path, sample_id: str) -> dict:
    context = prepare_test_context(batch, sample_id=sample_id)
    files = sorted((batch / sample_id / "okf_candidate").rglob("*.md"))
    paths = files + [batch / sample_id / "okf_candidate/BUNDLE_MANIFEST.json",
                     batch / sample_id / "provenance.json", batch / "rag_candidates.jsonl"]
    hashes = {str(p.relative_to(batch)): hashlib.sha256(p.read_bytes()).hexdigest()
              for p in paths}
    digest = hashlib.sha256(json.dumps(hashes, sort_keys=True).encode()).hexdigest()
    return {"sample_id": sample_id, "review_sha256": digest, "files": hashes,
            "category": context["category"], "legal_authority_verified": False}


def release_template(batch: Path, releases: Path, *, sample_id: str,
                     expected_review_sha256: str, reviewer: str,
                     confirm_review: bool) -> Path:
    if not confirm_review or not reviewer.strip():
        raise ValueError("Named reviewer and confirmation of derived template review required")
    snapshot = review_snapshot(batch, sample_id)
    if snapshot["review_sha256"] != expected_review_sha256:
        raise ValueError("Reviewed candidate changed; review the current revision")
    source = batch / sample_id / "okf_candidate"
    manifest = json.loads((source / "BUNDLE_MANIFEST.json").read_text())
    manifest["version"] = "1.0.0"
    target = releases / f'{manifest["bundle_id"]}-1.0.0'
    releases.mkdir(parents=True, exist_ok=True, mode=0o700)
    # Stage beside, never inside, the configured catalog (catalog enumerates dirs).
    temporary = Path(tempfile.mkdtemp(prefix=".s528-release-", dir=releases.parent))
    try:
        stamp = datetime.now(UTC).isoformat()
        for entry in manifest["entries"]:
            raw = (source / entry["path"]).read_bytes()
            if hashlib.sha256(raw).hexdigest() != entry["sha256"]:
                raise ValueError("Candidate changed during release")
            metadata = _load_frontmatter(raw, path=entry["path"])
            metadata.update(status="stable", verified={"by": reviewer.strip(), "at": stamp})
            body = raw.decode().split("\n---\n", 1)[1]
            content = ("---\n" + yaml.safe_dump(metadata, sort_keys=False)
                       + "---\n" + body).encode()
            path = temporary / entry["path"]
            path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
            path.write_bytes(content)
            path.chmod(0o600)
            entry["sha256"] = hashlib.sha256(content).hexdigest()
        (temporary / "BUNDLE_MANIFEST.json").write_text(json.dumps(manifest, indent=2))
        verify_bundle(temporary)
        if review_snapshot(batch, sample_id) != snapshot:
            raise ValueError("Candidate changed during release")
        record = dict(snapshot, reviewer=reviewer.strip(), reviewed_at=stamp,
                      approved_scope="drafting_guidance", embedding_or_indexing=False)
        (temporary / "APPROVAL.json").write_text(json.dumps(record, indent=2))
        for path in temporary.rglob("*"):
            if path.is_file():
                path.chmod(0o600)
        # Never replace an existing release, including concurrent same-version runs.
        if target.exists():
            raise FileExistsError("Release version already exists")
        os.rename(temporary, target)
        return target
    finally:
        if temporary.exists():
            shutil.rmtree(temporary)
