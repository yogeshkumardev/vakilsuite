"""One paid submission per owner/context; durable checkpoint before atomic publication."""

import asyncio
import hashlib
import json
import logging
import math
import uuid
from datetime import UTC, date, datetime

from pydantic import Field
from sqlalchemy import select

from app.core.config import settings
from app.core.exceptions import AppError, ConflictError, NotFoundError, ValidationError
from app.features.chambers.provider_policy_service import (
    get_policy_output,
    resolve_authorized_task_policy,
)
from app.features.jobs.models import Job, JobStatus
from app.features.jobs.service import get_or_create_job
from app.features.revisions.lexical import validate_editor_document
from app.features.revisions.models import WorkingDocument
from app.features.revisions.service import WorkingDocumentService
from app.features.users.models import User
from app.integrations.ai.s528_draft import generate
from .draft_contract import (
    DraftOutput,
    PROMPT_VERSION,
    SYSTEM,
    contents,
    editor_from_output,
)
from .preflight import DraftPreflightRequest, check_draft_inputs
from .snapshots import OkfContextService

JOB_TYPE = "s528_draft_generation"
logger = logging.getLogger(__name__)


class DraftGenerationRequest(DraftPreflightRequest):
    requested_relief: str = Field(min_length=10, max_length=4000)


class SubmitDraftRequest(DraftGenerationRequest):
    expected_quote_hash: str = Field(pattern=r"^[a-f0-9]{64}$")


def fingerprint(value):
    return hashlib.sha256(
        json.dumps(
            value, sort_keys=True, separators=(",", ":"), ensure_ascii=False
        ).encode()
    ).hexdigest()


def reserve_paise(input_bound, output_bound):
    return math.ceil(
        (
            input_bound * settings.DRAFT_INPUT_PAISE_PER_MILLION
            + output_bound * settings.DRAFT_OUTPUT_PAISE_PER_MILLION
        )
        / 1_000_000
    )


class DraftGenerationService:
    def __init__(self, db):
        self.db = db
        self.contexts = OkfContextService(db)

    async def prepare(self, *, case_id, snapshot_id, user, body):
        case = await self.contexts.preparation._require_editable_case(case_id, user)
        context = await self.contexts.read(
            case_id=case_id, snapshot_id=snapshot_id, user=user
        )
        checked = check_draft_inputs(context.payload, context.manifest_sha256, body)
        if not checked.reference_coverage_complete:
            raise ValidationError(
                "Select supporting facts for every required field before generation"
            )
        policy = await get_policy_output(self.db, chamber_id=case.chamber_id)
        if not policy.capabilities.generation:
            raise ValidationError("Draft generation is disabled by the chamber policy")
        task = None
        for data_class in ("document_text", "approved_knowledge", "case_metadata"):
            task = await resolve_authorized_task_policy(
                self.db,
                chamber_id=case.chamber_id,
                operation="draft",
                data_class=data_class,
                collection_id=None,
            )
        route = task.providers[0]
        if route.provider.value != "gemini":
            raise ValidationError(
                "This pilot requires Gemini as the first authorized draft provider"
            )
        if route.model not in (
            settings.GEMINI_ALLOWED_MODELS or [settings.GEMINI_MODEL]
        ):
            raise ValidationError("The draft model is not allowlisted")
        if not settings.GEMINI_API_KEY:
            raise ValidationError("Gemini key is not configured on the backend")
        if (
            task.permitted_languages
            and "en-in" not in task.permitted_languages
            and "en" not in task.permitted_languages
        ):
            raise ValidationError("The draft policy does not permit English")
        try:
            pricing_current = date.today() <= date.fromisoformat(
                settings.DRAFT_PRICING_VALID_UNTIL
            )
        except ValueError:
            pricing_current = False
        if (
            not pricing_current
            or settings.DRAFT_PRICING_MODEL != route.model
            or min(
                settings.DRAFT_INPUT_PAISE_PER_MILLION,
                settings.DRAFT_OUTPUT_PAISE_PER_MILLION,
            )
            <= 0
        ):
            raise ValidationError(
                "Configure a current model-matched draft pricing estimate before paid generation"
            )
        prompt = contents(
            context.payload,
            body.model_dump(mode="json")["fact_bindings"],
            body.requested_relief,
        )
        input_bytes = len(prompt.encode())
        if input_bytes > task.max_input_bytes:
            raise ValidationError(
                "Complete context exceeds the policy input limit; nothing was truncated"
            )
        output_limit = min(task.max_output_tokens, 8192)
        # Byte-based upper estimate including schema/system framing, not a billing guarantee.
        input_bound = (
            input_bytes
            + len(SYSTEM.encode())
            + len(json.dumps(DraftOutput.model_json_schema()).encode())
            + 4096
        )
        reserved = reserve_paise(input_bound, output_limit)
        if reserved > task.run_budget_paise:
            raise ValidationError(
                "Estimated reservation exceeds the chamber draft budget"
            )
        quote = dict(
            provider="gemini",
            model=route.model,
            policy_version=policy.version,
            context_hash=context.manifest_sha256,
            prompt_version=PROMPT_VERSION,
            request_hash=fingerprint(
                body.model_dump(mode="json", exclude={"expected_quote_hash"})
            ),
            estimated_reservation_paise=reserved,
            max_output_tokens=output_limit,
            deadline_seconds=task.deadline_seconds,
            input_bound=input_bound,
            pricing_model=settings.DRAFT_PRICING_MODEL,
            input_rate=settings.DRAFT_INPUT_PAISE_PER_MILLION,
            output_rate=settings.DRAFT_OUTPUT_PAISE_PER_MILLION,
            pricing_valid_until=settings.DRAFT_PRICING_VALID_UNTIL,
        )
        return case, context, prompt, quote

    async def submit(self, *, case_id, snapshot_id, user, body):
        case, _, _, quote = await self.prepare(
            case_id=case_id, snapshot_id=snapshot_id, user=user, body=body
        )
        if fingerprint(quote) != body.expected_quote_hash:
            raise ConflictError(
                "Generation estimate or inputs changed; review a fresh estimate"
            )
        request = body.model_dump(mode="json", exclude={"expected_quote_hash"})
        job, created = await get_or_create_job(
            self.db,
            owner_id=user.id,
            chamber_id=case.chamber_id,
            case_id=case.id,
            job_type=JOB_TYPE,
            idempotency_key=f"context:{snapshot_id}",
            payload={
                "snapshot_id": str(snapshot_id),
                "request": request,
                "quote": quote,
                "phase": "queued",
            },
        )
        if not created and job.status == JobStatus.failed:
            job.status = JobStatus.queued
            job.error_message = None
            job.started_at = None
            job.completed_at = None
            job.attempt_count = 0
            job.payload = {
                "snapshot_id": str(snapshot_id),
                "request": request,
                "quote": quote,
                "phase": "queued",
            }
            job.result_summary = {
                "phase": "queued",
            }
            job.leased_until = None
        elif not created and (
            job.payload.get("request") != request or job.payload.get("quote") != quote
        ):
            raise ConflictError(
                "This context already has a generation attempt. Reuse its status; no automatic regeneration"
            )
        job.max_attempts = 1
        await self.db.commit()
        await self.db.refresh(job)

        if job.status == JobStatus.queued:
            try:
                from app.worker.tasks.s528_draft import generate_draft

                generate_draft.delay(str(job.id))
            except Exception as exc:
                logger.warning(
                    "Direct worker dispatch deferred (durable recovery will deliver): %s",
                    exc,
                )

        return job

    async def get(self, *, case_id, job_id, user):
        await self.contexts.preparation._require_editable_case(case_id, user)
        job = await self.db.scalar(
            select(Job).where(
                Job.id == job_id,
                Job.case_id == case_id,
                Job.owner_id == user.id,
                Job.job_type == JOB_TYPE,
            )
        )
        if job is None:
            raise NotFoundError("Draft generation not found")
        return job

    async def current(self, *, case_id, snapshot_id, user):
        await self.contexts.preparation._require_editable_case(case_id, user)
        return await self.db.scalar(
            select(Job).where(
                Job.case_id == case_id,
                Job.owner_id == user.id,
                Job.job_type == JOB_TYPE,
                Job.idempotency_key == f"context:{snapshot_id}",
            )
        )

    async def execute(self, job_id):
        job = await self.db.scalar(
            select(Job)
            .where(Job.id == job_id, Job.job_type == JOB_TYPE)
            .with_for_update()
        )
        if job is None or job.status in (
            JobStatus.succeeded,
            JobStatus.failed,
            JobStatus.cancelled,
        ):
            return
        # A running dispatch without a response checkpoint is never resubmitted.
        if job.status == JobStatus.running and "response" not in job.payload:
            return
        try:
            user = await self.db.get(User, job.owner_id)
            if user is None:
                raise NotFoundError("User unavailable")
            body = DraftGenerationRequest.model_validate(job.payload["request"])
            _, context, prompt, quote = await self.prepare(
                case_id=job.case_id,
                snapshot_id=uuid.UUID(job.payload["snapshot_id"]),
                user=user,
                body=body,
            )
            if quote != job.payload["quote"]:
                raise ConflictError("Context or provider policy changed")
        except AppError, ValueError:
            await self.fail(job, "SOURCE_OR_POLICY_CHANGED")
            return
        if "response" not in job.payload:
            job.status = JobStatus.running
            job.attempt_count = 1
            job.started_at = datetime.now(UTC).replace(tzinfo=None)
            job.payload = {**job.payload, "phase": "dispatched"}
            job.result_summary = {
                "phase": "dispatched",
                "reserved_paise": quote["estimated_reservation_paise"],
            }
            await self.db.commit()
            try:
                response = await asyncio.to_thread(
                    generate,
                    model=quote["model"],
                    prompt=prompt,
                    max_output_tokens=quote["max_output_tokens"],
                    deadline_seconds=quote["deadline_seconds"],
                )
            except Exception as exc:
                logger.exception("Provider generate call failed for job %s: %s", job_id, exc)
                job = await self.db.get(Job, job_id, with_for_update=True)
                await self.fail(job, "PROVIDER_OUTCOME_UNKNOWN_NO_RETRY")
                return
            job = await self.db.get(Job, job_id, with_for_update=True)
            if job.status != JobStatus.running:
                return
            job.payload = {
                **job.payload,
                "response": response,
                "phase": "response_received",
            }
            job.result_summary = {
                "phase": "response_received",
                "reserved_paise": quote["estimated_reservation_paise"],
                "provider_request_id": response["request_id"],
                "input_tokens": response["input_tokens"],
                "output_tokens": response["output_tokens"],
                "thinking_tokens": response["thinking_tokens"],
                "estimated_usage_cost_paise": math.ceil(
                    (
                        (response["input_tokens"] or 0) * quote["input_rate"]
                        + (
                            (response["output_tokens"] or 0)
                            + (response["thinking_tokens"] or 0)
                        )
                        * quote["output_rate"]
                    )
                    / 1_000_000
                )
                if response["input_tokens"] is not None
                and response["output_tokens"] is not None
                else None,
            }
            await self.db.commit()
        # Re-lock after checkpoint. Duplicate deliveries can publish at most once.
        job = await self.db.scalar(
            select(Job)
            .where(Job.id == job_id)
            .with_for_update()
            .execution_options(populate_existing=True)
        )
        if job.status != JobStatus.running:
            return
        try:
            _, context, _, fresh_quote = await self.prepare(
                case_id=job.case_id,
                snapshot_id=uuid.UUID(job.payload["snapshot_id"]),
                user=user,
                body=body,
            )
            if fresh_quote != quote:
                raise ConflictError("Dependencies changed")
            response = job.payload["response"]
            if response["finish"] != "STOP":
                raise ValueError("INCOMPLETE_PROVIDER_OUTPUT")
            output = DraftOutput.model_validate_json(response["text"])
            editor = editor_from_output(output, context.payload)
        except (AppError, ValueError) as exc:
            logger.exception("Failed validating or building working document for job %s: %s", job_id, exc)
            await self.fail(job, "STALE_OR_INVALID_PROVIDER_OUTPUT")
            return
        document = WorkingDocument(
            case_id=job.case_id,
            chamber_id=job.chamber_id,
            created_by_user_id=job.owner_id,
            title="S528 — AI working draft (review required)",
            document_kind="ai_draft_unreviewed",
        )
        self.db.add(document)
        await self.db.flush()
        revision = WorkingDocumentService._new_revision(
            document,
            revision_number=1,
            parent_revision_id=None,
            client_mutation_id=None,
            validated=validate_editor_document(editor),
            user_id=job.owner_id,
        )
        self.db.add(revision)
        await self.db.flush()
        job.status = JobStatus.succeeded
        job.completed_at = datetime.now(UTC).replace(tzinfo=None)
        job.result_summary = {
            **(job.result_summary or {}),
            "phase": "review_required",
            "working_document_id": str(document.id),
            "revision_id": str(revision.id),
            "context_sha256": context.manifest_sha256,
            "missing_fact_count": len(output.missing_facts),
            "validation": "source_ids_only_advocate_semantic_review_required",
        }
        await self.db.commit()

    async def fail(self, job, code):
        job.status = JobStatus.failed
        job.error_message = code
        job.completed_at = datetime.now(UTC).replace(tzinfo=None)
        await self.db.commit()
