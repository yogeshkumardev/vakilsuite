"""Add validated summary payload storage and provider-attempt ledger (S07-02)."""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "405162738495"
down_revision = "3f5061728394"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TYPE summary_run_status ADD VALUE IF NOT EXISTS 'running'")
    op.add_column("summary_runs", sa.Column("result_payload", postgresql.JSONB(), nullable=True))
    op.add_column("summary_runs", sa.Column("error_code", sa.String(length=80), nullable=True))
    op.add_column("summary_runs", sa.Column("provider_request_id", sa.String(length=255), nullable=True))
    op.create_table(
        "summary_provider_attempts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("summary_run_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("summary_runs.id", ondelete="CASCADE"), nullable=False),
        sa.Column("sequence", sa.Integer(), nullable=False),
        sa.Column("provider", sa.String(length=32), nullable=False),
        sa.Column("model", sa.String(length=160), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="reserved"),
        sa.Column("input_manifest_hash", sa.String(length=64), nullable=False),
        sa.Column("output_hash", sa.String(length=64), nullable=True),
        sa.Column("error_code", sa.String(length=80), nullable=True),
        sa.Column("outcome_unknown", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("provider_request_id", sa.String(length=255), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        sa.UniqueConstraint("summary_run_id", "sequence", name="uq_summary_provider_attempt_sequence"),
    )
    op.create_index("ix_summary_provider_attempts_run", "summary_provider_attempts", ["summary_run_id", "sequence"])


def downgrade() -> None:
    raise NotImplementedError("Summary attempts retain legal audit history; use a forward migration.")
