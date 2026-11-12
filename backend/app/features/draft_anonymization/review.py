"""Local operator review gate. Hash-bound approvals never imply legal verification."""

import hashlib
import json
from datetime import UTC, datetime
from pathlib import Path

from app.features.draft_anonymization.service import obvious_findings


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def prepare_review(job: Path) -> None:
    result = json.loads((job / "result.json").read_text())
    # Never overwrite a human correction.
    with (job / "review.md").open("x", encoding="utf-8") as stream:
        stream.write(result["markdown"])


def approve(
    job: Path, reviewer: str, *, global_consent: bool, privacy_confirmed: bool
) -> str:
    if not reviewer.strip() or not privacy_confirmed:
        raise ValueError("Named reviewer and explicit privacy/meaning review required")
    if json.loads((job / "result.json").read_text()).get("audit_status") == "not_run":
        raise ValueError("Independent audit required before approving offline review")
    content = (job / "review.md").read_bytes()
    text = content.decode("utf-8")
    if len(text.strip()) < 100 or obvious_findings({"review": text}):
        raise ValueError("Review is empty or contains detectable identifiers")
    # A local trusted operator reviews unresolved automated flags manually.
    sha = digest(content)
    record = {
        "reviewer": reviewer,
        "reviewed_at": datetime.now(UTC).isoformat(),
        "sha256": sha,
        "result_sha256": digest((job / "result.json").read_bytes()),
        "global_consent": global_consent,
        "privacy_confirmed": True,
        "legal_authority_verified": False,
    }
    directory = job / "approvals"
    directory.mkdir(exist_ok=True, mode=0o700)
    with (directory / f"{sha}.json").open("x") as stream:
        json.dump(record, stream)
    return sha


def export_review(job: Path) -> Path:
    content = (job / "review.md").read_bytes()
    sha = digest(content)
    approval = json.loads((job / "approvals" / f"{sha}.json").read_text())
    if approval["sha256"] != sha or approval["result_sha256"] != digest(
        (job / "result.json").read_bytes()
    ):
        raise ValueError("Approved input/output changed")
    target = job / "exports" / sha
    target.mkdir(parents=True, mode=0o700)
    (target / "knowledge.md").write_bytes(content)
    (target / "metadata.json").write_text(
        json.dumps(
            {
                "sha256": sha,
                "scope": "global_candidate"
                if approval["global_consent"]
                else "private",
                "kind": "sample_draft",
                "legal_authority_verified": False,
                "automatic_ingestion": False,
            }
        )
    )
    return target
