"""
FastAPI dependency injection: current user, DB session, tier enforcement.
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.security import decode_token
from app.models.practitioner import Practitioner, SubscriptionTier

bearer = HTTPBearer()


async def get_current_practitioner(
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: AsyncSession = Depends(get_db),
) -> Practitioner:
    token = credentials.credentials
    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")

    practitioner_id = int(payload["sub"])
    result = await db.execute(select(Practitioner).where(Practitioner.id == practitioner_id))
    practitioner = result.scalar_one_or_none()

    if not practitioner or not practitioner.active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Practitioner not found")

    return practitioner


async def require_active_subscription(
    current: Practitioner = Depends(get_current_practitioner),
) -> Practitioner:
    """Allow trial period OR active subscription."""
    from datetime import datetime, timezone
    in_trial = current.trial_ends_at and current.trial_ends_at > datetime.now(timezone.utc)
    if not (current.subscription_active or in_trial):
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="Active subscription required. Please upgrade your plan.",
        )
    return current


async def check_patient_limit(
    current: Practitioner = Depends(require_active_subscription),
    db: AsyncSession = Depends(get_db),
) -> Practitioner:
    """Enforce Seed tier 30-patient limit."""
    if current.subscription_tier == SubscriptionTier.SEED:
        from sqlalchemy import func
        from app.models.patient import Patient
        result = await db.execute(
            select(func.count()).where(Patient.practitioner_id == current.id, Patient.active == True)  # noqa: E712
        )
        count = result.scalar_one()
        if count >= 30:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Seed plan limit of 30 active patients reached. Upgrade to Practice plan for unlimited patients.",
            )
    return current
