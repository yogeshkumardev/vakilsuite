"""Publish a failed job's existing Sarvam result without another paid submission.

Usage: uv run python -m scripts.recover_sarvam_typing --job-id UUID
The original source, policy, permissions and editor revision must still match.
"""

import argparse
import asyncio
import uuid
from datetime import UTC, datetime, timedelta

import app.db.registry  # noqa: F401
from app.core.exceptions import ConflictError
from app.features.documents.source_models import DocumentTypingAttempt
from app.features.documents.source_ocr import JOB_TYPE, OcrPageRequest, SourceOcrService
from app.features.jobs.models import Job, JobStatus
from app.features.users.models import User
from app.integrations.document_typing.sarvam import SarvamParseClient
from app.worker.database import worker_session


async def recover(job_id: uuid.UUID) -> str:
    async with worker_session() as db:
        job = await db.get(Job, job_id)
        if job is None or job.job_type != JOB_TYPE:
            raise ConflictError("Typing job not found")
        if job.status == JobStatus.succeeded:
            return "already_succeeded"
        if job.status != JobStatus.failed:
            raise ConflictError("Only a failed typing job can be recovered")
        provider_job = job.payload.get("provider_job", {})
        quote = job.payload.get("quote", {})
        remote_id = provider_job.get("job_id")
        if (
            provider_job.get("provider") != "sarvam"
            or quote.get("provider") != "sarvam"
            or not isinstance(remote_id, str)
            or not remote_id
        ):
            raise ConflictError("An existing Sarvam job is required")
        original_attempt = job.attempt_count
        service = SourceOcrService(db)
        user = await db.get(User, job.owner_id)
        body = OcrPageRequest.model_validate(job.payload["request"])
        # Validate current source/editor/policy before fetching any output.
        await service.prepare(uuid.UUID(job.payload["document_id"]), user, body, stored_quote=quote)
        await db.rollback()
        typed = await asyncio.to_thread(SarvamParseClient().results, remote_id)
        job = await db.get(Job, job_id, with_for_update=True, populate_existing=True)
        if (
            job.status != JobStatus.failed
            or job.attempt_count != original_attempt
            or job.payload.get("quote") != quote
            or job.payload.get("provider_job", {}).get("job_id") != remote_id
        ):
            raise ConflictError("Typing state changed during recovery")
        now = datetime.now(UTC).replace(tzinfo=None)
        history = list(job.payload.get("recovery_history", []))[-9:]
        history.append({"reason": "recover_completed_sarvam_result", "at": now.isoformat(), "previous_error": job.error_message})
        job.payload = {
            **job.payload,
            "recovery_history": history,
            "response": {
                "provider": "sarvam",
                "request_id": typed.request_id,
                "document": {"pages": [{"page_number": p.page_number, "text": p.text} for p in typed.pages]},
            },
        }
        job.result_summary = {"provider": "sarvam", "provider_job_id": remote_id, "usage": typed.usage or {}}
        job.status = JobStatus.running
        job.error_message = None
        job.completed_at = None
        job.leased_until = now + timedelta(minutes=5)
        await db.commit()
        # Execute the standard publication checks with a durable response.
        # This path cannot submit Parse, count Gemini tokens or invoke Gemini.
        result = await service.execute(job_id)
        if result.failure_code:
            return result.failure_code
        await db.refresh(job)
        if job.status != JobStatus.succeeded:
            raise ConflictError("Recovery did not publish a result")
        attempt_id = job.payload.get("typing_attempt_id")
        if attempt_id:
            attempt = await db.get(DocumentTypingAttempt, uuid.UUID(attempt_id))
            if attempt is not None:
                attempt.status = "succeeded"
                attempt.error_code = None
                attempt.outcome_unknown = False
                attempt.next_poll_at = None
                attempt.reported_usage = typed.usage or {}
        await db.commit()
        return "succeeded"


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--job-id", type=uuid.UUID, required=True)
    args = parser.parse_args()
    try:
        outcome = asyncio.run(recover(args.job_id))
    except Exception as exc:
        # Exceptions can contain storage URLs or content; print only the type.
        print(f"Recovery stopped: {type(exc).__name__}")
        raise SystemExit(1) from None
    print(f"Typing recovery: {outcome}")
    raise SystemExit(0 if outcome in {"succeeded", "already_succeeded"} else 1)
