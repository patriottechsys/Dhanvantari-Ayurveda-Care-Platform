"""
Yoga asanas and video references.
"""
from datetime import datetime, timezone
from sqlalchemy import String, Boolean, DateTime, Integer, Text, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class YogaAsana(Base):
    """Master yoga asana library. Shared across all practitioners."""
    __tablename__ = "yoga_asanas"

    id:             Mapped[int]        = mapped_column(primary_key=True)
    name:           Mapped[str]        = mapped_column(String(200), nullable=False)
    name_sanskrit:  Mapped[str | None] = mapped_column(String(200))
    category:       Mapped[str | None] = mapped_column(String(80))    # Standing, Seated, Supine, Prone, etc.
    level:          Mapped[str | None] = mapped_column(String(30))    # Beginner, Intermediate, Advanced
    description:    Mapped[str | None] = mapped_column(Text)
    instructions:   Mapped[list | None] = mapped_column(JSON)         # ["Step 1...", "Step 2..."]
    benefits:       Mapped[str | None] = mapped_column(Text)
    dosha_effect:   Mapped[str | None] = mapped_column(String(200))   # e.g. "Balances Vata & Kapha"
    therapeutic_focus: Mapped[list | None] = mapped_column(JSON)      # ["Flexibility", "Stress Relief"]
    modifications:  Mapped[list | None] = mapped_column(JSON)         # ["Use a block...", ...]
    contraindications: Mapped[list | None] = mapped_column(JSON)      # ["Avoid if...", ...]
    hold_duration:  Mapped[str | None] = mapped_column(String(100))   # "30-60 seconds"
    repetitions:    Mapped[str | None] = mapped_column(String(100))   # "3-5 rounds"
    image_url:      Mapped[str | None] = mapped_column(String(500))
    is_community:   Mapped[bool]       = mapped_column(Boolean, default=True)
    created_at:     Mapped[datetime]   = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    videos: Mapped[list["VideoReference"]] = relationship(
        back_populates="yoga_asana",
        primaryjoin="and_(VideoReference.entity_type=='yoga_asana', foreign(VideoReference.entity_id)==YogaAsana.id)",
        viewonly=True,
    )


class VideoReference(Base):
    """Video links (YouTube/Vimeo) attached to yoga asanas or pranayama exercises."""
    __tablename__ = "video_references"

    id:             Mapped[int]        = mapped_column(primary_key=True)
    title:          Mapped[str]        = mapped_column(String(300), nullable=False)
    url:            Mapped[str]        = mapped_column(String(500), nullable=False)
    platform:       Mapped[str | None] = mapped_column(String(20))    # youtube, vimeo, other
    embed_url:      Mapped[str | None] = mapped_column(String(500))
    thumbnail_url:  Mapped[str | None] = mapped_column(String(500))
    duration_display: Mapped[str | None] = mapped_column(String(20))  # "4:32"
    language:       Mapped[str | None] = mapped_column(String(50), default="English")
    source_name:    Mapped[str | None] = mapped_column(String(200))   # Channel or instructor name
    is_primary:     Mapped[bool]       = mapped_column(Boolean, default=False)

    # Polymorphic link: entity_type + entity_id
    entity_type:    Mapped[str]        = mapped_column(String(50), nullable=False, index=True)  # yoga_asana, pranayama
    entity_id:      Mapped[int]        = mapped_column(Integer, nullable=False, index=True)

    created_at:     Mapped[datetime]   = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    yoga_asana: Mapped["YogaAsana | None"] = relationship(
        back_populates="videos",
        primaryjoin="and_(VideoReference.entity_type=='yoga_asana', foreign(VideoReference.entity_id)==YogaAsana.id)",
        viewonly=True,
    )


class PlanYogaAsana(Base):
    """A yoga asana assigned to a patient's consultation plan."""
    __tablename__ = "plan_yoga_asanas"

    id:        Mapped[int] = mapped_column(primary_key=True)
    plan_id:   Mapped[int] = mapped_column(ForeignKey("consultation_plans.id"), nullable=False, index=True)
    asana_id:  Mapped[int] = mapped_column(ForeignKey("yoga_asanas.id"), nullable=False)
    frequency: Mapped[str | None] = mapped_column(String(100))     # "Daily", "3x per week"
    duration:  Mapped[str | None] = mapped_column(String(100))     # "10 minutes", "5-10 breaths"
    hold_time: Mapped[str | None] = mapped_column(String(100))     # "30 seconds", "1 minute each side"
    repetitions:      Mapped[str | None] = mapped_column(String(100))  # "3 sets of 5"
    practice_time:    Mapped[str | None] = mapped_column(String(100))  # "Morning", "Before bed"
    include_video_link: Mapped[bool]     = mapped_column(Boolean, default=False)
    notes:     Mapped[str | None] = mapped_column(Text)

    plan:  Mapped["ConsultationPlan"] = relationship()  # noqa: F821
    asana: Mapped["YogaAsana"]        = relationship()
