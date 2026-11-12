"""Add durable Sarvam/Gemini document typing attempts.

Revision ID: 6b1c2d3e4f5a
Revises: 5a0b1c2d3e4f
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql as pg


revision = "6b1c2d3e4f5a"
down_revision = "5a0b1c2d3e4f"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "document_typing_attempts",
        sa.Column("id", pg.UUID(as_uuid=True), primary_key=True),
        sa.Column("job_id", pg.UUID(as_uuid=True), sa.ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False),
        sa.Column("file_version_id", pg.UUID(as_uuid=True), sa.ForeignKey("document_file_versions.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("sequence", sa.Integer(), nullable=False),
        sa.Column("provider", sa.String(32), nullable=False),
        sa.Column("model", sa.String(160), nullable=False),
        sa.Column("status", sa.String(32), nullable=False),
        sa.Column("source_sha256", sa.String(64), nullable=False),
        sa.Column("quote_hash", sa.String(64), nullable=False),
        sa.Column("reserved_paise", sa.Integer(), nullable=False),
        sa.Column("provider_job_id", sa.String(255)),
        sa.Column("provider_run_id", sa.String(255)),
        sa.Column("reported_usage", pg.JSONB()),
        sa.Column("error_code", sa.String(100)),
        sa.Column("outcome_unknown", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("next_poll_at", sa.DateTime()),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("job_id", "sequence", name="uq_document_typing_attempt_sequence"),
    )
    op.create_index("ix_document_typing_attempts_job", "document_typing_attempts", ["job_id"])
    op.create_index("ix_document_typing_attempts_provider_job", "document_typing_attempts", ["provider_job_id"])


def downgrade():
    op.drop_index("ix_document_typing_attempts_provider_job", table_name="document_typing_attempts")
    op.drop_index("ix_document_typing_attempts_job", table_name="document_typing_attempts")
    op.drop_table("document_typing_attempts")
