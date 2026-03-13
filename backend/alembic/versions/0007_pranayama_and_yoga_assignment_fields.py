"""Add pranayama tables and enhance plan_yoga_asanas fields.

Revision ID: 0007
Revises: 0006
"""
from alembic import op
import sqlalchemy as sa

revision = "0007"
down_revision = "0006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── #51: Pranayama master library ─────────────────────────────────────────
    op.create_table(
        "pranayama_exercises",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("name_sanskrit", sa.String(200)),
        sa.Column("category", sa.String(80)),
        sa.Column("difficulty", sa.String(30)),
        sa.Column("description", sa.Text),
        sa.Column("technique_steps", sa.JSON),
        sa.Column("benefits", sa.JSON),
        sa.Column("contraindications", sa.JSON),
        sa.Column("dosha_effect", sa.String(200)),
        sa.Column("duration_range", sa.String(100)),
        sa.Column("default_rounds", sa.String(50)),
        sa.Column("image_url", sa.String(500)),
        sa.Column("is_community", sa.Boolean, default=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # ── #51: Pranayama plan assignment ────────────────────────────────────────
    op.create_table(
        "plan_pranayama",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("plan_id", sa.Integer, sa.ForeignKey("consultation_plans.id"), nullable=False, index=True),
        sa.Column("pranayama_id", sa.Integer, sa.ForeignKey("pranayama_exercises.id"), nullable=False),
        sa.Column("duration", sa.String(100)),
        sa.Column("rounds", sa.String(50)),
        sa.Column("frequency", sa.String(100)),
        sa.Column("practice_time", sa.String(100)),
        sa.Column("notes", sa.Text),
    )

    # ── #52: Enhanced yoga assignment fields ──────────────────────────────────
    op.add_column("plan_yoga_asanas", sa.Column("duration", sa.String(100)))
    op.add_column("plan_yoga_asanas", sa.Column("hold_time", sa.String(100)))
    op.add_column("plan_yoga_asanas", sa.Column("repetitions", sa.String(100)))
    op.add_column("plan_yoga_asanas", sa.Column("practice_time", sa.String(100)))
    op.add_column("plan_yoga_asanas", sa.Column("include_video_link", sa.Boolean, server_default=sa.text("false")))


def downgrade() -> None:
    op.drop_column("plan_yoga_asanas", "include_video_link")
    op.drop_column("plan_yoga_asanas", "practice_time")
    op.drop_column("plan_yoga_asanas", "repetitions")
    op.drop_column("plan_yoga_asanas", "hold_time")
    op.drop_column("plan_yoga_asanas", "duration")
    op.drop_table("plan_pranayama")
    op.drop_table("pranayama_exercises")
