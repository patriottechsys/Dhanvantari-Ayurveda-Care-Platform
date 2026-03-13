"""
Consultation notes — CRUD + AI draft generation.
"""
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from pydantic import BaseModel

from app.core.config import settings
from app.core.database import get_db
from app.api.deps import get_current_practitioner, require_active_subscription
from app.models.practitioner import Practitioner
from app.models.consultation_note import ConsultationNote
from app.models.patient import Patient, HealthProfile

router = APIRouter()


# ── Pydantic schemas ──────────────────────────────────────────────────────────

class NoteCreate(BaseModel):
    patient_id:          int
    title:               str
    greeting:            str | None = None
    primary_concerns:    str | None = None
    health_history:      str | None = None
    dietary_plan:        str | None = None
    lifestyle_plan:      str | None = None
    supplements_plan:    str | None = None
    emotional_wellbeing: str | None = None
    next_steps:          str | None = None
    custom_recipes:      str | None = None
    additional_notes:    str | None = None
    closing:             str | None = None


class NoteUpdate(BaseModel):
    title:               str | None = None
    greeting:            str | None = None
    primary_concerns:    str | None = None
    health_history:      str | None = None
    dietary_plan:        str | None = None
    lifestyle_plan:      str | None = None
    supplements_plan:    str | None = None
    emotional_wellbeing: str | None = None
    next_steps:          str | None = None
    custom_recipes:      str | None = None
    additional_notes:    str | None = None
    closing:             str | None = None


# ── Helpers ───────────────────────────────────────────────────────────────────

def _note_dict(n: ConsultationNote) -> dict:
    return {
        "id": n.id,
        "patient_id": n.patient_id,
        "practitioner_id": n.practitioner_id,
        "title": n.title,
        "greeting": n.greeting,
        "primary_concerns": n.primary_concerns,
        "health_history": n.health_history,
        "dietary_plan": n.dietary_plan,
        "lifestyle_plan": n.lifestyle_plan,
        "supplements_plan": n.supplements_plan,
        "emotional_wellbeing": n.emotional_wellbeing,
        "next_steps": n.next_steps,
        "custom_recipes": n.custom_recipes,
        "additional_notes": n.additional_notes,
        "closing": n.closing,
        "sent": n.sent,
        "sent_at": n.sent_at.isoformat() if n.sent_at else None,
        "created_at": n.created_at.isoformat(),
        "updated_at": n.updated_at.isoformat(),
    }


# ── CRUD Routes ──────────────────────────────────────────────────────────────

@router.get("/{patient_id}/notes")
async def list_notes(
    patient_id: int,
    practitioner: Practitioner = Depends(get_current_practitioner),
    db: AsyncSession = Depends(get_db),
):
    # Verify patient ownership
    result = await db.execute(
        select(Patient).where(Patient.id == patient_id, Patient.practitioner_id == practitioner.id)
    )
    if not result.scalars().first():
        raise HTTPException(status_code=404, detail="Patient not found")

    result = await db.execute(
        select(ConsultationNote)
        .where(ConsultationNote.patient_id == patient_id, ConsultationNote.practitioner_id == practitioner.id)
        .order_by(desc(ConsultationNote.created_at))
    )
    return [_note_dict(n) for n in result.scalars().all()]


@router.get("/{patient_id}/notes/{note_id}")
async def get_note(
    patient_id: int,
    note_id: int,
    practitioner: Practitioner = Depends(get_current_practitioner),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ConsultationNote).where(
            ConsultationNote.id == note_id,
            ConsultationNote.patient_id == patient_id,
            ConsultationNote.practitioner_id == practitioner.id,
        )
    )
    note = result.scalars().first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    return _note_dict(note)


@router.post("/{patient_id}/notes", status_code=201)
async def create_note(
    patient_id: int,
    body: NoteCreate,
    practitioner: Practitioner = Depends(get_current_practitioner),
    db: AsyncSession = Depends(get_db),
):
    # Verify patient ownership
    result = await db.execute(
        select(Patient).where(Patient.id == patient_id, Patient.practitioner_id == practitioner.id)
    )
    if not result.scalars().first():
        raise HTTPException(status_code=404, detail="Patient not found")

    note = ConsultationNote(
        patient_id=patient_id,
        practitioner_id=practitioner.id,
        title=body.title,
        greeting=body.greeting,
        primary_concerns=body.primary_concerns,
        health_history=body.health_history,
        dietary_plan=body.dietary_plan,
        lifestyle_plan=body.lifestyle_plan,
        supplements_plan=body.supplements_plan,
        emotional_wellbeing=body.emotional_wellbeing,
        next_steps=body.next_steps,
        custom_recipes=body.custom_recipes,
        additional_notes=body.additional_notes,
        closing=body.closing,
    )
    db.add(note)
    await db.flush()
    return _note_dict(note)


@router.patch("/{patient_id}/notes/{note_id}")
async def update_note(
    patient_id: int,
    note_id: int,
    body: NoteUpdate,
    practitioner: Practitioner = Depends(get_current_practitioner),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ConsultationNote).where(
            ConsultationNote.id == note_id,
            ConsultationNote.patient_id == patient_id,
            ConsultationNote.practitioner_id == practitioner.id,
        )
    )
    note = result.scalars().first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(note, field, value)

    await db.flush()
    return _note_dict(note)


@router.delete("/{patient_id}/notes/{note_id}", status_code=204)
async def delete_note(
    patient_id: int,
    note_id: int,
    practitioner: Practitioner = Depends(get_current_practitioner),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ConsultationNote).where(
            ConsultationNote.id == note_id,
            ConsultationNote.patient_id == patient_id,
            ConsultationNote.practitioner_id == practitioner.id,
        )
    )
    note = result.scalars().first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    await db.delete(note)


@router.post("/{patient_id}/notes/{note_id}/send")
async def send_note(
    patient_id: int,
    note_id: int,
    practitioner: Practitioner = Depends(get_current_practitioner),
    db: AsyncSession = Depends(get_db),
    background_tasks: BackgroundTasks = BackgroundTasks(),
):
    """Mark note as sent (and email it if Resend is configured)."""
    result = await db.execute(
        select(ConsultationNote).where(
            ConsultationNote.id == note_id,
            ConsultationNote.patient_id == patient_id,
            ConsultationNote.practitioner_id == practitioner.id,
        )
    )
    note = result.scalars().first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    # Get patient email
    patient_result = await db.execute(select(Patient).where(Patient.id == patient_id))
    patient = patient_result.scalars().first()

    note.sent = True
    note.sent_at = datetime.now(timezone.utc)
    await db.flush()

    # Fire-and-forget email if configured
    if patient and patient.email and settings.RESEND_API_KEY:
        from app.core.email import _send
        background_tasks.add_task(
            _send,
            to=patient.email,
            subject=f"Consultation Summary: {note.title}",
            html=_note_to_html(note, practitioner.name, patient.full_name),
        )

    return {"sent": True, "sent_at": note.sent_at.isoformat()}


# ── AI Draft ─────────────────────────────────────────────────────────────────

@router.post("/{patient_id}/notes/ai-draft")
async def ai_draft_note(
    patient_id: int,
    practitioner: Practitioner = Depends(require_active_subscription),
    db: AsyncSession = Depends(get_db),
):
    """Generate a structured consultation note draft from the patient's full profile."""
    if not settings.ANTHROPIC_API_KEY:
        raise HTTPException(status_code=503, detail="ANTHROPIC_API_KEY not configured")

    result = await db.execute(
        select(Patient).where(Patient.id == patient_id, Patient.practitioner_id == practitioner.id)
    )
    patient = result.scalars().first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    # Load health profile
    hp_result = await db.execute(
        select(HealthProfile).where(HealthProfile.patient_id == patient_id)
    )
    hp = hp_result.scalars().first()

    # Load recent check-ins
    from app.models.checkin import DailyCheckIn
    ci_result = await db.execute(
        select(DailyCheckIn)
        .where(DailyCheckIn.patient_id == patient_id)
        .order_by(desc(DailyCheckIn.date))
        .limit(14)
    )
    checkins = ci_result.scalars().all()

    # Load active plan with supplements
    from app.models.plan import ConsultationPlan, PlanSupplement, Supplement
    from sqlalchemy.orm import selectinload
    plan_result = await db.execute(
        select(ConsultationPlan)
        .options(selectinload(ConsultationPlan.plan_supplements).selectinload(PlanSupplement.supplement))
        .where(ConsultationPlan.patient_id == patient_id, ConsultationPlan.active == True)  # noqa: E712
    )
    plan = plan_result.scalars().first()

    # Build patient context
    context = f"Patient: {patient.full_name}\n"
    if patient.dob:
        from datetime import date
        age = date.today().year - patient.dob.year - ((date.today().month, date.today().day) < (patient.dob.month, patient.dob.day))
        context += f"Age: {age}\n"
    context += f"Sex: {patient.sex or 'not specified'}\n"

    if hp:
        context += f"\nPrakriti: {hp.dosha_primary or 'not assessed'}"
        if hp.dosha_secondary:
            context += f"/{hp.dosha_secondary}"
        context += f"\nVikriti: {hp.vikriti_notes or 'not assessed'}"
        context += f"\nAgni: {hp.agni_assessment or 'not assessed'}"
        context += f"\nAma: {hp.ama_assessment or 'not assessed'}"
        context += f"\nChief complaints: {hp.chief_complaints or 'none'}"
        context += f"\nMedical history: {hp.medical_history or 'none'}"
        context += f"\nCurrent medications: {hp.current_medications or 'none'}"
        context += f"\nAllergies: {hp.allergies or 'none'}"

    if patient.diet_pattern:
        context += f"\nDiet: {patient.diet_pattern}"
    if patient.sleep_notes:
        context += f"\nSleep: {patient.sleep_notes}"
    if patient.stress_level:
        context += f"\nStress: {patient.stress_level}"
    if patient.exercise_notes:
        context += f"\nExercise: {patient.exercise_notes}"

    if plan:
        supplements = [
            f"{ps.supplement.name} ({ps.dose}, {ps.timing})"
            for ps in plan.plan_supplements if ps.supplement
        ]
        if supplements:
            context += f"\nCurrent supplements: {', '.join(supplements)}"
        if plan.dietary_guidance:
            context += f"\nDietary guidance: {plan.dietary_guidance}"
        if plan.lifestyle_notes:
            context += f"\nLifestyle notes: {plan.lifestyle_notes}"

    if checkins:
        ci_lines = [
            f"{ci.date}: habits={ci.habit_completion_pct}%, dig={ci.digestion_score}, energy={ci.energy_score}"
            for ci in reversed(checkins[:7])
        ]
        context += f"\n\nRecent check-ins (last {len(ci_lines)} days):\n" + "\n".join(ci_lines)

    import anthropic as ac
    import json

    client = ac.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

    prompt = f"""You are an Ayurvedic practitioner writing a consultation summary letter to your patient.
The practitioner is {practitioner.name} ({practitioner.designation or 'Ayurvedic Practitioner'}) at {practitioner.practice_name or 'their practice'}.

{context}

Write a structured consultation note in JSON format with these exact keys:
{{
  "title": "Brief title (e.g. '2-Month Vata Support Plan' or 'Initial Consultation Summary')",
  "greeting": "Warm, personal opening addressing the patient by first name (e.g. 'Dear [Name] Ji, Thank you for...')",
  "primary_concerns": "Bullet list of the patient's main health concerns discussed",
  "health_history": "Brief summary of relevant health history and context",
  "dietary_plan": "Detailed dietary recommendations organized by category (vegetables, grains, seeds, fats, beverages, foods to minimize)",
  "lifestyle_plan": "Lifestyle recommendations (walking, sleep routine, breathwork, stress management)",
  "supplements_plan": "Specific supplements with dosage and timing",
  "emotional_wellbeing": "Notes on emotional support and self-care (only if relevant context exists, otherwise null)",
  "next_steps": "Numbered action items for the patient",
  "custom_recipes": "Any special recipes relevant to their condition (only if appropriate, otherwise null)",
  "additional_notes": "Any other relevant guidance (only if needed, otherwise null)",
  "closing": "Warm professional closing"
}}

Use classical Ayurvedic principles. Be warm and professional. Use proper Ayurvedic terminology.
Return only valid JSON."""

    message = client.messages.create(
        model=settings.AI_MODEL,
        max_tokens=3000,
        messages=[{"role": "user", "content": prompt}],
    )

    try:
        content = message.content[0].text
        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]
        draft = json.loads(content.strip())
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI response parse error: {e}")

    return {"draft": draft, "patient_id": patient_id}


# ── Email helpers ─────────────────────────────────────────────────────────────

def _note_to_html(note: ConsultationNote, practitioner_name: str, patient_name: str) -> str:
    sections = []
    if note.greeting:
        sections.append(f"<p>{note.greeting}</p>")
    for label, field in [
        ("Primary Concerns", note.primary_concerns),
        ("Health History & Context", note.health_history),
        ("Dietary Plan", note.dietary_plan),
        ("Lifestyle & Routine", note.lifestyle_plan),
        ("Supplements", note.supplements_plan),
        ("Emotional Wellbeing", note.emotional_wellbeing),
        ("Next Steps", note.next_steps),
        ("Recipes & Preparations", note.custom_recipes),
        ("Additional Notes", note.additional_notes),
    ]:
        if field:
            sections.append(f"<h3>{label}</h3><p style='white-space:pre-wrap'>{field}</p>")
    if note.closing:
        sections.append(f"<p>{note.closing}</p>")

    return f"""
    <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #b8860b;">{note.title}</h2>
        {''.join(sections)}
        <hr style="margin-top: 30px; border: none; border-top: 1px solid #ddd;">
        <p style="font-size: 12px; color: #888;">{practitioner_name} &middot; Dhanvantari Ayurveda Care Platform</p>
    </div>
    """
