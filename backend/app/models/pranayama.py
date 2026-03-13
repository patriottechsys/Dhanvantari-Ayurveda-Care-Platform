"""
Pranayama breathing exercises and plan assignments.
"""
from datetime import datetime, timezone
from sqlalchemy import String, Boolean, DateTime, Integer, Text, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class Pranayama(Base):
    """Master pranayama exercise library. Shared across all practitioners."""
    __tablename__ = "pranayama_exercises"

    id:              Mapped[int]        = mapped_column(primary_key=True)
    name:            Mapped[str]        = mapped_column(String(200), nullable=False)
    name_sanskrit:   Mapped[str | None] = mapped_column(String(200))
    category:        Mapped[str | None] = mapped_column(String(80))     # Balancing, Calming, Energizing, Cooling
    difficulty:      Mapped[str | None] = mapped_column(String(30))     # Beginner, Intermediate, Advanced
    description:     Mapped[str | None] = mapped_column(Text)
    technique_steps: Mapped[list | None] = mapped_column(JSON)          # ["Step 1...", "Step 2..."]
    benefits:        Mapped[list | None] = mapped_column(JSON)          # ["Reduces stress", ...]
    contraindications: Mapped[list | None] = mapped_column(JSON)        # ["High blood pressure", ...]
    dosha_effect:    Mapped[str | None] = mapped_column(String(200))    # e.g. "Balances Vata & Pitta"
    duration_range:  Mapped[str | None] = mapped_column(String(100))    # "5-15 minutes"
    default_rounds:  Mapped[str | None] = mapped_column(String(50))     # "3-5 rounds"
    image_url:       Mapped[str | None] = mapped_column(String(500))
    is_community:    Mapped[bool]       = mapped_column(Boolean, default=True)
    created_at:      Mapped[datetime]   = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    videos: Mapped[list["VideoReference"]] = relationship(
        primaryjoin="and_(VideoReference.entity_type=='pranayama', foreign(VideoReference.entity_id)==Pranayama.id)",
        viewonly=True,
    )


class PlanPranayama(Base):
    """A pranayama exercise assigned to a patient's consultation plan."""
    __tablename__ = "plan_pranayama"

    id:            Mapped[int]        = mapped_column(primary_key=True)
    plan_id:       Mapped[int]        = mapped_column(ForeignKey("consultation_plans.id"), nullable=False, index=True)
    pranayama_id:  Mapped[int]        = mapped_column(ForeignKey("pranayama_exercises.id"), nullable=False)
    duration:      Mapped[str | None] = mapped_column(String(100))      # "10 minutes"
    rounds:        Mapped[str | None] = mapped_column(String(50))       # "5 rounds"
    frequency:     Mapped[str | None] = mapped_column(String(100))      # "Daily", "2x per day"
    practice_time: Mapped[str | None] = mapped_column(String(100))      # "Morning", "Before bed"
    notes:         Mapped[str | None] = mapped_column(Text)

    plan:      Mapped["ConsultationPlan"] = relationship()  # noqa: F821
    pranayama: Mapped["Pranayama"]        = relationship()
