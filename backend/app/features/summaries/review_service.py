"""Read and human-review operations for immutable generated summary output."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictError, NotFoundError, ValidationError
from app.features.chambers.permissions import ChamberCapability
from app.features.chambers.service import require_capability
from app.features.summaries.models import (
    SummaryReviewDecision,
    SummaryReviewEdit,
    SummaryRun,
    SummaryRunStatus,
    SummarySourceDependency,
)
from app.features.summaries.schemas import (
    DecideSummaryReviewRequest,
    SummaryReviewDocument,
    SummaryReviewDecisionResponse,
    SummaryRunDetailResponse,
)
from .review_editing import effective_payload, effective_hash, editable_payload, text_blocks, apply_edits, recover_review_payload
from app.features.summaries.service import SummaryPreparationService
from app.features.users.models import User


def _now() -> datetime:
    return datetime.now(UTC).replace(tzinfo=None)


class SummaryReviewService:
    """Expose derived output and record a reviewer decision without mutating provider output."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.preparation = SummaryPreparationService(db)

    async def get_detail(
        self, *, case_id: uuid.UUID, run_id: uuid.UUID, user: User
    ) -> SummaryRunDetailResponse:
        await self.preparation._require_readable_case(case_id, user)
        run = await self._get_run(case_id=case_id, run_id=run_id)
        return await self._detail(run)

    async def save_editor(self, *, case_id, run_id, body, user):
        case = await self.preparation._require_readable_case(case_id, user)
        await require_capability(self.db, chamber_id=case.chamber_id, user_id=user.id,
                                 capability=ChamberCapability.review_decide)
        run = await self._get_run(case_id=case_id, run_id=run_id, lock=True)
        if run.status != SummaryRunStatus.pending_review:
            raise ConflictError("Only a summary awaiting review can be edited")
        if run.review_version != body.expected_review_version or effective_hash(run) != body.expected_result_hash:
            raise ConflictError("Summary changed in another session. Reload before saving")
        base = editable_payload(effective_payload(run))
        if base is None:
            raise ConflictError("The saved output is incomplete and cannot be edited as a full summary")
        payload, digest = apply_edits(base, body.editor_state)
        # Validate the edited structure locally; generation is never invoked here.
        from .structured_validation import parse_summary
        try:
            parsed = parse_summary(payload)
        except ValueError as exc:
            raise ConflictError("Summary source metadata or structure is incomplete. It must be corrected before approval") from exc
        run.review_payload = parsed.model_dump(mode="json")
        run.review_editor_state = body.editor_state
        run.review_hash = digest
        run.validation_report = None
        run.review_version += 1
        self.db.add(SummaryReviewEdit(
            summary_run_id=run.id, review_version=run.review_version,
            editor_state=body.editor_state, payload=run.review_payload,
            content_hash=digest, saved_by_user_id=user.id,
        ))
        await self.db.commit()
        await self.db.refresh(run)
        return await self._detail(run)

    async def decide(
        self,
        *,
        case_id: uuid.UUID,
        run_id: uuid.UUID,
        body: DecideSummaryReviewRequest,
        user: User,
    ) -> SummaryRunDetailResponse:
        case = await self.preparation._require_readable_case(case_id, user)
        await require_capability(
            self.db,
            chamber_id=case.chamber_id,
            user_id=user.id,
            capability=ChamberCapability.review_decide,
        )
        run = await self._get_run(case_id=case_id, run_id=run_id, lock=True)
        if run.status != SummaryRunStatus.pending_review:
            raise ConflictError(
                "Only a current summary awaiting review can receive this decision"
            )
        if run.result_hash is None or run.result_payload is None:
            raise ConflictError("This summary has no reviewable generated output")
        if effective_hash(run) != body.expected_result_hash:
            raise ConflictError(
                "The generated summary changed; reload it before deciding"
            )
        if run.review_version != body.expected_review_version:
            raise ConflictError(
                "This summary was reviewed or refreshed; reload it before deciding"
            )
        if (body.action == "approve" and
                effective_payload(run).get("schema_version") == "case-summary-unverified-v1"):
            raise ConflictError("This AI draft is unverified and cannot be approved as a case summary")
        comment = body.comment.strip() if body.comment else None
        if body.action == "request_changes" and not comment:
            raise ValidationError(
                "Explain what must be changed before requesting another summary"
            )

        recovery_notice = recover_review_payload(run.result_payload)[1]
        if body.action == "approve" and recovery_notice and not body.acknowledge_incomplete:
            raise ConflictError("Confirm that you completed and reviewed the recovered summary against every original document")
        if body.action == "approve" and recovery_notice:
            comment = ((comment + "\n") if comment else "") + "Reviewer confirmed completion and review of recovered incomplete AI output."

        if body.action == "approve":
            from .generation import SummaryGenerationService
            from .structured import StructuredSummary
            from .contracts import CaseSummaryPayload

            generator = SummaryGenerationService(self.db)
            records, _ = await generator._authorize_and_collect(run=run, user=user)
            try:
                payload = (
                    StructuredSummary.model_validate(effective_payload(run))
                    if effective_payload(run).get("schema_version") == "case-summary-v2"
                    else CaseSummaryPayload.model_validate(effective_payload(run))
                )
                generator._validate_payload(
                    payload, records
                )
            except ValueError as exc:
                raise ConflictError(
                    "Summary structure or source references are no longer valid; regenerate before approval"
                ) from exc

        sequence = (
            await self.db.scalar(
                select(
                    func.coalesce(func.max(SummaryReviewDecision.sequence), 0)
                ).where(SummaryReviewDecision.summary_run_id == run.id)
            )
        ) + 1
        decision = SummaryReviewDecision(
            summary_run_id=run.id,
            sequence=sequence,
            action=body.action,
            result_hash=effective_hash(run),
            reviewed_by_user_id=user.id,
            comment=comment,
        )
        self.db.add(decision)
        run.status = (
            SummaryRunStatus.completed
            if body.action == "approve"
            else SummaryRunStatus.changes_requested
        )
        run.review_version += 1
        run.reviewed_by_user_id = user.id
        run.reviewed_at = _now()
        run.review_comment = comment
        await self.db.commit()
        await self.db.refresh(run)
        return await self._detail(run)

    async def _get_run(
        self, *, case_id: uuid.UUID, run_id: uuid.UUID, lock: bool = False
    ) -> SummaryRun:
        statement = select(SummaryRun).where(
            SummaryRun.id == run_id,
            SummaryRun.case_id == case_id,
        )
        if lock:
            statement = statement.with_for_update()
        run = await self.db.scalar(statement)
        if run is None:
            raise NotFoundError("Summary run not found")
        return run

    @staticmethod
    def _presentation(payload):
        from .structured import StructuredSummary
        from .presentation import present_summary

        if payload and payload.get("schema_version") == "case-summary-v2":
            return present_summary(StructuredSummary.model_validate(payload))
        return None

    async def _detail(self, run: SummaryRun) -> SummaryRunDetailResponse:
        source_count = await self.db.scalar(
            select(func.count())
            .select_from(SummarySourceDependency)
            .where(SummarySourceDependency.summary_run_id == run.id)
        )
        decisions = list(
            await self.db.scalars(
                select(SummaryReviewDecision)
                .where(SummaryReviewDecision.summary_run_id == run.id)
                .order_by(SummaryReviewDecision.sequence.asc())
            )
        )
        presentation = self._presentation(effective_payload(run))
        from app.features.documents.models import Document

        document_ids = set()
        for item in run.dependency_snapshot:
            if item.get("kind") == "original_pdf":
                ids = [item.get("document_id")]
            else:
                ids = [dependency.get("original_document_id") for dependency in item.get("file_dependencies", [])]
            for ident in ids:
                try:
                    document_ids.add(uuid.UUID(str(ident)))
                except (ValueError, TypeError):
                    continue
        names = {}
        if document_ids:
            originals = await self.db.scalars(
                select(Document).where(
                    Document.id.in_(document_ids), Document.case_id == run.case_id
                )
            )
            names = {str(doc.id): doc.original_filename for doc in originals}
        if presentation:
            links = [
                link
                for section in presentation.sections
                for block in section.blocks
                for cell in block.cells
                for link in cell.sources
            ]
            links += [
                link for fact in presentation.selectable_facts for link in fact.sources
            ]
            for link in links:
                link.filename = names.get(link.document_id)
        return SummaryRunDetailResponse(
            **SummaryPreparationService._response(
                run,
                source_count=(source_count or 0)
                + sum(
                    item.get("kind") == "original_pdf"
                    for item in run.dependency_snapshot
                ),
            ).model_dump(),
            provider=run.provider,
            model=run.model,
            provider_request_id=run.provider_request_id,
            input_tokens=run.input_tokens,
            output_tokens=run.output_tokens,
            result_hash=effective_hash(run),
            result_payload=effective_payload(run),
            editor_state=getattr(run, "review_editor_state", None),
            editor_blocks=text_blocks(editable_payload(effective_payload(run)) or {}),
            has_saved_edits=bool(getattr(run, "review_hash", None)),
            editor_recovery_notice=recover_review_payload(run.result_payload)[1],
            presentation=presentation,
            review_documents=[
                SummaryReviewDocument(document_id=ident, filename=names[str(ident)])
                for ident in sorted(document_ids, key=str) if str(ident) in names
            ],
            validation_report=run.validation_report,
            error_code=run.error_code,
            review_version=run.review_version,
            reviewed_by_user_id=run.reviewed_by_user_id,
            reviewed_at=run.reviewed_at,
            review_comment=run.review_comment,
            decisions=[
                SummaryReviewDecisionResponse(
                    id=item.id,
                    sequence=item.sequence,
                    action=item.action,  # constrained on write
                    result_hash=item.result_hash,
                    reviewed_by_user_id=item.reviewed_by_user_id,
                    comment=item.comment,
                    created_at=item.created_at,
                )
                for item in decisions
            ],
        )
