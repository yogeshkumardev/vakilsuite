"""Store non-authoritative page-aware file classification hints."""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "2e3f40516273"
down_revision = "2d3e4f506172"
branch_labels = None
depends_on = None


def upgrade():
    classification = postgresql.ENUM(
        "unknown", "digital", "scanned", "mixed", "not_applicable",
        name="document_content_classification",
    )
    classification.create(op.get_bind(), checkfirst=True)
    op.add_column(
        "document_file_versions",
        sa.Column(
            "content_classification",
            postgresql.ENUM(name="document_content_classification", create_type=False),
            nullable=False,
            server_default="unknown",
        ),
    )
    op.add_column(
        "document_file_versions",
        sa.Column("page_classification_hints", postgresql.JSONB(), nullable=True),
    )


def downgrade():
    raise RuntimeError("Classification provenance must not be silently removed")
