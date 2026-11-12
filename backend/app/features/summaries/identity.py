"""Canonical hashes for tenant/case-scoped summary caching."""

from __future__ import annotations

import hashlib
import json
import uuid


def summary_cache_key(
    *,
    chamber_id: uuid.UUID,
    case_id: uuid.UUID,
    source_manifest_hash: str,
    prompt_version: str,
    policy_version: int,
    schema_version: str | None = None,
    output_language: str | None = None,
) -> str:
    payload = {
        "chamber_id": str(chamber_id),
        "case_id": str(case_id),
        "source_manifest_hash": source_manifest_hash,
        "prompt_version": prompt_version,
        "policy_version": policy_version,
    }
    if schema_version is not None:
        payload.update(schema_version=schema_version, output_language=output_language)
    return hashlib.sha256(
        json.dumps(payload, sort_keys=True, separators=(",", ":")).encode()
    ).hexdigest()
