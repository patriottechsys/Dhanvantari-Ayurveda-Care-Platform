"""
Practitioner profile routes.
"""
import os
import aiofiles
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

from app.core.database import get_db
from app.core.config import settings
from app.api.deps import get_current_practitioner
from app.models.practitioner import Practitioner

router = APIRouter()


class ProfileUpdate(BaseModel):
    name: str | None = None
    practice_name: str | None = None
    designation: str | None = None
    bio: str | None = None
    tagline: str | None = None
    location: str | None = None
    telehealth_url: str | None = None
    website: str | None = None


def _practitioner_dict(p: Practitioner) -> dict:
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)
    in_trial = bool(p.trial_ends_at and p.trial_ends_at > now and not p.subscription_active)
    return {
        "id": p.id,
        "name": p.name,
        "email": p.email,
        "practice_name": p.practice_name,
        "practice_logo_url": p.practice_logo_url,
        "designation": p.designation,
        "bio": p.bio,
        "tagline": p.tagline,
        "location": p.location,
        "telehealth_url": p.telehealth_url,
        "website": p.website,
        "subscription_tier": p.subscription_tier,
        "subscription_active": p.subscription_active,
        "in_trial": in_trial,
        "trial_ends_at": p.trial_ends_at.isoformat() if p.trial_ends_at else None,
        "created_at": p.created_at.isoformat(),
    }


@router.get("/me")
async def get_me(
    practitioner: Practitioner = Depends(get_current_practitioner),
):
    return _practitioner_dict(practitioner)


@router.patch("/me")
async def update_me(
    body: ProfileUpdate,
    practitioner: Practitioner = Depends(get_current_practitioner),
    db: AsyncSession = Depends(get_db),
):
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(practitioner, field, value)
    await db.flush()
    return _practitioner_dict(practitioner)


@router.post("/me/logo")
async def upload_logo(
    file: UploadFile = File(...),
    practitioner: Practitioner = Depends(get_current_practitioner),
    db: AsyncSession = Depends(get_db),
):
    # Validate file type
    content_type = file.content_type or ""
    if content_type not in ("image/jpeg", "image/png", "image/webp"):
        raise HTTPException(status_code=400, detail="Only JPEG, PNG, or WebP images are accepted")

    # Save to local storage
    upload_dir = os.path.join(settings.STORAGE_LOCAL_PATH, "logos")
    os.makedirs(upload_dir, exist_ok=True)

    ext = content_type.split("/")[-1]
    filename = f"practitioner_{practitioner.id}.{ext}"
    filepath = os.path.join(upload_dir, filename)

    contents = await file.read()
    if len(contents) > 2 * 1024 * 1024:  # 2MB limit
        raise HTTPException(status_code=400, detail="File too large (max 2MB)")

    async with aiofiles.open(filepath, "wb") as f:
        await f.write(contents)

    logo_url = f"/uploads/logos/{filename}"
    practitioner.practice_logo_url = logo_url
    await db.flush()

    return {"practice_logo_url": logo_url}
