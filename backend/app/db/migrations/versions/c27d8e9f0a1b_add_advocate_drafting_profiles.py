"""Add reusable advocate drafting profiles and court registrations.

Revision ID: c27d8e9f0a1b
Revises: b16f7b8c9d0e
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "c27d8e9f0a1b"
down_revision = "b16f7b8c9d0e"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "advocate_profiles",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("office_address_line1", sa.String(length=300), nullable=True),
        sa.Column("office_address_line2", sa.String(length=300), nullable=True),
        sa.Column("city", sa.String(length=100), nullable=True),
        sa.Column("district", sa.String(length=100), nullable=True),
        sa.Column("state", sa.String(length=100), nullable=True),
        sa.Column("mobile_number", sa.String(length=20), nullable=True),
        sa.Column("chamber_number", sa.String(length=100), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", name="uq_advocate_profiles_user"),
    )
    op.create_table(
        "advocate_court_registrations",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("advocate_profile_id", sa.Uuid(), nullable=False),
        sa.Column("court_code", sa.String(length=80), nullable=False),
        sa.Column("identifiers", postgresql.JSONB(astext_type=sa.Text()), server_default=sa.text("'{}'::jsonb"), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["advocate_profile_id"], ["advocate_profiles.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("advocate_profile_id", "court_code", name="uq_advocate_court_registration"),
    )
    op.create_index("ix_advocate_court_registrations_court", "advocate_court_registrations", ["court_code"])


def downgrade():
    op.drop_index("ix_advocate_court_registrations_court", table_name="advocate_court_registrations")
    op.drop_table("advocate_court_registrations")
    op.drop_table("advocate_profiles")
