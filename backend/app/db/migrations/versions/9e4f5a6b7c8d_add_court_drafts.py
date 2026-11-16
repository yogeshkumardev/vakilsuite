"""Add config-driven court draft records."""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "9e4f5a6b7c8d"
down_revision = "8d3e4f5a6b7c"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table("court_drafts",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("chamber_id", sa.Uuid(), sa.ForeignKey("chambers.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("case_id", sa.Uuid(), sa.ForeignKey("cases.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("summary_run_id", sa.Uuid(), sa.ForeignKey("summary_runs.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("draft_type", sa.String(80), nullable=False),
        sa.Column("blueprint_code", sa.String(120), nullable=False),
        sa.Column("blueprint_version", sa.Integer(), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(32), nullable=False, server_default="needs_review"),
        sa.Column("content", postgresql.JSONB(), nullable=False),
        sa.Column("rule_snapshot", postgresql.JSONB(), nullable=False),
        sa.Column("prompt_version", sa.String(80), nullable=False, server_default="bail-483-skeleton-v1"),
        sa.Column("model", sa.String(160)),
        sa.Column("source_summary_hash", sa.String(64), nullable=False),
        sa.Column("created_by_user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("case_id", "version", name="uq_court_drafts_case_version"))
    op.create_index("ix_court_drafts_chamber_case_created", "court_drafts", ["chamber_id", "case_id", "created_at"])


def downgrade():
    op.drop_table("court_drafts")
