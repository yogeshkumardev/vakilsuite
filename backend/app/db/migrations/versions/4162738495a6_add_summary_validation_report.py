"""Persist deterministic validation findings for unreviewed summaries (S07-03)."""
from alembic import op
from sqlalchemy.dialects import postgresql
import sqlalchemy as sa

revision = "4162738495a6"
down_revision = "405162738495"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("summary_runs", sa.Column("validation_report", postgresql.JSONB(), nullable=True))


def downgrade() -> None:
    raise NotImplementedError("Validation audit records are retained; use a forward migration.")
