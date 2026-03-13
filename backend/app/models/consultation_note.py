"""
ConsultationNote model — structured consultation summaries sent to patients.
"""
from datetime import datetime, timezone
from sqlalchemy import String, Boolean, DateTime, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class ConsultationNote(Base):
    __tablename__ = "consultation_notes"

    id:              Mapped[int]  = mapped_column(primary_key=True)
    patient_id:      Mapped[int]  = mapped_column(ForeignKey("patients.id"), nullable=False, index=True)
    practitioner_id: Mapped[int]  = mapped_column(ForeignKey("practitioners.id"), nullable=False)

    # Header
    title:           Mapped[str]       = mapped_column(String(300), nullable=False)
    greeting:        Mapped[str | None] = mapped_column(Text)

    # Structured sections
    primary_concerns:    Mapped[str | None] = mapped_column(Text)
    health_history:      Mapped[str | None] = mapped_column(Text)
    dietary_plan:        Mapped[str | None] = mapped_column(Text)
    lifestyle_plan:      Mapped[str | None] = mapped_column(Text)
    supplements_plan:    Mapped[str | None] = mapped_column(Text)
    emotional_wellbeing: Mapped[str | None] = mapped_column(Text)
    next_steps:          Mapped[str | None] = mapped_column(Text)
    custom_recipes:      Mapped[str | None] = mapped_column(Text)
    additional_notes:    Mapped[str | None] = mapped_column(Text)
    closing:             Mapped[str | None] = mapped_column(Text)

    # Status
    sent:       Mapped[bool]     = mapped_column(Boolean, default=False)
    sent_at:    Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    patient:      Mapped["Patient"]      = relationship(back_populates="consultation_notes")  # noqa: F821
    practitioner: Mapped["Practitioner"] = relationship(back_populates="consultation_notes")  # noqa: F821
