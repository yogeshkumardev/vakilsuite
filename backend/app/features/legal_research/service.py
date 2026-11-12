"""Authorization and durable creation for explicit legal-research requests."""

from __future__ import annotations

import hashlib
import json
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import AppError, ConflictError, NotFoundError
from app.features.cases.repository import CaseRepository
from app.features.chambers.permissions import ChamberCapability
from app.features.chambers.service import require_capability
from app.features.legal_research.models import (
    AuthorityReviewAction,
    LegalAuthorityPassage,
    LegalAuthority,
    LegalAuthorityManifest,
    LegalAuthorityReview,
    LegalAuthorityVersion,
    LegalProposition,
    LegalResearchRun,
    LegalResearchResumeIntent,
    LegalResearchOperation,
    LegalResearchOperationStatus,
    LegalResearchRunStatus,
)
from app.features.legal_research.schemas import (
    AuthorityReviewResponse,
    CreatePropositionRequest,
    CreateResearchRunRequest,
    DecideAuthorityReviewRequest,
    LegalResearchConfigResponse,
    LegalResearchRunResponse,
    PropositionResponse,
    AuthorityPassageRequest,
    AuthorityPassageResponse,
    AuthorityResponse,
    FetchAuthorityRequest,
    CreateAuthorityManifestRequest,
    AuthorityManifestResponse,
)
from app.features.users.models import User
from app.integrations.indiankanoon.contracts import SearchRequest
from app.integrations.indiankanoon.client import IndianKanoonClient
from app.integrations.indiankanoon.contracts import IndianKanoonError


class LegalResearchService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def config(self, *, case_id: uuid.UUID, user: User) -> LegalResearchConfigResponse:
        await self._case(case_id, user, ChamberCapability.legal_research_read)
        configured = settings.INDIAN_KANOON_ENABLED and bool(settings.INDIAN_KANOON_API_TOKEN.strip())
        return LegalResearchConfigResponse(
            available=configured,
            reason=None if configured else "Legal research is not configured for this chamber server.",
            max_search_pages=settings.INDIAN_KANOON_MAX_SEARCH_PAGES,
            max_selected_authorities=settings.INDIAN_KANOON_MAX_SELECTED_AUTHORITIES,
            rate_card_version=settings.INDIAN_KANOON_RATE_CARD_VERSION,
        )

    async def create_run(self, *, case_id: uuid.UUID, user: User, body: CreateResearchRunRequest) -> LegalResearchRunResponse:
        case = await self._case(case_id, user, ChamberCapability.legal_research_run)
        query = SearchRequest(query=body.query).query
        digest = hashlib.sha256(json.dumps({"query": query, "budget_paise": body.budget_paise}, sort_keys=True).encode()).hexdigest()
        existing = await self.db.scalar(
            select(LegalResearchRun).where(
                LegalResearchRun.chamber_id == case.chamber_id,
                LegalResearchRun.case_id == case.id,
                LegalResearchRun.idempotency_key == body.idempotency_key,
            )
        )
        if existing is not None:
            if existing.request_digest != digest:
                raise ConflictError("Idempotency key was already used with different research input")
            return await self._response_with_results(existing)
        run = LegalResearchRun(
            chamber_id=case.chamber_id,
            case_id=case.id,
            created_by_user_id=user.id,
            idempotency_key=body.idempotency_key,
            request_digest=digest,
            query_text=query,
            budget_paise=body.budget_paise,
            status=LegalResearchRunStatus.pending,
        )
        self.db.add(run)
        await self.db.commit()
        await self.db.refresh(run)
        # Creation is intentionally non-billable. A future worker must reserve
        # an operation and resolve chamber policy before upstream dispatch.
        return await self._response_with_results(run)

    async def get_run(self, *, case_id: uuid.UUID, run_id: uuid.UUID, user: User) -> LegalResearchRunResponse:
        await self._case(case_id, user, ChamberCapability.legal_research_read)
        run = await self.db.scalar(select(LegalResearchRun).where(LegalResearchRun.id == run_id, LegalResearchRun.case_id == case_id))
        if run is None:
            raise NotFoundError("Legal research run not found")
        return await self._response_with_results(run)

    async def list_runs(self, *, case_id: uuid.UUID, user: User) -> list[LegalResearchRunResponse]:
        await self._case(case_id, user, ChamberCapability.legal_research_read)
        runs = list(await self.db.scalars(select(LegalResearchRun).where(LegalResearchRun.case_id == case_id).order_by(LegalResearchRun.created_at.desc())))
        return [await self._response_with_results(run) for run in runs]

    async def submit_run(self, *, case_id: uuid.UUID, run_id: uuid.UUID, user: User) -> LegalResearchRunResponse:
        """Explicitly execute one reserved search; never retry an uncertain billable request."""
        case = await self._case(case_id, user, ChamberCapability.legal_research_run)
        run = await self.db.scalar(select(LegalResearchRun).where(LegalResearchRun.id == run_id, LegalResearchRun.case_id == case.id).with_for_update())
        if run is None:
            raise NotFoundError("Legal research run not found")
        if run.status == LegalResearchRunStatus.completed:
            return await self._response_with_results(run)
        if run.status != LegalResearchRunStatus.pending:
            raise ConflictError("This legal research run cannot be submitted")
        if not settings.INDIAN_KANOON_ENABLED or not settings.INDIAN_KANOON_API_TOKEN.strip():
            raise AppError("Indian Kanoon legal research is not configured for this server.", "LEGAL_RESEARCH_UNAVAILABLE", 503)
        estimated_paise = 50
        if run.budget_paise < estimated_paise:
            raise ConflictError("Research budget is below the estimated search cost")
        operation = LegalResearchOperation(
            run_id=run.id,
            operation_name="search",
            request_digest=run.request_digest,
            idempotency_key=run.idempotency_key,
            reserved_paise=estimated_paise,
            status=LegalResearchOperationStatus.dispatched,
        )
        self.db.add(operation)
        run.status, run.reserved_paise = LegalResearchRunStatus.running, estimated_paise
        await self.db.commit()
        try:
            async with IndianKanoonClient() as client:
                result = await client.search(SearchRequest(query=run.query_text, page=0))
        except IndianKanoonError as error:
            locked = await self.db.get(LegalResearchRun, run.id, with_for_update=True)
            saved = await self.db.get(LegalResearchOperation, operation.id, with_for_update=True)
            assert locked is not None and saved is not None
            locked.status = LegalResearchRunStatus.outcome_unknown if error.outcome_unknown else LegalResearchRunStatus.failed
            locked.error_code = error.code.value
            saved.status = LegalResearchOperationStatus.outcome_unknown if error.outcome_unknown else LegalResearchOperationStatus.failed
            saved.outcome_unknown, saved.error_code = error.outcome_unknown, error.code.value
            await self.db.commit()
            raise AppError(error.message, error.code.value, error.status_code, {"outcome_unknown": error.outcome_unknown}) from error
        saved = await self.db.get(LegalResearchOperation, operation.id, with_for_update=True)
        locked = await self.db.get(LegalResearchRun, run.id, with_for_update=True)
        assert saved is not None and locked is not None
        saved.status, saved.result_payload = LegalResearchOperationStatus.completed, {"hits": [hit.model_dump(mode="json") for hit in result.hits], "page": result.page, "has_more": result.has_more}
        locked.status, locked.spent_estimate_paise = LegalResearchRunStatus.completed, estimated_paise
        await self.db.commit()
        return self._response(locked, results=saved.result_payload.get("hits", []))

    async def create_proposition(self, *, case_id: uuid.UUID, user: User, body: CreatePropositionRequest) -> PropositionResponse:
        case = await self._case(case_id, user, ChamberCapability.legal_research_run)
        version = await self.db.scalar(
            select(LegalAuthorityVersion)
            .join(LegalAuthorityPassage, LegalAuthorityPassage.authority_version_id == LegalAuthorityVersion.id)
            .where(LegalAuthorityVersion.id == body.authority_version_id, LegalAuthorityPassage.id == body.passage_id)
        )
        if version is None:
            raise NotFoundError("Authority passage not found")
        # Ensure the authority belongs to this chamber before accepting a copied UUID.
        authority = await self.db.scalar(select(LegalAuthority).where(LegalAuthority.id == version.authority_id, LegalAuthority.chamber_id == case.chamber_id))
        if authority is None:
            raise NotFoundError("Authority passage not found")
        text = " ".join(body.text.split())
        digest = hashlib.sha256(text.encode()).hexdigest()
        proposition = LegalProposition(chamber_id=case.chamber_id, case_id=case.id, authority_version_id=version.id, passage_id=body.passage_id, text=text, text_hash=digest, created_by_user_id=user.id)
        self.db.add(proposition)
        await self.db.flush()
        review = LegalAuthorityReview(chamber_id=case.chamber_id, case_id=case.id, proposition_id=proposition.id)
        self.db.add(review)
        await self.db.commit()
        await self.db.refresh(proposition)
        await self.db.refresh(review)
        return PropositionResponse(id=proposition.id, authority_version_id=proposition.authority_version_id, passage_id=proposition.passage_id, text=proposition.text, text_hash=proposition.text_hash, review_id=review.id, review_action=review.action.value, review_version=review.version, created_at=proposition.created_at)

    async def decide_review(self, *, case_id: uuid.UUID, review_id: uuid.UUID, user: User, body: DecideAuthorityReviewRequest) -> AuthorityReviewResponse:
        case = await self._case(case_id, user, ChamberCapability.review_decide)
        review = await self.db.scalar(select(LegalAuthorityReview).where(LegalAuthorityReview.id == review_id, LegalAuthorityReview.case_id == case.id, LegalAuthorityReview.chamber_id == case.chamber_id).with_for_update())
        if review is None:
            raise NotFoundError("Authority review not found")
        if review.version != body.expected_version:
            raise ConflictError("Authority review changed; reload before deciding")
        if review.action != AuthorityReviewAction.pending:
            raise ConflictError("This authority review already has a decision")
        review.action = AuthorityReviewAction(body.action)
        review.version += 1
        review.treatment_notes = body.treatment_notes.strip() if body.treatment_notes else None
        from datetime import UTC, datetime
        review.decided_by_user_id = user.id
        review.decided_at = datetime.now(UTC).replace(tzinfo=None)
        if review.action == AuthorityReviewAction.approved:
            self.db.add(LegalResearchResumeIntent(review_id=review.id, idempotency_key=f"authority-review:{review.id}"))
        await self.db.commit()
        await self.db.refresh(review)
        if review.action == AuthorityReviewAction.approved:
            intent = await self.db.scalar(select(LegalResearchResumeIntent).where(LegalResearchResumeIntent.review_id == review.id))
            if intent is not None:
                from app.worker.tasks.legal_research import resume_approved_authority
                try:
                    resume_approved_authority.delay(str(intent.id))
                except Exception:
                    # The durable outbox remains pending; reconciler delivery is safe.
                    pass
        return AuthorityReviewResponse(id=review.id, proposition_id=review.proposition_id, action=review.action.value, version=review.version, treatment_notes=review.treatment_notes, decided_by_user_id=review.decided_by_user_id, decided_at=review.decided_at)

    async def fetch_authority(self, *, case_id: uuid.UUID, upstream_document_id: int, user: User, body: FetchAuthorityRequest) -> AuthorityResponse:
        case = await self._case(case_id, user, ChamberCapability.legal_research_run)
        run = await self.db.scalar(select(LegalResearchRun).where(LegalResearchRun.id == body.run_id, LegalResearchRun.case_id == case.id).with_for_update())
        if run is None:
            raise NotFoundError("Legal research run not found")
        if run.status != LegalResearchRunStatus.completed:
            raise ConflictError("Complete the search before fetching an authority")
        if not settings.INDIAN_KANOON_ENABLED or not settings.INDIAN_KANOON_API_TOKEN.strip():
            raise AppError("Indian Kanoon legal research is not configured for this server.", "LEGAL_RESEARCH_UNAVAILABLE", 503)
        # Document + metadata + optional fragment; original documents remain disabled.
        estimate = 22 + (5 if body.include_fragment else 0)
        if run.spent_estimate_paise + estimate > run.budget_paise:
            raise ConflictError("Authority fetch would exceed the research budget")
        digest = hashlib.sha256(f"authority:{upstream_document_id}:{body.include_fragment}".encode()).hexdigest()
        existing = await self.db.scalar(select(LegalResearchOperation).where(LegalResearchOperation.run_id == run.id, LegalResearchOperation.operation_name == "fetch_authority", LegalResearchOperation.request_digest == digest))
        if existing and existing.status == LegalResearchOperationStatus.completed:
            authority_id = existing.result_payload.get("authority_id") if existing.result_payload else None
            authority = await self.db.get(LegalAuthority, authority_id) if authority_id else None
            if authority is not None:
                return AuthorityResponse(id=authority.id, upstream_document_id=authority.upstream_document_id, canonical_url=authority.canonical_url, current_version_id=authority.current_version_id)
        operation = LegalResearchOperation(run_id=run.id, operation_name="fetch_authority", request_digest=digest, idempotency_key=f"{run.idempotency_key}:authority:{upstream_document_id}", reserved_paise=estimate, status=LegalResearchOperationStatus.dispatched)
        self.db.add(operation)
        run.reserved_paise += estimate
        await self.db.commit()
        try:
            async with IndianKanoonClient() as client:
                document = await client.document(upstream_document_id)
                metadata = await client.metadata(upstream_document_id)
                fragment = await client.fragment(upstream_document_id, run.query_text) if body.include_fragment else None
        except IndianKanoonError as error:
            await self._record_fetch_error(run_id=run.id, operation_id=operation.id, error=error)
            raise AppError(error.message, error.code.value, error.status_code, {"outcome_unknown": error.outcome_unknown}) from error
        authority = await self.db.scalar(select(LegalAuthority).where(LegalAuthority.chamber_id == case.chamber_id, LegalAuthority.upstream_document_id == upstream_document_id).with_for_update())
        if authority is None:
            authority = LegalAuthority(chamber_id=case.chamber_id, upstream_document_id=upstream_document_id, canonical_url=f"https://indiankanoon.org/doc/{upstream_document_id}/")
            self.db.add(authority)
            await self.db.flush()
        text = document.text or ""
        metadata_json = {"document": document.raw, "metadata": metadata.raw, "fragment": fragment.raw if fragment else {}}
        content_hash = hashlib.sha256((text + json.dumps(metadata_json, sort_keys=True)).encode()).hexdigest()
        version = await self.db.scalar(select(LegalAuthorityVersion).where(LegalAuthorityVersion.authority_id == authority.id, LegalAuthorityVersion.content_hash == content_hash))
        if version is None:
            version = LegalAuthorityVersion(authority_id=authority.id, content_hash=content_hash, metadata_json=metadata_json, normalized_text=text or None)
            self.db.add(version)
            await self.db.flush()
        authority.current_version_id = version.id
        saved = await self.db.get(LegalResearchOperation, operation.id, with_for_update=True)
        refreshed_run = await self.db.get(LegalResearchRun, run.id, with_for_update=True)
        assert saved is not None and refreshed_run is not None
        saved.status, saved.result_payload = LegalResearchOperationStatus.completed, {"authority_id": str(authority.id), "authority_version_id": str(version.id)}
        refreshed_run.spent_estimate_paise += estimate
        await self.db.commit()
        return AuthorityResponse(id=authority.id, upstream_document_id=authority.upstream_document_id, canonical_url=authority.canonical_url, current_version_id=authority.current_version_id)

    async def create_passage(self, *, case_id: uuid.UUID, authority_id: uuid.UUID, user: User, body: AuthorityPassageRequest) -> AuthorityPassageResponse:
        case = await self._case(case_id, user, ChamberCapability.legal_research_run)
        authority = await self.db.scalar(select(LegalAuthority).where(LegalAuthority.id == authority_id, LegalAuthority.chamber_id == case.chamber_id))
        version = await self.db.scalar(select(LegalAuthorityVersion).where(LegalAuthorityVersion.id == body.authority_version_id, LegalAuthorityVersion.authority_id == authority_id))
        if authority is None or version is None or not version.normalized_text:
            raise NotFoundError("Authority text is unavailable")
        if body.end_offset > len(version.normalized_text) or body.start_offset >= body.end_offset:
            raise ConflictError("Passage offsets no longer match the authority text")
        text = version.normalized_text[body.start_offset:body.end_offset]
        digest = hashlib.sha256(text.encode()).hexdigest()
        passage = await self.db.scalar(select(LegalAuthorityPassage).where(LegalAuthorityPassage.authority_version_id == version.id, LegalAuthorityPassage.text_hash == digest, LegalAuthorityPassage.start_offset == body.start_offset))
        if passage is None:
            passage = LegalAuthorityPassage(authority_version_id=version.id, text=text, text_hash=digest, start_offset=body.start_offset, end_offset=body.end_offset, paragraph_label=body.paragraph_label, locator_valid=True)
            self.db.add(passage)
            await self.db.commit()
            await self.db.refresh(passage)
        return AuthorityPassageResponse(id=passage.id, authority_version_id=passage.authority_version_id, text=passage.text, text_hash=passage.text_hash, start_offset=passage.start_offset, end_offset=passage.end_offset, paragraph_label=passage.paragraph_label, locator_valid=passage.locator_valid)

    async def get_authority(self, *, case_id: uuid.UUID, authority_id: uuid.UUID, user: User) -> AuthorityResponse:
        case = await self._case(case_id, user, ChamberCapability.legal_research_read)
        authority = await self.db.scalar(select(LegalAuthority).where(LegalAuthority.id == authority_id, LegalAuthority.chamber_id == case.chamber_id))
        if authority is None:
            raise NotFoundError("Authority not found")
        version = await self.db.get(LegalAuthorityVersion, authority.current_version_id) if authority.current_version_id else None
        return AuthorityResponse(id=authority.id, upstream_document_id=authority.upstream_document_id, canonical_url=authority.canonical_url, current_version_id=authority.current_version_id, text=version.normalized_text if version else None)

    async def list_manifests(self, *, case_id: uuid.UUID, user: User, offset: int = 0) -> list[AuthorityManifestResponse]:
        case = await self._case(case_id, user, ChamberCapability.legal_research_read)
        rows = await self.db.scalars(select(LegalAuthorityManifest).where(
            LegalAuthorityManifest.case_id == case.id,
            LegalAuthorityManifest.chamber_id == case.chamber_id,
        ).order_by(LegalAuthorityManifest.created_at.desc(), LegalAuthorityManifest.id.desc()).offset(offset).limit(50))
        return [AuthorityManifestResponse(id=row.id, context_hash=row.context_hash,
            references=row.references_json, is_stale=row.is_stale) for row in rows]

    async def create_manifest(self, *, case_id: uuid.UUID, user: User, body: CreateAuthorityManifestRequest) -> AuthorityManifestResponse:
        case = await self._case(case_id, user, ChamberCapability.legal_research_read)
        reviews = list(await self.db.scalars(select(LegalAuthorityReview).where(LegalAuthorityReview.id.in_(body.review_ids), LegalAuthorityReview.case_id == case.id, LegalAuthorityReview.chamber_id == case.chamber_id)))
        if len(reviews) != len(set(body.review_ids)) or any(item.action != AuthorityReviewAction.approved for item in reviews):
            raise ConflictError("Every selected authority must have a current approved review")
        propositions = {item.id: item for item in await self.db.scalars(select(LegalProposition).where(LegalProposition.id.in_([review.proposition_id for review in reviews])))}
        references = [{"review_id": str(review.id), "proposition_id": str(review.proposition_id), "proposition_hash": propositions[review.proposition_id].text_hash, "review_version": review.version} for review in sorted(reviews, key=lambda item: str(item.id))]
        context_hash = hashlib.sha256(json.dumps(references, sort_keys=True, separators=(",", ":")).encode()).hexdigest()
        manifest = LegalAuthorityManifest(chamber_id=case.chamber_id, case_id=case.id, created_by_user_id=user.id, context_hash=context_hash, references_json=references)
        self.db.add(manifest)
        await self.db.commit()
        await self.db.refresh(manifest)
        return AuthorityManifestResponse(id=manifest.id, context_hash=manifest.context_hash, references=manifest.references_json, is_stale=manifest.is_stale)

    async def _record_fetch_error(self, *, run_id: uuid.UUID, operation_id: uuid.UUID, error: IndianKanoonError) -> None:
        run = await self.db.get(LegalResearchRun, run_id, with_for_update=True)
        operation = await self.db.get(LegalResearchOperation, operation_id, with_for_update=True)
        if run is None or operation is None:
            return
        operation.status = LegalResearchOperationStatus.outcome_unknown if error.outcome_unknown else LegalResearchOperationStatus.failed
        operation.outcome_unknown, operation.error_code = error.outcome_unknown, error.code.value
        run.error_code = error.code.value
        await self.db.commit()

    async def _case(self, case_id: uuid.UUID, user: User, capability: ChamberCapability):
        case = await CaseRepository(self.db).get_by_id(case_id)
        if case is None or not await CaseRepository(self.db).can_access(case_id, user.id):
            raise NotFoundError("Case not found")
        await require_capability(self.db, chamber_id=case.chamber_id, user_id=user.id, capability=capability)
        return case

    @staticmethod
    def _response(run: LegalResearchRun, *, results: list[dict] | None = None) -> LegalResearchRunResponse:
        # Results remain operation-scoped. This method intentionally exposes no
        # query to another run or chamber and makes no upstream GET request.
        return LegalResearchRunResponse(
            id=run.id,
            status=run.status.value,
            query=run.query_text,
            budget_paise=run.budget_paise,
            reserved_paise=run.reserved_paise,
            spent_estimate_paise=run.spent_estimate_paise,
            error_code=run.error_code,
            results=results or [],
        )

    async def _response_with_results(self, run: LegalResearchRun) -> LegalResearchRunResponse:
        operation = await self.db.scalar(
            select(LegalResearchOperation)
            .where(LegalResearchOperation.run_id == run.id, LegalResearchOperation.status == LegalResearchOperationStatus.completed)
            .order_by(LegalResearchOperation.completed_at.desc())
        )
        payload = operation.result_payload if operation and operation.result_payload else {}
        return self._response(run, results=payload.get("hits", []))
