"""Persist R2 multipart upload identifiers and acknowledged parts."""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "2c3d4e5f6071"
down_revision = "2b3c4d5e6f70"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("document_upload_sessions", sa.Column("multipart_upload_id", sa.String(512)))
    op.add_column("document_upload_sessions", sa.Column("multipart_part_size_bytes", sa.Integer()))
    op.create_table(
        "document_upload_parts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("upload_session_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("document_upload_sessions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("part_number", sa.Integer(), nullable=False),
        sa.Column("etag", sa.String(512), nullable=False),
        sa.Column("size_bytes", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("upload_session_id", "part_number", name="uq_document_upload_part"),
    )
    op.create_index("ix_document_upload_parts_session", "document_upload_parts", ["upload_session_id"])


def downgrade():
    raise RuntimeError("Multipart checkpoints can reference retained private objects")
