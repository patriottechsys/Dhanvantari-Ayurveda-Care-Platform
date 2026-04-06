"""
Patient intake form submission and token models.
Allows practitioners to generate shareable intake links for new patients.
"""
import secrets
import enum
from datetime import datetime, timezone
from sqlalchemy import String, Boolean, DateTime, Date, Float, Text, Integer, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class IntakeStatus(str, enum.Enum):
    PENDING  = "pending"
    REVIEWED = "reviewed"
    APPROVED = "approved"
    REJECTED = "rejected"


class IntakeToken(Base):
    __tablename__ = "intake_tokens"

    id:              Mapped[int]  = mapped_column(primary_key=True)
    practitioner_id: Mapped[int]  = mapped_column(ForeignKey("practitioners.id"), nullable=False, index=True)
    token:           Mapped[str]  = mapped_column(String(128), unique=True, nullable=False, default=lambda: secrets.token_urlsafe(48))
    active:          Mapped[bool] = mapped_column(Boolean, default=True)
    created_at:      Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    practitioner: Mapped["Practitioner"] = relationship()  # noqa: F821
    submission:   Mapped["IntakeSubmission | None"] = relationship(back_populates="token_ref", uselist=False)

    @property
    def intake_url_path(self) -> str:
        return f"/intake/{self.token}"


class IntakeSubmission(Base):
    __tablename__ = "intake_submissions"

    id:              Mapped[int] = mapped_column(primary_key=True)
    practitioner_id: Mapped[int] = mapped_column(ForeignKey("practitioners.id"), nullable=False, index=True)
    token_id:        Mapped[int] = mapped_column(ForeignKey("intake_tokens.id"), nullable=False, unique=True)

    status: Mapped[IntakeStatus] = mapped_column(
        SAEnum(IntakeStatus), default=IntakeStatus.PENDING, nullable=False
    )

    # Timestamps
    submitted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    reviewed_at:  Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # ── Demographics ──────────────────────────────────────────────────────
    first_name:  Mapped[str]         = mapped_column(String(80), nullable=False)
    last_name:   Mapped[str]         = mapped_column(String(80), nullable=False)
    dob:         Mapped[datetime | None] = mapped_column(Date)
    sex:         Mapped[str | None]  = mapped_column(String(10))
    email:       Mapped[str | None]  = mapped_column(String(200))
    phone:       Mapped[str | None]  = mapped_column(String(30))
    address:     Mapped[str | None]  = mapped_column(String(500))
    occupation:  Mapped[str | None]  = mapped_column(String(200))

    # ── Medical History ───────────────────────────────────────────────────
    current_medications: Mapped[str | None] = mapped_column(Text)
    allergies:           Mapped[str | None] = mapped_column(Text)
    past_surgeries:      Mapped[str | None] = mapped_column(Text)
    chronic_conditions:  Mapped[str | None] = mapped_column(Text)
    family_history:      Mapped[str | None] = mapped_column(Text)

    # ── Lifestyle ─────────────────────────────────────────────────────────
    diet_type:        Mapped[str | None] = mapped_column(String(50))   # vegetarian, vegan, omnivore, etc.
    exercise_habits:  Mapped[str | None] = mapped_column(Text)
    sleep_patterns:   Mapped[str | None] = mapped_column(Text)
    stress_level:     Mapped[int | None] = mapped_column(Integer)      # 1-5
    smoking:          Mapped[str | None] = mapped_column(String(50))
    alcohol:          Mapped[str | None] = mapped_column(String(50))
    caffeine:         Mapped[str | None] = mapped_column(String(50))

    # ── Ayurvedic Background (optional) ───────────────────────────────────
    digestive_patterns:     Mapped[str | None] = mapped_column(Text)
    elimination_patterns:   Mapped[str | None] = mapped_column(Text)
    energy_levels:          Mapped[str | None] = mapped_column(Text)
    mental_tendencies:      Mapped[str | None] = mapped_column(Text)
    prior_ayurvedic_care:   Mapped[str | None] = mapped_column(Text)

    # ── Reason for Visit ──────────────────────────────────────────────────
    chief_concern:       Mapped[str | None] = mapped_column(Text)
    symptom_duration:    Mapped[str | None] = mapped_column(String(200))
    previous_treatments: Mapped[str | None] = mapped_column(Text)
    treatment_goals:     Mapped[str | None] = mapped_column(Text)

    # ── Rejection reason (set by practitioner) ────────────────────────────
    rejection_reason: Mapped[str | None] = mapped_column(Text)

    # Relationships
    practitioner: Mapped["Practitioner"] = relationship()  # noqa: F821
    token_ref:    Mapped["IntakeToken"]  = relationship(back_populates="submission")
