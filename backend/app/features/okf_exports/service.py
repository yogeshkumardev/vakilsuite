"""Build bounded deterministic OKF application metadata from reviewed case evidence."""

from __future__ import annotations

import hashlib
import json
import uuid
from pathlib import Path
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.summaries.review_editing import effective_hash, effective_payload
from app.core.config import settings
from app.core.exceptions import ConflictError, NotFoundError, ValidationError
from app.features.documents.models import (
    AnnexureDocumentRange,
    AnnexureItem,
    DocumentFileVersion,
)
from app.features.knowledge_bundles.loader import (
    BundleValidationError,
    capture_bundle,
    verify_bundle,
)
from app.features.revisions.eligibility import SourceEligibilityResolver
from app.features.revisions.models import WorkingDocumentRevision
from app.features.revisions.repository import WorkingDocumentRepository
from app.features.summaries.contracts import CaseSummaryPayload, SummaryFinding
from app.features.summaries.models import (
    SummaryRun,
    SummaryRunStatus,
    SummarySourceDependency,
)
from app.features.summaries.service import SummaryPreparationService
from app.features.users.models import User

from .schemas import (
    ConfirmedFindingSelection,
    OkfExportPreviewResponse,
    OkfAnnexureCandidateResponse,
    OkfTemplateOptionResponse,
    PrepareOkfExportPreviewRequest,
)


def _canonical_hash(value: object) -> str:
    return hashlib.sha256(
        json.dumps(
            value, sort_keys=True, separators=(",", ":"), ensure_ascii=False
        ).encode("utf-8")
    ).hexdigest()


class OkfBundleCatalog:
    """Manager-configured bundle catalog; fixture bundles are never case-exportable."""

    def __init__(self, root: Path | None = None):
        self.root = (
            root
            if root is not None
            else (Path(settings.OKF_BUNDLES_DIR) if settings.OKF_BUNDLES_DIR else None)
        )

    def templates(self) -> list[OkfTemplateOptionResponse]:
        if self.root is None or not self.root.is_dir():
            return []
        options: list[OkfTemplateOptionResponse] = []
        roots = (
            [self.root]
            if (self.root / "BUNDLE_MANIFEST.json").is_file()
            else sorted(
                (item for item in self.root.iterdir() if item.is_dir()),
                key=lambda item: item.name,
            )
        )
        for bundle_root in roots:
            try:
                bundle = verify_bundle(bundle_root)
            except BundleValidationError as exc:
                raise ValidationError(
                    "A configured OKF bundle failed integrity verification"
                ) from exc
            if bundle.bundle_id.startswith("s01_"):
                continue
            for entry in bundle.entries:
                if entry.kind != "template":
                    continue
                options.append(
                    OkfTemplateOptionResponse(
                        bundle_id=bundle.bundle_id,
                        bundle_version=bundle.version,
                        okf_spec_version=bundle.okf_spec_version,
                        okf_spec_commit=bundle.okf_spec_commit,
                        template_entry_id=entry.id,
                        template_title=str(entry.frontmatter.get("title") or entry.id),
                    )
                )
        return sorted(
            options,
            key=lambda item: (
                item.bundle_id,
                item.bundle_version,
                item.template_entry_id,
            ),
        )

    def require_template(
        self, *, bundle_id: str, bundle_version: str, template_entry_id: str
    ) -> OkfTemplateOptionResponse:
        for template in self.templates():
            if (
                template.bundle_id == bundle_id
                and template.bundle_version == bundle_version
                and template.template_entry_id == template_entry_id
            ):
                return template
        raise ValidationError("Choose a current, verified production OKF template")

    def capture_template(
        self, *, bundle_id: str, bundle_version: str, template_entry_id: str
    ) -> dict:
        self.require_template(
            bundle_id=bundle_id,
            bundle_version=bundle_version,
            template_entry_id=template_entry_id,
        )
        roots = (
            [self.root]
            if (self.root / "BUNDLE_MANIFEST.json").is_file()
            else sorted(item for item in self.root.iterdir() if item.is_dir())
        )
        matches = []
        try:
            for root in roots:
                bundle = verify_bundle(root)
                if bundle.bundle_id == bundle_id and bundle.version == bundle_version:
                    matches.append(root)
            if len(matches) != 1:
                raise BundleValidationError("Ambiguous or unavailable bundle revision")
            snapshot = capture_bundle(matches[0], template_entry_id=template_entry_id)
            if (
                snapshot["bundle_id"] != bundle_id
                or snapshot["bundle_version"] != bundle_version
            ):
                raise BundleValidationError("Selected bundle identity changed")
            return snapshot
        except (BundleValidationError, OSError) as exc:
            raise ValidationError(
                "Knowledge snapshot could not be verified; reload the template"
            ) from exc


class OkfExportPreviewService:
    """No provider calls or durable artifact writes; S07-08 owns artifact persistence."""

    def __init__(self, db: AsyncSession, *, catalog: OkfBundleCatalog | None = None):
        self.db = db
        self.catalog = catalog or OkfBundleCatalog()
        self.preparation = SummaryPreparationService(db)
        self.documents = WorkingDocumentRepository(db)
        self.eligibility = SourceEligibilityResolver(db)

    async def list_templates(
        self, *, case_id: uuid.UUID, user: User
    ) -> list[OkfTemplateOptionResponse]:
        await self.preparation._require_readable_case(case_id, user)
        return self.catalog.templates()

    async def annexure_candidates(
        self, *, case_id: uuid.UUID, user: User
    ) -> list[OkfAnnexureCandidateResponse]:
        await self.preparation._require_readable_case(case_id, user)
        items = list(
            await self.db.scalars(
                select(AnnexureItem)
                .where(AnnexureItem.case_id == case_id)
                .order_by(AnnexureItem.slot_code.asc(), AnnexureItem.id.asc())
            )
        )
        candidates: list[OkfAnnexureCandidateResponse] = []
        for item in items:
            row = (
                await self.db.execute(
                    select(AnnexureDocumentRange, DocumentFileVersion)
                    .join(
                        DocumentFileVersion,
                        DocumentFileVersion.id == AnnexureDocumentRange.file_version_id,
                    )
                    .where(
                        AnnexureDocumentRange.annexure_item_id == item.id,
                        AnnexureDocumentRange.is_current.is_(True),
                    )
                )
            ).one_or_none()
            if row is None:
                candidates.append(
                    OkfAnnexureCandidateResponse(
                        annexure_id=item.id,
                        slot_code=item.slot_code,
                        label=item.label,
                        eligible=False,
                        reason="No current document version is assigned",
                    )
                )
                continue
            _, version = row
            if version.sha256_hex is None:
                candidates.append(
                    OkfAnnexureCandidateResponse(
                        annexure_id=item.id,
                        slot_code=item.slot_code,
                        label=item.label,
                        eligible=False,
                        reason="Assigned file integrity has not been verified",
                    )
                )
                continue
            candidates.append(
                OkfAnnexureCandidateResponse(
                    annexure_id=item.id,
                    slot_code=item.slot_code,
                    label=item.label,
                    eligible=True,
                )
            )
        return candidates

    async def preview(
        self, *, case_id: uuid.UUID, body: PrepareOkfExportPreviewRequest, user: User
    ) -> OkfExportPreviewResponse:
        case = await self.preparation._require_readable_case(case_id, user)
        template = self.catalog.require_template(
            bundle_id=body.bundle_id,
            bundle_version=body.bundle_version,
            template_entry_id=body.template_entry_id,
        )
        run = await self.db.scalar(
            select(SummaryRun).where(
                SummaryRun.id == body.summary_run_id,
                SummaryRun.case_id == case_id,
            )
        )
        if run is None:
            raise NotFoundError("Reviewed summary not found")
        if run.status != SummaryRunStatus.completed:
            raise ConflictError(
                "Only a lawyer-approved summary can supply confirmed export facts"
            )
        if (
            effective_hash(run) != body.expected_summary_result_hash
            or run.result_payload is None
        ):
            raise ConflictError(
                "The reviewed summary changed; reload it before preparing an export"
            )
        await self._reauthorize_sources(run=run, user=user)
        from app.features.summaries.structured_validation import parse_summary

        payload = parse_summary(effective_payload(run))
        confirmed_facts = self._confirmed_facts(payload, body.confirmed_findings)
        annexures = await self._annexures(
            case_id=case.id, selected_ids=body.annexure_ids
        )
        application_metadata: dict[str, Any] = {
            "namespace": "vakilsuite",
            "case_id": str(case.id),
            "summary": {
                "summary_run_id": str(run.id),
                "result_hash": effective_hash(run),
                "source_manifest_hash": run.source_manifest_hash,
            },
            "template": template.model_dump(),
            "knowledge_snapshot": self.catalog.capture_template(
                bundle_id=body.bundle_id,
                bundle_version=body.bundle_version,
                template_entry_id=body.template_entry_id,
            ),
            "approved_sources": await self._source_dependencies(run.id),
            "confirmed_facts": confirmed_facts,
            "analysis_context": self._analysis_context(payload, confirmed_facts),
            "annexure_mapping": annexures,
        }
        payload_json = {
            "format": "vakilsuite-okf-export-preview/v1",
            "okf_spec": {
                "version": template.okf_spec_version,
                "commit": template.okf_spec_commit,
            },
            "application": application_metadata,
        }
        if body.authority_manifest_id is not None:
            from .authorities import capture_authorities

            application_metadata["verified_authorities"] = await capture_authorities(
                self.db,
                case_id=case_id,
                user=user,
                manifest_id=body.authority_manifest_id,
                expected_hash=body.expected_authority_context_hash,
            )
        return OkfExportPreviewResponse(
            export_format="vakilsuite-okf-export-preview/v1",
            manifest_sha256=_canonical_hash(payload_json),
            payload=payload_json,
        )

    async def _reauthorize_sources(self, *, run: SummaryRun, user: User) -> None:
        from app.features.summaries.coverage import require_case_coverage
        if getattr(run, "schema_version", "case-summary-v1") in {"case-summary-v2", "case-summary-v3"}:
            await require_case_coverage(self.db, case_id=run.case_id, entries=run.dependency_snapshot)
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
            raise ConflictError("This summary has no approved source dependencies")
        from app.features.documents.direct_pdf import collect_pdf

        for selection in run.dependency_snapshot:
            if selection.get("kind") == "original_pdf":
                await collect_pdf(
                    self.db, case_id=run.case_id, user=user, selection=selection
                )
        for dependency in dependencies:
            revision = await self.db.get(
                WorkingDocumentRevision, dependency.working_document_revision_id
            )
            if (
                revision is None
                or revision.content_sha256 != dependency.revision_sha256
            ):
                raise ConflictError(
                    "A source revision changed; prepare a new summary before export"
                )
            document = await self.documents.get(revision.working_document_id)
            if document is None or document.case_id != run.case_id:
                raise ConflictError("An approved source is no longer available")
            eligibility = await self.eligibility.resolve(
                allow_original_text=True,
                user=user,
                working_document_id=document.id,
                revision_id=revision.id,
                expected_revision_sha256=revision.content_sha256,
            )
            if not eligibility.eligible:
                raise ConflictError(
                    "An approved source is no longer eligible for export"
                )

    async def _source_dependencies(self, run_id: uuid.UUID) -> list[dict[str, str]]:
        dependencies = list(
            await self.db.scalars(
                select(SummarySourceDependency)
                .where(SummarySourceDependency.summary_run_id == run_id)
                .order_by(SummarySourceDependency.working_document_revision_id.asc())
            )
        )
        run = await self.db.get(SummaryRun, run_id)
        return [
            {
                "working_document_revision_id": str(item.working_document_revision_id),
                "revision_sha256": item.revision_sha256,
            }
            for item in dependencies
        ] + [
            item
            for item in run.dependency_snapshot
            if item.get("kind") == "original_pdf"
        ]

    @staticmethod
    def _analysis_context(payload, selected):
        from app.features.summaries.structured import (
            StructuredSummary,
            Analysis,
            walk_models,
        )

        if not isinstance(payload, StructuredSummary):
            return []
        selected_ids = {f["id"] for f in selected}
        return [
            {
                "text": a.text,
                "basis_fact_ids": ["summary:" + i for i in a.basis_fact_ids],
                "status": "ai_suggestion_requires_verification",
            }
            for a in walk_models(payload.sections)
            if isinstance(a, Analysis)
            and {"summary:" + i for i in a.basis_fact_ids} <= selected_ids
        ]

    @staticmethod
    def _confirmed_facts(
        payload: CaseSummaryPayload, selections: list[ConfirmedFindingSelection]
    ) -> list[dict[str, object]]:
        from app.features.summaries.structured import StructuredSummary

        if isinstance(payload, StructuredSummary):
            by_id = {f.id: f for f in payload.facts()}
            chosen = [s.finding_id for s in selections]
            if len(set(chosen)) != len(chosen) or any(i not in by_id for i in chosen):
                raise ValidationError(
                    "Select current stable finding IDs from this exact summary"
                )
            return [
                {
                    "id": "summary:" + ident,
                    "section": "structured_facts",
                    "finding_type": by_id[ident].status,
                    "text": by_id[ident].text,
                    "citations": [
                        c.model_dump(mode="json") for c in by_id[ident].citations
                    ],
                }
                for ident in sorted(chosen)
            ]
        if any(s.finding_id is not None for s in selections):
            raise ValidationError("Legacy summaries require legacy finding identities")
        by_name = {section.name: section for section in payload.sections}
        seen: set[tuple[str, int]] = set()
        facts: list[dict[str, object]] = []
        for selection in sorted(
            selections, key=lambda item: (item.section.value, item.finding_index)
        ):
            key = (selection.section.value, selection.finding_index)
            if key in seen:
                raise ValidationError("A confirmed finding may be selected only once")
            seen.add(key)
            section = by_name.get(selection.section)
            if section is None or selection.finding_index >= len(section.findings):
                raise ValidationError(
                    "A selected confirmed finding no longer exists in this summary"
                )
            facts.append(
                OkfExportPreviewService._fact(
                    section.findings[selection.finding_index], selection
                )
            )
        return facts

    @staticmethod
    def _fact(
        finding: SummaryFinding, selection: ConfirmedFindingSelection
    ) -> dict[str, object]:
        return {
            "id": f"summary:{selection.section.value}:{selection.finding_index}",
            "section": selection.section.value,
            "finding_type": finding.finding_type.value,
            "text": finding.text,
            "citations": [
                citation.model_dump(mode="json") for citation in finding.citations
            ],
        }

    async def _annexures(
        self, *, case_id: uuid.UUID, selected_ids: list[uuid.UUID]
    ) -> list[dict[str, object]]:
        if len(set(selected_ids)) != len(selected_ids):
            raise ValidationError("Each annexure may be selected only once")
        if not selected_ids:
            return []
        rows = (
            await self.db.execute(
                select(AnnexureItem, AnnexureDocumentRange, DocumentFileVersion)
                .join(
                    AnnexureDocumentRange,
                    AnnexureDocumentRange.annexure_item_id == AnnexureItem.id,
                )
                .join(
                    DocumentFileVersion,
                    DocumentFileVersion.id == AnnexureDocumentRange.file_version_id,
                )
                .where(
                    AnnexureItem.case_id == case_id,
                    AnnexureItem.id.in_(selected_ids),
                    AnnexureDocumentRange.is_current.is_(True),
                )
            )
        ).all()
        if len(rows) != len(selected_ids):
            raise ValidationError(
                "Every selected annexure requires a current verified document assignment"
            )
        mapping: list[dict[str, object]] = []
        for item, assignment, version in rows:
            if version.sha256_hex is None:
                raise ConflictError(
                    "A selected annexure file has not been integrity verified"
                )
            mapping.append(
                {
                    "annexure_id": str(item.id),
                    "slot_code": item.slot_code,
                    "label": item.label,
                    "file_version_id": str(version.id),
                    "file_sha256": version.sha256_hex,
                    "page_range": {
                        "first_page": assignment.first_page,
                        "last_page": assignment.last_page,
                    },
                }
            )
        return sorted(
            mapping, key=lambda item: (str(item["slot_code"]), str(item["annexure_id"]))
        )
