"""Offline S528 candidate acceptance; never promotes material to production."""

import hashlib
import json
from pathlib import Path

from app.features.knowledge_bundles.contracts import BundleManifest
from app.features.knowledge_bundles.loader import _load_frontmatter


def prepare_test_context(root: Path, *, sample_id: str) -> dict:
    """Select explicit drafting guidance, with no source facts or mock embeddings.

    Trusted local operator only. This is not a tenant-facing retrieval endpoint.
    Approval, case evidence and verified authorities belong to existing workflows.
    """
    if sample_id not in {"S528_01", "S528_02", "S528_03"}:
        raise ValueError("Only the three S528 test variants are supported")
    root = root.resolve()
    bundle = root / sample_id / "okf_candidate"
    manifest = BundleManifest.model_validate_json(
        (bundle / "BUNDLE_MANIFEST.json").read_bytes()
    )
    if manifest.bundle_id != f"s528_curated_{sample_id[-2:]}":
        raise ValueError("Wrong category or sample bundle")
    guidance = []
    for entry in manifest.entries:
        path = (bundle / entry.path).resolve()
        if bundle.resolve() not in path.parents:
            raise ValueError("Unsafe entry path")
        data = path.read_bytes()
        if hashlib.sha256(data).hexdigest() != entry.sha256:
            raise ValueError("Candidate changed: hash mismatch")
        metadata = _load_frontmatter(data, path=entry.path)
        if metadata.get("id") != entry.id or metadata.get("status") != "draft":
            raise ValueError("Expected an unpromoted candidate with matching ID")
        guidance.append({"entry_id": entry.id, "kind": entry.kind,
                         "sha256": entry.sha256, "text": data.decode()})
    provenance = json.loads((root / sample_id / "provenance.json").read_bytes())
    chunks = []
    seen = set()
    for line in (root / "rag_candidates.jsonl").read_text().splitlines():
        item = json.loads(line)
        if item["sample_id"] != sample_id:
            continue
        if item["id"] in seen:
            raise ValueError("Duplicate chunk")
        seen.add(item["id"])
        if any(item.get(key) is not False for key in
               ("approved", "indexable", "authority", "case_evidence")):
            raise ValueError("Candidate authority boundary changed")
        if item["source_docx_sha256"] != provenance["input_docx_sha256"]:
            raise ValueError("Chunk source mismatch")
        if item["source_info_sha256"] != provenance["input_info_sha256"]:
            raise ValueError("Chunk review source mismatch")
        if hashlib.sha256(item["text"].encode()).hexdigest() != item["sha256"]:
            raise ValueError("Chunk hash mismatch")
        expected = next((g for g, e in zip(guidance, manifest.entries)
                         if item["derived_path"] == f"{sample_id}/okf_candidate/{e.path}"), None)
        if expected is None or expected["text"].split("\n---\n", 1)[1].strip() != item["text"].strip():
            raise ValueError("Chunk does not match curated bundle content")
        chunks.append(item["id"])
    if len(chunks) != len(guidance):
        raise ValueError("Incomplete curated chunk projection")
    return {"category": "BNSS_528", "sample_id": sample_id,
            "testing_only": True, "production_eligible": False,
            "selection": "explicit_full_context", "embedding_calls": 0,
            "guidance": guidance, "candidate_chunk_ids": chunks,
            "case_facts": [], "verified_authorities": [],
            "required_before_generation": ["approved current-case facts",
                                           "reviewed template revision",
                                           "verified authorities if cited"]}
