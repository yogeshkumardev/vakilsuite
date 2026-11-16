"""Assemble reviewable court-draft JSON from a verified summary and YAML config."""

import base64
import re
import uuid
import hashlib
import json
from datetime import date
from typing import Any

from sqlalchemy import func, select

from app.core.exceptions import ConflictError, NotFoundError, ValidationError
from app.features.blueprints import get_blueprint
from app.features.cases.repository import CaseRepository
from app.features.court_rules import get_format_spec
from app.features.drafts.models import AdvocateCourtRegistration, AdvocateProfile, CourtDraft
from app.features.drafts.annexures import summary_annexures
from app.features.drafts.affidavit import cited_affidavit_findings
from app.features.drafts.schemas import (
    AdvocateCourtRegistrationUpdate,
    AdvocateProfileResponse,
    AdvocateProfileUpdate,
    CreateCourtDraftRequest,
    UpdateCourtDraftRequest,
    ReadinessResponse,
)
from app.features.chambers.provider_policy_service import resolve_authorized_task_policy
from app.features.jobs.service import get_or_create_job
from app.features.summaries.models import SummaryRun, SummaryRunStatus
from app.features.summaries.review_editing import effective_hash, effective_payload
from app.features.drafts.compliance import validate_court_draft_docx
from app.features.drafts.rendering import render_court_draft_docx
from app.features.revisions.lexical import EDITOR_DOCUMENT_SCHEMA_VERSION, validate_editor_document
from app.features.revisions.models import RevisionStatus, WorkingDocument, WorkingDocumentRevision

MISSING = "[● lawyer confirm karein ●]"
TOKEN = re.compile(r"\[\[([a-zA-Z0-9_.]+)\]\]")


def _value(context: dict[str, Any], path: str) -> str:
    value: Any = context
    for segment in path.split("."):
        if not isinstance(value, dict) or segment not in value:
            return MISSING
        value = value[segment]
    if value is None or value == "":
        return MISSING
    return str(value)


def _render(template: str, context: dict[str, Any]) -> str:
    rendered = template
    # Variants are YAML values that may themselves contain declared placeholders.
    # Bound resolution prevents a malformed config from looping indefinitely.
    for _ in range(3):
        next_value = TOKEN.sub(lambda match: _value(context, match.group(1)), rendered)
        if next_value == rendered:
            break
        rendered = next_value
    return rendered.strip()


def _missing_fields(required: dict[str, tuple[str, ...]], data: dict[str, Any]) -> list[str]:
    missing: list[str] = []
    for collection, fields in required.items():
        values = data.get(collection)
        if collection in {"applicants", "deponents"}:
            if not isinstance(values, list) or not values:
                missing.extend(f"{collection}.{field}" for field in fields)
                continue
            for index, item in enumerate(values, 1):
                for field in fields:
                    if not isinstance(item, dict) or not item.get(field):
                        missing.append(f"{collection}[{index}].{field}")
        elif not isinstance(values, dict):
            missing.extend(f"{collection}.{field}" for field in fields)
        else:
            missing.extend(f"{collection}.{field}" for field in fields if not values.get(field))
    return missing


def _word_editor_document(draft: CourtDraft) -> dict[str, object]:
    """Build a revision-safe Word editor payload from the saved court snapshot."""
    docx = render_court_draft_docx(
        draft.content, draft.rule_snapshot, title=f"Court draft {draft.version}"
    )
    children: list[dict[str, object]] = []
    for component in draft.content.get("components", []):
        if not isinstance(component, dict):
            continue
        if component.get("mode") == "table":
            columns = component.get("columns", [])
            if isinstance(columns, list):
                text = " | ".join(str(column).replace("_", " ").title() for column in columns)
                children.append({"type": "paragraph", "version": 1, "children": [{"type": "text", "text": text, "version": 1}]})
            continue
        for paragraph in component.get("paragraphs", []):
            if isinstance(paragraph, dict):
                children.append({"type": "paragraph", "version": 1, "children": [{"type": "text", "text": str(paragraph.get("text", "")), "version": 1}]})
    if not children:
        children.append({"type": "paragraph", "version": 1, "children": [{"type": "text", "text": "", "version": 1}]})
    return {
        "schemaVersion": EDITOR_DOCUMENT_SCHEMA_VERSION,
        "editorState": {
            "root": {"type": "root", "version": 1, "children": children},
            "docx_base64": base64.b64encode(docx).decode("ascii"),
        },
        # The saved DOCX retains authoritative court margins. This layout is
        # only the compatible text-projection fallback for revision indexing.
        "pageLayout": {"pageSize": "Legal", "orientation": "portrait", "marginTop": 25.4, "marginRight": 25.4, "marginBottom": 25.4, "marginLeft": 44.45},
    }


class CourtDraftService:
    def __init__(self, db):
        self.db = db
        self.cases = CaseRepository(db)

    async def _profile(self, user) -> AdvocateProfile | None:
        return await self.db.scalar(select(AdvocateProfile).where(AdvocateProfile.user_id == user.id))

    async def profile(self, user) -> AdvocateProfileResponse:
        profile = await self._profile(user)
        registrations: dict[str, dict[str, str]] = {}
        if profile:
            rows = (await self.db.scalars(select(AdvocateCourtRegistration).where(
                AdvocateCourtRegistration.advocate_profile_id == profile.id
            ))).all()
            registrations = {row.court_code: {key: str(value) for key, value in row.identifiers.items() if value} for row in rows}
        # Existing accounts retain their existing profile values until they choose to save this
        # dedicated drafting profile. This avoids a destructive migration/backfill.
        return AdvocateProfileResponse(
            full_name=user.full_name,
            office_address_line1=(profile.office_address_line1 if profile else user.office_address_line1),
            office_address_line2=(profile.office_address_line2 if profile else user.office_address_line2),
            city=(profile.city if profile else user.city), district=(profile.district if profile else user.district),
            state=(profile.state if profile else user.state),
            mobile_number=(profile.mobile_number if profile else user.mobile_number),
            chamber_number=(profile.chamber_number if profile else user.chamber_number),
            court_registrations=registrations,
        )

    async def update_profile(self, *, user, body: AdvocateProfileUpdate) -> AdvocateProfileResponse:
        profile = await self._profile(user)
        if profile is None:
            profile = AdvocateProfile(user_id=user.id)
            self.db.add(profile)
        for key, value in body.model_dump(exclude_unset=True).items():
            setattr(profile, key, value)
        await self.db.commit()
        return await self.profile(user)

    async def update_court_registration(self, *, user, court_code: str, body: AdvocateCourtRegistrationUpdate) -> AdvocateProfileResponse:
        if court_code != "allahabad_hc":
            raise ValidationError("Unsupported court registration")
        profile = await self._profile(user)
        if profile is None:
            profile = AdvocateProfile(user_id=user.id)
            self.db.add(profile)
            await self.db.flush()
        registration = await self.db.scalar(select(AdvocateCourtRegistration).where(
            AdvocateCourtRegistration.advocate_profile_id == profile.id,
            AdvocateCourtRegistration.court_code == court_code,
        ))
        identifiers = {key: value for key, value in body.model_dump(exclude_unset=True).items() if value}
        if registration is None:
            registration = AdvocateCourtRegistration(advocate_profile_id=profile.id, court_code=court_code, identifiers=identifiers)
            self.db.add(registration)
        else:
            registration.identifiers = {**registration.identifiers, **identifiers}
        await self.db.commit()
        return await self.profile(user)

    async def readiness(self, *, case_id: uuid.UUID, user, draft_type: str) -> ReadinessResponse:
        case = await self.cases.get_by_id(case_id)
        if case is None or not await self.cases.can_access(case_id, user.id):
            raise NotFoundError("Case not found")
        blueprint = get_blueprint(draft_type, "allahabad_hc", "allahabad", "physical", "en")
        profile = await self.profile(user)
        registration = profile.court_registrations.get("allahabad_hc", {})
        data = {
            "case": {"court_code": "allahabad_hc", "bench_code": "allahabad", "district": None, "case_crime_number": None, "case_crime_year": None,
                     "police_station": None, "offence_sections": None, "jail_district": None,
                     "custody_since": None},
            "applicants": [], "deponents": [], "advocate": {
                "full_name": profile.full_name,
                "enrollment_or_aor": registration.get("enrollment_number") or user.enrollment_number,
            },
        }
        if case.petitioner_name:
            data["applicants"] = [{"full_name": case.petitioner_name}]
        if case.sections:
            data["case"]["offence_sections"] = ", ".join(section.section for section in case.sections if section.is_active)
        missing = _missing_fields(blueprint.required_inputs, data)
        missing_case_fields = [field for field in missing if not field.startswith("advocate.")]
        profile_values = {
            "enrollment_number": data["advocate"]["enrollment_or_aor"],
            "office_address_line1": profile.office_address_line1,
            "mobile_number": profile.mobile_number,
            "chamber_number": profile.chamber_number,
        }
        return ReadinessResponse(
            draft_type=draft_type, blueprint_code=blueprint.blueprint_code,
            blueprint_version=blueprint.version, tier=blueprint.tiers.current,
            banner=blueprint.tiers.banner, missing_inputs=missing,
            missing_case_fields=missing_case_fields,
            missing_profile_fields=[key for key, value in profile_values.items() if not value],
            prefill=data,
            warnings=["Missing case values will remain as lawyer-confirmation placeholders; they do not block draft generation.",
                      "A verified, current case summary is required before draft creation.",
                      "This approved blueprint creates one separate affidavit per deponent; joint affidavits need separately approved wording."],
        )

    async def create(self, *, case_id: uuid.UUID, user, body: CreateCourtDraftRequest) -> CourtDraft:
        case = await self.cases.get_by_id(case_id)
        if case is None or not await self.cases.can_edit(case_id, user.id):
            raise NotFoundError("Case not found")
        summary = await self.db.scalar(select(SummaryRun).where(
            SummaryRun.id == body.summary_run_id, SummaryRun.case_id == case.id
        ).with_for_update())
        if summary is None or summary.status != SummaryRunStatus.completed:
            raise ConflictError("Approve a current summary before creating a draft")
        summary_hash = effective_hash(summary)
        if summary_hash != body.expected_summary_hash:
            raise ConflictError("Summary changed; reload before creating the draft")
        blueprint = get_blueprint(body.draft_type, body.court_code, body.bench_code,
                                  body.filing_mode, body.pleading_language)
        data = body.model_dump(mode="json", exclude={"expected_summary_hash", "summary_run_id", "draft_type", "court_code", "bench_code", "filing_mode", "pleading_language"})
        if body.annexures or body.case_specific_affidavit_paragraphs.strip():
            raise ValidationError("Annexures and affidavit prose are derived from approved sources; create a fresh draft without client-supplied text")
        data["case"]["court_code"] = body.court_code
        data["case"]["bench_code"] = body.bench_code
        # The index is derived from the approved summary's exact source versions,
        # never from a client-supplied filename, number or unrelated case upload.
        data["annexures"] = await summary_annexures(
            self.db, summary=summary, case_id=case.id, chamber_id=case.chamber_id
        )
        profile = await self.profile(user)
        registration = profile.court_registrations.get(body.court_code, {})
        advocate = data.setdefault("advocate", {})
        if not advocate.get("full_name"):
            advocate["full_name"] = profile.full_name
        if not advocate.get("enrollment_or_aor"):
            advocate["enrollment_or_aor"] = registration.get("enrollment_number") or user.enrollment_number or ""
        # Populate advocate profile fields used by deterministic footer blocks in the blueprint.
        # These are never client-supplied; they always come from the saved advocate profile.
        if not advocate.get("chamber_number"):
            advocate["chamber_number"] = profile.chamber_number or MISSING
        if not advocate.get("mobile_number"):
            advocate["mobile_number"] = profile.mobile_number or MISSING
        self._validate_deponent_links(data)
        data["case"]["application_number"] = data["case"].get("application_number", "...............")
        data["case"]["application_year"] = data["case"].get("application_year", str(date.today().year))
        data["case"]["filing_date"] = data["case"].get("filing_date") or date.today().strftime("%d.%m.%Y")
        declarations = data.setdefault("declarations", {})
        if not declarations.get("prior_bail_applications"):
            declarations["prior_bail_applications"] = (
                "neither application has been filed nor pending against the bail rejection order passed by the Learned Lower Court before the Hon'ble Apex Court, this Hon'ble Court or any other court"
            )
        if not declarations.get("criminal_history"):
            declarations["criminal_history"] = "and has no criminal history"
        content = self._assemble(blueprint, data, summary)
        rules = get_format_spec(body.court_code, body.bench_code, date.today(), body.filing_mode, body.pleading_language)
        rule_snapshot = rules.model_dump(mode="json")
        rendered = render_court_draft_docx(content, rule_snapshot, title=case.case_title)
        compliance = validate_court_draft_docx(rendered, content, rule_snapshot)
        content_hash = hashlib.sha256(json.dumps(content, sort_keys=True, ensure_ascii=False).encode()).hexdigest()
        version = (await self.db.scalar(select(func.coalesce(func.max(CourtDraft.version), 0)).where(CourtDraft.case_id == case.id))) + 1
        draft = CourtDraft(
            chamber_id=case.chamber_id, case_id=case.id, summary_run_id=summary.id,
            draft_type=body.draft_type, blueprint_code=blueprint.blueprint_code,
            blueprint_version=blueprint.version, version=version, status="needs_review",
            content=content, content_hash=content_hash, rule_snapshot=rule_snapshot,
            compliance_report=compliance.model_dump(mode="json"),
            source_summary_hash=summary_hash, created_by_user_id=user.id,
        )
        self.db.add(draft)
        await self.db.commit()
        await self.db.refresh(draft)
        return draft

    async def get(self, *, case_id: uuid.UUID, draft_id: uuid.UUID, user) -> CourtDraft:
        case = await self.cases.get_by_id(case_id)
        if case is None or not await self.cases.can_access(case_id, user.id):
            raise NotFoundError("Case not found")
        draft = await self.db.scalar(select(CourtDraft).where(
            CourtDraft.id == draft_id, CourtDraft.case_id == case_id, CourtDraft.chamber_id == case.chamber_id
        ).with_for_update())
        if draft is None:
            raise NotFoundError("Court draft not found")
        summary = await self.db.scalar(select(SummaryRun).where(SummaryRun.id == draft.summary_run_id))
        if summary is None or summary.status != SummaryRunStatus.completed or effective_hash(summary) != draft.source_summary_hash:
            if draft.status != "stale":
                draft.status, draft.stale_reason = "stale", "SUMMARY_CHANGED"
                await self.db.commit()
                await self.db.refresh(draft)
        return draft

    async def update(self, *, case_id: uuid.UUID, draft_id: uuid.UUID, user, body: UpdateCourtDraftRequest) -> CourtDraft:
        draft = await self.get(case_id=case_id, draft_id=draft_id, user=user)
        if not await self.cases.can_edit(case_id, user.id):
            raise NotFoundError("Case not found")
        if draft.status == "stale":
            raise ConflictError("The approved summary changed; regenerate this draft before editing")
        if draft.content_hash != body.expected_content_hash:
            raise ConflictError("Draft changed; reload before saving edits")
        content = json.loads(json.dumps(draft.content))
        components = {str(component.get("code")): component for component in content.get("components", []) if isinstance(component, dict)}
        seen: set[tuple[str, int]] = set()
        for edit in body.edits:
            key = (edit.component_code, edit.paragraph_index)
            if key in seen:
                raise ValidationError("A draft paragraph can be edited only once per save")
            seen.add(key)
            component = components.get(edit.component_code)
            paragraphs = component.get("paragraphs") if component else None
            if not isinstance(paragraphs, list) or edit.paragraph_index >= len(paragraphs):
                raise ValidationError("Draft paragraph no longer exists; reload the draft")
            paragraph = paragraphs[edit.paragraph_index]
            if not isinstance(paragraph, dict) or not paragraph.get("editable"):
                raise ValidationError("Court boilerplate cannot be edited here")
            paragraph["text"] = edit.text.strip()
            if paragraph.get("citations"):
                paragraph["citation_review_required"] = True
        rendered = render_court_draft_docx(content, draft.rule_snapshot, title="Court draft")
        draft.content = content
        draft.content_hash = hashlib.sha256(json.dumps(content, sort_keys=True, ensure_ascii=False).encode()).hexdigest()
        draft.compliance_report = validate_court_draft_docx(rendered, content, draft.rule_snapshot).model_dump(mode="json")
        await self.db.commit()
        await self.db.refresh(draft)
        return draft

    async def start_generation(self, *, case_id: uuid.UUID, draft_id: uuid.UUID, user, expected_content_hash: str, idempotency_key: str):
        draft = await self.get(case_id=case_id, draft_id=draft_id, user=user)
        if not await self.cases.can_edit(case_id, user.id):
            raise NotFoundError("Case not found")
        if draft.status == "stale":
            raise ConflictError("The approved summary changed; create a new draft from the current summary")
        if draft.content_hash != expected_content_hash:
            raise ConflictError("Draft changed; reload before generating")
        if not any(
            paragraph.get("affidavit_narrative")
            for component in draft.content.get("components", [])
            for paragraph in component.get("paragraphs", [])
            if isinstance(paragraph, dict)
        ):
            raise ConflictError("This draft uses an older affidavit blueprint; create a fresh draft before Gemini generation")
        summary = await self.db.get(SummaryRun, draft.summary_run_id)
        try:
            findings = cited_affidavit_findings(effective_payload(summary) or {})
        except ValueError as exc:
            raise ValidationError(str(exc)) from exc
        if not findings:
            raise ValidationError("The approved summary has no cited case-specific findings for an affidavit")
        policy = await resolve_authorized_task_policy(
            self.db, chamber_id=draft.chamber_id, operation="draft", data_class="approved_knowledge", collection_id=None
        )
        route = next((item for item in policy.providers if item.provider.value == "gemini"), None)
        if route is None:
            raise ValidationError("Configure an authorized Gemini draft model before generating")
        if policy.max_output_tokens < 1500 + 100 * len(findings):
            raise ValidationError("Gemini draft output budget is too small for the cited affidavit; increase the chamber draft token limit before submitting")
        job, created = await get_or_create_job(
            self.db, owner_id=user.id, chamber_id=draft.chamber_id, case_id=case_id,
            job_type="court_draft_generation", idempotency_key=idempotency_key,
            payload={"draft_id": str(draft.id), "draft_content_hash": draft.content_hash, "summary_run_id": str(draft.summary_run_id), "provider": "gemini", "model": route.model, "max_output_tokens": policy.max_output_tokens, "deadline_seconds": policy.deadline_seconds},
        )
        await self.db.commit()
        await self.db.refresh(job)
        return job, created

    async def materialize_word_editor(self, *, case_id: uuid.UUID, draft_id: uuid.UUID, user) -> uuid.UUID:
        """Create one lawyer-editable Word document from generated court prose."""
        draft = await self.get(case_id=case_id, draft_id=draft_id, user=user)
        if not await self.cases.can_edit(case_id, user.id):
            raise NotFoundError("Case not found")
        if draft.status == "stale":
            raise ConflictError("The approved summary changed; create a new draft before opening Word editor")
        if not draft.model:
            raise ConflictError("Generate facts, grounds and prayer before opening the Word editor")
        if draft.working_document_id:
            return draft.working_document_id

        validated = validate_editor_document(_word_editor_document(draft))
        document = WorkingDocument(
            chamber_id=draft.chamber_id,
            case_id=draft.case_id,
            title=f"Allahabad regular bail application v{draft.version}",
            document_kind="court_draft",
            created_by_user_id=user.id,
        )
        self.db.add(document)
        await self.db.flush()
        self.db.add(WorkingDocumentRevision(
            working_document_id=document.id,
            chamber_id=draft.chamber_id,
            case_id=draft.case_id,
            revision_number=1,
            parent_revision_id=None,
            client_mutation_id=None,
            status=RevisionStatus.saved,
            editor_schema_version=EDITOR_DOCUMENT_SCHEMA_VERSION,
            editor_document=validated.editor_document,
            normalized_text=validated.normalized_text,
            source_map=validated.source_map,
            content_sha256=validated.content_sha256,
            created_by_user_id=user.id,
        ))
        draft.working_document_id = document.id
        await self.db.commit()
        return document.id

    async def enqueue_export(self, *, case_id: uuid.UUID, draft_id: uuid.UUID, user, expected_content_hash: str, idempotency_key: str, acknowledge_compliance_warnings: bool):
        draft = await self.get(case_id=case_id, draft_id=draft_id, user=user)
        if not await self.cases.can_edit(case_id, user.id):
            raise NotFoundError("Case not found")
        if draft.status == "stale":
            raise ConflictError("The approved summary changed; this draft cannot be exported")
        if draft.content_hash != expected_content_hash:
            raise ConflictError("Draft changed; reload before exporting")
        profile = await self.profile(user)
        registration = profile.court_registrations.get("allahabad_hc", {})
        required_profile = {
            "enrollment_number": registration.get("enrollment_number") or user.enrollment_number,
            "office_address_line1": profile.office_address_line1,
            "mobile_number": profile.mobile_number,
            "chamber_number": profile.chamber_number,
        }
        missing = [key.replace("_", " ") for key, value in required_profile.items() if not value]
        if missing:
            raise ConflictError("Complete advocate profile before download: " + ", ".join(missing))
        report = draft.compliance_report or {}
        if report.get("overall") in {"warning", "fail"} and not acknowledge_compliance_warnings:
            raise ConflictError("Review and acknowledge the compliance warnings before export")
        job, created = await get_or_create_job(
            self.db, owner_id=user.id, chamber_id=draft.chamber_id, case_id=case_id,
            job_type="court_draft_export", idempotency_key=idempotency_key,
            payload={"draft_id": str(draft.id), "content_hash": draft.content_hash, "format": "docx"},
        )
        await self.db.commit()
        await self.db.refresh(job)
        return job, created

    @staticmethod
    def _validate_deponent_links(data: dict[str, Any]) -> None:
        applicants = data.get("applicants", [])
        applicant_ids = {
            str(applicant.get("id") or f"applicant_{index}")
            for index, applicant in enumerate(applicants, 1)
            if isinstance(applicant, dict)
        }
        for index, deponent in enumerate(data.get("deponents", []), 1):
            linked_ids = deponent.get("for_applicant_ids") if isinstance(deponent, dict) else None
            if not isinstance(linked_ids, list) or not linked_ids:
                raise ValidationError(f"Deponent {index} must be linked to at least one applicant")
            if any(str(applicant_id) not in applicant_ids for applicant_id in linked_ids):
                raise ValidationError(f"Deponent {index} is linked to an unknown applicant")

    def _assemble(self, blueprint, data: dict[str, Any], summary: SummaryRun) -> dict[str, Any]:
        components: list[dict[str, Any]] = []
        for component in blueprint.components:
            if component.mode == "table":
                table_rows = [
                    ["01.", "Criminal Misc. Bail Application (U/S 483 The Bhartiya Nagarik Suraksha Sanhita, 2023)", "", "", "01-02"],
                    ["02.", "Affidavit", "", "", "03-12"],
                ]
                annex_list = [item for item in data.get("annexures", []) if isinstance(item, dict)]
                for idx, item in enumerate(annex_list, 3):
                    desc = str(item.get("description") or MISSING)
                    if not desc.lower().startswith("a true copy") and not desc.lower().startswith("a free copy"):
                        desc = f"A true copy of {desc}"
                    annex_num = str(item.get("annexure_number") or MISSING)
                    if annex_num.isdigit():
                        annex_num = f"{int(annex_num):02d}"
                    table_rows.append([
                        f"{idx:02d}.",
                        desc,
                        str(item.get("date") or ""),
                        annex_num,
                        str(item.get("page_number") or ""),
                    ])
                table_rows.append([
                    f"{len(table_rows) + 1:02d}.",
                    "Parcha",
                    "",
                    "",
                    str(data.get("parcha_page_number") or ""),
                ])
                components.append({"code": component.code, "mode": "table", "columns": list(component.columns), "rows": table_rows})
                continue
            contexts = [data]
            if component.mode == "repeat":
                contexts = [dict(data, **{component.repeat_for: item}, **item) for item in data.get(component.repeat_for, [])]
            paragraphs: list[dict[str, str]] = []
            for context in contexts:
                if component.variants:
                    capacity = str(context.get("capacity", ""))
                    variant = component.variants.get(capacity)
                    context = dict(context, variant={"opening": variant.opening if variant else MISSING})
                if component.template:
                    if component.code == "affidavit" and "[[case_specific_affidavit_paragraphs]]" in component.template:
                        before, after = component.template.split("[[case_specific_affidavit_paragraphs]]", 1)
                        paragraphs.append({"role": component.role, "text": _render(before, context)})
                        paragraphs.append({"role": "body", "text": f"6. {MISSING} (case-specific affidavit narrative)",
                                           "editable": True, "affidavit_narrative": True})
                        paragraphs.append({"role": component.role, "text": _render(after, context)})
                    else:
                        paragraphs.append({"role": component.role, "text": _render(component.template, context)})
                for fixed in component.fixed_blocks:
                    paragraphs.append({"role": component.role, "text": _render(fixed, context)})
                for block in component.llm_blocks:
                    paragraphs.append({"role": block.role, "text": f"{MISSING} ({block.name})", "editable": True, "generation_slot": block.name})
            components.append({"code": component.code, "mode": component.mode, "paragraphs": paragraphs})
        return {
            "schema_version": 1, "blueprint": {"code": blueprint.blueprint_code, "version": blueprint.version},
            "summary_reference": {"id": str(summary.id), "hash": effective_hash(summary)},
            "annexure_sources": data.get("annexures", []),
            "components": components,
            "generation": {"mode": "deterministic_skeleton", "prompt_version": "bail-483-skeleton-v1"},
        }
