"""
Auth routes: register, login, refresh, verify email, password reset.
"""
import secrets
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, EmailStr

from app.core.database import get_db
from app.core.security import hash_password, verify_password, create_access_token, create_refresh_token, decode_token
from app.models.practitioner import Practitioner
from app.api.deps import get_current_practitioner

router = APIRouter()

TRIAL_DAYS = 14


# ── Schemas ────────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    name:          str
    email:         EmailStr
    password:      str
    practice_name: str | None = None
    designation:   str | None = None  # CAP, CAAP, AV, BAMS


class LoginRequest(BaseModel):
    email:    EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token:  str
    refresh_token: str
    token_type:    str = "bearer"
    practitioner:  dict


class RefreshRequest(BaseModel):
    refresh_token: str


# ── Routes ─────────────────────────────────────────────────────────────────

@router.post("/register", response_model=TokenResponse, status_code=201)
async def register(
    body: RegisterRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    existing = await db.execute(select(Practitioner).where(Practitioner.email == body.email.lower()))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    practitioner = Practitioner(
        name=body.name,
        email=body.email.lower(),
        password_hash=hash_password(body.password),
        practice_name=body.practice_name,
        designation=body.designation,
        trial_ends_at=datetime.now(timezone.utc) + timedelta(days=TRIAL_DAYS),
        subscription_active=False,
    )
    db.add(practitioner)
    await db.flush()  # get id

    # TODO: background_tasks.add_task(send_welcome_email, practitioner)

    access  = create_access_token(practitioner.id)
    refresh = create_refresh_token(practitioner.id)

    return TokenResponse(
        access_token=access,
        refresh_token=refresh,
        practitioner=_practitioner_dict(practitioner),
    )


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Practitioner).where(Practitioner.email == body.email.lower()))
    practitioner = result.scalar_one_or_none()

    if not practitioner or not verify_password(body.password, practitioner.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not practitioner.active:
        raise HTTPException(status_code=403, detail="Account is deactivated")

    access  = create_access_token(practitioner.id)
    refresh = create_refresh_token(practitioner.id)

    return TokenResponse(
        access_token=access,
        refresh_token=refresh,
        practitioner=_practitioner_dict(practitioner),
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(body: RefreshRequest, db: AsyncSession = Depends(get_db)):
    payload = decode_token(body.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    result = await db.execute(select(Practitioner).where(Practitioner.id == int(payload["sub"])))
    practitioner = result.scalar_one_or_none()
    if not practitioner:
        raise HTTPException(status_code=401, detail="Practitioner not found")

    access  = create_access_token(practitioner.id)
    refresh = create_refresh_token(practitioner.id)
    return TokenResponse(
        access_token=access,
        refresh_token=refresh,
        practitioner=_practitioner_dict(practitioner),
    )


@router.get("/me")
async def me(current: Practitioner = Depends(get_current_practitioner)):
    return _practitioner_dict(current)


# ── Helper ─────────────────────────────────────────────────────────────────

def _practitioner_dict(p: Practitioner) -> dict:
    from datetime import datetime, timezone
    in_trial = p.trial_ends_at and p.trial_ends_at > datetime.now(timezone.utc)
    return {
        "id": p.id,
        "name": p.name,
        "email": p.email,
        "practice_name": p.practice_name,
        "practice_logo_url": p.practice_logo_url,
        "tagline": p.tagline,
        "designation": p.designation,
        "subscription_tier": p.subscription_tier,
        "subscription_active": p.subscription_active,
        "in_trial": bool(in_trial),
        "trial_ends_at": p.trial_ends_at.isoformat() if p.trial_ends_at else None,
    }
