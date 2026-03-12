"""
Patient CRUD and health profile routes.
"""
import secrets
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel, EmailStr

from app.core.database import get_db
from app.models.patient import Patient, HealthProfile
from app.models.checkin import CheckInToken
from app.api.deps import get_current_practitioner, require_active_subscription, check_patient_limit
from app.models.practitioner import Practitioner

router = APIRouter()


# ── Schemas ────────────────────────────────────────────────────────────────

class PatientCreate(BaseModel):
    first_name:     str
    last_name:      str
    dob:            date | None = None
    sex:            str | None = None
    location:       str | None = None
    occupation:     str | None = None
    phone:          str | None = None
    email:          str | None = None
    weight_lbs:     float | None = None
    height_in:      float | None = None
    exercise_notes: str | None = None
    diet_pattern:   str | None = None
    sleep_notes:    str | None = None
    stress_level:   str | None = None


class PatientUpdate(PatientCreate):
    first_name: str | None = None
    last_name:  str | None = None


class HealthProfileUpdate(BaseModel):
    # Labs
    cholesterol_total: float | None = None
    hdl:               float | None = None
    ldl:               float | None = None
    triglycerides:     float | None = None
    hemoglobin:        float | None = None
    hematocrit:        float | None = None
    eosinophils_pct:   float | None = None
    glucose:           float | None = None
    hba1c:             float | None = None
    creatinine:        float | None = None
    egfr:              float | None = None
    testosterone:      float | None = None
    tsh:               float | None = None
    psa:               float | None = None
    lab_date:          date | None = None
    lab_notes:         str | None = None
    # Clinical
    chief_complaints:    str | None = None
    medical_history:     str | None = None
    current_medications: str | None = None
    allergies:           str | None = None
    # Ayurvedic
    dosha_primary:    str | None = None
    dosha_secondary:  str | None = None
    dosha_imbalances: str | None = None
    agni_assessment:  str | None = None
    ama_assessment:   str | None = None
    prakriti_notes:   str | None = None
    vikriti_notes:    str | None = None
    # Ashtavidha
    nadi_notes:    str | None = None
    jihwa_notes:   str | None = None
    mutra_notes:   str | None = None
    mala_notes:    str | None = None
    shabda_notes:  str | None = None
    sparsha_notes: str | None = None
    drika_notes:   str | None = None
    akriti_notes:  str | None = None


# ── Routes ─────────────────────────────────────────────────────────────────

@router.get("")
async def list_patients(
    db: AsyncSession = Depends(get_db),
    current: Practitioner = Depends(require_active_subscription),
):
    result = await db.execute(
        select(Patient)
        .where(Patient.practitioner_id == current.id, Patient.active == True)  # noqa: E712
        .order_by(Patient.last_name, Patient.first_name)
    )
    patients = result.scalars().all()
    return [_patient_summary(p) for p in patients]


@router.post("", status_code=201)
async def create_patient(
    body: PatientCreate,
    db: AsyncSession = Depends(get_db),
    current: Practitioner = Depends(check_patient_limit),
):
    patient = Patient(practitioner_id=current.id, **body.model_dump(exclude_none=True))
    db.add(patient)
    await db.flush()

    # Auto-create health profile and check-in token
    hp = HealthProfile(patient_id=patient.id)
    tok = CheckInToken(patient_id=patient.id)
    db.add(hp)
    db.add(tok)

    await db.flush()
    return _patient_detail(patient, hp, tok)


@router.get("/{patient_id}")
async def get_patient(
    patient_id: int,
    db: AsyncSession = Depends(get_db),
    current: Practitioner = Depends(require_active_subscription),
):
    patient = await _get_or_404(db, patient_id, current.id)
    hp = patient.health_profile
    tok = patient.checkin_token
    return _patient_detail(patient, hp, tok)


@router.patch("/{patient_id}")
async def update_patient(
    patient_id: int,
    body: PatientUpdate,
    db: AsyncSession = Depends(get_db),
    current: Practitioner = Depends(require_active_subscription),
):
    patient = await _get_or_404(db, patient_id, current.id)
    for field, val in body.model_dump(exclude_none=True).items():
        setattr(patient, field, val)
    return _patient_summary(patient)


@router.patch("/{patient_id}/health-profile")
async def update_health_profile(
    patient_id: int,
    body: HealthProfileUpdate,
    db: AsyncSession = Depends(get_db),
    current: Practitioner = Depends(require_active_subscription),
):
    patient = await _get_or_404(db, patient_id, current.id)
    hp = patient.health_profile
    if not hp:
        hp = HealthProfile(patient_id=patient_id)
        db.add(hp)
    for field, val in body.model_dump(exclude_none=True).items():
        setattr(hp, field, val)
    return {"ok": True}


@router.delete("/{patient_id}", status_code=204)
async def deactivate_patient(
    patient_id: int,
    db: AsyncSession = Depends(get_db),
    current: Practitioner = Depends(require_active_subscription),
):
    patient = await _get_or_404(db, patient_id, current.id)
    patient.active = False


# ── Helpers ────────────────────────────────────────────────────────────────

async def _get_or_404(db: AsyncSession, patient_id: int, practitioner_id: int) -> Patient:
    result = await db.execute(
        select(Patient).where(Patient.id == patient_id, Patient.practitioner_id == practitioner_id)
    )
    p = result.scalar_one_or_none()
    if not p:
        raise HTTPException(status_code=404, detail="Patient not found")
    return p


def _patient_summary(p: Patient) -> dict:
    return {
        "id": p.id,
        "full_name": p.full_name,
        "first_name": p.first_name,
        "last_name": p.last_name,
        "email": p.email,
        "phone": p.phone,
        "dob": p.dob.isoformat() if p.dob else None,
        "active": p.active,
        "created_at": p.created_at.isoformat(),
        "dosha_primary": p.health_profile.dosha_primary if p.health_profile else None,
        "checkin_token": p.checkin_token.token if p.checkin_token else None,
    }


def _patient_detail(p: Patient, hp: HealthProfile | None, tok: CheckInToken | None) -> dict:
    base = _patient_summary(p)
    base.update({
        "sex": p.sex,
        "location": p.location,
        "occupation": p.occupation,
        "weight_lbs": p.weight_lbs,
        "height_in": p.height_in,
        "exercise_notes": p.exercise_notes,
        "diet_pattern": p.diet_pattern,
        "sleep_notes": p.sleep_notes,
        "stress_level": p.stress_level,
        "health_profile": {
            "dosha_primary": hp.dosha_primary,
            "dosha_secondary": hp.dosha_secondary,
            "dosha_imbalances": hp.dosha_imbalances,
            "agni_assessment": hp.agni_assessment,
            "ama_assessment": hp.ama_assessment,
            "prakriti_notes": hp.prakriti_notes,
            "vikriti_notes": hp.vikriti_notes,
            "chief_complaints": hp.chief_complaints,
            "medical_history": hp.medical_history,
            "current_medications": hp.current_medications,
            "allergies": hp.allergies,
            "nadi_notes": hp.nadi_notes,
            "jihwa_notes": hp.jihwa_notes,
            # … full set
        } if hp else None,
        "portal_token": tok.token if tok else None,
    })
    return base
