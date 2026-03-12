from datetime import datetime, timezone
from sqlalchemy import String, Boolean, DateTime, Integer, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
import enum


class SubscriptionStatus(str, enum.Enum):
    TRIALING  = "trialing"
    ACTIVE    = "active"
    PAST_DUE  = "past_due"
    CANCELED  = "canceled"
    UNPAID    = "unpaid"


class Subscription(Base):
    __tablename__ = "subscriptions"

    id:              Mapped[int] = mapped_column(primary_key=True)
    practitioner_id: Mapped[int] = mapped_column(ForeignKey("practitioners.id"), nullable=False, unique=True, index=True)

    stripe_subscription_id: Mapped[str | None] = mapped_column(String(100), unique=True)
    stripe_price_id:        Mapped[str | None] = mapped_column(String(100))
    tier:   Mapped[str]    = mapped_column(String(20), default="free")
    status: Mapped[str]    = mapped_column(String(20), default="trialing")

    current_period_start: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    current_period_end:   Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    cancel_at_period_end: Mapped[bool] = mapped_column(Boolean, default=False)
    trial_end:            Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
