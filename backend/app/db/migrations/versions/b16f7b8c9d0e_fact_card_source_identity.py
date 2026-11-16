"""Support both reviewed revisions and immutable direct-PDF file versions."""

from alembic import op
import sqlalchemy as sa

revision = "b16f7b8c9d0e"
down_revision = "a05f6a7b8c9d"
branch_labels = None
depends_on = None


def upgrade():
    op.drop_constraint("uq_fact_card_revision", "document_fact_cards", type_="unique")
    op.drop_constraint("document_fact_cards_working_document_revision_id_fkey", "document_fact_cards", type_="foreignkey")
    op.alter_column("document_fact_cards", "working_document_revision_id", new_column_name="source_revision_id")
    op.add_column("document_fact_cards", sa.Column("original_document_id", sa.Uuid(), nullable=True))
    op.add_column("document_fact_cards", sa.Column("original_file_version_id", sa.Uuid(), nullable=True))
    op.add_column("document_fact_cards", sa.Column("original_sha256", sa.String(64), nullable=True))
    op.add_column("document_fact_cards", sa.Column("source_kind", sa.String(24), nullable=False, server_default="reviewed_text"))
    op.add_column("document_fact_cards", sa.Column("provider_request_id", sa.String(255), nullable=True))
    op.create_foreign_key("fk_fact_cards_original_document", "document_fact_cards", "documents", ["original_document_id"], ["id"], ondelete="RESTRICT")
    op.execute("""
        UPDATE document_fact_cards AS card
        SET original_document_id = version.document_id,
            original_file_version_id = version.id,
            original_sha256 = provenance.source_sha256
        FROM reviewed_source_provenance AS provenance
        JOIN document_file_versions AS version ON version.id = provenance.file_version_id
        WHERE card.source_revision_id = provenance.revision_id
          AND card.source_sha256 = provenance.revision_sha256
    """)
    op.execute("""
        UPDATE document_fact_cards AS card
        SET original_document_id = version.document_id,
            original_file_version_id = version.id,
            original_sha256 = source.source_sha256
        FROM original_text_sources AS source
        JOIN document_file_versions AS version ON version.id = source.file_version_id
        WHERE card.source_revision_id = source.revision_id
          AND card.original_document_id IS NULL
    """)
    op.create_unique_constraint("uq_fact_card_revision", "document_fact_cards", ["chamber_id", "source_revision_id"])


def downgrade():
    op.drop_constraint("uq_fact_card_revision", "document_fact_cards", type_="unique")
    op.drop_constraint("fk_fact_cards_original_document", "document_fact_cards", type_="foreignkey")
    for column in ("provider_request_id", "source_kind", "original_sha256", "original_file_version_id", "original_document_id"):
        op.drop_column("document_fact_cards", column)
    op.alter_column("document_fact_cards", "source_revision_id", new_column_name="working_document_revision_id")
    op.create_foreign_key("document_fact_cards_working_document_revision_id_fkey", "document_fact_cards", "working_document_revisions", ["working_document_revision_id"], ["id"], ondelete="RESTRICT")
    op.create_unique_constraint("uq_fact_card_revision", "document_fact_cards", ["chamber_id", "working_document_revision_id"])
