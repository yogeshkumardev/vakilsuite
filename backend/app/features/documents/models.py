import enum
import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    Boolean,
    BigInteger,
    DateTime,
    Enum as SAEnum,
    ForeignKey,
    Index,
    Integer,
    String,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.db.base import Base

if TYPE_CHECKING:
    from app.features.cases.models import Case
    from app.features.users.models import User


class DocumentType(str, enum.Enum):
    fir = "fir"
    chargesheet = "chargesheet"
    summon = "summon"
    bail_rejection_order = "bail_rejection_order"
    bail_order = "bail_order"
    affidavit = "affidavit"
    counter_affidavit = "counter_affidavit"
    rejoinder = "rejoinder"
    vakalatnama = "vakalatnama"
    judgment = "judgment"
    court_order = "court_order"
    other = "other"


class UploadStatus(str, enum.Enum):
    pending = "pending"
    uploading = "uploading"
    uploaded = "uploaded"
    failed = "failed"
    quarantined = "quarantined"


class FileOrigin(str, enum.Enum):
    """How an original entered VakilSuite; it is provenance, not approval."""

    unknown = "unknown"
    web_upload = "web_upload"
    web_camera = "web_camera"
    android_scan = "android_scan"
    android_import = "android_import"
    legacy = "legacy"


class UploadSessionStatus(str, enum.Enum):
    pending = "pending"
    uploaded = "uploaded"
    failed = "failed"
    expired = "expired"


class DocumentContentClassification(str, enum.Enum):
    """Technical file hint only; never evidence review or factual approval."""

    unknown = "unknown"
    digital = "digital"
    scanned = "scanned"
    mixed = "mixed"
    not_applicable = "not_applicable"


class ExtractionAttemptStatus(str, enum.Enum):
    reserved = "reserved"
    submitted = "submitted"
    succeeded = "succeeded"
    failed = "failed"
    unknown = "unknown"


class Document(Base):
    """Logical case document.

    The legacy file columns remain the active-version compatibility projection
    while S04 introduces immutable ``DocumentFileVersion`` rows.  They must not
    be used as an excuse to overwrite a verified original.
    """

    __tablename__ = "documents"
    __table_args__ = (
        Index("ix_documents_case_created", "case_id", "created_at"),
        Index("ix_documents_chamber_id", "chamber_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    case_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False, index=True
    )
    # Nullable during the S02 expand/migrate phase; populated from the parent
    # case for legacy records and enforced by scoped writers in S02-03.
    chamber_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("chambers.id", ondelete="RESTRICT"), nullable=True
    )
    uploaded_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    original_filename: Mapped[str] = mapped_column(String(500), nullable=False)
    r2_key: Mapped[str] = mapped_column(String(1000), nullable=False)
    r2_bucket: Mapped[str] = mapped_column(String(255), nullable=False)
    mime_type: Mapped[str] = mapped_column(String(100), nullable=False)
    file_size_bytes: Mapped[int] = mapped_column(BigInteger, nullable=False)
    document_type: Mapped[DocumentType] = mapped_column(
        SAEnum(DocumentType, name="document_type"), nullable=False, default=DocumentType.other
    )
    display_name: Mapped[str | None] = mapped_column(String(500))
    deleted_at: Mapped[datetime | None] = mapped_column(nullable=True)
    upload_status: Mapped[UploadStatus] = mapped_column(
        SAEnum(UploadStatus, name="upload_status"), nullable=False, default=UploadStatus.pending
    )
    created_at: Mapped[datetime] = mapped_column(default=func.now())
    updated_at: Mapped[datetime] = mapped_column(default=func.now(), onupdate=func.now())

    case: Mapped["Case"] = relationship("Case", back_populates="documents")
    uploaded_by_user: Mapped["User"] = relationship("User", foreign_keys=[uploaded_by])
    file_versions: Mapped[list["DocumentFileVersion"]] = relationship(
        "DocumentFileVersion",
        back_populates="document",
        cascade="all, delete-orphan",
        order_by="DocumentFileVersion.version_number",
    )
    upload_sessions: Mapped[list["DocumentUploadSession"]] = relationship(
        "DocumentUploadSession",
        back_populates="document",
        cascade="all, delete-orphan",
    )


class DocumentFileVersion(Base):
    """One immutable original-file version belonging to a logical document.

    Detection and hash values are deliberately nullable until S04-02 verifies
    the object server-side.  Client-declared MIME and size are retained
    separately from the later detected values.
    """

    __tablename__ = "document_file_versions"
    __table_args__ = (
        UniqueConstraint("document_id", "version_number", name="uq_document_file_versions_number"),
        Index("ix_document_file_versions_chamber_document", "chamber_id", "document_id"),
        Index("ix_document_file_versions_sha256", "sha256_hex"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    document_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("documents.id", ondelete="CASCADE"),
        nullable=False,
    )
    chamber_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("chambers.id", ondelete="RESTRICT"),
        nullable=False,
    )
    version_number: Mapped[int] = mapped_column(Integer, nullable=False)
    r2_key: Mapped[str] = mapped_column(String(1000), nullable=False)
    r2_bucket: Mapped[str] = mapped_column(String(255), nullable=False)
    original_filename: Mapped[str] = mapped_column(String(500), nullable=False)
    declared_mime_type: Mapped[str] = mapped_column(String(100), nullable=False)
    detected_mime_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    file_size_bytes: Mapped[int] = mapped_column(BigInteger, nullable=False)
    sha256_hex: Mapped[str | None] = mapped_column(String(64), nullable=True)
    page_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    content_classification: Mapped[DocumentContentClassification] = mapped_column(
        SAEnum(DocumentContentClassification, name="document_content_classification"),
        nullable=False,
        default=DocumentContentClassification.unknown,
        server_default=DocumentContentClassification.unknown.value,
    )
    # Per-page technical observations, e.g. text-layer presence. This must not
    # contain OCR text or be mistaken for reviewed factual authority.
    page_classification_hints: Mapped[list[dict[str, object]] | None] = mapped_column(
        JSONB, nullable=True
    )
    origin: Mapped[FileOrigin] = mapped_column(
        SAEnum(FileOrigin, name="document_file_origin"),
        nullable=False,
        default=FileOrigin.unknown,
    )
    upload_status: Mapped[UploadStatus] = mapped_column(
        SAEnum(UploadStatus, name="upload_status", create_type=False),
        nullable=False,
        default=UploadStatus.pending,
    )
    created_by_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(), default=func.now(), server_default=func.now(), nullable=False
    )

    document: Mapped["Document"] = relationship("Document", back_populates="file_versions")


class DocumentUploadSession(Base):
    """Durable intent for one original-file upload.

    Presigned URLs are intentionally not persisted: they are short-lived
    transport credentials, whereas this row is the recoverable workflow state.
    """

    __tablename__ = "document_upload_sessions"
    __table_args__ = (
        UniqueConstraint("file_version_id", name="uq_document_upload_sessions_file_version"),
        Index("ix_document_upload_sessions_chamber_status", "chamber_id", "status"),
        Index("ix_document_upload_sessions_expires", "expires_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    document_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("documents.id", ondelete="CASCADE"),
        nullable=False,
    )
    file_version_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("document_file_versions.id", ondelete="CASCADE"),
        nullable=False,
    )
    chamber_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("chambers.id", ondelete="RESTRICT"),
        nullable=False,
    )
    created_by_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    client_upload_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    status: Mapped[UploadSessionStatus] = mapped_column(
        SAEnum(UploadSessionStatus, name="document_upload_session_status"),
        nullable=False,
        default=UploadSessionStatus.pending,
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(), nullable=False)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(), nullable=True)
    multipart_upload_id: Mapped[str | None] = mapped_column(String(512), nullable=True)
    multipart_part_size_bytes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(), default=func.now(), server_default=func.now(), nullable=False
    )

    document: Mapped["Document"] = relationship("Document", back_populates="upload_sessions")
    file_version: Mapped["DocumentFileVersion"] = relationship("DocumentFileVersion")


class DocumentUploadPart(Base):
    """Server checkpoint for an acknowledged R2 multipart part."""

    __tablename__ = "document_upload_parts"
    __table_args__ = (
        UniqueConstraint("upload_session_id", "part_number", name="uq_document_upload_part"),
        Index("ix_document_upload_parts_session", "upload_session_id"),
    )
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    upload_session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("document_upload_sessions.id", ondelete="CASCADE"), nullable=False
    )
    part_number: Mapped[int] = mapped_column(Integer, nullable=False)
    etag: Mapped[str] = mapped_column(String(512), nullable=False)
    size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(), default=func.now(), server_default=func.now(), nullable=False)


class AnnexureItem(Base):
    """Stable, human-controlled annexure slot under one matter."""

    __tablename__ = "annexure_items"
    __table_args__ = (UniqueConstraint("case_id", "slot_code", name="uq_annexure_item_slot"),)
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    chamber_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("chambers.id", ondelete="RESTRICT"), nullable=False)
    case_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False)
    slot_code: Mapped[str] = mapped_column(String(32), nullable=False)
    label: Mapped[str] = mapped_column(String(500), nullable=False)
    created_by_user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(), default=func.now(), server_default=func.now(), nullable=False)


class AnnexureDocumentRange(Base):
    """Immutable version/page-range assignment; old assignments remain historical."""

    __tablename__ = "annexure_document_ranges"
    __table_args__ = (Index("ix_annexure_document_ranges_annexure_current", "annexure_item_id", "is_current"),)
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    annexure_item_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("annexure_items.id", ondelete="CASCADE"), nullable=False)
    file_version_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("document_file_versions.id", ondelete="RESTRICT"), nullable=False)
    first_page: Mapped[int | None] = mapped_column(Integer, nullable=True)
    last_page: Mapped[int | None] = mapped_column(Integer, nullable=True)
    is_current: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    assigned_by_user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(), default=func.now(), server_default=func.now(), nullable=False)


class DocumentExtractionAttempt(Base):
    """Durable billable-operation ledger; never stores raw document/provider output."""

    __tablename__ = "document_extraction_attempts"
    __table_args__ = (
        UniqueConstraint("job_id", "sequence", name="uq_document_extraction_attempt_sequence"),
        Index("ix_document_extraction_attempts_job", "job_id"),
        Index("ix_document_extraction_attempts_status", "status"),
    )
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    job_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False)
    file_version_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("document_file_versions.id", ondelete="RESTRICT"), nullable=False)
    sequence: Mapped[int] = mapped_column(Integer, nullable=False)
    provider: Mapped[str] = mapped_column(String(32), nullable=False)
    model: Mapped[str] = mapped_column(String(160), nullable=False)
    status: Mapped[ExtractionAttemptStatus] = mapped_column(SAEnum(ExtractionAttemptStatus, name="document_extraction_attempt_status"), nullable=False, default=ExtractionAttemptStatus.reserved)
    input_manifest_digest: Mapped[str] = mapped_column(String(64), nullable=False)
    provider_request_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    output_sha256: Mapped[str | None] = mapped_column(String(64), nullable=True)
    error_code: Mapped[str | None] = mapped_column(String(80), nullable=True)
    outcome_unknown: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    reserved_at: Mapped[datetime] = mapped_column(DateTime(), default=func.now(), server_default=func.now(), nullable=False)
    reconciled_at: Mapped[datetime | None] = mapped_column(DateTime(), nullable=True)
