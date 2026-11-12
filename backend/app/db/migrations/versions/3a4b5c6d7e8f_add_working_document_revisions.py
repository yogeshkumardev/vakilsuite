"""Add immutable server-validated working document revisions (S05-02)."""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision = "3a4b5c6d7e8f"
down_revision = "2e3f40516273"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "working_documents",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("chamber_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("chambers.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("case_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("cases.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("title", sa.String(length=300), nullable=False),
        sa.Column("document_kind", sa.String(length=64), nullable=False, server_default="typed_document"),
        sa.Column("created_by_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_working_documents_chamber_case_updated", "working_documents", ["chamber_id", "case_id", "updated_at"])
    op.create_index("ix_working_documents_case_deleted", "working_documents", ["case_id", "deleted_at"])
    op.create_table(
        "working_document_revisions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("working_document_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("working_documents.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("case_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("cases.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("chamber_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("chambers.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("revision_number", sa.Integer(), nullable=False),
        sa.Column("parent_revision_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("working_document_revisions.id", ondelete="RESTRICT"), nullable=True),
        sa.Column("editor_schema_version", sa.Integer(), nullable=False),
        sa.Column("editor_document", postgresql.JSONB(), nullable=False),
        sa.Column("normalized_text", sa.Text(), nullable=False),
        sa.Column("source_map", postgresql.JSONB(), nullable=False),
        sa.Column("content_sha256", sa.String(length=64), nullable=False),
        sa.Column("created_by_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("working_document_id", "revision_number", name="uq_working_document_revision_number"),
    )
    op.create_index("ix_working_document_revisions_chamber_case_created", "working_document_revisions", ["chamber_id", "case_id", "created_at"])
    op.create_index("ix_working_document_revisions_document_created", "working_document_revisions", ["working_document_id", "created_at"])
    op.create_index("ix_working_document_revisions_hash", "working_document_revisions", ["content_sha256"])


def downgrade():
    raise RuntimeError("Legal working-document revisions must not be silently removed")
