"""Keep each human summary edit as an immutable audit snapshot."""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "4c9d7e8f901a"
down_revision = "4b8c6d7e8f90"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "summary_review_edits",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "summary_run_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("summary_runs.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("review_version", sa.Integer(), nullable=False),
        sa.Column("editor_state", postgresql.JSONB(), nullable=False),
        sa.Column("payload", postgresql.JSONB(), nullable=False),
        sa.Column("content_hash", sa.String(64), nullable=False),
        sa.Column(
            "saved_by_user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column(
            "created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False
        ),
        sa.UniqueConstraint(
            "summary_run_id", "review_version", name="uq_summary_review_edit_version"
        ),
    )


def downgrade():
    op.drop_table("summary_review_edits")
