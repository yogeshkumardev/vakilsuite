"""Direct digital-original routing and explicit full-document scanned-text review."""

import asyncio
import hashlib
import logging
import re
from botocore.exceptions import ClientError
from sqlalchemy import select
from app.core.exceptions import NotFoundError, ValidationError, ConflictError, ForbiddenError
from app.features.documents.models import Document, DocumentFileVersion, UploadStatus
from app.features.documents.source_models import (
    OriginalTextSource,
    ReviewedSourceProvenance,
)
from app.features.documents.page_provenance import (
    page_paths,
    pages_with_provenance,
    stabilize_ordered_source_pages,
)
from app.features.documents.source_schemas import (
    OriginalSourceResponse,
    SourceOcrStatusResponse,
)
from app.features.documents.source_text import (
    pages_editor,
    MAX_SOURCE_BYTES,
    SUPPORTED_SOURCE_TYPES,
    MAX_TEXT,
)
from app.features.documents.storage import get_r2_client
from app.features.cases.repository import CaseRepository
from app.features.chambers.permissions import ChamberCapability
from app.features.chambers.service import require_capability
from app.features.revisions.models import WorkingDocument, WorkingDocumentRevision
from app.features.revisions.service import WorkingDocumentService
from app.features.revisions.lexical import validate_editor_document


logger = logging.getLogger(__name__)


def read_original(version):
    try:
        client = get_r2_client()
        response = client.get_object(Bucket=version.r2_bucket, Key=version.r2_key)
        stream = response["Body"]
        try:
            data = stream.read(MAX_SOURCE_BYTES + 1)
        finally:
            stream.close()
    except ClientError as exc:
        code = exc.response.get("Error", {}).get("Code")
        if code in {"404", "NoSuchKey", "NotFound"}:
            raise ConflictError(
                "Document file is missing from secure storage. Re-upload it before preparing a source."
            ) from exc
        logger.warning("Could not read a document source from storage: %s", code)
        raise ValidationError(
            "Document source could not be read from secure storage. Retry shortly."
        ) from exc
    if (
        len(data) > MAX_SOURCE_BYTES
        or hashlib.sha256(data).hexdigest() != version.sha256_hex
    ):
        raise ConflictError(
            "Original bytes changed; re-upload and prepare current sources"
        )
    return data


class OriginalSourceService:
    def __init__(self, db):
        self.db = db

    async def authorized(self, document_id, user, *, lock=False):
        doc = await self.db.scalar(
            select(Document).where(
                Document.id == document_id, Document.deleted_at.is_(None)
            )
        )
        if doc is None or not await CaseRepository(self.db).can_access(
            doc.case_id, user.id
        ):
            raise NotFoundError("Document not found")
        await require_capability(
            self.db,
            chamber_id=doc.chamber_id,
            user_id=user.id,
            capability=ChamberCapability.document_read,
        )
        q = (
            select(DocumentFileVersion)
            .where(DocumentFileVersion.document_id == doc.id)
            .order_by(DocumentFileVersion.version_number.desc())
            .limit(1)
        )
        if lock:
            q = q.with_for_update()
        version = await self.db.scalar(q)
        if (
            doc.upload_status == UploadStatus.uploaded
            and (
                version is None
                or version.upload_status in {UploadStatus.pending, UploadStatus.uploading}
                or not version.sha256_hex
                or not version.detected_mime_type
            )
        ):
            from app.features.documents.service import DocumentService

            version = await DocumentService(self.db).ensure_verified_current_version(doc)
        if (
            version is None
            or doc.upload_status != UploadStatus.uploaded
            or version.upload_status != UploadStatus.uploaded
            or not version.sha256_hex
        ):
            raise ConflictError("Original is not verified")
        if version.detected_mime_type not in SUPPORTED_SOURCE_TYPES:
            raise ValidationError(
                "Use a PDF, JPG, PNG or WebP original for this source workflow"
            )
        return doc, version

    async def inspect(self, document_id, user):
        from app.features.documents.direct_pdf import digital_pdf

        # Inspection creates a source row on its first call. Lock the file
        # version so concurrent polling requests cannot create two rows.
        doc, version = await self.authorized(document_id, user, lock=True)
        data = await asyncio.to_thread(read_original, version)
        direct, count = (
            await asyncio.to_thread(digital_pdf, data)
            if version.detected_mime_type == "application/pdf"
            else (False, 1)
        )
        if direct:
            # No text extraction, review state, or derivative revision for digital PDFs.
            return OriginalSourceResponse(
                file_version_id=version.id,
                source_sha256=version.sha256_hex,
                mode="direct_pdf",
                pages=[],
                page_count=count,
            )
        doc, version = await self.authorized(document_id, user, lock=True)
        if hashlib.sha256(data).hexdigest() != version.sha256_hex:
            raise ConflictError("Original changed during inspection")
        source = await self.db.get(
            OriginalTextSource, version.id, populate_existing=True
        )
        if source is None:
            source = OriginalTextSource(
                file_version_id=version.id,
                source_sha256=version.sha256_hex,
                pages=[
                    {
                        "page_number": n,
                        "text": "",
                        "native": False,
                        "reason": (
                            "mobile_image_needs_review"
                            if version.detected_mime_type.startswith("image/")
                            else "scanned_document"
                        ),
                    }
                    for n in range(1, count + 1)
                ],
                mode="needs_review",
            )
            self.db.add(source)
            await self.db.commit()
        if source.source_sha256 != version.sha256_hex:
            raise ConflictError("Source fingerprint changed")
        await self.repair_typing_layout(source, doc, version, user)
        return await self.response(source)

    async def repair_typing_layout(self, source, doc, version, user):
        """Repair saved Sarvam layout/commentary while inspect holds the version lock.

        No provider/storage calls. Reviewed revisions and nonmatching user edits
        stay immutable; advancing the editor version rejects stale-tab saves.
        """
        if source.revision_id or source.mode == "reviewed" or not source.editor_document:
            return
        from app.integrations.document_typing.sarvam_output import strip_empty_image_comments

        text = validate_editor_document(source.editor_document).normalized_text
        if "<table" not in text.lower() and strip_empty_image_comments(text) == text:
            return
        if not await CaseRepository(self.db).can_edit(doc.case_id, user.id):
            return
        try:
            await require_capability(self.db, chamber_id=doc.chamber_id, user_id=user.id,
                                     capability=ChamberCapability.document_write)
        except ForbiddenError:
            return
        from app.features.jobs.models import Job, JobStatus
        from .typing_layout import repair_saved_tables, repair_saved_commentary, typed_page_text

        job = await self.db.scalar(
            select(Job).where(
                Job.job_type == "original_page_ocr",
                Job.status == JobStatus.succeeded,
                Job.idempotency_key == f"{version.id}:page:0",
                Job.payload["document_id"].as_string() == str(doc.id),
                Job.payload["request"]["expected_source_sha256"].as_string() == source.source_sha256,
            ).order_by(Job.created_at.desc()).limit(1)
        )
        response = job.payload.get("response", {}) if job else {}
        if response.get("provider") != "sarvam":
            return
        raw_pages = response.get("document", {}).get("pages", [])
        provider_pages = {p["page_number"]: p["text"] for p in raw_pages
                          if isinstance(p, dict) and isinstance(p.get("page_number"), int)
                          and isinstance(p.get("text"), str)}
        editor, changed = repair_saved_tables(source.editor_document, provider_pages)
        editor, commentary_pages = repair_saved_commentary(editor, provider_pages)
        changed |= commentary_pages
        if not changed:
            return
        try:
            validate_editor_document(editor)
            page_paths(editor, len(source.pages))
        except ValidationError:
            # Layout repair must not make an otherwise viewable workspace fail.
            return
        source.editor_document = editor
        texts = {p["pageNumber"]: typed_page_text(p["children"])
                 for p in editor["editorState"]["root"]["children"]
                 if p.get("type") == "source-page" and p["pageNumber"] in changed}
        source.pages = [{**p, "text": texts[p["page_number"]]} if p["page_number"] in texts else p
                        for p in source.pages]
        source.editor_version += 1
        await self.db.commit()
        logger.info("Repaired saved typing output: document=%s pages=%s", doc.id, len(changed))

    async def ocr_status(self, document_id, user):
        """Return typing state without reading the original object from R2.

        The source workspace uses this endpoint for polling.  The full source
        is re-inspected only when the job reaches a terminal state, when its
        editor document may have changed.
        """

        doc, version = await self.authorized(document_id, user)
        from app.features.documents.source_ocr import (
            JOB_TYPE,
            can_restart_before_dispatch,
            retry_may_charge,
        )
        from app.features.jobs.models import Job

        job = await self.db.scalar(
            select(Job)
            .where(
                Job.job_type == JOB_TYPE,
                Job.idempotency_key == f"{version.id}:page:0",
                Job.payload["document_id"].as_string() == str(doc.id),
            )
            .order_by(Job.created_at.desc())
            .limit(1)
        )
        if job is None:
            return SourceOcrStatusResponse()
        return SourceOcrStatusResponse(
            job_id=job.id,
            status=job.status.value,
            error=job.error_message,
            can_restart=can_restart_before_dispatch(job),
            can_retry=job.status.value == "failed",
            retry_may_charge=retry_may_charge(job),
            attempt_count=job.attempt_count,
        )

    async def response(self, source):
        revision = (
            await self.db.get(WorkingDocumentRevision, source.revision_id)
            if source.revision_id
            else None
        )
        if revision is not None:
            revision = await self.db.scalar(
                select(WorkingDocumentRevision)
                .where(
                    WorkingDocumentRevision.working_document_id
                    == revision.working_document_id
                )
                .order_by(WorkingDocumentRevision.revision_number.desc())
                .limit(1)
            )
        current_provenance = (
            await self.db.get(ReviewedSourceProvenance, revision.id)
            if revision
            else None
        )
        mode = source.mode
        if (
            revision
            and not current_provenance
            and (
                revision.id != source.revision_id or source.editor_document is not None
            )
        ):
            mode = "needs_provenance_repair"
        from app.features.jobs.models import Job

        jobs = list(
            await self.db.scalars(
                select(Job)
                .where(
                    Job.job_type == "original_page_ocr",
                    Job.payload["request"]["expected_source_sha256"].as_string()
                    == source.source_sha256,
                    Job.idempotency_key.like(f"{source.file_version_id}:page:%"),
                )
                .order_by(Job.created_at)
            )
        )
        states = {
            int(j.payload["request"]["page_number"]): {
                "ocr_status": j.status.value,
                "ocr_error": j.error_message,
            }
            for j in jobs
        }
        pages = [{**p, **states.get(p["page_number"], {})} for p in source.pages]
        editor = revision.editor_document if revision else source.editor_document
        if (
            editor
            and not re.sub(
                r"\[Original page \d+\]",
                "",
                validate_editor_document(editor).normalized_text,
            ).strip()
        ):
            # Old empty page labels are not extracted text. Do not mutate stored revisions.
            editor = None
        from app.features.documents.source_ocr import (
            can_restart_before_dispatch,
            retry_may_charge,
        )

        whole_job = next(
            (j for j in reversed(jobs) if j.payload["request"]["page_number"] == 0),
            None,
        )
        return OriginalSourceResponse(
            ocr_can_restart=bool(whole_job and can_restart_before_dispatch(whole_job)),
            ocr_can_retry=bool(whole_job and whole_job.status.value == "failed"),
            ocr_retry_may_charge=bool(whole_job and retry_may_charge(whole_job)),
            ocr_attempt_count=whole_job.attempt_count if whole_job else 0,
            file_version_id=source.file_version_id,
            source_sha256=source.source_sha256,
            mode=mode,
            ocr_status=states.get(0, {}).get("ocr_status"),
            ocr_error=states.get(0, {}).get("ocr_error"),
            page_count=len(source.pages),
            editor_document=editor or pages_with_provenance(source.pages),
            editor_version=revision.revision_number
            if revision
            else source.editor_version,
            pages=pages,
            working_document_id=revision.working_document_id if revision else None,
        )

    async def require_scanned(self, version):
        from app.features.documents.direct_pdf import digital_pdf

        if version.detected_mime_type == "application/pdf":
            data = await asyncio.to_thread(read_original, version)
            direct, _ = await asyncio.to_thread(digital_pdf, data)
            if direct:
                raise ValidationError(
                    "Digital PDFs go directly to case summary; transcription review is not applicable"
                )

    async def review(self, document_id, user, body):
        doc, version = await self.authorized(document_id, user, lock=True)
        await require_capability(
            self.db,
            chamber_id=doc.chamber_id,
            user_id=user.id,
            capability=ChamberCapability.review_decide,
        )
        source = await self.db.get(OriginalTextSource, version.id)
        if (
            source is None
            or source.source_sha256 != body.expected_source_sha256
            or version.sha256_hex != source.source_sha256
        ):
            raise ConflictError("Reload current source before reviewing")
        if source.revision_id:
            raise ConflictError(
                "Source already finalized; use revision review to change or revoke it"
            )
        await self.require_scanned(version)
        if source.editor_document is not None:
            raise ConflictError(
                "Use the complete document editor to review this transcription"
            )
        required = {p["page_number"] for p in source.pages if not p["native"]}
        if not body.confirmed or set(body.page_texts) != required:
            raise ValidationError(
                "Confirm every scanned/unclear page; native pages cannot be replaced"
            )
        if (
            any(not t.strip() for t in body.page_texts.values())
            or sum(len(t) for t in body.page_texts.values()) > MAX_TEXT
        ):
            raise ValidationError(
                "Every review page needs bounded text (mark a genuinely blank page explicitly)"
            )
        source.pages = [
            {**p, "text": body.page_texts.get(p["page_number"], p["text"])}
            for p in source.pages
        ]
        if sum(len(p["text"]) for p in source.pages) > MAX_TEXT:
            raise ValidationError(
                "Combined source text exceeds the safe processing limit"
            )
        source.editor_document = pages_with_provenance(source.pages)
        source.mode = "reviewed"
        source.reviewed_by = user.id
        await self.publish(source, doc, user)
        await self.db.commit()
        return await self.response(source)

    async def publish(self, source, doc, user):
        working = WorkingDocument(
            case_id=doc.case_id,
            chamber_id=doc.chamber_id,
            title=doc.original_filename[:300],
            document_kind="original_source",
            created_by_user_id=user.id,
        )
        self.db.add(working)
        await self.db.flush()
        revision = WorkingDocumentService._new_revision(
            working,
            revision_number=1,
            parent_revision_id=None,
            client_mutation_id=None,
            validated=validate_editor_document(
                source.editor_document or pages_editor(source.pages)
            ),
            user_id=user.id,
        )
        self.db.add(revision)
        await self.db.flush()
        mapping = page_paths(
            revision.editor_document, len(source.pages), require_complete=True
        )
        self.db.add(
            ReviewedSourceProvenance(
                revision_id=revision.id,
                file_version_id=source.file_version_id,
                revision_sha256=revision.content_sha256,
                source_sha256=source.source_sha256,
                page_paths=mapping,
                reviewed_by=user.id,
                mode="reviewed",
            )
        )
        source.revision_id = revision.id
        source.revision_sha256 = revision.content_sha256

    async def save_editor(self, document_id, user, body, *, review=False):
        doc, version = await self.authorized(document_id, user, lock=True)
        await require_capability(
            self.db,
            chamber_id=doc.chamber_id,
            user_id=user.id,
            capability=ChamberCapability.review_decide
            if review
            else ChamberCapability.document_write,
        )
        if not review and not await CaseRepository(self.db).can_edit(
            doc.case_id, user.id
        ):
            raise NotFoundError("Document not available for editing")
        source = await self.db.get(
            OriginalTextSource, version.id, populate_existing=True
        )
        if (
            source is None
            or source.revision_id
            or source.source_sha256 != body.expected_source_sha256
            or version.sha256_hex != source.source_sha256
        ):
            raise ConflictError("Source changed or already finalized; reload")
        if source.editor_version != body.expected_editor_version:
            raise ConflictError(
                "Text changed since it was opened. Reload before saving."
            )
        await self.require_scanned(version)
        validated = validate_editor_document(
            stabilize_ordered_source_pages(body.editor_document, len(source.pages))
        )
        if review and (
            not body.confirmed
            or not re.sub(
                r"\[Original page \d+\]", "", validated.normalized_text
            ).strip()
        ):
            raise ValidationError(
                "Confirm the complete transcription against the original"
            )
        if review:
            page_paths(
                validated.editor_document, len(source.pages), require_complete=True
            )
        source.editor_document = validated.editor_document
        source.editor_version += 1
        if review:
            source.mode = "reviewed"
            source.reviewed_by = user.id
            await self.publish(source, doc, user)
        await self.db.commit()
        return await self.response(source)

    async def repair_editor(self, document_id, user, body):
        doc, version = await self.authorized(document_id, user, lock=True)
        await require_capability(
            self.db,
            chamber_id=doc.chamber_id,
            user_id=user.id,
            capability=ChamberCapability.review_decide,
        )
        if not await CaseRepository(self.db).can_edit(doc.case_id, user.id):
            raise NotFoundError("Document not available for editing")
        await self.require_scanned(version)
        source = await self.db.get(OriginalTextSource, version.id)
        if (
            source is None
            or not source.revision_id
            or source.source_sha256 != body.expected_source_sha256
            or source.source_sha256 != version.sha256_hex
        ):
            raise ConflictError("Reload the current reviewed source")
        old = await self.db.get(WorkingDocumentRevision, source.revision_id)
        working = await self.db.get(
            WorkingDocument, old.working_document_id, with_for_update=True
        )
        latest = await self.db.scalar(
            select(WorkingDocumentRevision)
            .where(WorkingDocumentRevision.working_document_id == working.id)
            .order_by(WorkingDocumentRevision.revision_number.desc())
            .limit(1)
        )
        if latest.revision_number != body.expected_editor_version or not body.confirmed:
            raise ConflictError("Reload and confirm the exact source repair")
        validated = validate_editor_document(
            stabilize_ordered_source_pages(body.editor_document, len(source.pages))
        )
        mapping = page_paths(
            validated.editor_document, len(source.pages), require_complete=True
        )
        revised = WorkingDocumentService._new_revision(
            working,
            revision_number=latest.revision_number + 1,
            parent_revision_id=latest.id,
            client_mutation_id=None,
            validated=validated,
            user_id=user.id,
        )
        self.db.add(revised)
        await self.db.flush()
        self.db.add(
            ReviewedSourceProvenance(
                revision_id=revised.id,
                file_version_id=version.id,
                revision_sha256=revised.content_sha256,
                source_sha256=version.sha256_hex,
                page_paths=mapping,
                reviewed_by=user.id,
                mode="reviewed",
            )
        )
        from app.features.summaries.invalidation import invalidate_summaries_for_case

        await invalidate_summaries_for_case(self.db, case_id=doc.case_id)
        await self.db.commit()
        return await self.response(source)
