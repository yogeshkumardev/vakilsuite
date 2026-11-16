"""Explicit, policy-gated Gemini generation for editable court-draft prose."""

from __future__ import annotations

import hashlib
import json
import uuid
from datetime import UTC, datetime

from sqlalchemy.orm import sessionmaker

from app.core.config import settings
from app.features.drafts.compliance import validate_court_draft_docx
from app.features.drafts.affidavit import bind_affidavit_paragraphs, cited_affidavit_findings, source_revision_hashes
from app.features.drafts.models import CourtDraft
from app.features.drafts.rendering import render_court_draft_docx
from app.features.jobs.models import Job, JobStatus
from app.features.summaries.models import SummaryRun, SummaryRunStatus
from app.features.summaries.review_editing import effective_hash, effective_payload
from app.integrations.ai.contracts import ProviderError
from app.integrations.ai.gemini import GeminiAdapter
from app.worker.celery_app import celery_app
from app.worker.database import create_worker_sync_engine


JOB_TYPE = "court_draft_generation"
_url = settings.DATABASE_URL.replace("postgresql+asyncpg://", "postgresql+psycopg2://")
_engine = create_worker_sync_engine(_url, pool_pre_ping=True)
Session = sessionmaker(bind=_engine)


def _now():
    return datetime.now(UTC).replace(tzinfo=None)


@celery_app.task(bind=True, name="app.worker.tasks.court_draft_generation.generate_court_draft", acks_late=True, max_retries=0)
def generate_court_draft(self, job_id: str) -> dict[str, str]:
    """Never retry automatically: a timeout has an unknown paid-provider outcome."""
    with Session.begin() as db:
        job = db.get(Job, uuid.UUID(job_id), with_for_update=True)
        if not job or job.job_type != JOB_TYPE or job.status != JobStatus.queued:
            return {"status": "ignored"}
        job.status, job.started_at, job.attempt_count = JobStatus.running, _now(), job.attempt_count + 1
        draft = db.get(CourtDraft, uuid.UUID(job.payload["draft_id"]), with_for_update=True)
        summary = db.get(SummaryRun, uuid.UUID(job.payload["summary_run_id"]))
        if not draft or not summary or draft.status == "stale" or summary.status != SummaryRunStatus.completed or effective_hash(summary) != draft.source_summary_hash:
            job.status, job.error_message, job.completed_at = JobStatus.failed, "Draft source summary is no longer current", _now()
            return {"status": "stale"}
        if draft.content_hash != job.payload.get("draft_content_hash"):
            job.status, job.error_message, job.completed_at = JobStatus.failed, "Draft changed before generation began", _now()
            return {"status": "conflict"}
        if not any(
            paragraph.get("affidavit_narrative")
            for component in draft.content.get("components", [])
            for paragraph in component.get("paragraphs", [])
            if isinstance(paragraph, dict)
        ):
            job.status, job.error_message, job.completed_at = JobStatus.failed, "Draft requires a fresh affidavit blueprint", _now()
            return {"status": "old_blueprint"}
        slots = [str(paragraph["generation_slot"]) for component in draft.content.get("components", []) for paragraph in component.get("paragraphs", []) if isinstance(paragraph, dict) and paragraph.get("editable") and paragraph.get("generation_slot")]
        payload = effective_payload(summary)
        try:
            findings = cited_affidavit_findings(payload) if isinstance(payload, dict) else []
        except ValueError:
            job.status, job.error_message, job.completed_at = JobStatus.failed, "The approved summary has invalid affidavit finding IDs", _now()
            return {"status": "invalid_summary"}
        if job.payload.get("provider") != "gemini":
            job.status, job.error_message, job.completed_at = JobStatus.failed, "Draft job uses an unsupported provider route; submit a new Gemini generation request", _now()
            return {"status": "unsupported_provider"}
        if not findings:
            job.status, job.error_message, job.completed_at = JobStatus.failed, "Approved summary has no cited affidavit findings", _now()
            return {"status": "missing_findings"}
        # slots may be empty now that facts/grounds/prayer are deterministic boilerplate;
        # affidavit_paragraphs are still generated from cited findings.
        if not settings.GEMINI_API_KEY.strip():
            job.status, job.error_message, job.completed_at = JobStatus.failed, "Gemini draft generation is not configured", _now()
            return {"status": "not_configured"}
        try:
            result = GeminiAdapter(
                model=str(job.payload["model"]),
                timeout_seconds=int(job.payload.get("deadline_seconds") or settings.AI_REQUEST_TIMEOUT_SECONDS),
            ).generate_court_draft_prose(
                summary=payload,
                slots=slots,
                affidavit_findings=findings,
                max_output_tokens=int(job.payload["max_output_tokens"]),
            )
        except ValueError:
            job.status, job.error_message, job.completed_at = JobStatus.failed, "Gemini draft provider configuration is invalid", _now()
            return {"status": "not_configured"}
        if isinstance(result, ProviderError):
            job.status, job.error_message, job.completed_at = JobStatus.failed, result.message, _now()
            return {"status": "failed"}
        prose, input_tokens, output_tokens, request_id = result
        try:
            affidavit_paragraphs = bind_affidavit_paragraphs(
                prose["affidavit_paragraphs"], findings,
                revision_hashes=source_revision_hashes(summary.dependency_snapshot),
            )
        except (KeyError, TypeError, ValueError):
            job.status, job.error_message, job.completed_at = JobStatus.failed, "Gemini returned incomplete or ungrounded affidavit prose; no draft was published", _now()
            job.result_summary = {"provider_request_id": request_id, "input_tokens": input_tokens, "output_tokens": output_tokens}
            return {"status": "invalid_prose"}
        content = json.loads(json.dumps(draft.content))
        for component in content.get("components", []):
            assembled = []
            for paragraph in component.get("paragraphs", []):
                if isinstance(paragraph, dict) and paragraph.get("affidavit_narrative"):
                    assembled.extend(affidavit_paragraphs)
                    continue
                if isinstance(paragraph, dict) and paragraph.get("generation_slot") in prose:
                    paragraph["text"] = prose[paragraph["generation_slot"]]
                assembled.append(paragraph)
            component["paragraphs"] = assembled
        content["affidavit_coverage"] = {
            "selected_findings": len(findings), "generated_paragraphs": len(affidavit_paragraphs),
            "source_fact_ids": [item["id"] for item in findings],
        }
        draft.content = content
        draft.content_hash = hashlib.sha256(json.dumps(content, sort_keys=True, ensure_ascii=False).encode()).hexdigest()
        draft.model, draft.prompt_version, draft.status = str(job.payload["model"]), "allahabad-bail-prose-v3", "needs_review"
        rendered = render_court_draft_docx(content, draft.rule_snapshot, title="Court draft")
        draft.compliance_report = validate_court_draft_docx(rendered, content, draft.rule_snapshot).model_dump(mode="json")
        job.status, job.result_summary, job.completed_at = JobStatus.succeeded, {"draft_id": str(draft.id), "content_hash": draft.content_hash, "provider": "gemini", "provider_request_id": request_id, "input_tokens": input_tokens, "output_tokens": output_tokens}, _now()
        return {"status": "succeeded"}
