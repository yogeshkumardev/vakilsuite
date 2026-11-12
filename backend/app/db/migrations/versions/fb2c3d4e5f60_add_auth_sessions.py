"""add auth sessions

Revision ID: fb2c3d4e5f60
Revises: fa1b2c3d4e5f
Create Date: 2026-09-21
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision: str = "fb2c3d4e5f60"
down_revision: Union[str, Sequence[str], None] = "fa1b2c3d4e5f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    auth_device_type = postgresql.ENUM(
        "web",
        "android",
        "ios",
        "unknown",
        name="auth_device_type",
        create_type=False,
    )
    auth_device_type.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "auth_sessions",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("refresh_token_hash", sa.String(length=128), nullable=False),
        sa.Column(
            "device_type",
            auth_device_type,
            server_default="unknown",
            nullable=False,
        ),
        sa.Column("device_name", sa.String(length=255), nullable=True),
        sa.Column("device_id", sa.String(length=255), nullable=True),
        sa.Column("user_agent", sa.String(length=500), nullable=True),
        sa.Column("ip_address", sa.String(length=64), nullable=True),
        sa.Column("last_seen_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("revoked_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_auth_sessions_user_id", "auth_sessions", ["user_id"])
    op.create_index(
        "ix_auth_sessions_refresh_token_hash",
        "auth_sessions",
        ["refresh_token_hash"],
    )
    op.create_index("ix_auth_sessions_device_id", "auth_sessions", ["device_id"])


def downgrade() -> None:
    op.drop_index("ix_auth_sessions_device_id", table_name="auth_sessions")
    op.drop_index("ix_auth_sessions_refresh_token_hash", table_name="auth_sessions")
    op.drop_index("ix_auth_sessions_user_id", table_name="auth_sessions")
    op.drop_table("auth_sessions")
    postgresql.ENUM(name="auth_device_type").drop(op.get_bind(), checkfirst=True)
