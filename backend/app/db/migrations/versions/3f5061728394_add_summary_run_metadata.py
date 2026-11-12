"""Add scoped summary metadata and immutable source dependencies (S07-04)."""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "3f5061728394"
down_revision = "3e4f50617293"
branch_labels = None
depends_on = None

def upgrade():
    op.execute("CREATE TYPE summary_run_status AS ENUM ('pending', 'pending_review', 'completed', 'failed', 'stale')")
    op.create_table("summary_runs", sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True), sa.Column("chamber_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("chambers.id", ondelete="RESTRICT"), nullable=False), sa.Column("case_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("cases.id", ondelete="RESTRICT"), nullable=False), sa.Column("created_by_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False), sa.Column("status", postgresql.ENUM(name="summary_run_status", create_type=False), nullable=False, server_default="pending"), sa.Column("source_manifest_hash", sa.String(64), nullable=False), sa.Column("cache_key", sa.String(64), nullable=False), sa.Column("prompt_version", sa.String(80), nullable=False), sa.Column("policy_version", sa.Integer(), nullable=False), sa.Column("provider", sa.String(32)), sa.Column("model", sa.String(160)), sa.Column("input_tokens", sa.Integer()), sa.Column("output_tokens", sa.Integer()), sa.Column("usage_paise", sa.Integer()), sa.Column("result_hash", sa.String(64)), sa.Column("dependency_snapshot", postgresql.JSONB(), nullable=False), sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")), sa.Column("completed_at", sa.DateTime()))
    op.create_unique_constraint("uq_summary_runs_scoped_cache_key", "summary_runs", ["chamber_id", "case_id", "cache_key"])
    op.create_index("ix_summary_runs_chamber_case_created", "summary_runs", ["chamber_id", "case_id", "created_at"])
    op.create_index("ix_summary_runs_status", "summary_runs", ["status"])
    op.create_table("summary_source_dependencies", sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True), sa.Column("summary_run_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("summary_runs.id", ondelete="CASCADE"), nullable=False), sa.Column("working_document_revision_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("working_document_revisions.id", ondelete="RESTRICT"), nullable=False), sa.Column("revision_sha256", sa.String(64), nullable=False), sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")))
    op.create_unique_constraint("uq_summary_source_dependency", "summary_source_dependencies", ["summary_run_id", "working_document_revision_id"])

def downgrade():
    raise RuntimeError("Summary provenance records must not be silently removed")
