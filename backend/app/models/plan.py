"""
Consultation plans, supplements, and recipes.
"""
from datetime import datetime, date, timezone
from sqlalchemy import String, Boolean, DateTime, Date, Integer, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class ConsultationPlan(Base):
    __tablename__ = "consultation_plans"

    id:         Mapped[int]  = mapped_column(primary_key=True)
    patient_id: Mapped[int]  = mapped_column(ForeignKey("patients.id"), nullable=False, index=True)

    title:          Mapped[str]        = mapped_column(String(200), default="Initial Protocol")
    active:         Mapped[bool]       = mapped_column(Boolean, default=True)
    duration_weeks: Mapped[int | None] = mapped_column(Integer)
    start_date:     Mapped[date | None] = mapped_column(Date)
    end_date:       Mapped[date | None] = mapped_column(Date)

    # Structured protocol notes
    foods_to_avoid:   Mapped[str | None] = mapped_column(Text)
    foods_to_include: Mapped[str | None] = mapped_column(Text)
    lifestyle_notes:  Mapped[str | None] = mapped_column(Text)
    breathing_notes:  Mapped[str | None] = mapped_column(Text)
    nasal_care_notes: Mapped[str | None] = mapped_column(Text)
    followup_notes:   Mapped[str | None] = mapped_column(Text)

    # AI-generated fields
    ai_rationale:    Mapped[str | None] = mapped_column(Text)   # Why AI chose these recommendations
    ai_generated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    patient:          Mapped["Patient"]          = relationship(back_populates="plans")  # noqa: F821
    plan_supplements: Mapped[list["PlanSupplement"]] = relationship(back_populates="plan", cascade="all, delete-orphan")
    plan_recipes:     Mapped[list["PlanRecipe"]]     = relationship(back_populates="plan", cascade="all, delete-orphan")


class Supplement(Base):
    """Master supplement / herb library. Shared across all practitioners."""
    __tablename__ = "supplements"

    id:          Mapped[int]       = mapped_column(primary_key=True)
    name:        Mapped[str]       = mapped_column(String(200), nullable=False)
    name_sanskrit: Mapped[str | None] = mapped_column(String(200))  # Sanskrit / classical name
    brand:       Mapped[str | None] = mapped_column(String(200))
    category:    Mapped[str | None] = mapped_column(String(80))     # Herbal / Tea / Tablet / Churna / Ghrita
    purpose:     Mapped[str | None] = mapped_column(Text)
    dosha_effect: Mapped[str | None] = mapped_column(String(100))   # e.g. "Reduces Vata, Pitta"
    typical_dose: Mapped[str | None] = mapped_column(String(200))   # Standard dosing range
    cautions:    Mapped[str | None] = mapped_column(Text)
    contraindications: Mapped[str | None] = mapped_column(Text)
    source_url:  Mapped[str | None] = mapped_column(String(500))
    notes:       Mapped[str | None] = mapped_column(Text)
    is_classical: Mapped[bool]     = mapped_column(Boolean, default=False)  # classical formula vs modern brand
    is_community: Mapped[bool]     = mapped_column(Boolean, default=True)   # shared in community library

    plan_supplements: Mapped[list["PlanSupplement"]] = relationship(back_populates="supplement")


class PlanSupplement(Base):
    """A supplement assigned to a plan with patient-specific dosing."""
    __tablename__ = "plan_supplements"

    id:            Mapped[int] = mapped_column(primary_key=True)
    plan_id:       Mapped[int] = mapped_column(ForeignKey("consultation_plans.id"), nullable=False)
    supplement_id: Mapped[int] = mapped_column(ForeignKey("supplements.id"), nullable=False)

    dose:          Mapped[str | None] = mapped_column(String(100))
    timing:        Mapped[str | None] = mapped_column(String(100))
    frequency:     Mapped[str | None] = mapped_column(String(100))
    special_notes: Mapped[str | None] = mapped_column(Text)

    plan:       Mapped["ConsultationPlan"] = relationship(back_populates="plan_supplements")
    supplement: Mapped["Supplement"]       = relationship(back_populates="plan_supplements")


class Recipe(Base):
    """Master recipe library. Shared across all practitioners."""
    __tablename__ = "recipes"

    id:           Mapped[int]       = mapped_column(primary_key=True)
    name:         Mapped[str]       = mapped_column(String(200), nullable=False)
    meal_type:    Mapped[str | None] = mapped_column(String(50))   # Breakfast / Lunch / Dinner / Tea / Snack
    dosha_good_for: Mapped[str | None] = mapped_column(String(100)) # e.g. "Vata, Pitta"
    dosha_avoid:  Mapped[str | None] = mapped_column(String(100))  # e.g. "Kapha"
    ingredients:  Mapped[str | None] = mapped_column(Text)
    instructions: Mapped[str | None] = mapped_column(Text)
    notes:        Mapped[str | None] = mapped_column(Text)
    is_tea:       Mapped[bool]       = mapped_column(Boolean, default=False)
    is_community: Mapped[bool]       = mapped_column(Boolean, default=True)

    plan_recipes: Mapped[list["PlanRecipe"]] = relationship(back_populates="recipe")


class PlanRecipe(Base):
    """A recipe assigned to a plan with meal slot context."""
    __tablename__ = "plan_recipes"

    id:        Mapped[int] = mapped_column(primary_key=True)
    plan_id:   Mapped[int] = mapped_column(ForeignKey("consultation_plans.id"), nullable=False)
    recipe_id: Mapped[int] = mapped_column(ForeignKey("recipes.id"), nullable=False)
    meal_slot: Mapped[str | None] = mapped_column(String(50))

    plan:   Mapped["ConsultationPlan"] = relationship(back_populates="plan_recipes")
    recipe: Mapped["Recipe"]           = relationship(back_populates="plan_recipes")
