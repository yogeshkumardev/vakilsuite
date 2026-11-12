from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictError, ForbiddenError, NotFoundError, ValidationError
from app.features.cases.repository import CaseRepository
from app.features.revisions.lexical import EDITOR_DOCUMENT_SCHEMA_VERSION, validate_editor_document
from app.features.chambers.permissions import ChamberCapability
from app.features.chambers.service import require_capability
from app.features.revisions.models import (
    RevisionEventType,
    RevisionStatus,
    WorkingDocument,
    WorkingDocumentRevision,
    WorkingDocumentRevisionEvent,
)
from app.features.revisions.repository import WorkingDocumentRepository
from app.features.revisions.schemas import (
    CreateRevisionRequest,
    CreateWorkingDocumentRequest,
    DecideRevisionRequest,
    RevisionDecisionAction,
    SubmitRevisionRequest,
    WorkingDocumentDetailResponse,
    WorkingDocumentRevisionResponse,
    WorkingDocumentSummaryResponse,
)
from app.features.users.models import User


class WorkingDocumentService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.case_repo = CaseRepository(db)
        self.repo = WorkingDocumentRepository(db)

    async def create(self, case_id: uuid.UUID, body: CreateWorkingDocumentRequest, user: User) -> WorkingDocumentDetailResponse:
        case = await self._require_editable_case(case_id, user)
        validated = validate_editor_document(body.editor_document)
        title = body.title.strip()
        document_kind = body.document_kind.strip()
        if not title:
            raise ValidationError("Working document title cannot be blank")
        if not document_kind:
            raise ValidationError("Working document kind cannot be blank")
        document = WorkingDocument(
            case_id=case.id,
            chamber_id=case.chamber_id,
            title=title,
            document_kind=document_kind,
            created_by_user_id=user.id,
        )
        self.db.add(document)
        await self.db.flush()
        revision = self._new_revision(
            document,
            revision_number=1,
            parent_revision_id=None,
            client_mutation_id=None,
            validated=validated,
            user_id=user.id,
        )
        self.db.add(revision)
        await self.db.commit()
        await self.db.refresh(document)
        await self.db.refresh(revision)
        return self._detail(document, revision)

    async def create_revision(self, document_id: uuid.UUID, body: CreateRevisionRequest, user: User) -> WorkingDocumentRevisionResponse:
        document = await self.repo.get_locked(document_id)
        if document is None:
            raise NotFoundError("Working document not found")
        await self._require_editable_case(document.case_id, user)
        validated = validate_editor_document(body.editor_document)
        existing = await self.repo.get_by_client_mutation(document.id, body.client_mutation_id)
        if existing is not None:
            if existing.content_sha256 != validated.content_sha256:
                raise ConflictError(
                    "client_mutation_id was already used for different editor content"
                )
            return WorkingDocumentRevisionResponse.model_validate(existing)
        latest = await self.repo.get_latest_revision(document.id)
        if latest is None:
            raise ConflictError("Working document has no current revision")
        if body.expected_revision_number != latest.revision_number:
            raise ConflictError(
                "This document changed in another editor. Reload the latest revision before saving.",
                details={
                    "current_revision_id": str(latest.id),
                    "current_revision_number": latest.revision_number,
                    "current_content_sha256": latest.content_sha256,
                    "current_status": latest.status.value,
                },
            )
        revision = self._new_revision(
            document,
            revision_number=latest.revision_number + 1,
            parent_revision_id=latest.id,
            client_mutation_id=body.client_mutation_id,
            validated=validated,
            user_id=user.id,
        )
        self.db.add(revision)
        # An older revision is no longer current once a replacement has been
        # saved. Any derived summary that depended on it remains historical,
        # but it cannot still be presented as current.
        from app.features.summaries.invalidation import invalidate_summaries_for_revision

        await invalidate_summaries_for_revision(self.db, revision_id=latest.id)
        await self.db.commit()
        await self.db.refresh(revision)
        return WorkingDocumentRevisionResponse.model_validate(revision)

    async def submit_revision(
        self,
        document_id: uuid.UUID,
        revision_id: uuid.UUID,
        body: SubmitRevisionRequest,
        user: User,
    ) -> WorkingDocumentRevisionResponse:
        document = await self.repo.get_locked(document_id)
        if document is None:
            raise NotFoundError("Working document not found")
        await self._require_editable_case(document.case_id, user)
        revision = await self.repo.get_revision(document.id, revision_id)
        latest = await self.repo.get_latest_revision(document.id)
        if revision is None or latest is None or latest.id != revision.id:
            raise ConflictError("Only the current revision can be submitted for review")
        if revision.content_sha256 != body.expected_content_sha256:
            raise ConflictError("The submitted content hash does not match the current revision")
        if revision.status == RevisionStatus.submitted:
            return WorkingDocumentRevisionResponse.model_validate(revision)
        if revision.status not in {RevisionStatus.saved, RevisionStatus.changes_requested}:
            raise ConflictError(f"Revision cannot be submitted from status {revision.status.value}")
        previous_status = revision.status
        revision.status = RevisionStatus.submitted
        self.db.add(self._event(revision, RevisionEventType.submitted, previous_status, user.id))
        await self.db.commit()
        await self.db.refresh(revision)
        return WorkingDocumentRevisionResponse.model_validate(revision)

    async def decide_revision(
        self,
        document_id: uuid.UUID,
        revision_id: uuid.UUID,
        body: DecideRevisionRequest,
        user: User,
    ) -> WorkingDocumentRevisionResponse:
        document = await self.repo.get_locked(document_id)
        if document is None:
            raise NotFoundError("Working document not found")
        await self._require_readable_case(document.case_id, user)
        await require_capability(
            self.db,
            chamber_id=document.chamber_id,
            user_id=user.id,
            capability=ChamberCapability.review_decide,
        )
        revision = await self.repo.get_revision(document.id, revision_id)
        if revision is None:
            raise NotFoundError("Working document revision not found")
        if revision.content_sha256 != body.expected_content_sha256:
            raise ConflictError("The review decision hash does not match this revision")
        destination, event_type, allowed_from = self._decision_transition(body.action)
        if revision.status == destination:
            return WorkingDocumentRevisionResponse.model_validate(revision)
        if revision.status not in allowed_from:
            raise ConflictError(
                f"Revision cannot be {destination.value} from status {revision.status.value}"
            )
        latest = await self.repo.get_latest_revision(document.id)
        if body.action != RevisionDecisionAction.revoke and (latest is None or latest.id != revision.id):
            raise ConflictError("A newer revision exists; this revision can no longer receive a review decision")
        previous_status = revision.status
        revision.status = destination
        revision.reviewed_by_user_id = user.id
        revision.reviewed_at = datetime.now(timezone.utc).replace(tzinfo=None)
        revision.review_comment = body.comment.strip() if body.comment else None
        self.db.add(self._event(revision, event_type, previous_status, user.id, revision.review_comment))
        if body.action == RevisionDecisionAction.revoke:
            from app.features.summaries.invalidation import invalidate_summaries_for_revision

            await invalidate_summaries_for_revision(self.db, revision_id=revision.id)
        await self.db.commit()
        await self.db.refresh(revision)
        return WorkingDocumentRevisionResponse.model_validate(revision)

    async def list_for_case(self, case_id: uuid.UUID, user: User) -> list[WorkingDocumentSummaryResponse]:
        await self._require_readable_case(case_id, user)
        documents = await self.repo.list_for_case(case_id)
        items: list[WorkingDocumentSummaryResponse] = []
        for document in documents:
            latest = await self.repo.get_latest_revision(document.id)
            items.append(self._summary(document, latest))
        return items

    async def get_detail(self, document_id: uuid.UUID, user: User) -> WorkingDocumentDetailResponse:
        document = await self.repo.get(document_id)
        if document is None:
            raise NotFoundError("Working document not found")
        await self._require_readable_case(document.case_id, user)
        return self._detail(document, await self.repo.get_latest_revision(document.id))

    async def _require_readable_case(self, case_id: uuid.UUID, user: User):
        if not await self.case_repo.can_access(case_id, user.id):
            raise NotFoundError("Case not found")
        case = await self.case_repo.get_by_id_simple(case_id)
        if case is None:
            raise NotFoundError("Case not found")
        return case

    async def _require_editable_case(self, case_id: uuid.UUID, user: User):
        case = await self._require_readable_case(case_id, user)
        if not await self.case_repo.can_edit(case_id, user.id):
            raise ForbiddenError("You do not have permission to edit this case")
        if case.chamber_id is None:
            raise NotFoundError("Case not found")
        return case

    @staticmethod
    def _new_revision(
        document: WorkingDocument,
        *,
        revision_number: int,
        parent_revision_id: uuid.UUID | None,
        client_mutation_id: uuid.UUID | None,
        validated,
        user_id: uuid.UUID,
    ) -> WorkingDocumentRevision:
        return WorkingDocumentRevision(
            working_document_id=document.id,
            case_id=document.case_id,
            chamber_id=document.chamber_id,
            revision_number=revision_number,
            parent_revision_id=parent_revision_id,
            client_mutation_id=client_mutation_id,
            status=RevisionStatus.saved,
            editor_schema_version=EDITOR_DOCUMENT_SCHEMA_VERSION,
            editor_document=validated.editor_document,
            normalized_text=validated.normalized_text,
            source_map=validated.source_map,
            content_sha256=validated.content_sha256,
            created_by_user_id=user_id,
        )

    @staticmethod
    def _event(
        revision: WorkingDocumentRevision,
        event_type: RevisionEventType,
        from_status: RevisionStatus,
        actor_user_id: uuid.UUID,
        comment: str | None = None,
    ) -> WorkingDocumentRevisionEvent:
        return WorkingDocumentRevisionEvent(
            revision_id=revision.id,
            working_document_id=revision.working_document_id,
            case_id=revision.case_id,
            chamber_id=revision.chamber_id,
            event_type=event_type,
            from_status=from_status,
            to_status=revision.status,
            content_sha256=revision.content_sha256,
            actor_user_id=actor_user_id,
            comment=comment,
        )

    @staticmethod
    def _decision_transition(action: RevisionDecisionAction) -> tuple[RevisionStatus, RevisionEventType, set[RevisionStatus]]:
        if action == RevisionDecisionAction.approve:
            return RevisionStatus.approved, RevisionEventType.approved, {RevisionStatus.submitted}
        if action == RevisionDecisionAction.request_changes:
            return RevisionStatus.changes_requested, RevisionEventType.changes_requested, {RevisionStatus.submitted}
        return RevisionStatus.revoked, RevisionEventType.revoked, {RevisionStatus.approved}

    @staticmethod
    def _summary(document: WorkingDocument, latest: WorkingDocumentRevision | None) -> WorkingDocumentSummaryResponse:
        return WorkingDocumentSummaryResponse(
            **{field: getattr(document, field) for field in WorkingDocumentSummaryResponse.model_fields if field != "latest_revision_number"},
            latest_revision_number=latest.revision_number if latest else None,
        )

    def _detail(self, document: WorkingDocument, latest: WorkingDocumentRevision | None) -> WorkingDocumentDetailResponse:
        return WorkingDocumentDetailResponse(
            **self._summary(document, latest).model_dump(),
            latest_revision=WorkingDocumentRevisionResponse.model_validate(latest) if latest else None,
        )
