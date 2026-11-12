"""Add single-use password recovery challenges."""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "fc3d4e5f6071"
down_revision = "fb2c3d4e5f60"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "auth_challenges",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("purpose", sa.String(30), nullable=False),
        sa.Column("code_hash", sa.String(64), nullable=False),
        sa.Column("attempts", sa.Integer(), nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("used_at", sa.DateTime()),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    op.create_index("ix_auth_challenges_user_id", "auth_challenges", ["user_id"])


def downgrade():
    op.drop_table("auth_challenges")
