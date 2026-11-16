"""Durable, provider-free preparation of an approved-source summary request."""

from __future__ import annotations

import hashlib
import json
import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import (
    ConflictError,
    ForbiddenError,
    NotFoundError,
    ValidationError,
)
from app.features.cases.repository import CaseRepository
from app.features.cases.models import Case
from app.features.chambers.permissions import ChamberCapability
from app.features.chambers.provider_policy_service import get_policy_output
from app.features.chambers.service import require_capability
from app.features.revisions.approved_sources import build_approved_source_manifest
from app.features.revisions.eligibility import SourceEligibilityResolver
from app.features.revisions.repository import WorkingDocumentRepository
from app.features.summaries.identity import summary_cache_key
from app.features.summaries.models import (
    SummaryRun,
    SummaryRunStatus,
    SummarySourceDependency,
    DocumentFactCard,
)
from app.features.summaries.schemas import (
    PrepareSummaryRunRequest,
    SummaryRunResponse,
    SummarySourceCandidateResponse,
    FactCardCoverageResponse,
)
from app.features.users.models import User


class SummaryPreparationService:
    """Build a reproducible source manifest without submitting any provider request."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.case_repo = CaseRepository(db)
        self.working_documents = WorkingDocumentRepository(db)
        self.eligibility = SourceEligibilityResolver(db)

    async def candidates(
        self, *, case_id: uuid.UUID, user: User
    ) -> list[SummarySourceCandidateResponse]:
        await self._require_readable_case(case_id, user)
        candidates: list[SummarySourceCandidateResponse] = []
        # Provider-free native-text projection for originals; scanned pages remain
        # blocked until explicit OCR/manual transcription and reviewer confirmation.
        from app.features.documents.models import Document, UploadStatus
        from app.features.documents.source_service import OriginalSourceService

        originals = list(
            await self.db.scalars(
                select(Document)
                .where(
                    Document.case_id == case_id,
                    Document.deleted_at.is_(None),
                )
                .order_by(Document.id)
                .limit(51)
            )
        )
        original_modes = {}
        direct_source_revisions = set()
        for original in originals:
            reason = None
            if original.upload_status != UploadStatus.uploaded:
                reason = "upload_incomplete"
            elif original.mime_type not in {
                "application/pdf",
                "image/jpeg",
                "image/png",
                "image/webp",
            }:
                reason = "unsupported_summary_source"
            if reason:
                candidates.append(
                    SummarySourceCandidateResponse(
                        original_document_id=original.id,
                        working_document_id=original.id,
                        revision_id=None,
                        title=original.original_filename,
                        revision_number=None,
                        status=reason,
                        revision_sha256=None,
                        eligible=False,
                        reasons=[reason],
                    )
                )
                continue
            try:
                source = await OriginalSourceService(self.db).inspect(original.id, user)
            except (ConflictError, ValidationError):
                # A stale/missing object must block this one document, not make
                # the entire case-readiness view unavailable.
                candidates.append(
                    SummarySourceCandidateResponse(
                        original_document_id=original.id,
                        working_document_id=original.id,
                        revision_id=None,
                        title=original.original_filename,
                        revision_number=None,
                        status="source_unavailable",
                        revision_sha256=None,
                        eligible=False,
                        reasons=["source_unavailable"],
                    )
                )
                continue
            if source.mode == "direct_pdf":
                candidates.append(
                    SummarySourceCandidateResponse(
                        source_kind="original_pdf",
                        original_document_id=original.id,
                        working_document_id=original.id,
                        revision_id=source.file_version_id,
                        title=original.original_filename,
                        revision_number=None,
                        status="original_pdf",
                        revision_sha256=source.source_sha256,
                        eligible=True,
                        reasons=["eligible"],
                    )
                )
                from app.features.documents.source_models import OriginalTextSource

                old = await self.db.get(OriginalTextSource, source.file_version_id)
                if old and old.revision_id:
                    direct_source_revisions.add(old.revision_id)
                continue
            if source.working_document_id:
                original_modes[source.working_document_id] = source.mode
            if source.working_document_id is None:
                candidates.append(
                    SummarySourceCandidateResponse(
                        working_document_id=original.id,
                        revision_id=None,
                        title=original.original_filename,
                        revision_number=None,
                        status="scanned_review_required",
                        revision_sha256=None,
                        eligible=False,
                        reasons=["scanned_review_required"],
                        original_document_id=original.id,
                    )
                )

        for document in await self.working_documents.list_for_case(case_id):
            if document.id not in original_modes:
                continue
            revision = await self.working_documents.get_latest_revision(document.id)
            if revision is not None and revision.id in direct_source_revisions:
                continue
            if revision is None:
                candidates.append(
                    SummarySourceCandidateResponse(
                        working_document_id=document.id,
                        revision_id=None,
                        title=document.title,
                        revision_number=None,
                        status=None,
                        revision_sha256=None,
                        eligible=False,
                        reasons=["revision_not_found"],
                    )
                )
                continue
            eligibility = await self.eligibility.resolve(
                allow_original_text=True,
                user=user,
                working_document_id=document.id,
                revision_id=revision.id,
                expected_revision_sha256=revision.content_sha256,
            )
            from app.features.documents.source_eligibility import original_page_metadata

            metadata = await original_page_metadata(self.db, revision)
            provenance_ready = bool(metadata.get("page_paths")) and all(
                not revision.normalized_text[int(b["start"]) : int(b["end"])].strip()
                or b["path"] in metadata["page_paths"]
                for b in revision.source_map
            )
            candidates.append(
                SummarySourceCandidateResponse(
                    original_document_id=metadata.get("original_document_id"),
                    working_document_id=document.id,
                    revision_id=revision.id,
                    title=document.title,
                    revision_number=revision.revision_number,
                    status=(original_modes[document.id] + "_original_ready")
                    if document.id in original_modes and eligibility.eligible
                    else revision.status.value,
                    revision_sha256=revision.content_sha256,
                    eligible=eligibility.eligible and provenance_ready,
                    reasons=[reason.value for reason in eligibility.reasons]
                    if provenance_ready
                    else ["source_page_assignment_required"],
                )
            )
        return candidates

    async def fact_card_coverage(self, *, case_id: uuid.UUID, user: User) -> list[FactCardCoverageResponse]:
        candidates = await self.candidates(case_id=case_id, user=user)
        revision_ids = [item.revision_id for item in candidates if item.eligible and item.revision_id]
        case = await self.case_repo.get_by_id_simple(case_id)
        cards = {card.source_revision_id: card for card in await self.db.scalars(
            select(DocumentFactCard).where(
                DocumentFactCard.case_id == case_id,
                DocumentFactCard.chamber_id == case.chamber_id,
                DocumentFactCard.source_revision_id.in_(revision_ids),
            )
        )} if revision_ids else {}
        result = []
        for item in candidates:
            card = cards.get(item.revision_id) if item.eligible else None
            if card and card.source_sha256 != item.revision_sha256:
                card = None
            result.append(FactCardCoverageResponse(
                document_id=item.original_document_id,
                revision_id=item.revision_id,
                revision_sha256=item.revision_sha256,
                card_id=card.id if card else None,
                title=item.title,
                eligible=item.eligible,
                status=card.status if card else "not_processed" if item.eligible else "not_ready",
                error_code=card.error_code if card else None,
                content=card.content if card and card.status == "ready" else None,
            ))
        return result

    async def list_runs(
        self, *, case_id: uuid.UUID, user: User
    ) -> list[SummaryRunResponse]:
        await self._require_readable_case(case_id, user)
        runs = list(
            await self.db.scalars(
                select(SummaryRun)
                .where(SummaryRun.case_id == case_id)
                .order_by(SummaryRun.created_at.desc(), SummaryRun.id.desc())
                .limit(50)
            )
        )
        if not runs:
            return []
        counts = {
            run_id: count
            for run_id, count in (
                await self.db.execute(
                    select(
                        SummarySourceDependency.summary_run_id,
                        func.count(SummarySourceDependency.id),
                    )
                    .where(
                        SummarySourceDependency.summary_run_id.in_(
                            [run.id for run in runs]
                        )
                    )
                    .group_by(SummarySourceDependency.summary_run_id)
                )
            ).all()
        }
        return [
            self._response(
                run,
                source_count=counts.get(run.id, 0)
                + sum(
                    item.get("kind") == "original_pdf"
                    for item in run.dependency_snapshot
                ),
            )
            for run in runs
        ]

    async def prepare(
        self, *, case_id: uuid.UUID, body: PrepareSummaryRunRequest, user: User
    ) -> SummaryRunResponse:
        case = await self._require_editable_case(case_id, user)
        source_ids = [source.working_document_id for source in body.sources]
        revision_ids = [source.revision_id for source in body.sources]
        if len(set(source_ids)) != len(source_ids) or len(set(revision_ids)) != len(
            revision_ids
        ):
            raise ValidationError(
                "Each approved source revision may be selected only once"
            )

        manifest_entries: list[dict[str, object]] = []
        dependencies: list[tuple[uuid.UUID, str]] = []
        for selection in body.sources:
            document = await self.working_documents.get(selection.working_document_id)
            if document is None or document.case_id != case.id:
                raise NotFoundError("Approved source not found")
            revision = await self.working_documents.get_revision(
                document.id, selection.revision_id
            )
            if revision is None:
                raise NotFoundError("Approved source revision not found")
            eligibility = await self.eligibility.resolve(
                allow_original_text=True,
                user=user,
                working_document_id=document.id,
                revision_id=revision.id,
                expected_revision_sha256=selection.expected_revision_sha256,
            )
            manifest = build_approved_source_manifest(
                revision=revision, dependencies=(), eligibility=eligibility
            )
            if not manifest.included:
                raise ConflictError(
                    "One or more selected sources are no longer eligible",
                    details={
                        "revision_id": str(revision.id),
                        "reasons": list(manifest.reasons),
                    },
                )
            from app.features.documents.source_eligibility import original_page_metadata

            original_metadata = (
                await original_page_metadata(self.db, revision)
                if getattr(document, "document_kind", "") == "original_source"
                else {}
            )
            if not original_metadata.get("page_paths"):
                raise ValidationError(
                    "Assign and review original source pages before preparing this summary"
                )
            manifest_entries.append(
                {
                    "working_document_id": str(document.id),
                    "revision_id": str(manifest.revision_id),
                    "revision_sha256": manifest.revision_sha256,
                    "block_offsets": list(manifest.block_offsets),
                    "file_dependencies": [original_metadata]
                    if original_metadata
                    else [],
                }
            )
            dependencies.append((manifest.revision_id, manifest.revision_sha256))

        from app.features.documents.direct_pdf import collect_pdf

        seen_pdf = set()
        for selected in body.original_pdf_sources:
            if selected.document_id in seen_pdf:
                raise ValidationError("Select each original PDF once")
            seen_pdf.add(selected.document_id)
            doc, version = await collect_pdf(
                self.db, case_id=case.id, user=user, selection=selected.model_dump()
            )
            manifest_entries.append(
                {
                    "kind": "original_pdf",
                    "document_id": str(doc.id),
                    "file_version_id": str(version.id),
                    "sha256": version.sha256_hex,
                    "page_count": version.page_count,
                    "revision_id": str(version.id),
                }
            )
        from .coverage import require_case_coverage

        await require_case_coverage(self.db, case_id=case.id, entries=manifest_entries)
        manifest_entries.sort(key=lambda item: str(item["revision_id"]))
        source_manifest_hash = hashlib.sha256(
            json.dumps(manifest_entries, sort_keys=True, separators=(",", ":")).encode()
        ).hexdigest()
        policy = await get_policy_output(self.db, chamber_id=case.chamber_id)
        cache_key = summary_cache_key(
            chamber_id=case.chamber_id,
            case_id=case.id,
            source_manifest_hash=source_manifest_hash,
            prompt_version=body.prompt_version,
            policy_version=policy.version,
            schema_version="case-summary-v3",
            output_language=body.output_language,
        )
        # Serialize prepare calls for this case. A failed provider attempt is
        # immutable; a fresh explicit Generate click starts a new run, while
        # concurrent clicks reuse the newest pending/running or finished run.
        await self.db.scalar(select(Case.id).where(Case.id == case.id).with_for_update())
        existing = await self.db.scalar(
            select(SummaryRun)
            .where(
                SummaryRun.chamber_id == case.chamber_id,
                SummaryRun.case_id == case.id,
                SummaryRun.source_manifest_hash == source_manifest_hash,
                SummaryRun.prompt_version == body.prompt_version,
                SummaryRun.policy_version == policy.version,
                SummaryRun.schema_version == "case-summary-v3",
                SummaryRun.output_language == body.output_language,
            )
            .order_by(SummaryRun.created_at.desc(), SummaryRun.id.desc())
            .limit(1)
        )
        if existing is not None:
            if existing.status not in {SummaryRunStatus.failed, SummaryRunStatus.stale}:
                return self._response(existing, source_count=len(manifest_entries))
            cache_key = hashlib.sha256(
                f"{cache_key}:{uuid.uuid4()}".encode()
            ).hexdigest()

        run = SummaryRun(
            chamber_id=case.chamber_id,
            case_id=case.id,
            created_by_user_id=user.id,
            status=SummaryRunStatus.pending,
            source_manifest_hash=source_manifest_hash,
            cache_key=cache_key,
            prompt_version=body.prompt_version,
            schema_version="case-summary-v3",
            output_language=body.output_language,
            policy_version=policy.version,
            dependency_snapshot=manifest_entries,
        )
        self.db.add(run)
        await self.db.flush()
        self.db.add_all(
            SummarySourceDependency(
                summary_run_id=run.id,
                working_document_revision_id=revision_id,
                revision_sha256=revision_hash,
            )
            for revision_id, revision_hash in dependencies
        )
        await self.db.commit()
        await self.db.refresh(run)
        return self._response(run, source_count=len(manifest_entries))

    async def prepare_synthesis_retry(self, *, case_id: uuid.UUID, run_id: uuid.UUID, user: User) -> SummaryRunResponse:
        case = await self._require_editable_case(case_id, user)
        previous = await self.db.get(SummaryRun, run_id)
        if previous is None or previous.case_id != case_id or previous.chamber_id != case.chamber_id:
            raise NotFoundError("Summary run not found")
        if (
            previous.schema_version != "case-summary-v3"
            or previous.status != SummaryRunStatus.pending_review
            or not isinstance(previous.result_payload, dict)
            or previous.result_payload.get("reason") != "incomplete_output"
        ):
            raise ConflictError("Only an incomplete synthesis can be regenerated")
        from .coverage import require_case_coverage
        await require_case_coverage(self.db, case_id=case_id, entries=previous.dependency_snapshot)
        policy = await get_policy_output(self.db, chamber_id=case.chamber_id)
        if policy.version != previous.policy_version:
            raise ConflictError("Provider policy changed; prepare current sources again")
        # A fresh run gets a fresh provider attempt. Fact cards retain their
        # source-version keys, so no document is sent to the provider again.
        run = SummaryRun(
            chamber_id=case.chamber_id, case_id=case_id,
            created_by_user_id=user.id, status=SummaryRunStatus.pending,
            source_manifest_hash=previous.source_manifest_hash,
            cache_key=hashlib.sha256(f"{previous.cache_key}:retry:{uuid.uuid4()}".encode()).hexdigest(),
            prompt_version=previous.prompt_version, schema_version=previous.schema_version,
            output_language=previous.output_language, policy_version=policy.version,
            dependency_snapshot=previous.dependency_snapshot,
        )
        self.db.add(run)
        await self.db.flush()
        dependencies = list(await self.db.scalars(select(SummarySourceDependency).where(
            SummarySourceDependency.summary_run_id == previous.id
        )))
        self.db.add_all(SummarySourceDependency(
            summary_run_id=run.id,
            working_document_revision_id=item.working_document_revision_id,
            revision_sha256=item.revision_sha256,
        ) for item in dependencies)
        await self.db.commit()
        await self.db.refresh(run)
        return self._response(run, source_count=len(previous.dependency_snapshot))

    async def _require_readable_case(self, case_id: uuid.UUID, user: User):
        if not await self.case_repo.can_access(case_id, user.id):
            raise NotFoundError("Case not found")
        case = await self.case_repo.get_by_id_simple(case_id)
        if case is None or case.chamber_id is None:
            raise NotFoundError("Case not found")
        await require_capability(
            self.db,
            chamber_id=case.chamber_id,
            user_id=user.id,
            capability=ChamberCapability.document_read,
        )
        return case

    async def _require_editable_case(self, case_id: uuid.UUID, user: User):
        case = await self._require_readable_case(case_id, user)
        if not await self.case_repo.can_edit(case_id, user.id):
            raise ForbiddenError(
                "You do not have permission to prepare a summary for this case"
            )
        return case

    @staticmethod
    def _response(run: SummaryRun, *, source_count: int) -> SummaryRunResponse:
        return SummaryRunResponse(
            id=run.id,
            case_id=run.case_id,
            status=run.status.value,
            source_manifest_hash=run.source_manifest_hash,
            prompt_version=run.prompt_version,
            policy_version=run.policy_version,
            source_count=source_count,
            schema_version=getattr(run, "schema_version", "case-summary-v1"),
            output_language=getattr(run, "output_language", "en-IN"),
            created_at=run.created_at,
            completed_at=run.completed_at,
        )
