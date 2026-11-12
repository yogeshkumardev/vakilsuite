"""Add recoverable case/document deletion markers.

Revision ID: fd4e5f607182
Revises: fc3d4e5f6071
"""
from alembic import op
import sqlalchemy as sa

revision = "fd4e5f607182"
down_revision = "fc3d4e5f6071"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("cases", sa.Column("deleted_at", sa.DateTime(), nullable=True))
    op.add_column("documents", sa.Column("deleted_at", sa.DateTime(), nullable=True))


def downgrade():
    op.drop_column("documents", "deleted_at")
    op.drop_column("cases", "deleted_at")
