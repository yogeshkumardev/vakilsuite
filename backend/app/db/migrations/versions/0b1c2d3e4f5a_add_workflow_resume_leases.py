"""Add recoverable lease tracking to workflow resume intents.

Revision ID: 0b1c2d3e4f5a
Revises: 0a1b2c3d4e5f
Create Date: 2026-10-27 00:00:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0b1c2d3e4f5a"
down_revision: Union[str, Sequence[str], None] = "0a1b2c3d4e5f"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("workflow_resume_intents", sa.Column("leased_until", sa.DateTime(), nullable=True))


def downgrade() -> None:
    op.drop_column("workflow_resume_intents", "leased_until")
