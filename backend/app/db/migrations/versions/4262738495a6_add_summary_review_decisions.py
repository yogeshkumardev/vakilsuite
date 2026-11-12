"""Add durable human review decisions for generated summaries (S07-06)."""

from alembic import op
import sqlalchemy as sa


revision = "4262738495a6"
down_revision = "4162738495a6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TYPE summary_run_status ADD VALUE IF NOT EXISTS 'changes_requested'")
    op.add_column("summary_runs", sa.Column("review_version", sa.Integer(), nullable=False, server_default="1"))
    op.add_column("summary_runs", sa.Column("reviewed_by_user_id", sa.Uuid(), nullable=True))
    op.add_column("summary_runs", sa.Column("reviewed_at", sa.DateTime(), nullable=True))
    op.add_column("summary_runs", sa.Column("review_comment", sa.String(length=2000), nullable=True))
    op.create_foreign_key(
        "fk_summary_runs_reviewed_by_user",
        "summary_runs",
        "users",
        ["reviewed_by_user_id"],
        ["id"],
        ondelete="RESTRICT",
    )
    op.create_table(
        "summary_review_decisions",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("summary_run_id", sa.Uuid(), nullable=False),
        sa.Column("sequence", sa.Integer(), nullable=False),
        sa.Column("action", sa.String(length=32), nullable=False),
        sa.Column("result_hash", sa.String(length=64), nullable=False),
        sa.Column("reviewed_by_user_id", sa.Uuid(), nullable=False),
        sa.Column("comment", sa.String(length=2000), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["reviewed_by_user_id"], ["users.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["summary_run_id"], ["summary_runs.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("summary_run_id", "sequence", name="uq_summary_review_decision_sequence"),
    )
    op.create_index("ix_summary_review_decisions_run", "summary_review_decisions", ["summary_run_id", "sequence"])


def downgrade() -> None:
    raise NotImplementedError("Summary review audit records are retained; use a forward migration.")
