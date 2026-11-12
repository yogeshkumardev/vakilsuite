"""Add exact-hash revision decision metadata and immutable events (S05-03)."""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision = "3c4d5e6f7081"
down_revision = "3b4c5d6e7f80"
branch_labels = None
depends_on = None


def upgrade():
    event_type = postgresql.ENUM(
        "submitted", "changes_requested", "approved", "revoked",
        name="working_document_revision_event_type",
    )
    event_type.create(op.get_bind(), checkfirst=True)
    op.add_column(
        "working_document_revisions",
        sa.Column("reviewed_by_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=True),
    )
    op.add_column("working_document_revisions", sa.Column("reviewed_at", sa.DateTime(), nullable=True))
    op.add_column("working_document_revisions", sa.Column("review_comment", sa.Text(), nullable=True))
    op.create_table(
        "working_document_revision_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("revision_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("working_document_revisions.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("working_document_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("working_documents.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("case_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("cases.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("chamber_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("chambers.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("event_type", postgresql.ENUM(name="working_document_revision_event_type", create_type=False), nullable=False),
        sa.Column("from_status", postgresql.ENUM(name="working_document_revision_status", create_type=False), nullable=False),
        sa.Column("to_status", postgresql.ENUM(name="working_document_revision_status", create_type=False), nullable=False),
        sa.Column("content_sha256", sa.String(length=64), nullable=False),
        sa.Column("actor_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("comment", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_working_document_revision_events_revision_created", "working_document_revision_events", ["revision_id", "created_at"])
    op.create_index("ix_working_document_revision_events_chamber_case_created", "working_document_revision_events", ["chamber_id", "case_id", "created_at"])


def downgrade():
    raise RuntimeError("Revision review evidence must not be silently removed")
