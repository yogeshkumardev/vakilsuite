"""Link court-draft snapshots to their lawyer-editable Word documents."""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "06a1b2c3d4e"
down_revision = "f5a1b2c3d4e5"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "court_drafts",
        sa.Column("working_document_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_foreign_key(
        "fk_court_drafts_working_document_id",
        "court_drafts",
        "working_documents",
        ["working_document_id"],
        ["id"],
        ondelete="RESTRICT",
    )
    op.create_unique_constraint(
        "uq_court_drafts_working_document_id", "court_drafts", ["working_document_id"]
    )


def downgrade() -> None:
    op.drop_constraint("uq_court_drafts_working_document_id", "court_drafts", type_="unique")
    op.drop_constraint("fk_court_drafts_working_document_id", "court_drafts", type_="foreignkey")
    op.drop_column("court_drafts", "working_document_id")
