"""
Patient intake form routes.
- Practitioner endpoints: generate links, list/review/approve/reject submissions
- Public endpoints: load form, submit intake
"""
from datetime import datetime, date, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from pydantic import BaseModel

from app.core.database import get_db
from app.models.intake import IntakeToken, IntakeSubmission, IntakeStatus
from app.models.patient import Patient, HealthProfile
from app.models.checkin import CheckInToken
from app.models.practitioner import Practitioner
from app.api.deps import get_current_practitioner, require_active_subscription, check_patient_limit

router = APIRouter()


# ── Schemas ────────────────────────────────────────────────────────────────────

class IntakeSubmitBody(BaseModel):
    # Demographics (required)
    first_name: str
    last_name:  str
    # Demographics (optional)
    dob:        date | None = None
    sex:        str | None = None
    email:      str | None = None
    phone:      str | None = None
    address:    str | None = None
    occupation: str | None = None
    # Medical history
    current_medications: str | None = None
    allergies:           str | None = None
    past_surgeries:      str | None = None
    chronic_conditions:  str | None = None
    family_history:      str | None = None
    # Lifestyle
    diet_type:       str | None = None
    exercise_habits: str | None = None
    sleep_patterns:  str | None = None
    stress_level:    int | None = None
    smoking:         str | None = None
    alcohol:         str | None = None
    caffeine:        str | None = None
    # Ayurvedic (optional)
    digestive_patterns:   str | None = None
    elimination_patterns: str | None = None
    energy_levels:        str | None = None
    mental_tendencies:    str | None = None
    prior_ayurvedic_care: str | None = None
    # Reason for visit
    chief_concern:       str | None = None
    symptom_duration:    str | None = None
    previous_treatments: str | None = None
    treatment_goals:     str | None = None


class RejectBody(BaseModel):
    reason: str | None = None


# ── Token resolution helper (public) ──────────────────────────────────────────

async def _resolve_intake_token(token: str, db: AsyncSession) -> IntakeToken:
    result = await db.execute(
        select(IntakeToken)
        .options(selectinload(IntakeToken.practitioner), selectinload(IntakeToken.submission))
        .where(IntakeToken.token == token, IntakeToken.active == True)
    )
    tok = result.scalars().first()
    if not tok:
        raise HTTPException(status_code=404, detail="Invalid or expired intake link")
    return tok


# ── Public routes (no auth) ───────────────────────────────────────────────────

@router.get("/form/{token}")
async def get_intake_form(token: str, db: AsyncSession = Depends(get_db)):
    """Load intake form — returns practitioner branding and whether already submitted."""
    tok = await _resolve_intake_token(token, db)
    practitioner = tok.practitioner

    return {
        "token": tok.token,
        "already_submitted": tok.submission is not None,
        "practice": {
            "name": practitioner.practice_name or practitioner.name,
            "logo_url": practitioner.practice_logo_url,
            "tagline": practitioner.tagline,
            "practitioner_name": practitioner.name,
            "designation": practitioner.designation,
        },
    }


@router.post("/form/{token}/submit", status_code=201)
async def submit_intake_form(token: str, body: IntakeSubmitBody, db: AsyncSession = Depends(get_db)):
    """Patient submits their completed intake form."""
    tok = await _resolve_intake_token(token, db)

    if tok.submission is not None:
        raise HTTPException(status_code=409, detail="This intake form has already been submitted")

    submission = IntakeSubmission(
        practitioner_id=tok.practitioner_id,
        token_id=tok.id,
        **body.model_dump(),
    )
    db.add(submission)
    await db.flush()

    # Deactivate token after successful submission
    tok.active = False

    return {"message": "Intake form submitted successfully", "submission_id": submission.id}


# ── Practitioner routes (auth required) ───────────────────────────────────────

@router.post("/generate-link")
async def generate_intake_link(
    db: AsyncSession = Depends(get_db),
    current: Practitioner = Depends(require_active_subscription),
):
    """Generate a new intake form link for a prospective patient."""
    tok = IntakeToken(practitioner_id=current.id)
    db.add(tok)
    await db.flush()

    return {
        "token": tok.token,
        "intake_url_path": tok.intake_url_path,
    }


@router.get("/submissions")
async def list_submissions(
    status_filter: IntakeStatus | None = None,
    db: AsyncSession = Depends(get_db),
    current: Practitioner = Depends(require_active_subscription),
):
    """List all intake submissions for this practitioner."""
    query = (
        select(IntakeSubmission)
        .where(IntakeSubmission.practitioner_id == current.id)
        .order_by(IntakeSubmission.submitted_at.desc())
    )
    if status_filter:
        query = query.where(IntakeSubmission.status == status_filter)

    result = await db.execute(query)
    submissions = result.scalars().all()

    return [_submission_summary(s) for s in submissions]


@router.get("/submissions/{submission_id}")
async def get_submission(
    submission_id: int,
    db: AsyncSession = Depends(get_db),
    current: Practitioner = Depends(require_active_subscription),
):
    """View a single intake submission in full detail."""
    submission = await _get_submission_or_404(db, submission_id, current.id)
    return _submission_detail(submission)


@router.post("/submissions/{submission_id}/review")
async def mark_reviewed(
    submission_id: int,
    db: AsyncSession = Depends(get_db),
    current: Practitioner = Depends(require_active_subscription),
):
    """Mark a submission as reviewed (seen but not yet decided)."""
    submission = await _get_submission_or_404(db, submission_id, current.id)

    if submission.status != IntakeStatus.PENDING:
        raise HTTPException(status_code=400, detail=f"Cannot review a submission with status '{submission.status.value}'")

    submission.status = IntakeStatus.REVIEWED
    submission.reviewed_at = datetime.now(timezone.utc)

    return {"message": "Submission marked as reviewed"}


@router.post("/submissions/{submission_id}/approve")
async def approve_submission(
    submission_id: int,
    db: AsyncSession = Depends(get_db),
    current: Practitioner = Depends(check_patient_limit),
):
    """Approve a submission — creates a Patient + HealthProfile from the intake data."""
    submission = await _get_submission_or_404(db, submission_id, current.id)

    if submission.status == IntakeStatus.APPROVED:
        raise HTTPException(status_code=400, detail="This submission has already been approved")
    if submission.status == IntakeStatus.REJECTED:
        raise HTTPException(status_code=400, detail="Cannot approve a rejected submission")

    # Create Patient from submission demographics + lifestyle
    patient = Patient(
        practitioner_id=current.id,
        first_name=submission.first_name,
        last_name=submission.last_name,
        dob=submission.dob,
        sex=submission.sex,
        email=submission.email,
        phone=submission.phone,
        location=submission.address,
        occupation=submission.occupation,
        exercise_notes=submission.exercise_habits,
        diet_pattern=submission.diet_type,
        sleep_notes=submission.sleep_patterns,
        stress_level=str(submission.stress_level) if submission.stress_level else None,
    )
    db.add(patient)
    await db.flush()

    # Create HealthProfile from medical history + Ayurvedic data
    hp = HealthProfile(
        patient_id=patient.id,
        chief_complaints=submission.chief_concern,
        medical_history=_build_medical_history(submission),
        current_medications=submission.current_medications,
        allergies=submission.allergies,
    )
    db.add(hp)

    # Auto-create check-in token for the new patient
    checkin_tok = CheckInToken(patient_id=patient.id)
    db.add(checkin_tok)

    # Update submission status
    submission.status = IntakeStatus.APPROVED
    submission.reviewed_at = datetime.now(timezone.utc)

    await db.flush()

    return {
        "message": "Submission approved — patient record created",
        "patient_id": patient.id,
    }


@router.post("/submissions/{submission_id}/reject")
async def reject_submission(
    submission_id: int,
    body: RejectBody,
    db: AsyncSession = Depends(get_db),
    current: Practitioner = Depends(require_active_subscription),
):
    """Reject a submission with an optional reason."""
    submission = await _get_submission_or_404(db, submission_id, current.id)

    if submission.status == IntakeStatus.APPROVED:
        raise HTTPException(status_code=400, detail="Cannot reject an already-approved submission")

    submission.status = IntakeStatus.REJECTED
    submission.reviewed_at = datetime.now(timezone.utc)
    submission.rejection_reason = body.reason

    return {"message": "Submission rejected"}


@router.delete("/submissions/{submission_id}", status_code=204)
async def delete_submission(
    submission_id: int,
    db: AsyncSession = Depends(get_db),
    current: Practitioner = Depends(require_active_subscription),
):
    """Delete a submission (only pending or rejected)."""
    submission = await _get_submission_or_404(db, submission_id, current.id)

    if submission.status == IntakeStatus.APPROVED:
        raise HTTPException(status_code=400, detail="Cannot delete an approved submission")

    await db.delete(submission)


# ── Helpers ────────────────────────────────────────────────────────────────────

async def _get_submission_or_404(db: AsyncSession, submission_id: int, practitioner_id: int) -> IntakeSubmission:
    result = await db.execute(
        select(IntakeSubmission).where(
            IntakeSubmission.id == submission_id,
            IntakeSubmission.practitioner_id == practitioner_id,
        )
    )
    s = result.scalar_one_or_none()
    if not s:
        raise HTTPException(status_code=404, detail="Submission not found")
    return s


def _build_medical_history(s: IntakeSubmission) -> str | None:
    """Combine intake medical history fields into a single text block."""
    parts = []
    if s.past_surgeries:
        parts.append(f"Past surgeries: {s.past_surgeries}")
    if s.chronic_conditions:
        parts.append(f"Chronic conditions: {s.chronic_conditions}")
    if s.family_history:
        parts.append(f"Family history: {s.family_history}")
    if s.previous_treatments:
        parts.append(f"Previous treatments: {s.previous_treatments}")
    return "\n".join(parts) if parts else None


def _submission_summary(s: IntakeSubmission) -> dict:
    return {
        "id": s.id,
        "first_name": s.first_name,
        "last_name": s.last_name,
        "full_name": f"{s.first_name} {s.last_name}",
        "email": s.email,
        "phone": s.phone,
        "status": s.status.value,
        "submitted_at": s.submitted_at.isoformat(),
        "reviewed_at": s.reviewed_at.isoformat() if s.reviewed_at else None,
        "chief_concern": s.chief_concern,
    }


def _submission_detail(s: IntakeSubmission) -> dict:
    base = _submission_summary(s)
    base.update({
        # Demographics
        "dob": s.dob.isoformat() if s.dob else None,
        "sex": s.sex,
        "address": s.address,
        "occupation": s.occupation,
        # Medical history
        "current_medications": s.current_medications,
        "allergies": s.allergies,
        "past_surgeries": s.past_surgeries,
        "chronic_conditions": s.chronic_conditions,
        "family_history": s.family_history,
        # Lifestyle
        "diet_type": s.diet_type,
        "exercise_habits": s.exercise_habits,
        "sleep_patterns": s.sleep_patterns,
        "stress_level": s.stress_level,
        "smoking": s.smoking,
        "alcohol": s.alcohol,
        "caffeine": s.caffeine,
        # Ayurvedic
        "digestive_patterns": s.digestive_patterns,
        "elimination_patterns": s.elimination_patterns,
        "energy_levels": s.energy_levels,
        "mental_tendencies": s.mental_tendencies,
        "prior_ayurvedic_care": s.prior_ayurvedic_care,
        # Reason for visit
        "chief_concern": s.chief_concern,
        "symptom_duration": s.symptom_duration,
        "previous_treatments": s.previous_treatments,
        "treatment_goals": s.treatment_goals,
        # Meta
        "rejection_reason": s.rejection_reason,
    })
    return base
