"""Add chamber-scoped legal research records.

Revision ID: 4362738495a6
Revises: 4262738495a6
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "4362738495a6"
down_revision = "4262738495a6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "legal_research_runs",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("chamber_id", sa.Uuid(), sa.ForeignKey("chambers.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("case_id", sa.Uuid(), sa.ForeignKey("cases.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("created_by_user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("idempotency_key", sa.String(128), nullable=False),
        sa.Column("request_digest", sa.String(64), nullable=False),
        sa.Column("query_text", sa.String(500), nullable=False),
        sa.Column("query_policy_version", sa.String(80), nullable=False),
        sa.Column("status", sa.Enum("pending", "running", "completed", "cancelled", "failed", "outcome_unknown", name="legal_research_run_status"), nullable=False),
        sa.Column("budget_paise", sa.Integer(), nullable=False),
        sa.Column("reserved_paise", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("spent_estimate_paise", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("cancelled_at", sa.DateTime(), nullable=True),
        sa.Column("error_code", sa.String(80), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("chamber_id", "case_id", "idempotency_key", name="uq_legal_research_runs_scoped_idempotency"),
    )
    op.create_index("ix_legal_research_runs_chamber_case_created", "legal_research_runs", ["chamber_id", "case_id", "created_at"])
    op.create_index("ix_legal_research_runs_status", "legal_research_runs", ["status"])
    op.create_table(
        "legal_research_operations",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("run_id", sa.Uuid(), sa.ForeignKey("legal_research_runs.id", ondelete="CASCADE"), nullable=False),
        sa.Column("operation_name", sa.String(40), nullable=False),
        sa.Column("request_digest", sa.String(64), nullable=False),
        sa.Column("idempotency_key", sa.String(128), nullable=False),
        sa.Column("status", sa.Enum("reserved", "dispatched", "completed", "failed", "outcome_unknown", "cancelled", name="legal_research_operation_status"), nullable=False),
        sa.Column("reserved_paise", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("outcome_unknown", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("result_payload", postgresql.JSONB(), nullable=True),
        sa.Column("error_code", sa.String(80), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        sa.UniqueConstraint("run_id", "operation_name", "request_digest", name="uq_legal_research_operations_request"),
    )
    op.create_index("ix_legal_research_operations_run_status", "legal_research_operations", ["run_id", "status"])
    op.create_table(
        "legal_authorities",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("chamber_id", sa.Uuid(), sa.ForeignKey("chambers.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("upstream_document_id", sa.Integer(), nullable=False),
        sa.Column("canonical_url", sa.String(500), nullable=False),
        sa.Column("current_version_id", sa.Uuid(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("chamber_id", "upstream_document_id", name="uq_legal_authorities_chamber_upstream"),
    )
    op.create_index("ix_legal_authorities_chamber", "legal_authorities", ["chamber_id"])
    op.create_table(
        "legal_authority_versions",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("authority_id", sa.Uuid(), sa.ForeignKey("legal_authorities.id", ondelete="CASCADE"), nullable=False),
        sa.Column("content_hash", sa.String(64), nullable=False),
        sa.Column("metadata", postgresql.JSONB(), nullable=False),
        sa.Column("normalized_text", sa.Text(), nullable=True),
        sa.Column("normalization_version", sa.String(40), nullable=False),
        sa.Column("fetched_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("authority_id", "content_hash", name="uq_legal_authority_versions_content"),
    )
    op.create_table(
        "legal_authority_passages",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("authority_version_id", sa.Uuid(), sa.ForeignKey("legal_authority_versions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("text", sa.Text(), nullable=False), sa.Column("text_hash", sa.String(64), nullable=False),
        sa.Column("start_offset", sa.Integer(), nullable=False), sa.Column("end_offset", sa.Integer(), nullable=False),
        sa.Column("paragraph_label", sa.String(100), nullable=True), sa.Column("locator_valid", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.UniqueConstraint("authority_version_id", "text_hash", "start_offset", name="uq_legal_authority_passages_locator"),
    )
    op.create_table(
        "legal_propositions",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("chamber_id", sa.Uuid(), sa.ForeignKey("chambers.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("case_id", sa.Uuid(), sa.ForeignKey("cases.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("authority_version_id", sa.Uuid(), sa.ForeignKey("legal_authority_versions.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("passage_id", sa.Uuid(), sa.ForeignKey("legal_authority_passages.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("text", sa.Text(), nullable=False), sa.Column("text_hash", sa.String(64), nullable=False),
        sa.Column("created_by_user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_legal_propositions_case_created", "legal_propositions", ["case_id", "created_at"])
    op.create_table(
        "legal_authority_reviews",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("chamber_id", sa.Uuid(), sa.ForeignKey("chambers.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("case_id", sa.Uuid(), sa.ForeignKey("cases.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("proposition_id", sa.Uuid(), sa.ForeignKey("legal_propositions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("action", sa.Enum("pending", "approved", "rejected", "changes_requested", "revoked", name="authority_review_action"), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("treatment_notes", sa.String(4000), nullable=True),
        sa.Column("decided_by_user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=True),
        sa.Column("decided_at", sa.DateTime(), nullable=True), sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("proposition_id", "version", name="uq_legal_authority_reviews_proposition_version"),
    )


def downgrade() -> None:
    raise NotImplementedError("Legal research evidence is retained; use a forward migration.")
