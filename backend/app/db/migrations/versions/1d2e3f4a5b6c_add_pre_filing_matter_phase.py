"""Allow pre-filing matters without court parties.

Revision ID: 1d2e3f4a5b6c
Revises: 1c2d3e4f5a6b
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "1d2e3f4a5b6c"
down_revision = "1c2d3e4f5a6b"
branch_labels = None
depends_on = None

def upgrade():
    op.execute("CREATE TYPE matter_phase AS ENUM ('pre_filing', 'filed')")
    op.add_column("cases", sa.Column("matter_phase", postgresql.ENUM("pre_filing", "filed", name="matter_phase", create_type=False), nullable=False, server_default="filed"))
    op.alter_column("cases", "petitioner_name", existing_type=sa.String(length=500), nullable=True)
    op.alter_column("cases", "respondent_name", existing_type=sa.String(length=500), nullable=True)
    op.alter_column("cases", "case_type", existing_type=sa.Enum(name="case_type"), server_default="other")

def downgrade():
    raise RuntimeError("Downgrade is unsafe after pre-filing matters exist")
