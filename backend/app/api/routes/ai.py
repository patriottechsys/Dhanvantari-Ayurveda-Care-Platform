"""
AI routes: chat (streaming SSE), plan draft, check-in insights.
"""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

from app.core.config import settings
from app.core.database import get_db
from app.api.deps import require_active_subscription
from app.models.practitioner import Practitioner
from app.models.patient import Patient, HealthProfile
from app.models.plan import ConsultationPlan

router = APIRouter()


class ChatRequest(BaseModel):
    message:    str
    patient_id: int | None = None
    session_id: str = "default"


class PlanDraftRequest(BaseModel):
    patient_id: int


# ── Streaming Chat ─────────────────────────────────────────────────────────

@router.post("/chat")
async def chat(
    body: ChatRequest,
    db: AsyncSession = Depends(get_db),
    current: Practitioner = Depends(require_active_subscription),
):
    if not settings.ANTHROPIC_API_KEY:
        raise HTTPException(status_code=503, detail="ANTHROPIC_API_KEY not configured")

    import anthropic as ac

    context_parts = [
        "You are an AI assistant for the Dhanvantari Ayurveda Care Platform.",
        f"You are assisting {current.name} ({current.designation or 'Ayurvedic Practitioner'}) at {current.practice_name or 'their practice'}.",
        "You help practitioners manage patients, review check-in data, analyze symptom trends, draft consultation plans, and plan follow-ups.",
        "Always be warm, professional, and grounded in Ayurvedic principles.",
        "When referencing Ayurvedic concepts, use proper terminology (Prakriti, Vikriti, Dosha, Agni, Ama, etc.).",
    ]

    if body.patient_id:
        result = await db.execute(
            select(Patient).where(Patient.id == body.patient_id, Patient.practitioner_id == current.id)
        )
        patient = result.scalar_one_or_none()
        if patient:
            hp = patient.health_profile
            plan = next((p for p in await db.execute(
                select(ConsultationPlan).where(ConsultationPlan.patient_id == patient.id, ConsultationPlan.active == True)  # noqa: E712
            ).then(lambda r: r.scalars().all())), None) if False else None

            context_parts.append(f"\nCurrent patient context: {patient.full_name}")
            if hp:
                if hp.dosha_primary:
                    context_parts.append(f"Prakriti: {hp.dosha_primary}" + (f"/{hp.dosha_secondary}" if hp.dosha_secondary else ""))
                if hp.chief_complaints:
                    context_parts.append(f"Chief complaints: {hp.chief_complaints}")
                if hp.agni_assessment:
                    context_parts.append(f"Agni: {hp.agni_assessment}")

    system_prompt = "\n".join(context_parts)
    client = ac.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

    async def stream_response():
        with client.messages.stream(
            model=settings.AI_MODEL,
            max_tokens=2048,
            system=system_prompt,
            messages=[{"role": "user", "content": body.message}],
        ) as stream:
            for text in stream.text_stream:
                yield f"data: {text}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(stream_response(), media_type="text/event-stream")


# ── AI Plan Draft ──────────────────────────────────────────────────────────

@router.post("/draft-plan/{patient_id}")
async def draft_plan(
    patient_id: int,
    db: AsyncSession = Depends(get_db),
    current: Practitioner = Depends(require_active_subscription),
):
    """
    Read the patient's full profile and generate a complete draft consultation plan.
    Returns structured JSON: supplements, recipes, dietary guidance, lifestyle notes.
    """
    if not settings.ANTHROPIC_API_KEY:
        raise HTTPException(status_code=503, detail="ANTHROPIC_API_KEY not configured")

    result = await db.execute(
        select(Patient).where(Patient.id == patient_id, Patient.practitioner_id == current.id)
    )
    patient = result.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    hp = patient.health_profile

    # Build rich patient context for the AI
    patient_context = f"""
Patient: {patient.full_name}
Age: {_age(patient.dob) if patient.dob else 'unknown'}
Sex: {patient.sex or 'not specified'}

AYURVEDIC ASSESSMENT:
Prakriti (constitution): {hp.dosha_primary or 'not assessed'}{f'/{hp.dosha_secondary}' if hp and hp.dosha_secondary else ''}
Vikriti (imbalance): {hp.vikriti_notes or 'not assessed'}
Agni (digestive fire): {hp.agni_assessment or 'not assessed'}
Ama (toxin accumulation): {hp.ama_assessment or 'not assessed'}
Dosha imbalances: {hp.dosha_imbalances or 'none noted'}

CHIEF COMPLAINTS: {hp.chief_complaints or 'none recorded'}
MEDICAL HISTORY: {hp.medical_history or 'none recorded'}
CURRENT MEDICATIONS: {hp.current_medications or 'none'}
ALLERGIES: {hp.allergies or 'none known'}

LIFESTYLE:
Sleep: {patient.sleep_notes or 'not recorded'}
Stress: {patient.stress_level or 'not recorded'}
Exercise: {patient.exercise_notes or 'not recorded'}
Diet pattern: {patient.diet_pattern or 'not recorded'}

PULSE & EXAMINATION:
Nadi (pulse): {hp.nadi_notes or 'not recorded'}
Jihwa (tongue): {hp.jihwa_notes or 'not recorded'}
""".strip() if hp else f"Patient: {patient.full_name}\n[Health profile not yet completed]"

    import anthropic as ac
    import json

    client = ac.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

    prompt = f"""You are an expert Ayurvedic practitioner. Based on the patient data below, draft a complete consultation plan.

{patient_context}

Return a JSON object with this exact structure:
{{
  "title": "Plan title (e.g. 'Vata-Pacifying Protocol' or 'Digestive Restoration Program')",
  "duration_weeks": <number>,
  "rationale": "2-3 sentences explaining your clinical reasoning",
  "supplements": [
    {{
      "name": "supplement name",
      "dose": "e.g. 1/2 tsp",
      "timing": "e.g. Before meals",
      "frequency": "e.g. Twice daily",
      "purpose": "why this supplement for this patient"
    }}
  ],
  "foods_to_include": "bullet list of recommended foods",
  "foods_to_avoid": "bullet list of foods to avoid",
  "lifestyle_notes": "lifestyle recommendations",
  "breathing_notes": "pranayama / breathing practice",
  "nasal_care_notes": "nasya or nasal care if indicated",
  "followup_notes": "when and what to reassess"
}}

Use classical Ayurvedic principles. Recommend only safe, appropriate herbs and dietary changes. Return only valid JSON."""

    message = client.messages.create(
        model=settings.AI_MODEL,
        max_tokens=3000,
        messages=[{"role": "user", "content": prompt}],
    )

    try:
        content = message.content[0].text
        # Strip markdown code fences if present
        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]
        draft = json.loads(content.strip())
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI response parse error: {e}")

    return {"draft": draft, "patient_id": patient_id}


# ── Check-In Insights ─────────────────────────────────────────────────────

@router.get("/insights/{patient_id}")
async def patient_insights(
    patient_id: int,
    db: AsyncSession = Depends(get_db),
    current: Practitioner = Depends(require_active_subscription),
):
    """Generate AI summary of a patient's recent check-in trends."""
    if not settings.ANTHROPIC_API_KEY:
        raise HTTPException(status_code=503, detail="ANTHROPIC_API_KEY not configured")

    from app.models.checkin import DailyCheckIn
    from sqlalchemy import desc

    result = await db.execute(
        select(Patient).where(Patient.id == patient_id, Patient.practitioner_id == current.id)
    )
    patient = result.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    ci_result = await db.execute(
        select(DailyCheckIn)
        .where(DailyCheckIn.patient_id == patient_id)
        .order_by(desc(DailyCheckIn.date))
        .limit(14)
    )
    checkins = ci_result.scalars().all()

    if len(checkins) < 3:
        return {"insights": "Not enough check-in data yet. At least 3 check-ins are needed for insights.", "count": len(checkins)}

    ci_summary = "\n".join([
        f"{ci.date}: habits={ci.habit_completion_pct}%, dig={ci.digestion_score}, energy={ci.energy_score}, urinary={ci.urinary_score}, sinus={ci.sinus_score}"
        + (f", notes: {ci.notes[:100]}" if ci.notes else "")
        for ci in reversed(checkins)
    ])

    import anthropic as ac
    client = ac.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

    prompt = f"""Patient: {patient.full_name}
Check-in data (last {len(checkins)} days):
{ci_summary}

In 3-4 sentences, summarize:
1. Trend in symptom scores (improving/declining/stable)
2. Habit compliance pattern
3. Any noteworthy notes or concerns
4. One specific recommendation for the upcoming follow-up

Be specific with numbers. Use a warm, clinical tone."""

    message = client.messages.create(
        model=settings.AI_MODEL,
        max_tokens=500,
        messages=[{"role": "user", "content": prompt}],
    )

    return {
        "insights": message.content[0].text,
        "checkin_count": len(checkins),
        "patient_name": patient.full_name,
    }


# ── Helpers ────────────────────────────────────────────────────────────────

def _age(dob) -> int:
    from datetime import date
    today = date.today()
    return today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
