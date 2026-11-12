"""Add short-lived document-scoped Android editor bootstrap sessions (S05-05)."""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "3d4e5f607182"
down_revision = "3c4d5e6f7081"
branch_labels = None
depends_on = None

def upgrade():
    op.create_table(
        "editor_bootstrap_sessions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("working_document_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("working_documents.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("case_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("cases.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("chamber_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("chambers.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("token_sha256", sa.String(length=64), unique=True, nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("last_used_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_editor_bootstrap_sessions_document_expires", "editor_bootstrap_sessions", ["working_document_id", "expires_at"])

def downgrade():
    raise RuntimeError("Editor bootstrap audit/security records must not be silently removed")
