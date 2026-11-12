"""Add immutable document file versions and durable upload sessions.

The existing ``documents`` table remains the logical-document and active-file
compatibility projection.  New uploads create version 1; a separate migration
is intentionally avoided for bulk backfill because it must be bounded and
observable on a deployed chamber database.
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "2a3b4c5d6e7f"
down_revision = "1f2a3b4c5d6e"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    origin = postgresql.ENUM(
        "unknown",
        "web_upload",
        "web_camera",
        "android_scan",
        "android_import",
        "legacy",
        name="document_file_origin",
    )
    origin.create(bind, checkfirst=True)
    session_status = postgresql.ENUM(
        "pending", "uploaded", "failed", "expired", name="document_upload_session_status"
    )
    session_status.create(bind, checkfirst=True)

    op.create_table(
        "document_file_versions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "document_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("documents.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "chamber_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("chambers.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("version_number", sa.Integer(), nullable=False),
        sa.Column("r2_key", sa.String(1000), nullable=False),
        sa.Column("r2_bucket", sa.String(255), nullable=False),
        sa.Column("original_filename", sa.String(500), nullable=False),
        sa.Column("declared_mime_type", sa.String(100), nullable=False),
        sa.Column("detected_mime_type", sa.String(100), nullable=True),
        sa.Column("file_size_bytes", sa.BigInteger(), nullable=False),
        sa.Column("sha256_hex", sa.String(64), nullable=True),
        sa.Column("page_count", sa.Integer(), nullable=True),
        sa.Column(
            "origin",
            postgresql.ENUM(name="document_file_origin", create_type=False),
            nullable=False,
            server_default="unknown",
        ),
        sa.Column(
            "upload_status",
            postgresql.ENUM(name="upload_status", create_type=False),
            nullable=False,
            server_default="pending",
        ),
        sa.Column(
            "created_by_user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("document_id", "version_number", name="uq_document_file_versions_number"),
    )
    op.create_index(
        "ix_document_file_versions_chamber_document",
        "document_file_versions",
        ["chamber_id", "document_id"],
    )
    op.create_index("ix_document_file_versions_sha256", "document_file_versions", ["sha256_hex"])

    op.create_table(
        "document_upload_sessions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "document_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("documents.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "file_version_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("document_file_versions.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "chamber_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("chambers.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column(
            "created_by_user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("client_upload_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column(
            "status",
            postgresql.ENUM(name="document_upload_session_status", create_type=False),
            nullable=False,
            server_default="pending",
        ),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("file_version_id", name="uq_document_upload_sessions_file_version"),
    )
    op.create_index(
        "ix_document_upload_sessions_chamber_status",
        "document_upload_sessions",
        ["chamber_id", "status"],
    )
    op.create_index("ix_document_upload_sessions_expires", "document_upload_sessions", ["expires_at"])


def downgrade():
    raise RuntimeError("Document file versions may be referenced by retained originals")
