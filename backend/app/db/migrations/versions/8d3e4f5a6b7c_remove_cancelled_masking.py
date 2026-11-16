"""Remove the cancelled masking feature storage."""

from alembic import op


revision = "8d3e4f5a6b7c"
down_revision = "7c2d3e4f5a6b"
branch_labels = None
depends_on = None


def upgrade():
    op.drop_table("masked_document_revisions")


def downgrade():
    raise NotImplementedError("The cancelled masking table is intentionally not recreated")
