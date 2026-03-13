"""
Yoga asanas library routes + video references.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from pydantic import BaseModel

from app.core.database import get_db
from app.api.deps import get_current_practitioner
from app.models.practitioner import Practitioner
from app.models.yoga import YogaAsana, VideoReference, PlanYogaAsana

router = APIRouter()


# ── Pydantic schemas ─────────────────────────────────────────────────────────

class AsanaCreate(BaseModel):
    name: str
    name_sanskrit: str | None = None
    category: str | None = None
    level: str | None = None
    description: str | None = None
    instructions: list[str] | None = None
    benefits: str | None = None
    dosha_effect: str | None = None
    therapeutic_focus: list[str] | None = None
    modifications: list[str] | None = None
    contraindications: list[str] | None = None
    hold_duration: str | None = None
    repetitions: str | None = None
    image_url: str | None = None


class AsanaUpdate(BaseModel):
    name: str | None = None
    name_sanskrit: str | None = None
    category: str | None = None
    level: str | None = None
    description: str | None = None
    instructions: list[str] | None = None
    benefits: str | None = None
    dosha_effect: str | None = None
    therapeutic_focus: list[str] | None = None
    modifications: list[str] | None = None
    contraindications: list[str] | None = None
    hold_duration: str | None = None
    repetitions: str | None = None
    image_url: str | None = None


class VideoCreate(BaseModel):
    title: str
    url: str
    platform: str | None = None
    embed_url: str | None = None
    thumbnail_url: str | None = None
    duration_display: str | None = None
    language: str | None = "English"
    source_name: str | None = None
    is_primary: bool = False
    entity_type: str
    entity_id: int


class VideoUpdate(BaseModel):
    title: str | None = None
    url: str | None = None
    platform: str | None = None
    embed_url: str | None = None
    thumbnail_url: str | None = None
    duration_display: str | None = None
    language: str | None = None
    source_name: str | None = None
    is_primary: bool | None = None


class PlanYogaCreate(BaseModel):
    asana_id: int
    frequency: str | None = None
    duration: str | None = None
    hold_time: str | None = None
    repetitions: str | None = None
    practice_time: str | None = None
    include_video_link: bool = False
    notes: str | None = None


# ── Helpers ───────────────────────────────────────────────────────────────────

def _asana_dict(a: YogaAsana, videos: list | None = None) -> dict:
    d = {
        "id": a.id,
        "name": a.name,
        "name_sanskrit": a.name_sanskrit,
        "category": a.category,
        "level": a.level,
        "description": a.description,
        "instructions": a.instructions or [],
        "benefits": a.benefits,
        "dosha_effect": a.dosha_effect,
        "therapeutic_focus": a.therapeutic_focus or [],
        "modifications": a.modifications or [],
        "contraindications": a.contraindications or [],
        "hold_duration": a.hold_duration,
        "repetitions": a.repetitions,
        "image_url": a.image_url,
        "is_community": a.is_community,
        "created_at": a.created_at.isoformat() if a.created_at else None,
    }
    if videos is not None:
        d["videos"] = [_video_dict(v) for v in videos]
    return d


def _video_dict(v: VideoReference) -> dict:
    return {
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
        "created_at": v.created_at.isoformat() if v.created_at else None,
    }


# ── Yoga Asana CRUD ──────────────────────────────────────────────────────────

@router.get("")
async def list_asanas(
    search: str | None = Query(None),
    category: str | None = Query(None),
    level: str | None = Query(None),
    dosha: str | None = Query(None),
    practitioner: Practitioner = Depends(get_current_practitioner),
    db: AsyncSession = Depends(get_db),
):
    q = select(YogaAsana)
    if search:
        q = q.where(
            or_(
                YogaAsana.name.ilike(f"%{search}%"),
                YogaAsana.name_sanskrit.ilike(f"%{search}%"),
                YogaAsana.description.ilike(f"%{search}%"),
            )
        )
    if category:
        q = q.where(YogaAsana.category.ilike(f"%{category}%"))
    if level:
        q = q.where(YogaAsana.level.ilike(f"%{level}%"))
    if dosha:
        q = q.where(YogaAsana.dosha_effect.ilike(f"%{dosha}%"))
    q = q.order_by(YogaAsana.name)
    result = await db.execute(q)
    return [_asana_dict(a) for a in result.scalars().all()]


@router.post("", status_code=201)
async def create_asana(
    body: AsanaCreate,
    practitioner: Practitioner = Depends(get_current_practitioner),
    db: AsyncSession = Depends(get_db),
):
    a = YogaAsana(**body.model_dump())
    db.add(a)
    await db.flush()
    return {"id": a.id, "message": "Yoga asana created"}


@router.get("/{asana_id}")
async def get_asana(
    asana_id: int,
    practitioner: Practitioner = Depends(get_current_practitioner),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(YogaAsana).where(YogaAsana.id == asana_id))
    a = result.scalars().first()
    if not a:
        raise HTTPException(status_code=404, detail="Asana not found")
    # Fetch associated videos
    vresult = await db.execute(
        select(VideoReference).where(
            VideoReference.entity_type == "yoga_asana",
            VideoReference.entity_id == asana_id,
        )
    )
    videos = vresult.scalars().all()
    return _asana_dict(a, videos=videos)


@router.patch("/{asana_id}")
async def update_asana(
    asana_id: int,
    body: AsanaUpdate,
    practitioner: Practitioner = Depends(get_current_practitioner),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(YogaAsana).where(YogaAsana.id == asana_id))
    a = result.scalars().first()
    if not a:
        raise HTTPException(status_code=404, detail="Asana not found")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(a, field, value)
    await db.flush()
    return {"message": "Updated"}


@router.delete("/{asana_id}", status_code=204)
async def delete_asana(
    asana_id: int,
    practitioner: Practitioner = Depends(get_current_practitioner),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(YogaAsana).where(YogaAsana.id == asana_id))
    a = result.scalars().first()
    if not a:
        raise HTTPException(status_code=404, detail="Asana not found")
    await db.delete(a)
    return None


# ── Video References CRUD ─────────────────────────────────────────────────────

@router.get("/{asana_id}/videos")
async def list_asana_videos(
    asana_id: int,
    practitioner: Practitioner = Depends(get_current_practitioner),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(VideoReference).where(
            VideoReference.entity_type == "yoga_asana",
            VideoReference.entity_id == asana_id,
        )
    )
    return [_video_dict(v) for v in result.scalars().all()]


# ── Standalone video routes (mounted separately) ─────────────────────────────

video_router = APIRouter()


@video_router.get("")
async def list_videos(
    entity_type: str | None = Query(None),
    entity_id: int | None = Query(None),
    practitioner: Practitioner = Depends(get_current_practitioner),
    db: AsyncSession = Depends(get_db),
):
    q = select(VideoReference)
    if entity_type:
        q = q.where(VideoReference.entity_type == entity_type)
    if entity_id is not None:
        q = q.where(VideoReference.entity_id == entity_id)
    q = q.order_by(VideoReference.title)
    result = await db.execute(q)
    return [_video_dict(v) for v in result.scalars().all()]


@video_router.post("", status_code=201)
async def create_video(
    body: VideoCreate,
    practitioner: Practitioner = Depends(get_current_practitioner),
    db: AsyncSession = Depends(get_db),
):
    v = VideoReference(**body.model_dump())
    db.add(v)
    await db.flush()
    return {"id": v.id, "message": "Video reference created"}


@video_router.patch("/{video_id}")
async def update_video(
    video_id: int,
    body: VideoUpdate,
    practitioner: Practitioner = Depends(get_current_practitioner),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(VideoReference).where(VideoReference.id == video_id))
    v = result.scalars().first()
    if not v:
        raise HTTPException(status_code=404, detail="Video not found")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(v, field, value)
    await db.flush()
    return {"message": "Updated"}


@video_router.delete("/{video_id}", status_code=204)
async def delete_video(
    video_id: int,
    practitioner: Practitioner = Depends(get_current_practitioner),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(VideoReference).where(VideoReference.id == video_id))
    v = result.scalars().first()
    if not v:
        raise HTTPException(status_code=404, detail="Video not found")
    await db.delete(v)
    return None


# ── Plan Yoga Assignment ──────────────────────────────────────────────────────

plan_yoga_router = APIRouter()


@plan_yoga_router.get("/{plan_id}/yoga")
async def list_plan_yoga(
    plan_id: int,
    practitioner: Practitioner = Depends(get_current_practitioner),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(PlanYogaAsana).where(PlanYogaAsana.plan_id == plan_id)
    )
    items = result.scalars().all()
    out = []
    for item in items:
        aresult = await db.execute(select(YogaAsana).where(YogaAsana.id == item.asana_id))
        asana = aresult.scalars().first()
        out.append({
            "id": item.id,
            "plan_id": item.plan_id,
            "asana_id": item.asana_id,
            "frequency": item.frequency,
            "duration": item.duration,
            "hold_time": item.hold_time,
            "repetitions": item.repetitions,
            "practice_time": item.practice_time,
            "include_video_link": item.include_video_link,
            "notes": item.notes,
            "asana": _asana_dict(asana) if asana else None,
        })
    return out


@plan_yoga_router.post("/{plan_id}/yoga", status_code=201)
async def assign_yoga_to_plan(
    plan_id: int,
    body: PlanYogaCreate,
    practitioner: Practitioner = Depends(get_current_practitioner),
    db: AsyncSession = Depends(get_db),
):
    item = PlanYogaAsana(plan_id=plan_id, **body.model_dump())
    db.add(item)
    await db.flush()
    return {"id": item.id, "message": "Yoga asana assigned to plan"}


@plan_yoga_router.delete("/{plan_id}/yoga/{assignment_id}", status_code=204)
async def remove_yoga_from_plan(
    plan_id: int,
    assignment_id: int,
    practitioner: Practitioner = Depends(get_current_practitioner),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(PlanYogaAsana).where(
            PlanYogaAsana.id == assignment_id,
            PlanYogaAsana.plan_id == plan_id,
        )
    )
    item = result.scalars().first()
    if not item:
        raise HTTPException(status_code=404, detail="Assignment not found")
    await db.delete(item)
    return None
