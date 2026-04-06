"""Add intake_tokens and intake_submissions tables.

Revision ID: 0009
Revises: 0008
"""
from alembic import op
import sqlalchemy as sa

revision = "0009"
down_revision = "0008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "intake_tokens",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("practitioner_id", sa.Integer, sa.ForeignKey("practitioners.id"), nullable=False, index=True),
        sa.Column("token", sa.String(128), unique=True, nullable=False),
        sa.Column("active", sa.Boolean, default=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "intake_submissions",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("practitioner_id", sa.Integer, sa.ForeignKey("practitioners.id"), nullable=False, index=True),
        sa.Column("token_id", sa.Integer, sa.ForeignKey("intake_tokens.id"), nullable=False, unique=True),
        sa.Column("status", sa.Enum("pending", "reviewed", "approved", "rejected", name="intakestatus"), nullable=False, server_default="pending"),
        sa.Column("submitted_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("reviewed_at", sa.DateTime(timezone=True)),
        # Demographics
        sa.Column("first_name", sa.String(80), nullable=False),
        sa.Column("last_name", sa.String(80), nullable=False),
        sa.Column("dob", sa.Date),
        sa.Column("sex", sa.String(10)),
        sa.Column("email", sa.String(200)),
        sa.Column("phone", sa.String(30)),
        sa.Column("address", sa.String(500)),
        sa.Column("occupation", sa.String(200)),
        # Medical history
        sa.Column("current_medications", sa.Text),
        sa.Column("allergies", sa.Text),
        sa.Column("past_surgeries", sa.Text),
        sa.Column("chronic_conditions", sa.Text),
        sa.Column("family_history", sa.Text),
        # Lifestyle
        sa.Column("diet_type", sa.String(50)),
        sa.Column("exercise_habits", sa.Text),
        sa.Column("sleep_patterns", sa.Text),
        sa.Column("stress_level", sa.Integer),
        sa.Column("smoking", sa.String(50)),
        sa.Column("alcohol", sa.String(50)),
        sa.Column("caffeine", sa.String(50)),
        # Ayurvedic
        sa.Column("digestive_patterns", sa.Text),
        sa.Column("elimination_patterns", sa.Text),
        sa.Column("energy_levels", sa.Text),
        sa.Column("mental_tendencies", sa.Text),
        sa.Column("prior_ayurvedic_care", sa.Text),
        # Reason for visit
        sa.Column("chief_concern", sa.Text),
        sa.Column("symptom_duration", sa.String(200)),
        sa.Column("previous_treatments", sa.Text),
        sa.Column("treatment_goals", sa.Text),
        # Rejection
        sa.Column("rejection_reason", sa.Text),
    )


def downgrade() -> None:
    op.drop_table("intake_submissions")
    op.drop_table("intake_tokens")
    op.execute("DROP TYPE IF EXISTS intakestatus")
