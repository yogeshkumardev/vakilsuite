from __future__ import annotations

import uuid
import enum
from datetime import datetime

from sqlalchemy import DateTime, Enum as SAEnum, ForeignKey, Index, Integer, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.db.base import Base


class RevisionStatus(str, enum.Enum):
    """Lifecycle state; revision content itself stays immutable."""

    saved = "saved"
    submitted = "submitted"
    changes_requested = "changes_requested"
    approved = "approved"
    revoked = "revoked"


class RevisionEventType(str, enum.Enum):
    submitted = "submitted"
    changes_requested = "changes_requested"
    approved = "approved"
    revoked = "revoked"


class WorkingDocument(Base):
    """A case-scoped editable legal document.

    The document row is mutable only for its display metadata.  Legal content is
    never overwritten here: every accepted editor save creates a revision row.
    """

    __tablename__ = "working_documents"
    __table_args__ = (
        Index("ix_working_documents_chamber_case_updated", "chamber_id", "case_id", "updated_at"),
        Index("ix_working_documents_case_deleted", "case_id", "deleted_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    chamber_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("chambers.id", ondelete="RESTRICT"), nullable=False
    )
    case_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("cases.id", ondelete="RESTRICT"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    document_kind: Mapped[str] = mapped_column(
        String(64), nullable=False, default="typed_document", server_default="typed_document"
    )
    created_by_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(), default=func.now(), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(), default=func.now(), onupdate=func.now(), server_default=func.now(), nullable=False
    )


class WorkingDocumentRevision(Base):
    """Immutable server-validated snapshot of one supported Lexical document."""

    __tablename__ = "working_document_revisions"
    __table_args__ = (
        UniqueConstraint("working_document_id", "revision_number", name="uq_working_document_revision_number"),
        Index("ix_working_document_revisions_chamber_case_created", "chamber_id", "case_id", "created_at"),
        Index("ix_working_document_revisions_document_created", "working_document_id", "created_at"),
        Index("ix_working_document_revisions_hash", "content_sha256"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    working_document_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("working_documents.id", ondelete="RESTRICT"), nullable=False
    )
    case_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("cases.id", ondelete="RESTRICT"), nullable=False
    )
    chamber_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("chambers.id", ondelete="RESTRICT"), nullable=False
    )
    revision_number: Mapped[int] = mapped_column(Integer, nullable=False)
    parent_revision_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("working_document_revisions.id", ondelete="RESTRICT"),
        nullable=True,
    )
    # A client-generated UUID makes a timed-out autosave retry return the
    # original accepted revision rather than create another snapshot.
    client_mutation_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    status: Mapped[RevisionStatus] = mapped_column(
        SAEnum(RevisionStatus, name="working_document_revision_status"),
        nullable=False,
        default=RevisionStatus.saved,
        server_default=RevisionStatus.saved.value,
    )
    reviewed_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=True
    )
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(), nullable=True)
    review_comment: Mapped[str | None] = mapped_column(Text(), nullable=True)
    editor_schema_version: Mapped[int] = mapped_column(Integer, nullable=False)
    editor_document: Mapped[dict[str, object]] = mapped_column(JSONB, nullable=False)
    normalized_text: Mapped[str] = mapped_column(Text, nullable=False)
    source_map: Mapped[list[dict[str, object]]] = mapped_column(JSONB, nullable=False)
    content_sha256: Mapped[str] = mapped_column(String(64), nullable=False)
    created_by_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(), default=func.now(), server_default=func.now(), nullable=False
    )


class WorkingDocumentRevisionEvent(Base):
    """Append-only audit trail for legal-content lifecycle transitions."""

    __tablename__ = "working_document_revision_events"
    __table_args__ = (
        Index("ix_working_document_revision_events_revision_created", "revision_id", "created_at"),
        Index("ix_working_document_revision_events_chamber_case_created", "chamber_id", "case_id", "created_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    revision_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("working_document_revisions.id", ondelete="RESTRICT"), nullable=False
    )
    working_document_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("working_documents.id", ondelete="RESTRICT"), nullable=False
    )
    case_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("cases.id", ondelete="RESTRICT"), nullable=False
    )
    chamber_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("chambers.id", ondelete="RESTRICT"), nullable=False
    )
    event_type: Mapped[RevisionEventType] = mapped_column(
        SAEnum(RevisionEventType, name="working_document_revision_event_type"), nullable=False
    )
    from_status: Mapped[RevisionStatus] = mapped_column(
        SAEnum(RevisionStatus, name="working_document_revision_status", create_type=False), nullable=False
    )
    to_status: Mapped[RevisionStatus] = mapped_column(
        SAEnum(RevisionStatus, name="working_document_revision_status", create_type=False), nullable=False
    )
    content_sha256: Mapped[str] = mapped_column(String(64), nullable=False)
    actor_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False
    )
    comment: Mapped[str | None] = mapped_column(Text(), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(), default=func.now(), server_default=func.now(), nullable=False
    )


class EditorBootstrapSession(Base):
    """Short-lived opaque capability for the restricted Android WebView editor."""

    __tablename__ = "editor_bootstrap_sessions"
    __table_args__ = (Index("ix_editor_bootstrap_sessions_document_expires", "working_document_id", "expires_at"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    working_document_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("working_documents.id", ondelete="RESTRICT"), nullable=False)
    case_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("cases.id", ondelete="RESTRICT"), nullable=False)
    chamber_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("chambers.id", ondelete="RESTRICT"), nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    token_sha256: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(), nullable=False)
    last_used_at: Mapped[datetime | None] = mapped_column(DateTime(), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(), default=func.now(), server_default=func.now(), nullable=False)
