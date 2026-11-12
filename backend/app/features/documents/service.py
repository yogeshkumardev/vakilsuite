import asyncio
import logging
import re
import uuid
from datetime import UTC, datetime, timedelta

from botocore.exceptions import ClientError
from sqlalchemy import select, text, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import ConflictError, ForbiddenError, NotFoundError, ValidationError
from app.features.cases.repository import CaseRepository
from app.features.cases.models import Case
from app.features.documents.models import (
    AnnexureDocumentRange,
    AnnexureItem,
    Document,
    DocumentFileVersion,
    FileOrigin,
    UploadSessionStatus,
    UploadStatus,
)
from app.features.documents.repository import DocumentRepository
from app.features.documents.schemas import (
    ConfirmUploadResponse,
    MultipartPartUrl,
    MultipartPartUrlResponse,
    DocumentResponse,
    PresignUploadRequest,
    PresignUploadResponse,
    UpdateDocumentRequest,
    ViewUrlResponse,
)
from app.features.documents.storage import get_r2_client
from app.features.documents.verification import (
    QuarantinedUploadError,
    VerifiedFile,
    verify_uploaded_bytes,
)
from app.features.users.models import User

logger = logging.getLogger(__name__)
_get_r2_client = get_r2_client

ALLOWED_MIME_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "image/jpeg",
    "image/png",
    "image/tiff",
    "image/webp",
}
MAX_FILE_SIZE = 50 * 1024 * 1024
MULTIPART_PART_SIZE = 8 * 1024 * 1024


class DocumentService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = DocumentRepository(db)
        self.case_repo = CaseRepository(db)

    async def _require_case_access(self, case_id: uuid.UUID, user: User) -> None:
        if not await self.case_repo.can_access(case_id, user.id):
            raise NotFoundError("Case not found")

    async def _require_case_edit(self, case_id: uuid.UUID, user: User) -> Case:
        # A concurrent case deletion must finish before another upload is accepted.
        case = (
            await self.db.execute(
                select(Case)
                .where(Case.id == case_id, Case.deleted_at.is_(None))
                .with_for_update()
            )
        ).scalar_one_or_none()
        if case is None or case.chamber_id is None:
            raise NotFoundError("Case not found")
        if not await self.case_repo.can_edit(case_id, user.id):
            raise ForbiddenError("You do not have edit access to this case")
        return case

    @staticmethod
    def _verify_uploaded_object(document: Document) -> VerifiedFile:
        try:
            storage = _get_r2_client()
            head = storage.head_object(Bucket=document.r2_bucket, Key=document.r2_key)
            actual_size = int(head.get("ContentLength", -1))
            if actual_size != document.file_size_bytes:
                raise ValidationError(
                    "Uploaded file size does not match the selected file. Re-upload it."
                )
            if actual_size <= 0 or actual_size > MAX_FILE_SIZE:
                raise ValidationError("Uploaded file exceeds the permitted size. Re-upload it.")
            response = storage.get_object(Bucket=document.r2_bucket, Key=document.r2_key)
            body = response["Body"]
            try:
                payload = body.read(MAX_FILE_SIZE + 1)
            finally:
                body.close()
            if len(payload) != actual_size:
                raise ValidationError("Uploaded file could not be read completely. Re-upload it.")
            return verify_uploaded_bytes(
                declared_mime_type=document.mime_type,
                payload=payload,
            )
        except ClientError as exc:
            if exc.response.get("Error", {}).get("Code") in {"404", "NoSuchKey", "NotFound"}:
                raise ValidationError("Document file is missing from storage. Re-upload it.") from exc
            logger.exception("Could not verify uploaded object %s", document.id)
            raise ValidationError("Could not verify document upload. Retry shortly.") from exc
        except ValidationError:
            raise
        except Exception as exc:
            logger.exception("Could not verify uploaded object %s", document.id)
            raise ValidationError("Could not verify document upload. Retry shortly.") from exc

    async def ensure_verified_current_version(
        self, document: Document
    ) -> DocumentFileVersion | None:
        """Repair only an incomplete legacy verification projection.

        The logical document may predate immutable file versions, or an older
        upload confirmation may have committed the document row before its
        version metadata. Re-read and verify the private original before
        creating/updating that projection. Failed and quarantined originals are
        deliberately never revived by opening a document.
        """
        version = await self.db.scalar(
            select(DocumentFileVersion)
            .where(DocumentFileVersion.document_id == document.id)
            .order_by(DocumentFileVersion.version_number.desc())
            .limit(1)
            .with_for_update()
        )
        if document.upload_status != UploadStatus.uploaded:
            return version
        if version is not None and version.upload_status in {
            UploadStatus.failed,
            UploadStatus.quarantined,
        }:
            return version
        if (
            version is not None
            and version.upload_status == UploadStatus.uploaded
            and version.sha256_hex
            and version.detected_mime_type
        ):
            return version

        verified = await asyncio.to_thread(self._verify_uploaded_object, document)
        if version is None:
            version = await self.repo.create_file_version(
                document_id=document.id,
                chamber_id=document.chamber_id,
                version_number=1,
                r2_key=document.r2_key,
                r2_bucket=document.r2_bucket,
                original_filename=document.original_filename,
                declared_mime_type=document.mime_type,
                file_size_bytes=document.file_size_bytes,
                origin=FileOrigin.legacy,
                created_by_user_id=document.uploaded_by,
                upload_status=UploadStatus.uploaded,
                detected_mime_type=verified.detected_mime_type,
                sha256_hex=verified.sha256_hex,
                page_count=verified.page_count,
                content_classification=verified.content_classification,
                page_classification_hints=verified.page_classification_hints,
            )
        else:
            version.upload_status = UploadStatus.uploaded
            version.detected_mime_type = verified.detected_mime_type
            version.sha256_hex = verified.sha256_hex
            version.page_count = verified.page_count
            version.content_classification = verified.content_classification
            version.page_classification_hints = verified.page_classification_hints
            await self.db.flush()
        return version

    async def presign_upload(
        self, case_id: uuid.UUID, data: PresignUploadRequest, current_user: User
    ) -> PresignUploadResponse:
        case = await self._require_case_edit(case_id, current_user)
        if data.mime_type not in ALLOWED_MIME_TYPES:
            raise ValidationError("Unsupported file type")
        if data.file_size_bytes > MAX_FILE_SIZE:
            raise ValidationError("File too large")

        document_id = (
            uuid.uuid5(
                uuid.NAMESPACE_URL,
                f"upload:{current_user.id}:{case_id}:{data.client_upload_id}",
            )
            if data.client_upload_id
            else uuid.uuid4()
        )
        if data.client_upload_id:
            await self.db.execute(
                text("SELECT pg_advisory_xact_lock(:key)"),
                {"key": int.from_bytes(document_id.bytes[:8], "big", signed=True)},
            )

        document = await self.repo.get_by_id(document_id) if data.client_upload_id else None
        if document and (
            document.case_id != case_id
            or document.uploaded_by != current_user.id
            or document.original_filename != data.filename
            or document.mime_type != data.mime_type
            or document.file_size_bytes != data.file_size_bytes
            or document.document_type != data.document_type
        ):
            raise ConflictError("Upload ID is already associated with a different file")
        if document and document.upload_status == UploadStatus.uploaded:
            return PresignUploadResponse(
                already_uploaded=True,
                upload_url="",
                document_id=document.id,
                r2_key=document.r2_key,
            )

        safe_filename = re.sub(r"[^a-zA-Z0-9._-]", "_", data.filename.strip())
        r2_key = (
            f"chambers/{case.chamber_id}/cases/{case_id}/docs/"
            f"{document_id}/{safe_filename}"
        )
        is_new_document = document is None
        if is_new_document:
            document = await self.repo.create(
                id=document_id,
                case_id=case_id,
                chamber_id=case.chamber_id,
                uploaded_by=current_user.id,
                original_filename=data.filename,
                r2_key=r2_key,
                r2_bucket=settings.R2_BUCKET_NAME,
                mime_type=data.mime_type,
                file_size_bytes=data.file_size_bytes,
                document_type=data.document_type,
            )
        if is_new_document:
            # A new logical document starts with immutable original version 1.
            # Existing unit-test doubles intentionally have no relationship;
            # creating this record remains harmless because the session is a
            # mocked boundary there.
            version = await self.repo.create_file_version(
                document_id=document.id,
                chamber_id=case.chamber_id,
                version_number=1,
                r2_key=document.r2_key,
                r2_bucket=document.r2_bucket,
                original_filename=document.original_filename,
                declared_mime_type=document.mime_type,
                file_size_bytes=document.file_size_bytes,
                origin=data.origin,
                created_by_user_id=current_user.id,
            )
            await self.repo.create_upload_session(
                document_id=document.id,
                file_version_id=version.id,
                chamber_id=case.chamber_id,
                created_by_user_id=current_user.id,
                client_upload_id=data.client_upload_id,
                expires_at=datetime.now(UTC).replace(tzinfo=None) + timedelta(hours=24),
            )
        try:
            upload_url = _get_r2_client().generate_presigned_url(
                "put_object",
                Params={
                    "Bucket": settings.R2_BUCKET_NAME,
                    "Key": r2_key,
                    "ContentType": data.mime_type,
                },
                ExpiresIn=900,
            )
        except Exception as exc:
            logger.exception("Presigned upload URL generation failed")
            raise ValidationError("Failed to generate upload URL") from exc
        return PresignUploadResponse(
            upload_url=upload_url, document_id=document.id, r2_key=document.r2_key
        )

    async def confirm_upload(
        self, document_id: uuid.UUID, current_user: User
    ) -> ConfirmUploadResponse:
        document = await self.repo.get_by_id(document_id)
        if document is None:
            raise NotFoundError("Document not found")
        await self._require_case_edit(document.case_id, current_user)
        try:
            verified = self._verify_uploaded_object(document)
        except QuarantinedUploadError:
            document.upload_status = UploadStatus.quarantined
            await self.repo.mark_initial_upload_result(
                document.id, succeeded=False, quarantined=True
            )
            await self.db.flush()
            raise
        except ValidationError:
            document.upload_status = UploadStatus.failed
            await self.repo.mark_initial_upload_result(document.id, succeeded=False)
            await self.db.flush()
            raise
        was_uploaded = document.upload_status == UploadStatus.uploaded
        document = await self.repo.confirm_upload(document)
        await self.repo.mark_initial_upload_result(
            document.id,
            succeeded=True,
            detected_mime_type=verified.detected_mime_type,
            sha256_hex=verified.sha256_hex,
            page_count=verified.page_count,
            content_classification=verified.content_classification,
            page_classification_hints=verified.page_classification_hints,
        )
        if not was_uploaded:
            from app.features.summaries.invalidation import invalidate_summaries_for_case
            await invalidate_summaries_for_case(self.db, case_id=document.case_id)
        await self.db.commit()
        await self.db.refresh(document)
        return ConfirmUploadResponse(document=DocumentResponse.model_validate(document))

    async def initiate_multipart_upload(self, document_id: uuid.UUID, current_user: User) -> None:
        document = await self.repo.get_by_id(document_id)
        if document is None:
            raise NotFoundError("Document not found")
        await self._require_case_edit(document.case_id, current_user)
        session = await self.repo.get_upload_session(document_id)
        if session is None or session.status != UploadSessionStatus.pending:
            raise ConflictError("This upload session cannot be resumed")
        if session.expires_at < datetime.now(UTC).replace(tzinfo=None):
            session.status = UploadSessionStatus.expired
            raise ConflictError("Upload session expired. Start the upload again.")
        if session.multipart_upload_id is None:
            try:
                created = _get_r2_client().create_multipart_upload(
                    Bucket=document.r2_bucket,
                    Key=document.r2_key,
                    ContentType=document.mime_type,
                )
            except Exception as exc:
                logger.exception("Multipart initiation failed for document %s", document.id)
                raise ValidationError("Could not start resumable upload. Retry shortly.") from exc
            session.multipart_upload_id = created["UploadId"]
            session.multipart_part_size_bytes = MULTIPART_PART_SIZE
            document.upload_status = UploadStatus.uploading
            await self.db.flush()

    async def get_multipart_part_urls(
        self, document_id: uuid.UUID, part_numbers: list[int], current_user: User
    ) -> MultipartPartUrlResponse:
        document = await self.repo.get_by_id(document_id)
        if document is None:
            raise NotFoundError("Document not found")
        await self._require_case_edit(document.case_id, current_user)
        session = await self.repo.get_upload_session(document_id)
        if session is None or not session.multipart_upload_id or session.status != UploadSessionStatus.pending:
            raise ConflictError("Resumable upload is not active")
        max_parts = (document.file_size_bytes + MULTIPART_PART_SIZE - 1) // MULTIPART_PART_SIZE
        if any(number > max_parts for number in part_numbers):
            raise ValidationError("Requested upload part is outside this file's size")
        storage = _get_r2_client()
        parts = [
            MultipartPartUrl(
                part_number=number,
                upload_url=storage.generate_presigned_url(
                    "upload_part",
                    Params={
                        "Bucket": document.r2_bucket,
                        "Key": document.r2_key,
                        "UploadId": session.multipart_upload_id,
                        "PartNumber": number,
                    },
                    ExpiresIn=900,
                ),
            )
            for number in sorted(set(part_numbers))
        ]
        return MultipartPartUrlResponse(parts=parts)

    async def record_multipart_part(
        self, document_id: uuid.UUID, *, part_number: int, etag: str, size_bytes: int, current_user: User
    ) -> None:
        document = await self.repo.get_by_id(document_id)
        if document is None:
            raise NotFoundError("Document not found")
        await self._require_case_edit(document.case_id, current_user)
        session = await self.repo.get_upload_session(document_id)
        if session is None or not session.multipart_upload_id or session.status != UploadSessionStatus.pending:
            raise ConflictError("Resumable upload is not active")
        await self.repo.record_multipart_part(
            upload_session_id=session.id, part_number=part_number, etag=etag.strip('"'), size_bytes=size_bytes
        )

    async def complete_multipart_upload(self, document_id: uuid.UUID, current_user: User) -> None:
        document = await self.repo.get_by_id(document_id)
        if document is None:
            raise NotFoundError("Document not found")
        await self._require_case_edit(document.case_id, current_user)
        session = await self.repo.get_upload_session(document_id)
        if session is None or not session.multipart_upload_id or session.status != UploadSessionStatus.pending:
            raise ConflictError("Resumable upload is not active")
        parts = await self.repo.list_multipart_parts(session.id)
        expected_count = (document.file_size_bytes + MULTIPART_PART_SIZE - 1) // MULTIPART_PART_SIZE
        if [part.part_number for part in parts] != list(range(1, expected_count + 1)):
            raise ValidationError("All upload parts must be acknowledged before completion")
        if sum(part.size_bytes for part in parts) != document.file_size_bytes:
            raise ValidationError("Multipart part sizes do not match the original file size")
        try:
            _get_r2_client().complete_multipart_upload(
                Bucket=document.r2_bucket,
                Key=document.r2_key,
                UploadId=session.multipart_upload_id,
                MultipartUpload={"Parts": [{"PartNumber": part.part_number, "ETag": part.etag} for part in parts]},
            )
        except Exception as exc:
            logger.exception("Multipart completion failed for document %s", document.id)
            raise ValidationError("Could not complete resumable upload. Renew part URLs and retry.") from exc
        # The caller must use existing confirm-upload, which performs the
        # content verification and marks the version/session completed.

    async def cleanup_expired_multipart_uploads(self) -> int:
        """Abort only durable sessions whose expiry has passed.

        This is safe for a periodic worker: rows are locked with SKIP LOCKED,
        and a storage error leaves the session pending for a later retry.
        """
        sessions = await self.repo.list_expired_multipart_sessions(
            datetime.now(UTC).replace(tzinfo=None)
        )
        cleaned = 0
        for session in sessions:
            document = await self.repo.get_by_id(session.document_id)
            if document is None:
                continue
            try:
                _get_r2_client().abort_multipart_upload(
                    Bucket=document.r2_bucket,
                    Key=document.r2_key,
                    UploadId=session.multipart_upload_id,
                )
            except ClientError as exc:
                code = exc.response.get("Error", {}).get("Code")
                if code not in {"NoSuchUpload", "404", "NotFound"}:
                    logger.exception("Multipart cleanup failed for session %s", session.id)
                    continue
            session.status = UploadSessionStatus.expired
            document.upload_status = UploadStatus.failed
            cleaned += 1
        await self.db.flush()
        return cleaned

    async def create_annexure(self, case_id: uuid.UUID, slot_code: str, label: str, current_user: User) -> AnnexureItem:
        case = await self._require_case_edit(case_id, current_user)
        item = AnnexureItem(chamber_id=case.chamber_id, case_id=case_id, slot_code=slot_code.upper(), label=label, created_by_user_id=current_user.id)
        self.db.add(item)
        try:
            await self.db.flush()
        except Exception as exc:
            raise ConflictError("This annexure slot is already occupied") from exc
        await self.db.commit()
        return item

    async def assign_annexure(self, annexure_id: uuid.UUID, file_version_id: uuid.UUID, first_page: int | None, last_page: int | None, current_user: User) -> None:
        item = await self.db.get(AnnexureItem, annexure_id)
        if item is None:
            raise NotFoundError("Annexure not found")
        await self._require_case_edit(item.case_id, current_user)
        version = await self.db.get(DocumentFileVersion, file_version_id)
        if version is None or version.chamber_id != item.chamber_id or version.upload_status != UploadStatus.uploaded:
            raise ValidationError("Choose a verified document version from this matter")
        document = await self.repo.get_by_id(version.document_id)
        if document is None or document.case_id != item.case_id:
            raise ValidationError("Document version belongs to another matter")
        if (first_page is None) != (last_page is None) or (first_page and first_page > last_page):
            raise ValidationError("Page range must include both pages in ascending order")
        if version.page_count and last_page and last_page > version.page_count:
            raise ValidationError("Page range exceeds the verified document page count")
        await self.db.execute(update(AnnexureDocumentRange).where(AnnexureDocumentRange.annexure_item_id == item.id, AnnexureDocumentRange.is_current.is_(True)).values(is_current=False))
        self.db.add(AnnexureDocumentRange(annexure_item_id=item.id, file_version_id=version.id, first_page=first_page, last_page=last_page, assigned_by_user_id=current_user.id))
        await self.db.commit()

    async def list_documents(
        self, case_id: uuid.UUID, current_user: User
    ) -> list[DocumentResponse]:
        await self._require_case_access(case_id, current_user)
        return [
            DocumentResponse.model_validate(document)
            for document in await self.repo.list_for_case(case_id)
        ]

    async def get_document(
        self, document_id: uuid.UUID, current_user: User
    ) -> DocumentResponse:
        document = await self.repo.get_by_id(document_id)
        if document is None:
            raise NotFoundError("Document not found")
        await self._require_case_access(document.case_id, current_user)
        return DocumentResponse.model_validate(document)

    async def update_document(
        self,
        document_id: uuid.UUID,
        data: UpdateDocumentRequest,
        current_user: User,
    ) -> DocumentResponse:
        document = await self.repo.get_by_id(document_id)
        if document is None:
            raise NotFoundError("Document not found")
        await self._require_case_edit(document.case_id, current_user)
        document = await self.repo.update(document, data)
        await self.db.commit()
        return DocumentResponse.model_validate(document)

    async def get_view_url(
        self, document_id: uuid.UUID, current_user: User
    ) -> ViewUrlResponse:
        document = await self.repo.get_by_id(document_id)
        if document is None:
            raise NotFoundError("Document not found")
        await self._require_case_access(document.case_id, current_user)
        if document.upload_status != UploadStatus.uploaded:
            raise ValidationError("Document upload is not complete")
        try:
            url = _get_r2_client().generate_presigned_url(
                "get_object",
                Params={"Bucket": document.r2_bucket, "Key": document.r2_key},
                ExpiresIn=900,
            )
        except Exception as exc:
            logger.exception("Presigned view URL generation failed")
            raise ValidationError("Failed to generate document URL") from exc
        return ViewUrlResponse(
            url=url, expires_at=datetime.now(UTC) + timedelta(minutes=15)
        )

    async def delete_document(self, document_id: uuid.UUID, current_user: User) -> None:
        document = await self.repo.get_by_id(document_id)
        if document is None:
            raise NotFoundError("Document not found")
        await self._require_case_edit(document.case_id, current_user)
        # A reviewed source can be referenced by immutable provenance records.
        # Hide the document from active case workflows instead of destroying
        # the original/version rows those records attest to.
        await self.repo.soft_delete(document)
        await self.db.commit()
