"""Add verified-email and refresh replay state without changing old revisions."""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "5a0b1c2d3e4f"
down_revision = "4c9d7e8f901a"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("users", sa.Column("email_verified_at", sa.DateTime(), nullable=True))
    # Existing deployments must resolve duplicate Google subjects before this
    # migration. A partial unique index preserves email-only accounts.
    op.create_index("uq_users_provider_id", "users", ["provider_id"], unique=True, postgresql_where=sa.text("provider_id IS NOT NULL"))
    op.create_table(
        "auth_email_outbox",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("challenge_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("auth_challenges.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("purpose", sa.String(30), nullable=False),
        sa.Column("recipient_email", sa.String(255), nullable=False),
        sa.Column("encrypted_payload", sa.Text(), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("attempt_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("next_attempt_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("provider_message_id", sa.String(255)), sa.Column("last_error_code", sa.String(80)),
        sa.Column("lease_until", sa.DateTime()), sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()), sa.Column("accepted_at", sa.DateTime()),
    )
    op.create_index("ix_auth_email_outbox_pending", "auth_email_outbox", ["status", "next_attempt_at"])
    op.create_table(
        "auth_spent_refresh_tokens",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("session_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("auth_sessions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("token_hash", sa.String(128), nullable=False), sa.Column("expires_at", sa.DateTime(), nullable=False), sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_auth_spent_refresh_hash", "auth_spent_refresh_tokens", ["token_hash"], unique=True)
    op.create_table(
        "auth_webhook_events",
        sa.Column("event_id", sa.String(255), primary_key=True),
        sa.Column("event_type", sa.String(100), nullable=False),
        sa.Column("received_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )


def downgrade():
    op.drop_table("auth_webhook_events")
    op.drop_index("ix_auth_spent_refresh_hash", table_name="auth_spent_refresh_tokens")
    op.drop_table("auth_spent_refresh_tokens")
    op.drop_index("ix_auth_email_outbox_pending", table_name="auth_email_outbox")
    op.drop_table("auth_email_outbox")
    op.drop_index("uq_users_provider_id", table_name="users")
    op.drop_column("users", "email_verified_at")
