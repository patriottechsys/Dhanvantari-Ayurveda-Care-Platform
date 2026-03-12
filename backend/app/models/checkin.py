"""
Patient check-in token and daily check-in records.
"""
import secrets
from datetime import datetime, date, timezone
from sqlalchemy import String, Boolean, DateTime, Date, Integer, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class CheckInToken(Base):
    __tablename__ = "checkin_tokens"

    id:         Mapped[int]  = mapped_column(primary_key=True)
    patient_id: Mapped[int]  = mapped_column(ForeignKey("patients.id"), nullable=False, unique=True)
    token:      Mapped[str]  = mapped_column(String(128), unique=True, nullable=False, default=lambda: secrets.token_urlsafe(48))
    active:     Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    patient: Mapped["Patient"] = relationship(back_populates="checkin_token")  # noqa: F821

    @property
    def portal_url_path(self) -> str:
        return f"/portal/{self.token}"


class DailyCheckIn(Base):
    __tablename__ = "daily_checkins"

    id:           Mapped[int]  = mapped_column(primary_key=True)
    patient_id:   Mapped[int]  = mapped_column(ForeignKey("patients.id"), nullable=False, index=True)
    date:         Mapped[date] = mapped_column(Date, nullable=False)
    submitted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Morning routine
    warm_water:         Mapped[bool] = mapped_column(Boolean, default=False)
    breathing_exercise: Mapped[bool] = mapped_column(Boolean, default=False)
    nasal_oil:          Mapped[bool] = mapped_column(Boolean, default=False)

    # Meals
    warm_breakfast:    Mapped[bool] = mapped_column(Boolean, default=False)
    avoided_cold_food: Mapped[bool] = mapped_column(Boolean, default=False)
    avoided_yogurt:    Mapped[bool] = mapped_column(Boolean, default=False)
    herbal_tea_am:     Mapped[bool] = mapped_column(Boolean, default=False)
    warm_lunch:        Mapped[bool] = mapped_column(Boolean, default=False)
    included_barley:   Mapped[bool] = mapped_column(Boolean, default=False)
    no_cold_drinks:    Mapped[bool] = mapped_column(Boolean, default=False)
    warm_dinner:       Mapped[bool] = mapped_column(Boolean, default=False)
    dinner_before_8pm: Mapped[bool] = mapped_column(Boolean, default=False)

    # Supplements
    supplements_am: Mapped[bool] = mapped_column(Boolean, default=False)
    supplements_pm: Mapped[bool] = mapped_column(Boolean, default=False)

    # Lifestyle
    cardio_today:     Mapped[bool] = mapped_column(Boolean, default=False)
    consistent_sleep: Mapped[bool] = mapped_column(Boolean, default=False)

    # Symptom scores 1–5
    digestion_score: Mapped[int | None] = mapped_column(Integer)
    urinary_score:   Mapped[int | None] = mapped_column(Integer)
    sinus_score:     Mapped[int | None] = mapped_column(Integer)
    energy_score:    Mapped[int | None] = mapped_column(Integer)

    notes: Mapped[str | None] = mapped_column(Text)

    patient: Mapped["Patient"] = relationship(back_populates="checkins")  # noqa: F821

    @property
    def habit_completion_pct(self) -> int:
        fields = [
            self.warm_water, self.breathing_exercise, self.nasal_oil,
            self.warm_breakfast, self.avoided_cold_food, self.avoided_yogurt,
            self.herbal_tea_am, self.warm_lunch, self.included_barley,
            self.no_cold_drinks, self.warm_dinner, self.dinner_before_8pm,
            self.supplements_am, self.supplements_pm,
        ]
        done = sum(1 for f in fields if f)
        return round(done / len(fields) * 100)

    @property
    def avg_symptom_score(self) -> float | None:
        scores = [s for s in [self.digestion_score, self.urinary_score, self.sinus_score, self.energy_score] if s]
        return round(sum(scores) / len(scores), 1) if scores else None
