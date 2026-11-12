"""Single authority check for using reviewed content as a future source.

The resolver is deliberately provider-agnostic.  It decides only whether the
currently authenticated chamber member may use an exact working-document
revision and explicit original-file dependencies.  Callers must invoke it both
when they create a workflow and immediately before any external submission.
"""
from __future__ import annotations

import enum
import uuid
from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.cases.models import Case
from app.features.cases.repository import CaseRepository
from app.features.chambers.permissions import ChamberCapability
from app.features.chambers.service import require_capability
from app.features.documents.models import Document, DocumentFileVersion, UploadStatus
from app.features.revisions.models import RevisionStatus
from app.features.revisions.repository import WorkingDocumentRepository
from app.features.users.models import User


class EligibilityReason(str, enum.Enum):
    eligible = "eligible"
    revision_not_found = "revision_not_found"
    revision_hash_mismatch = "revision_hash_mismatch"
    revision_not_approved = "revision_not_approved"
    revision_is_not_current = "revision_is_not_current"
    case_unavailable = "case_unavailable"
    chamber_scope_mismatch = "chamber_scope_mismatch"
    source_not_found = "source_not_found"
    source_hash_mismatch = "source_hash_mismatch"
    source_not_uploaded = "source_not_uploaded"
    source_coverage_invalid = "source_coverage_invalid"


@dataclass(frozen=True)
class SourceDependency:
    file_version_id: uuid.UUID
    expected_sha256: str
    first_page: int | None = None
    last_page: int | None = None


@dataclass(frozen=True)
class EligibilityResult:
    eligible: bool
    reasons: tuple[EligibilityReason, ...]
    revision_id: uuid.UUID | None = None
    revision_hash: str | None = None


class SourceEligibilityResolver:
    """Revalidates scope and freshness for an exact approved source revision."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.case_repo = CaseRepository(db)
        self.revision_repo = WorkingDocumentRepository(db)

    async def resolve(
        self,
        *,
        user: User,
        working_document_id: uuid.UUID,
        revision_id: uuid.UUID,
        expected_revision_sha256: str,
        sources: tuple[SourceDependency, ...] = (),
        allow_original_text: bool = False,
    ) -> EligibilityResult:
        """Return all safely-disclosable reasons; access denial remains not-found upstream."""
        document = await self.revision_repo.get(working_document_id)
        if document is None:
            return EligibilityResult(False, (EligibilityReason.revision_not_found,))
        if not await self.case_repo.can_access(document.case_id, user.id):
            # Do not disclose a document/revision outside the caller's case scope.
            return EligibilityResult(False, (EligibilityReason.revision_not_found,))
        case = await self.db.scalar(
            select(Case).where(Case.id == document.case_id, Case.deleted_at.is_(None))
        )
        if case is None or case.deleted_at is not None or case.chamber_id is None:
            return EligibilityResult(False, (EligibilityReason.case_unavailable,))
        if case.chamber_id != document.chamber_id:
            return EligibilityResult(False, (EligibilityReason.chamber_scope_mismatch,))
        # Capability is checked after scope lookup; it is still authoritative
        # even when a legacy case-access row exists.
        await require_capability(
            self.db,
            chamber_id=document.chamber_id,
            user_id=user.id,
            capability=ChamberCapability.document_read,
        )

        revision = await self.revision_repo.get_revision(document.id, revision_id)
        if revision is None:
            return EligibilityResult(False, (EligibilityReason.revision_not_found,))

        reasons: list[EligibilityReason] = []
        if revision.content_sha256 != expected_revision_sha256:
            reasons.append(EligibilityReason.revision_hash_mismatch)
        original_valid, original_ready = True, False
        if getattr(document, 'document_kind', '') == 'original_source':
            from app.features.documents.source_eligibility import original_source_eligibility
            original_valid, original_ready = await original_source_eligibility(self.db, document, revision)
            if not original_valid:
                reasons.append(EligibilityReason.source_not_found)
        if revision.status != RevisionStatus.approved and not (allow_original_text and original_ready):
            reasons.append(EligibilityReason.revision_not_approved)
        latest = await self.revision_repo.get_latest_revision(document.id)
        if latest is None or latest.id != revision.id:
            reasons.append(EligibilityReason.revision_is_not_current)

        for source in sources:
            reason = await self._check_source(
                case=case,
                chamber_id=document.chamber_id,
                source=source,
            )
            if reason is not None:
                reasons.append(reason)

        deduplicated = tuple(dict.fromkeys(reasons))
        return EligibilityResult(
            eligible=not deduplicated,
            reasons=deduplicated or (EligibilityReason.eligible,),
            revision_id=revision.id,
            revision_hash=revision.content_sha256,
        )

    async def _check_source(
        self,
        *,
        case: Case,
        chamber_id: uuid.UUID,
        source: SourceDependency,
    ) -> EligibilityReason | None:
        row = await self.db.execute(
            select(DocumentFileVersion, Document)
            .join(Document, Document.id == DocumentFileVersion.document_id)
            .where(DocumentFileVersion.id == source.file_version_id)
        )
        pair = row.one_or_none()
        if pair is None:
            return EligibilityReason.source_not_found
        version, document = pair
        if (
            document.case_id != case.id
            or document.chamber_id != chamber_id
            or version.chamber_id != chamber_id
            or document.deleted_at is not None
        ):
            return EligibilityReason.source_not_found
        if document.upload_status != UploadStatus.uploaded or version.upload_status != UploadStatus.uploaded:
            return EligibilityReason.source_not_uploaded
        if version.sha256_hex is None or version.sha256_hex != source.expected_sha256:
            return EligibilityReason.source_hash_mismatch
        if source.first_page is not None or source.last_page is not None:
            if (
                version.page_count is None
                or source.first_page is None
                or source.last_page is None
                or source.first_page > source.last_page
                or source.last_page > version.page_count
            ):
                return EligibilityReason.source_coverage_invalid
        return None
