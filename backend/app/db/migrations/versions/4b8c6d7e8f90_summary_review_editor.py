"""Persist lawyer edits separately from immutable provider output."""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "4b8c6d7e8f90"
down_revision = "4a7b5c6d7e8f"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "summary_runs",
        sa.Column("review_editor_state", postgresql.JSONB(), nullable=True),
    )
    op.add_column(
        "summary_runs", sa.Column("review_payload", postgresql.JSONB(), nullable=True)
    )
    op.add_column(
        "summary_runs", sa.Column("review_hash", sa.String(64), nullable=True)
    )


def downgrade():
    for name in ("review_hash", "review_payload", "review_editor_state"):
        op.drop_column("summary_runs", name)
