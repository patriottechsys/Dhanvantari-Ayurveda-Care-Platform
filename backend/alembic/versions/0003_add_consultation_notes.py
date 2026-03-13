"""Add consultation_notes table.

Revision ID: 0003
Revises: 0002
"""
from alembic import op
import sqlalchemy as sa

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "consultation_notes",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("patient_id", sa.Integer, sa.ForeignKey("patients.id"), nullable=False, index=True),
        sa.Column("practitioner_id", sa.Integer, sa.ForeignKey("practitioners.id"), nullable=False),
        sa.Column("title", sa.String(300), nullable=False),
        sa.Column("greeting", sa.Text),
        sa.Column("primary_concerns", sa.Text),
        sa.Column("health_history", sa.Text),
        sa.Column("dietary_plan", sa.Text),
        sa.Column("lifestyle_plan", sa.Text),
        sa.Column("supplements_plan", sa.Text),
        sa.Column("emotional_wellbeing", sa.Text),
        sa.Column("next_steps", sa.Text),
        sa.Column("custom_recipes", sa.Text),
        sa.Column("additional_notes", sa.Text),
        sa.Column("closing", sa.Text),
        sa.Column("sent", sa.Boolean, default=False),
        sa.Column("sent_at", sa.DateTime(timezone=True)),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("consultation_notes")
