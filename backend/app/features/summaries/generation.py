"""Policy-bound, reauthorized execution of a prepared case-summary run."""

from __future__ import annotations

import asyncio
import hashlib
import json
import math
import uuid
from datetime import UTC, date, datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import (
    ConflictError,
    ForbiddenError,
    NotFoundError,
    ValidationError,
)
from app.features.cases.repository import CaseRepository
from app.features.chambers.provider_policy_service import (
    get_policy_output,
    resolve_authorized_task_policy,
)
from app.features.chambers.schemas import ProviderDataClass, ProviderOperation
from app.features.revisions.eligibility import SourceEligibilityResolver
from app.features.revisions.models import WorkingDocumentRevision
from app.features.revisions.repository import WorkingDocumentRepository
from app.features.summaries.contracts import CaseSummaryPayload
from app.features.summaries.models import (
    SummaryProviderAttempt,
    SummaryRun,
    SummaryRunStatus,
    SummarySourceDependency,
)
from app.features.summaries.prompt import PROMPT_VERSION, SIMPLE_PROMPT_VERSION, build_case_summary_contents
from app.features.summaries.semantic_validation import validate_summary_semantics
from app.features.summaries.structured import UnverifiedSummary
from app.features.users.models import User
from app.integrations.ai.contracts import ProviderError
from app.integrations.ai.gemini import GeminiAdapter


MAX_SUMMARY_OUTPUT_TOKENS = 32_768
SUMMARY_ESTIMATE_OVERHEAD_TOKENS = 4_096


def _now() -> datetime:
    return datetime.now(UTC).replace(tzinfo=None)


def _pricing_is_current(*, model: str) -> bool:
    """Check the locally configured, model-specific cost estimate before dispatch."""
    try:
        current = date.today() <= date.fromisoformat(settings.DRAFT_PRICING_VALID_UNTIL)
    except ValueError:
        current = False
    return bool(
        current
        and settings.DRAFT_PRICING_MODEL == model
        and min(
            settings.DRAFT_INPUT_PAISE_PER_MILLION,
            settings.DRAFT_OUTPUT_PAISE_PER_MILLION,
        )
        > 0
    )


def _estimated_reservation_paise(*, input_tokens: int, output_tokens: int) -> int:
    """Conservative reservation using the actual multimodal input-token count."""
    input_bound = input_tokens + SUMMARY_ESTIMATE_OVERHEAD_TOKENS
    return math.ceil(
        (
            input_bound * settings.DRAFT_INPUT_PAISE_PER_MILLION
            + output_tokens * settings.DRAFT_OUTPUT_PAISE_PER_MILLION
        )
        / 1_000_000
    )


class SummaryGenerationService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.case_repo = CaseRepository(db)
        self.documents = WorkingDocumentRepository(db)
        self.eligibility = SourceEligibilityResolver(db)

    async def authorize_submission(
        self, *, case_id: uuid.UUID, run_id: uuid.UUID, user: User
    ) -> SummaryRun:
        run = await self._run_for_user(run_id=run_id, user=user, lock=True)
        if run.case_id != case_id:
            raise NotFoundError("Summary run not found")
        if run.status == SummaryRunStatus.stale:
            raise ConflictError(
                "This summary's source manifest is stale; prepare current sources again"
            )
        if run.status == SummaryRunStatus.running:
            # Redeliver an accepted queue intent after broker/network failure.
            # The worker's persisted provider attempt prevents a second paid call.
            await self._authorize_and_collect(run=run, user=user)
            return run
        if run.status != SummaryRunStatus.pending:
            raise ConflictError(
                "This summary run has already been submitted or completed"
            )
        source_records, task_policy = await self._authorize_and_collect(
            run=run, user=user
        )
        run.input_tokens = await self._validate_summary_reservation(
            run=run,
            source_records=source_records,
            task_policy=task_policy,
        )
        run.status = SummaryRunStatus.running
        await self.db.commit()
        await self.db.refresh(run)
        return run

    async def execute(self, *, run_id: uuid.UUID) -> str:
        """Worker entry: reauthorize, call only one policy-authorized adapter, validate, then publish for review."""
        run = await self.db.scalar(
            select(SummaryRun).where(SummaryRun.id == run_id).with_for_update()
        )
        if run is None:
            raise NotFoundError("Summary run not found")
        if run.status in {
            SummaryRunStatus.pending_review,
            SummaryRunStatus.completed,
            SummaryRunStatus.stale,
        }:
            return run.status.value
        if run.status != SummaryRunStatus.running:
            return run.status.value
        user = await self.db.get(User, run.created_by_user_id)
        if user is None:
            await self._fail(run, "USER_UNAVAILABLE")
            return "failed"
        try:
            source_records, task_policy = await self._authorize_and_collect(
                run=run, user=user
            )
        except (ConflictError, NotFoundError, ForbiddenError, ValidationError):
            run.status = SummaryRunStatus.stale
            run.error_code = "SOURCE_AUTHORIZATION_CHANGED"
            await self.db.commit()
            return "stale"

        route = self._gemini_route(task_policy)
        if route is None:
            await self._fail(run, "NO_SUPPORTED_PROVIDER")
            return "failed"
        from .structured import PROMPT_VERSION as V2_PROMPT, StructuredSummary, UnverifiedSummary

        structured = run.prompt_version == V2_PROMPT
        if run.prompt_version not in {PROMPT_VERSION, V2_PROMPT, SIMPLE_PROMPT_VERSION}:
            await self._fail(run, "PROMPT_VERSION_UNSUPPORTED")
            return "failed"
        contents = build_case_summary_contents(
            source_records=source_records,
            language=getattr(run, "output_language", "en-IN"),
        )
        if len(contents.encode("utf-8")) > task_policy.max_input_bytes:
            await self._fail(run, "INPUT_LIMIT_EXCEEDED")
            return "failed"
        try:
            pdf_sources, _ = await self._load_summary_pdf_sources(
                source_records=source_records,
                contents=contents,
                max_input_bytes=task_policy.max_input_bytes,
            )
        except ValidationError as exc:
            if "input limit" in str(exc).lower():
                await self._fail(run, "INPUT_LIMIT_EXCEEDED")
                return "failed"
            await self._fail(run, "ORIGINAL_PDF_UNAVAILABLE")
            return "failed"
        try:
            if run.input_tokens is None or run.input_tokens <= 0:
                raise ValidationError("Summary cost estimate is unavailable")
            self._validate_pricing_and_budget(
                task_policy=task_policy, route=route, input_tokens=run.input_tokens,
                max_output_tokens=self._output_cap(run.prompt_version),
            )
        except ValidationError:
            await self._fail(run, "BUDGET_OR_PRICING_CHANGED")
            return "failed"
        # A delivered attempt may already have been billed; never repeat blindly.
        previous = await self.db.scalar(
            select(SummaryProviderAttempt.id)
            .where(SummaryProviderAttempt.summary_run_id == run.id)
            .limit(1)
        )
        if previous is not None:
            return "running"
        sequence = (
            await self.db.scalar(
                select(
                    func.coalesce(func.max(SummaryProviderAttempt.sequence), 0)
                ).where(SummaryProviderAttempt.summary_run_id == run.id)
            )
        ) + 1
        attempt = SummaryProviderAttempt(
            summary_run_id=run.id,
            sequence=sequence,
            provider="gemini",
            model=route.model,
            input_manifest_hash=run.source_manifest_hash,
            status="submitted",
        )
        self.db.add(attempt)
        run.provider, run.model, run.error_code = "gemini", route.model, None
        await self.db.commit()

        outcome = GeminiAdapter(model=route.model).summarize_case(
            contents=contents,
            max_output_tokens=min(
                task_policy.max_output_tokens, self._output_cap(run.prompt_version)
            ),
            pdf_sources=pdf_sources,
            structured=structured,
            deadline_seconds=task_policy.deadline_seconds,
        )
        if isinstance(outcome, ProviderError):
            await self._record_provider_failure(
                run_id=run.id, attempt_id=attempt.id, error=outcome
            )
            return "failed"
        payload, input_tokens, output_tokens, provider_request_id = outcome
        if isinstance(payload, UnverifiedSummary):
            validation_report = self._unverified_report()
        else:
            try:
                if isinstance(payload, StructuredSummary):
                    payload.canonicalize()
                if payload.output_language != getattr(
                    run, "output_language", "en-IN"
                ):
                    raise ValueError("Output language differs from requested language")
                validation_report = self._validate_payload(payload, source_records)
            except ValueError:
                # Keep the paid response visible, but never allow its approval.
                payload = UnverifiedSummary(
                    raw_text=payload.model_dump_json(), reason="failed_validation"
                )
                validation_report = self._unverified_report()
        return await self._publish_if_current(
            run_id=run.id,
            attempt_id=attempt.id,
            payload=payload,
            validation_report=validation_report,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            provider_request_id=provider_request_id,
        )

    @staticmethod
    def _unverified_report() -> dict[str, object]:
        return {
            "needs_advocate_review": 1,
            "issues": [{
                "reason": "The AI output could not be validated against the required format and sources. It cannot be approved or used for drafting.",
                "requires_advocate_review": True,
            }],
        }

    async def _authorize_and_collect(self, *, run: SummaryRun, user: User):
        if not await self.case_repo.can_edit(run.case_id, user.id):
            raise NotFoundError("Summary run not found")
        from .coverage import require_case_coverage

        if getattr(run, "schema_version", "case-summary-v1") in {"case-summary-v2", "case-summary-v3"}:
            await require_case_coverage(
                self.db, case_id=run.case_id, entries=run.dependency_snapshot
            )
        current_policy = await get_policy_output(self.db, chamber_id=run.chamber_id)
        if current_policy.version != run.policy_version:
            raise ConflictError(
                "The chamber provider policy changed after this summary was prepared"
            )
        task_policy = await resolve_authorized_task_policy(
            self.db,
            chamber_id=run.chamber_id,
            operation=ProviderOperation.summary.value,
            data_class=ProviderDataClass.document_text.value,
            collection_id=None,
        )
        dependencies = list(
            await self.db.scalars(
                select(SummarySourceDependency).where(
                    SummarySourceDependency.summary_run_id == run.id
                )
            )
        )
        if not dependencies and not any(
            item.get("kind") == "original_pdf" for item in run.dependency_snapshot
        ):
            raise ValidationError("Summary run has no approved source dependencies")
        records: list[dict[str, object]] = []
        for dependency in dependencies:
            revision = await self.db.get(
                WorkingDocumentRevision, dependency.working_document_revision_id
            )
            if (
                revision is None
                or revision.content_sha256 != dependency.revision_sha256
            ):
                raise ConflictError("Approved source revision changed")
            document = await self.documents.get(revision.working_document_id)
            if document is None or document.case_id != run.case_id:
                raise NotFoundError("Approved source is unavailable")
            eligibility = await self.eligibility.resolve(
                allow_original_text=True,
                user=user,
                working_document_id=document.id,
                revision_id=revision.id,
                expected_revision_sha256=revision.content_sha256,
            )
            if not eligibility.eligible:
                raise ConflictError("Approved source is no longer eligible")
            paths = [
                str(item.get("path"))
                for item in revision.source_map
                if isinstance(item.get("path"), str)
            ]
            if not paths or not revision.normalized_text.strip():
                raise ValidationError("Approved source has no readable text blocks")
            source_blocks = {
                str(item["path"]): revision.normalized_text[
                    int(item["start"]) : int(item["end"])
                ]
                for item in revision.source_map
                if isinstance(item.get("path"), str)
                and isinstance(item.get("start"), int)
                and isinstance(item.get("end"), int)
            }
            paths = [path for path in paths if source_blocks.get(path, "").strip()]
            from app.features.documents.source_eligibility import original_page_metadata

            page_metadata = (
                await original_page_metadata(self.db, revision)
                if getattr(document, "document_kind", "") == "original_source"
                else {}
            )
            records.append(
                {
                    **page_metadata,
                    "source_document_id": str(document.id),
                    "source_revision_id": str(revision.id),
                    "source_paths": paths,
                    "source_blocks": source_blocks,
                    "text": revision.normalized_text,
                }
            )
        from app.features.documents.direct_pdf import collect_pdf

        for selection in run.dependency_snapshot:
            if selection.get("kind") != "original_pdf":
                continue
            await resolve_authorized_task_policy(
                self.db,
                chamber_id=run.chamber_id,
                operation="summary",
                data_class="document_image",
                collection_id=None,
            )
            doc, version = await collect_pdf(
                self.db, case_id=run.case_id, user=user, selection=selection
            )
            if not version.page_count:
                raise ValidationError("Original PDF page count unavailable")
            paths = {f"page:{n}": n for n in range(1, version.page_count + 1)}
            records.append(
                {
                    "source_kind": "original_pdf",
                    "source_document_id": str(doc.id),
                    "source_revision_id": str(version.id),
                    "source_paths": list(paths),
                    "page_paths": paths,
                    "source_blocks": {},
                    "text": "Read the attached original PDF directly.",
                    "file_version_id": str(version.id),
                    "original_sha256": version.sha256_hex,
                }
            )
        from .structured import PROMPT_VERSION as V2_PROMPT

        if run.prompt_version in {V2_PROMPT, SIMPLE_PROMPT_VERSION}:
            for record in records:
                if (
                    not record.get("file_version_id")
                    or not record.get("page_paths")
                    or any(
                        p not in record["page_paths"] for p in record["source_paths"]
                    )
                ):
                    raise ValidationError(
                        "Source page provenance requires review before structured summary generation"
                    )
        return records, task_policy

    @staticmethod
    def _gemini_route(task_policy):
        return next(
            (item for item in task_policy.providers if item.provider.value == "gemini"),
            None,
        )

    @staticmethod
    def _output_cap(prompt_version: str) -> int:
        return 12_288 if prompt_version == SIMPLE_PROMPT_VERSION else MAX_SUMMARY_OUTPUT_TOKENS

    @staticmethod
    def _validate_pricing_and_budget(*, task_policy, route, input_tokens: int, max_output_tokens: int = MAX_SUMMARY_OUTPUT_TOKENS) -> int:
        if route is None:
            raise ValidationError("No supported summary provider is authorized")
        if not settings.GEMINI_API_KEY or route.model not in (
            settings.GEMINI_ALLOWED_MODELS or [settings.GEMINI_MODEL]
        ):
            raise ValidationError("Configure an authorized Gemini summary model and key")
        if not _pricing_is_current(model=route.model):
            raise ValidationError(
                "Configure current model-matched pricing before case summary generation"
            )
        output_tokens = min(task_policy.max_output_tokens, max_output_tokens)
        if _estimated_reservation_paise(
            input_tokens=input_tokens, output_tokens=output_tokens
        ) > task_policy.run_budget_paise:
            raise ValidationError(
                "Estimated reservation exceeds the chamber summary budget"
            )
        return output_tokens

    async def _validate_summary_reservation(
        self, *, run: SummaryRun, source_records: list[dict[str, object]], task_policy
    ) -> int:
        """Reject an over-budget request before it is marked running or enqueued."""
        route = self._gemini_route(task_policy)
        if route is None:
            raise ValidationError("No supported summary provider is authorized")
        if not settings.GEMINI_API_KEY or route.model not in (
            settings.GEMINI_ALLOWED_MODELS or [settings.GEMINI_MODEL]
        ):
            raise ValidationError("Configure an authorized Gemini summary model and key")
        if not _pricing_is_current(model=route.model):
            raise ValidationError(
                "Configure current model-matched pricing before case summary generation"
            )
        contents = build_case_summary_contents(
            source_records=source_records,
            language=getattr(run, "output_language", "en-IN"),
        )
        pdf_sources, _ = await self._load_summary_pdf_sources(
            source_records=source_records,
            contents=contents,
            max_input_bytes=task_policy.max_input_bytes,
        )
        input_tokens = await self._cached_summary_input_tokens(
            run=run,
            route=route,
            contents=contents,
            pdf_sources=pdf_sources,
        )
        self._validate_pricing_and_budget(
            task_policy=task_policy, route=route, input_tokens=input_tokens,
            max_output_tokens=self._output_cap(run.prompt_version),
        )
        return input_tokens

    async def _load_summary_pdf_sources(
        self,
        *,
        source_records: list[dict[str, object]],
        contents: str,
        max_input_bytes: int,
    ) -> tuple[list[dict[str, object]], int]:
        from app.features.documents.models import DocumentFileVersion
        from app.features.documents.source_service import read_original

        input_bytes = len(contents.encode("utf-8"))
        if input_bytes > max_input_bytes:
            raise ValidationError("Complete source set exceeds the policy input limit")
        pdf_sources: list[dict[str, object]] = []
        for record in source_records:
            if record.get("source_kind") != "original_pdf":
                continue
            version = await self.db.get(
                DocumentFileVersion, uuid.UUID(str(record["file_version_id"]))
            )
            if version is None or input_bytes + version.file_size_bytes > max_input_bytes:
                raise ValidationError("Complete source set exceeds the policy input limit")
            try:
                data = await asyncio.to_thread(read_original, version)
            except Exception as exc:
                raise ValidationError("An approved original PDF is unavailable") from exc
            input_bytes += len(data)
            if input_bytes > max_input_bytes:
                raise ValidationError("Complete source set exceeds the policy input limit")
            pdf_sources.append(
                {
                    "source_document_id": record["source_document_id"],
                    "source_revision_id": record["source_revision_id"],
                    "data": data,
                }
            )
        return pdf_sources, input_bytes

    async def _cached_summary_input_tokens(
        self,
        *,
        run: SummaryRun,
        route,
        contents: str,
        pdf_sources: list[dict[str, object]],
    ) -> int:
        from redis.asyncio import Redis

        identity = {
            "chamber_id": str(run.chamber_id),
            "source_manifest_hash": run.source_manifest_hash,
            "policy_version": run.policy_version,
            "prompt_version": run.prompt_version,
            "output_language": getattr(run, "output_language", "en-IN"),
            "model": route.model,
        }
        key = "summary:token-count:v1:" + hashlib.sha256(
            json.dumps(identity, sort_keys=True, separators=(",", ":")).encode()
        ).hexdigest()
        try:
            async with Redis.from_url(
                settings.REDIS_URL, socket_timeout=5, socket_connect_timeout=5
            ) as cache:
                async with cache.lock(key + ":lock", timeout=90, blocking_timeout=70):
                    cached = await cache.get(key)
                    if cached is not None:
                        return int(cached)
                    result = await asyncio.to_thread(
                        GeminiAdapter(model=route.model).count_case_summary_tokens,
                        contents=contents,
                        pdf_sources=pdf_sources,
                    )
                    if isinstance(result, ProviderError):
                        raise ValidationError("Could not estimate summary cost")
                    await cache.set(key, result, ex=900)
                    return result
        except ValidationError:
            raise
        except Exception as exc:
            raise ValidationError(
                "Summary cost check is temporarily unavailable. No summary was submitted."
            ) from exc

    async def _run_for_user(
        self, *, run_id: uuid.UUID, user: User, lock: bool
    ) -> SummaryRun:
        statement = select(SummaryRun).where(SummaryRun.id == run_id)
        if lock:
            statement = statement.with_for_update()
        run = await self.db.scalar(statement)
        if run is None or not await self.case_repo.can_edit(run.case_id, user.id):
            raise NotFoundError("Summary run not found")
        return run

    @staticmethod
    def _validate_payload(
        payload: CaseSummaryPayload, records: list[dict[str, object]]
    ) -> dict[str, object]:
        from .structured import StructuredSummary
        from .structured_validation import validate_structured

        if isinstance(payload, StructuredSummary):
            return validate_structured(payload, records)
        allowed = {str(record["source_revision_id"]): record for record in records}
        for section in payload.sections:
            for finding in section.findings:
                for citation in finding.citations:
                    record = allowed.get(citation.source_revision_id)
                    original_document_id = (
                        record.get("original_document_id", record["source_document_id"])
                        if record is not None else None
                    )
                    if (
                        record is None
                        or citation.source_document_id not in {
                            record["source_document_id"], original_document_id
                        }
                    ):
                        raise ValueError("Provider cited an unauthorized source")
                    citation.source_document_id = str(original_document_id)
                    page_paths = record.get("page_paths", {})
                    if page_paths:
                        if citation.page_number is None or any(
                            page_paths.get(path) != citation.page_number
                            for path in citation.source_paths
                        ):
                            raise ValueError(
                                "Citation page does not match original page provenance"
                            )
                    elif (
                        citation.page_number is not None
                        or citation.page_reference_note != "Not available"
                    ):
                        raise ValueError(
                            "Provider inferred unavailable page provenance"
                        )
                    if not set(citation.source_paths).issubset(
                        set(record["source_paths"])
                    ):
                        raise ValueError("Provider cited an unauthorized source path")
        blocks = {
            (str(record["source_revision_id"]), path): text
            for record in records
            for path, text in dict(record["source_blocks"]).items()
        }
        return validate_summary_semantics(payload, source_blocks=blocks).as_json()

    async def _publish_if_current(
        self,
        *,
        run_id: uuid.UUID,
        attempt_id: uuid.UUID,
        payload: CaseSummaryPayload | UnverifiedSummary,
        validation_report: dict[str, object],
        input_tokens: int | None,
        output_tokens: int | None,
        provider_request_id: str | None,
    ) -> str:
        run = await self.db.scalar(
            select(SummaryRun).where(SummaryRun.id == run_id).with_for_update()
        )
        attempt = await self.db.get(
            SummaryProviderAttempt, attempt_id, with_for_update=True
        )
        if run is None or attempt is None:
            return "failed"
        user = await self.db.get(User, run.created_by_user_id)
        try:
            if user is None:
                raise NotFoundError("User unavailable")
            await self._authorize_and_collect(run=run, user=user)
        except (ConflictError, NotFoundError, ForbiddenError, ValidationError):
            run.status, run.error_code = (
                SummaryRunStatus.stale,
                "SOURCE_AUTHORIZATION_CHANGED",
            )
            attempt.status, attempt.completed_at = "stale", _now()
            await self.db.commit()
            return "stale"
        serialized = payload.model_dump(mode="json")
        run.result_payload = serialized
        run.validation_report = validation_report
        run.result_hash = hashlib.sha256(
            json.dumps(serialized, sort_keys=True, separators=(",", ":")).encode()
        ).hexdigest()
        run.input_tokens, run.output_tokens = input_tokens, output_tokens
        run.provider_request_id = provider_request_id
        run.status, run.completed_at = SummaryRunStatus.pending_review, _now()
        (
            attempt.status,
            attempt.output_hash,
            attempt.provider_request_id,
            attempt.completed_at,
        ) = "succeeded", run.result_hash, provider_request_id, _now()
        await self.db.commit()
        return "pending_review"

    async def _record_provider_failure(
        self, *, run_id: uuid.UUID, attempt_id: uuid.UUID, error: ProviderError
    ) -> None:
        run = await self.db.get(SummaryRun, run_id, with_for_update=True)
        attempt = await self.db.get(
            SummaryProviderAttempt, attempt_id, with_for_update=True
        )
        if run is None or attempt is None:
            return
        run.status, run.error_code, run.provider_request_id = (
            SummaryRunStatus.failed,
            error.error_code.value,
            error.provider_request_id,
        )
        if error.input_tokens is not None:
            run.input_tokens = error.input_tokens
        if error.output_tokens is not None:
            run.output_tokens = error.output_tokens
        (
            attempt.status,
            attempt.error_code,
            attempt.outcome_unknown,
            attempt.provider_request_id,
            attempt.completed_at,
        ) = (
            "unknown" if error.outcome_unknown else "failed",
            error.error_code.value,
            error.outcome_unknown,
            error.provider_request_id,
            _now(),
        )
        await self.db.commit()

    async def _record_validation_failure(
        self, *, run_id: uuid.UUID, attempt_id: uuid.UUID
    ) -> None:
        run = await self.db.get(SummaryRun, run_id, with_for_update=True)
        attempt = await self.db.get(
            SummaryProviderAttempt, attempt_id, with_for_update=True
        )
        if run is None or attempt is None:
            return
        run.status, run.error_code = SummaryRunStatus.failed, "INVALID_PROVIDER_OUTPUT"
        attempt.status, attempt.error_code, attempt.completed_at = (
            "failed",
            "INVALID_PROVIDER_OUTPUT",
            _now(),
        )
        await self.db.commit()

    async def _fail(self, run: SummaryRun, error_code: str) -> None:
        run.status, run.error_code = SummaryRunStatus.failed, error_code
        await self.db.commit()
