"""Reuse a complete compact detection checkpoint; never call a provider."""

import argparse
import hashlib
import json
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.features.draft_anonymization.offline_review import build_review, write_review  # noqa: E402


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", type=Path)
    parser.add_argument("--owner-scope", required=True)
    parser.add_argument("--source-attempt-label", required=True)
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1] / "private_drafts"
    source = args.input.resolve()
    if (
        not source.is_relative_to((root / "input").resolve())
        or source.suffix.lower() != ".docx"
    ):
        parser.error("Select a DOCX inside private_drafts/input")
    data = source.read_bytes()
    # Existing job convention binds this source byte-for-byte, owner and attempt.
    job = hashlib.sha256(
        args.owner_scope.encode() + data + args.source_attempt_label.encode()
    ).hexdigest()
    checkpoint = root / "runs" / job / "provider-response-1.json"
    raw = checkpoint.read_bytes()
    result = build_review(data, json.loads(raw))
    target = checkpoint.parent / "offline-review-v1"
    write_review(
        target,
        result,
        {
            "source_job": job,
            "checkpoint_sha256": hashlib.sha256(raw).hexdigest(),
            "network_calls": 0,
        },
    )
    print(
        json.dumps(
            {
                "folder": str(target),
                "status": result["status"],
                "audit_status": result["audit_status"],
                "unresolved_findings": len(result["unresolved"]),
                "network_calls": 0,
            }
        )
    )


if __name__ == "__main__":
    main()
