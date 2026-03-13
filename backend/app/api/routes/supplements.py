"""
Supplements library routes.
"""
import os
import aiofiles
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from pydantic import BaseModel

from app.core.config import settings
from app.core.database import get_db
from app.api.deps import get_current_practitioner
from app.models.practitioner import Practitioner
from app.models.plan import Supplement

router = APIRouter()


class SupplementCreate(BaseModel):
    name: str
    name_sanskrit: str | None = None
    brand: str | None = None
    category: str | None = None
    purpose: str | None = None
    dosha_effect: str | None = None
    typical_dose: str | None = None
    cautions: str | None = None
    contraindications: str | None = None
    notes: str | None = None
    is_classical: bool = False


class SupplementUpdate(BaseModel):
    name: str | None = None
    name_sanskrit: str | None = None
    brand: str | None = None
    category: str | None = None
    purpose: str | None = None
    dosha_effect: str | None = None
    typical_dose: str | None = None
    cautions: str | None = None
    contraindications: str | None = None
    notes: str | None = None


def _supp_dict(s: Supplement) -> dict:
    return {
        "id": s.id,
        "name": s.name,
        "name_sanskrit": s.name_sanskrit,
        "brand": s.brand,
        "category": s.category,
        "purpose": s.purpose,
        "dosha_effect": s.dosha_effect,
        "typical_dose": s.typical_dose,
        "cautions": s.cautions,
        "contraindications": s.contraindications,
        "notes": s.notes,
        "image_url": s.image_url,
        "is_classical": s.is_classical,
        "is_community": s.is_community,
    }


@router.get("")
async def list_supplements(
    search: str | None = Query(None),
    category: str | None = Query(None),
    dosha: str | None = Query(None),
    practitioner: Practitioner = Depends(get_current_practitioner),
    db: AsyncSession = Depends(get_db),
):
    q = select(Supplement)
    if search:
        q = q.where(
            or_(
                Supplement.name.ilike(f"%{search}%"),
                Supplement.name_sanskrit.ilike(f"%{search}%"),
                Supplement.purpose.ilike(f"%{search}%"),
            )
        )
    if category:
        q = q.where(Supplement.category.ilike(f"%{category}%"))
    if dosha:
        q = q.where(Supplement.dosha_effect.ilike(f"%{dosha}%"))
    q = q.order_by(Supplement.name)
    result = await db.execute(q)
    return [_supp_dict(s) for s in result.scalars().all()]


@router.post("", status_code=201)
async def create_supplement(
    body: SupplementCreate,
    practitioner: Practitioner = Depends(get_current_practitioner),
    db: AsyncSession = Depends(get_db),
):
    s = Supplement(**body.model_dump())
    db.add(s)
    await db.flush()
    return {"id": s.id, "message": "Supplement created"}


@router.get("/{supplement_id}")
async def get_supplement(
    supplement_id: int,
    practitioner: Practitioner = Depends(get_current_practitioner),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Supplement).where(Supplement.id == supplement_id))
    s = result.scalars().first()
    if not s:
        raise HTTPException(status_code=404, detail="Not found")
    return _supp_dict(s)


@router.patch("/{supplement_id}")
async def update_supplement(
    supplement_id: int,
    body: SupplementUpdate,
    practitioner: Practitioner = Depends(get_current_practitioner),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Supplement).where(Supplement.id == supplement_id))
    s = result.scalars().first()
    if not s:
        raise HTTPException(status_code=404, detail="Not found")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(s, field, value)
    await db.flush()
    return {"message": "Updated"}


@router.post("/{supplement_id}/image")
async def upload_supplement_image(
    supplement_id: int,
    file: UploadFile = File(...),
    practitioner: Practitioner = Depends(get_current_practitioner),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Supplement).where(Supplement.id == supplement_id))
    s = result.scalars().first()
    if not s:
        raise HTTPException(status_code=404, detail="Not found")

    content_type = file.content_type or ""
    if content_type not in ("image/jpeg", "image/png", "image/webp"):
        raise HTTPException(status_code=400, detail="Only JPEG, PNG, or WebP images are accepted")

    contents = await file.read()
    if len(contents) > 2 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (max 2MB)")

    upload_dir = os.path.join(settings.STORAGE_LOCAL_PATH, "supplements")
    os.makedirs(upload_dir, exist_ok=True)

    ext = content_type.split("/")[-1]
    filename = f"supplement_{s.id}.{ext}"
    filepath = os.path.join(upload_dir, filename)

    async with aiofiles.open(filepath, "wb") as f:
        await f.write(contents)

    s.image_url = f"/uploads/supplements/{filename}"
    await db.flush()
    return {"image_url": s.image_url}


@router.delete("/{supplement_id}/image")
async def delete_supplement_image(
    supplement_id: int,
    practitioner: Practitioner = Depends(get_current_practitioner),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Supplement).where(Supplement.id == supplement_id))
    s = result.scalars().first()
    if not s:
        raise HTTPException(status_code=404, detail="Not found")

    if s.image_url:
        filepath = os.path.join(settings.STORAGE_LOCAL_PATH, s.image_url.lstrip("/uploads/"))
        if os.path.exists(filepath):
            os.remove(filepath)
        s.image_url = None
        await db.flush()

    return {"message": "Image removed"}
