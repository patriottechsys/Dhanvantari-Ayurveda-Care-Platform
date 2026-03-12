from datetime import datetime, date, timezone
from sqlalchemy import String, Boolean, DateTime, Date, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class FollowUp(Base):
    __tablename__ = "followups"

    id:              Mapped[int]  = mapped_column(primary_key=True)
    patient_id:      Mapped[int]  = mapped_column(ForeignKey("patients.id"), nullable=False, index=True)
    practitioner_id: Mapped[int]  = mapped_column(ForeignKey("practitioners.id"), nullable=False)
    scheduled_date:  Mapped[date] = mapped_column(Date, nullable=False)
    reason:          Mapped[str | None] = mapped_column(String(300))
    notes:           Mapped[str | None] = mapped_column(Text)
    completed:       Mapped[bool] = mapped_column(Boolean, default=False)
    completed_at:    Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at:      Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    patient:      Mapped["Patient"]      = relationship(back_populates="followups")  # noqa: F821
    practitioner: Mapped["Practitioner"] = relationship(back_populates="followups")  # noqa: F821
