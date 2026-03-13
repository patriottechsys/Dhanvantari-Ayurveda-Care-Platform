"""Add image_url column to supplements table.

Revision ID: 0006
Revises: 0005
"""
from alembic import op
import sqlalchemy as sa

revision = "0006"
down_revision = "0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("supplements", sa.Column("image_url", sa.String(500), nullable=True))


def downgrade() -> None:
    op.drop_column("supplements", "image_url")
