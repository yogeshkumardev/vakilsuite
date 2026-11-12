"""Add revision compare-and-swap, idempotency and lifecycle state (S05-03)."""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision = "3b4c5d6e7f80"
down_revision = "3a4b5c6d7e8f"
branch_labels = None
depends_on = None


def upgrade():
    revision_status = postgresql.ENUM(
        "saved", "submitted", "changes_requested", "approved", "revoked",
        name="working_document_revision_status",
    )
    revision_status.create(op.get_bind(), checkfirst=True)
    op.add_column(
        "working_document_revisions",
        sa.Column("client_mutation_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.add_column(
        "working_document_revisions",
        sa.Column(
            "status",
            postgresql.ENUM(name="working_document_revision_status", create_type=False),
            nullable=False,
            server_default="saved",
        ),
    )
    op.create_index(
        "uq_working_document_revision_client_mutation",
        "working_document_revisions",
        ["working_document_id", "client_mutation_id"],
        unique=True,
        postgresql_where=sa.text("client_mutation_id IS NOT NULL"),
    )


def downgrade():
    raise RuntimeError("Revision concurrency and lifecycle history must not be silently removed")
