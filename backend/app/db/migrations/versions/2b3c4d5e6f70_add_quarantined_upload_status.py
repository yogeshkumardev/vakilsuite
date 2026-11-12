"""Allow invalid originals to remain explicitly quarantined."""

from alembic import op

revision = "2b3c4d5e6f70"
down_revision = "2a3b4c5d6e7f"
branch_labels = None
depends_on = None


def upgrade():
    op.execute("ALTER TYPE upload_status ADD VALUE IF NOT EXISTS 'quarantined'")


def downgrade():
    raise RuntimeError("PostgreSQL enum value removal is unsafe")
