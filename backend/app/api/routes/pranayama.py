"""
Pranayama breathing exercises library routes + plan assignment.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from pydantic import BaseModel

from app.core.database import get_db
from app.api.deps import get_current_practitioner
from app.models.practitioner import Practitioner
from app.models.pranayama import Pranayama, PlanPranayama
from app.models.yoga import VideoReference

router = APIRouter()


# ── Pydantic schemas ─────────────────────────────────────────────────────────

class PranayamaCreate(BaseModel):
    name: str
    name_sanskrit: str | None = None
    category: str | None = None
    difficulty: str | None = None
    description: str | None = None
    technique_steps: list[str] | None = None
    benefits: list[str] | None = None
    contraindications: list[str] | None = None
    dosha_effect: str | None = None
    duration_range: str | None = None
    default_rounds: str | None = None
    image_url: str | None = None


class PranayamaUpdate(BaseModel):
    name: str | None = None
    name_sanskrit: str | None = None
    category: str | None = None
    difficulty: str | None = None
    description: str | None = None
    technique_steps: list[str] | None = None
    benefits: list[str] | None = None
    contraindications: list[str] | None = None
    dosha_effect: str | None = None
    duration_range: str | None = None
    default_rounds: str | None = None
    image_url: str | None = None


class PlanPranayamaCreate(BaseModel):
    pranayama_id: int
    duration: str | None = None
    rounds: str | None = None
    frequency: str | None = None
    practice_time: str | None = None
    notes: str | None = None


# ── Helpers ───────────────────────────────────────────────────────────────────

def _pranayama_dict(p: Pranayama, videos: list | None = None) -> dict:
    d = {
        "id": p.id,
        "name": p.name,
        "name_sanskrit": p.name_sanskrit,
        "category": p.category,
        "difficulty": p.difficulty,
        "description": p.description,
        "technique_steps": p.technique_steps or [],
        "benefits": p.benefits or [],
        "contraindications": p.contraindications or [],
        "dosha_effect": p.dosha_effect,
        "duration_range": p.duration_range,
        "default_rounds": p.default_rounds,
        "image_url": p.image_url,
        "is_community": p.is_community,
        "created_at": p.created_at.isoformat() if p.created_at else None,
    }
    if videos is not None:
        d["videos"] = [{
            "id": v.id,
            "title": v.title,
            "url": v.url,
            "platform": v.platform,
            "embed_url": v.embed_url,
            "thumbnail_url": v.thumbnail_url,
            "duration_display": v.duration_display,
            "language": v.language,
            "source_name": v.source_name,
            "is_primary": v.is_primary,
            "entity_type": v.entity_type,
            "entity_id": v.entity_id,
        } for v in videos]
    return d


# ── Pranayama CRUD ────────────────────────────────────────────────────────────

@router.get("")
async def list_pranayama(
    search: str | None = Query(None),
    category: str | None = Query(None),
    difficulty: str | None = Query(None),
    dosha: str | None = Query(None),
    practitioner: Practitioner = Depends(get_current_practitioner),
    db: AsyncSession = Depends(get_db),
):
    q = select(Pranayama)
    if search:
        q = q.where(
            or_(
                Pranayama.name.ilike(f"%{search}%"),
                Pranayama.name_sanskrit.ilike(f"%{search}%"),
                Pranayama.description.ilike(f"%{search}%"),
            )
        )
    if category:
        q = q.where(Pranayama.category.ilike(f"%{category}%"))
    if difficulty:
        q = q.where(Pranayama.difficulty.ilike(f"%{difficulty}%"))
    if dosha:
        q = q.where(Pranayama.dosha_effect.ilike(f"%{dosha}%"))
    q = q.order_by(Pranayama.name)
    result = await db.execute(q)
    return [_pranayama_dict(p) for p in result.scalars().all()]


@router.post("", status_code=201)
async def create_pranayama(
    body: PranayamaCreate,
    practitioner: Practitioner = Depends(get_current_practitioner),
    db: AsyncSession = Depends(get_db),
):
    p = Pranayama(**body.model_dump())
    db.add(p)
    await db.flush()
    return {"id": p.id, "message": "Pranayama exercise created"}


@router.get("/{exercise_id}")
async def get_pranayama(
    exercise_id: int,
    practitioner: Practitioner = Depends(get_current_practitioner),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Pranayama).where(Pranayama.id == exercise_id))
    p = result.scalars().first()
    if not p:
        raise HTTPException(status_code=404, detail="Pranayama exercise not found")
    # Fetch associated videos
    vresult = await db.execute(
        select(VideoReference).where(
            VideoReference.entity_type == "pranayama",
            VideoReference.entity_id == exercise_id,
        )
    )
    videos = vresult.scalars().all()
    return _pranayama_dict(p, videos=videos)


@router.patch("/{exercise_id}")
async def update_pranayama(
    exercise_id: int,
    body: PranayamaUpdate,
    practitioner: Practitioner = Depends(get_current_practitioner),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Pranayama).where(Pranayama.id == exercise_id))
    p = result.scalars().first()
    if not p:
        raise HTTPException(status_code=404, detail="Pranayama exercise not found")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(p, field, value)
    await db.flush()
    return {"message": "Updated"}


@router.delete("/{exercise_id}", status_code=204)
async def delete_pranayama(
    exercise_id: int,
    practitioner: Practitioner = Depends(get_current_practitioner),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Pranayama).where(Pranayama.id == exercise_id))
    p = result.scalars().first()
    if not p:
        raise HTTPException(status_code=404, detail="Pranayama exercise not found")
    await db.delete(p)
    return None


# ── Plan Pranayama Assignment ─────────────────────────────────────────────────

plan_pranayama_router = APIRouter()


@plan_pranayama_router.get("/{plan_id}/pranayama")
async def list_plan_pranayama(
    plan_id: int,
    practitioner: Practitioner = Depends(get_current_practitioner),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(PlanPranayama).where(PlanPranayama.plan_id == plan_id)
    )
    items = result.scalars().all()
    out = []
    for item in items:
        presult = await db.execute(select(Pranayama).where(Pranayama.id == item.pranayama_id))
        pranayama = presult.scalars().first()
        out.append({
            "id": item.id,
            "plan_id": item.plan_id,
            "pranayama_id": item.pranayama_id,
            "duration": item.duration,
            "rounds": item.rounds,
            "frequency": item.frequency,
            "practice_time": item.practice_time,
            "notes": item.notes,
            "pranayama": _pranayama_dict(pranayama) if pranayama else None,
        })
    return out


@plan_pranayama_router.post("/{plan_id}/pranayama", status_code=201)
async def assign_pranayama_to_plan(
    plan_id: int,
    body: PlanPranayamaCreate,
    practitioner: Practitioner = Depends(get_current_practitioner),
    db: AsyncSession = Depends(get_db),
):
    # Verify pranayama exists
    presult = await db.execute(select(Pranayama).where(Pranayama.id == body.pranayama_id))
    if not presult.scalars().first():
        raise HTTPException(status_code=404, detail="Pranayama exercise not found")
    item = PlanPranayama(plan_id=plan_id, **body.model_dump())
    db.add(item)
    await db.flush()
    return {"id": item.id, "message": "Pranayama exercise assigned to plan"}


@plan_pranayama_router.delete("/{plan_id}/pranayama/{assignment_id}", status_code=204)
async def remove_pranayama_from_plan(
    plan_id: int,
    assignment_id: int,
    practitioner: Practitioner = Depends(get_current_practitioner),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(PlanPranayama).where(
            PlanPranayama.id == assignment_id,
            PlanPranayama.plan_id == plan_id,
        )
    )
    item = result.scalars().first()
    if not item:
        raise HTTPException(status_code=404, detail="Assignment not found")
    await db.delete(item)
    return None
