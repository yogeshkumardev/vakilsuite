"""Local private artifact CLI. No automatic knowledge publication."""

import argparse
import hashlib
import json
import os
from pathlib import Path
import sys
from decimal import Decimal
from pydantic import ValidationError

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.features.draft_anonymization.service import anonymize, extract_docx  # noqa: E402


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "command", choices=["inspect", "anonymize", "review", "approve", "export"]
    )
    parser.add_argument("input", type=Path)
    parser.add_argument("--owner-scope", required=True)
    parser.add_argument("--allow-gemini", action="store_true")
    parser.add_argument("--provider", choices=["gemini", "deepseek"], default="gemini")
    parser.add_argument("--allow-deepseek", action="store_true")
    parser.add_argument("--deepseek-model", default=None)
    parser.add_argument("--reviewer")
    parser.add_argument("--confirm-privacy-and-meaning", action="store_true")
    parser.add_argument("--global-consent", action="store_true")
    parser.add_argument(
        "--attempt-label",
        default="",
        help="Explicit new attempt; preserves previous job records",
    )
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1] / "private_drafts"
    source = args.input.resolve()
    if args.command in {"review", "approve", "export"}:
        from app.features.draft_anonymization.review import (
            prepare_review,
            approve,
            export_review,
        )

        if source.parent != (root / "runs").resolve() or not source.is_dir():
            parser.error("Select a private_drafts/runs/<job-id> directory")
        if args.command == "review":
            prepare_review(source)
        elif args.command == "approve":
            approve(
                source,
                args.reviewer or "",
                global_consent=args.global_consent,
                privacy_confirmed=args.confirm_privacy_and_meaning,
            )
        else:
            export_review(source)
        print(json.dumps({"status": args.command + "_completed"}))
        return
    if (
        not source.is_relative_to((root / "input").resolve())
        or source.suffix.lower() != ".docx"
    ):
        parser.error("Select one DOCX within private_drafts/input")
    data = source.read_bytes()
    if args.command == "inspect":
        blocks = extract_docx(data)
        print(
            json.dumps(
                {"blocks": len(blocks), "characters": sum(map(len, blocks.values()))}
            )
        )
        return
    if not (args.allow_gemini if args.provider == "gemini" else args.allow_deepseek):
        parser.error(
            f"anonymize requires explicit --allow-{args.provider} (maximum two calls)"
        )
    job = hashlib.sha256(
        args.owner_scope.encode()
        + data
        + (
            args.attempt_label
            if args.provider == "gemini"
            else "deepseek:" + args.attempt_label
        ).encode()
    ).hexdigest()
    target = root / "runs" / job
    target.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    # Exclusive creation also prevents duplicate dispatch after an unknown outcome.
    target.mkdir(mode=0o700)
    (target / "status.json").write_text(
        json.dumps({"status": "dispatch_started", "version": "v1"})
    )
    detector = None
    budget = None
    try:
        from app.integrations.ai.draft_anonymizer import GeminiDraftDetector
        from app.core.config import settings
        from app.features.draft_anonymization.costs import DraftBudget, USD_SCALE

        # Content-based scope survives renamed files and fresh attempt labels.
        scope = hashlib.sha256(args.owner_scope.encode() + b"\0" + data).hexdigest()
        pricing = (
            {}
            if args.provider == "gemini"
            else {
                "input_rate": 300,
                "output_rate": 1200,
                "pricing_version": "deepseek-flash-peak-cache-miss-2026-11-01",
            }
        )
        budget = DraftBudget(
            root / "costs" / "ledger.sqlite3",
            scope,
            int(Decimal(str(settings.DRAFT_ANONYMIZATION_BUDGET_USD)) * USD_SCALE),
            **pricing,
        )

        def progress(detail):
            state = {"status": "dispatch_started", **detail}
            temporary = target / "status.tmp"
            temporary.write_text(json.dumps(state), encoding="utf-8")
            os.replace(temporary, target / "status.json")
            print(json.dumps(state), flush=True)

        def checkpoint_response(detail):
            # Provider output may contain PII. Keep it inside the private job
            # directory for local diagnosis, never in terminal/error messages.
            path = target / f"provider-response-{detail['call']}.json"
            descriptor = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
            with os.fdopen(descriptor, "w", encoding="utf-8") as stream:
                json.dump(detail, stream, ensure_ascii=False)

        if args.provider == "deepseek":
            from app.integrations.ai.deepseek_draft_anonymizer import (
                DeepSeekDraftDetector,
            )

            detector = DeepSeekDraftDetector(
                budget=budget,
                model=args.deepseek_model or settings.DEEPSEEK_MODEL,
                on_progress=progress,
                on_response=checkpoint_response,
            )
        else:
            detector = GeminiDraftDetector(
                budget=budget, on_progress=progress, on_response=checkpoint_response
            )
        result = anonymize(data, detector)
        result["provider_attempts"] = detector.attempts
        result["cost_summary"] = budget.summary()
        temporary = target / "result.tmp"
        temporary.write_text(json.dumps(result, ensure_ascii=False), encoding="utf-8")
        os.replace(temporary, target / "result.json")
        (target / "status.json").write_text(
            json.dumps(
                {
                    "status": result["status"],
                    "calls_started": detector.calls,
                    "quarantine_reasons": result["quarantine_reasons"],
                    "cost_summary": budget.summary(),
                }
            )
        )
        print(
            json.dumps(
                {
                    "job_id": job,
                    "status": result["status"],
                    "publication_allowed": False,
                    "calls_started": detector.calls,
                    "finding_count": result["finding_count"],
                    "audit_findings": result["audit_findings"],
                    "quarantine_reasons": result["quarantine_reasons"],
                }
            ),
            flush=True,
        )
    except Exception as exc:
        safe_codes = {
            "INVALID_SOURCE_SPAN",
            "AMBIGUOUS_SOURCE_SPAN",
            "OVERLAPPING_SOURCE_SPANS",
            "INCOMPLETE_PROVIDER_OUTPUT",
            "GEMINI_CONFIGURATION_REQUIRED",
            "DEEPSEEK_CONFIGURATION_REQUIRED",
            "MODEL_NOT_ALLOWED",
            "CALL_LIMIT",
            "DRAFT_BUDGET_EXCEEDED",
            "DRAFT_BUDGET_RECONCILIATION_REQUIRED",
            "ANONYMIZATION_PRICING_UNSUPPORTED",
            "ANONYMIZATION_PRICING_EXPIRED",
        }
        detail = {
            "status": "failed_or_outcome_unknown",
            "automatic_retry": False,
            "exception_type": type(exc).__name__,
            "calls_started": detector.calls if detector else 0,
        }
        if type(exc) is ValueError and str(exc) in safe_codes:
            detail["error_code"] = str(exc)
        if isinstance(exc, ValidationError):
            detail["validation_error_types"] = sorted(
                {
                    item["type"]
                    for item in exc.errors(
                        include_input=False, include_context=False, include_url=False
                    )
                }
            )
        http_code = getattr(exc, "status_code", None) or getattr(exc, "code", None)
        if isinstance(http_code, int):
            detail["http_status"] = http_code
        (target / "status.json").write_text(json.dumps(detail))
        print(
            json.dumps(detail),
            file=sys.stderr,
        )
        raise SystemExit(1) from None
    finally:
        if budget:
            accounting = {
                "cost_summary": budget.summary(),
                "provider_attempts": detector.attempts if detector else [],
            }
            (target / "costs.json").write_text(json.dumps(accounting), encoding="utf-8")
            print(json.dumps(accounting), flush=True)
        if detector:
            detector.close()


if __name__ == "__main__":
    main()
