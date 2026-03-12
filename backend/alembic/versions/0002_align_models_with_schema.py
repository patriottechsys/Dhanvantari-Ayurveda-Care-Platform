"""Align schema with current models — add missing columns to patients and health_profiles.

The 0001 migration used different column names / omitted columns that the
rewritten models expect.  The fix_schema.py script patched this at runtime;
this migration makes the changes permanent so fresh deployments just work.

Old columns from 0001 that no longer appear in models are intentionally kept
(data preservation).  They can be dropped in a future cleanup migration.

Revision ID: 0002
Revises: 0001
Create Date: 2026-03-12
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "0002"
down_revision: str = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _add_column_if_not_exists(table: str, column: sa.Column) -> None:
    """Safely add a column — silently skip if it already exists (idempotent)."""
    from sqlalchemy import inspect as sa_inspect
    bind = op.get_bind()
    inspector = sa_inspect(bind)
    existing = [c["name"] for c in inspector.get_columns(table)]
    if column.name not in existing:
        op.add_column(table, column)


def upgrade() -> None:
    # ── patients: add updated_at ─────────────────────────────────────────────
    _add_column_if_not_exists(
        "patients",
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # ── health_profiles: add columns the model expects ───────────────────────

    # Labs — new columns
    for col in [
        sa.Column("cholesterol_total", sa.Float),
        sa.Column("hemoglobin", sa.Float),
        sa.Column("hematocrit", sa.Float),
        sa.Column("eosinophils_pct", sa.Float),
        sa.Column("glucose", sa.Float),
        sa.Column("egfr", sa.Float),
        sa.Column("testosterone", sa.Float),
        sa.Column("psa", sa.Float),
        sa.Column("lab_date", sa.Date),
    ]:
        _add_column_if_not_exists("health_profiles", col)

    # Ayurvedic — new column names (old prakriti/vikriti/agni/ama_level kept)
    for col in [
        sa.Column("dosha_primary", sa.String(20)),
        sa.Column("dosha_secondary", sa.String(20)),
        sa.Column("dosha_imbalances", sa.Text),
        sa.Column("agni_assessment", sa.Text),
        sa.Column("ama_assessment", sa.Text),
        sa.Column("prakriti_notes", sa.Text),
        sa.Column("vikriti_notes", sa.Text),
    ]:
        _add_column_if_not_exists("health_profiles", col)

    # Clinical — new column names (old chief_complaint/medications kept)
    for col in [
        sa.Column("chief_complaints", sa.Text),
        sa.Column("medical_history", sa.Text),
        sa.Column("current_medications", sa.Text),
    ]:
        _add_column_if_not_exists("health_profiles", col)


def downgrade() -> None:
    # Remove only the columns this migration added
    hp_cols = [
        "cholesterol_total", "hemoglobin", "hematocrit", "eosinophils_pct",
        "glucose", "egfr", "testosterone", "psa", "lab_date",
        "dosha_primary", "dosha_secondary", "dosha_imbalances",
        "agni_assessment", "ama_assessment", "prakriti_notes", "vikriti_notes",
        "chief_complaints", "medical_history", "current_medications",
    ]
    for col in hp_cols:
        op.drop_column("health_profiles", col)

    op.drop_column("patients", "updated_at")
