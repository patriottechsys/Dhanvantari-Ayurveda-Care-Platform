"""
AI routes: chat (streaming SSE), plan draft, check-in insights,
assessment interpretation, dashboard summary.
"""
from datetime import date, datetime
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
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
            select(Patient)
            .options(selectinload(Patient.health_profile))
            .where(Patient.id == body.patient_id, Patient.practitioner_id == current.id)
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
        select(Patient)
        .options(selectinload(Patient.health_profile))
        .where(Patient.id == patient_id, Patient.practitioner_id == current.id)
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


# ── AI Assessment Interpretation ──────────────────────────────────────────

@router.post("/interpret-assessment/{assessment_id}")
async def interpret_assessment(
    assessment_id: int,
    db: AsyncSession = Depends(get_db),
    current: Practitioner = Depends(require_active_subscription),
):
    """Generate AI clinical interpretation of a dosha assessment."""
    if not settings.ANTHROPIC_API_KEY:
        raise HTTPException(status_code=503, detail="ANTHROPIC_API_KEY not configured")

    from app.models.dosha_assessment import DoshaAssessment
    from sqlalchemy.orm import selectinload

    result = await db.execute(
        select(DoshaAssessment)
        .options(selectinload(DoshaAssessment.patient))
        .where(DoshaAssessment.id == assessment_id, DoshaAssessment.practitioner_id == current.id)
    )
    assessment = result.scalar_one_or_none()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")

    patient = assessment.patient
    hp_result = await db.execute(
        select(HealthProfile).where(HealthProfile.patient_id == patient.id)
    )
    hp = hp_result.scalar_one_or_none()

    # Build assessment context
    context = f"""
Patient: {patient.full_name}
Age: {_age(patient.dob) if patient.dob else 'unknown'}

PRAKRITI (Constitution):
Vata: {assessment.prakriti_vata}, Pitta: {assessment.prakriti_pitta}, Kapha: {assessment.prakriti_kapha}
Result: {assessment.result_prakriti or 'not computed'}

VIKRITI (Current Imbalance):
Vata: {assessment.vikriti_vata}, Pitta: {assessment.vikriti_pitta}, Kapha: {assessment.vikriti_kapha}
Result: {assessment.result_vikriti or 'not computed'}

AGNI TYPE: {assessment.agni_type or 'not assessed'}
AMA LEVEL: {assessment.ama_level or 'not assessed'}

ASHTAVIDHA PAREEKSHA (8-Fold Exam):
{_format_ashtavidha(assessment.ashtavidha_responses) if assessment.ashtavidha_responses else 'Not performed'}

CHIEF COMPLAINTS: {hp.chief_complaints if hp else 'not recorded'}
""".strip()

    import anthropic as ac
    import json

    client = ac.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

    prompt = f"""You are an expert Ayurvedic practitioner interpreting a clinical dosha assessment. Based on the data below, provide a thorough clinical interpretation.

{context}

Return a JSON object with this exact structure:
{{
  "constitution_summary": "2-3 sentences describing the patient's prakriti and what it means clinically",
  "imbalance_analysis": "2-3 sentences analyzing the vikriti — which doshas are elevated and what symptoms this explains",
  "clinical_observations": "2-3 sentences on key findings from the 8-fold exam and agni/ama assessment",
  "protocol_suggestions": ["suggestion 1", "suggestion 2", "suggestion 3", "suggestion 4", "suggestion 5"],
  "dietary_direction": "2-3 sentences on dietary guidance based on constitution and current imbalance",
  "lifestyle_direction": "2-3 sentences on lifestyle recommendations"
}}

Use proper Ayurvedic terminology. Be specific and clinically relevant. Return only valid JSON."""

    message = client.messages.create(
        model=settings.AI_MODEL,
        max_tokens=2000,
        messages=[{"role": "user", "content": prompt}],
    )

    try:
        content = message.content[0].text
        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]
        interpretation = json.loads(content.strip())
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI response parse error: {e}")

    return {"interpretation": interpretation, "assessment_id": assessment_id}


# ── AI Dashboard Summary ─────────────────────────────────────────────────

@router.get("/dashboard-summary")
async def dashboard_summary(
    db: AsyncSession = Depends(get_db),
    current: Practitioner = Depends(require_active_subscription),
):
    """Generate AI summary of the practitioner's practice — patient statuses, trends, recommendations."""
    if not settings.ANTHROPIC_API_KEY:
        raise HTTPException(status_code=503, detail="ANTHROPIC_API_KEY not configured")

    from app.models.checkin import DailyCheckIn
    from sqlalchemy import desc, func

    # Get all patients with their health profiles
    patients_result = await db.execute(
        select(Patient).where(Patient.practitioner_id == current.id)
    )
    patients = patients_result.scalars().all()

    if not patients:
        return {"summary": "No patients yet. Add your first patient to get started.", "patient_count": 0}

    patient_summaries = []
    for p in patients:
        # Get latest check-ins
        ci_result = await db.execute(
            select(DailyCheckIn)
            .where(DailyCheckIn.patient_id == p.id)
            .order_by(desc(DailyCheckIn.date))
            .limit(7)
        )
        recent_checkins = ci_result.scalars().all()

        # Get active plan
        plan_result = await db.execute(
            select(ConsultationPlan).where(
                ConsultationPlan.patient_id == p.id,
                ConsultationPlan.active == True,  # noqa: E712
            )
        )
        plan = plan_result.scalar_one_or_none()

        # Get health profile dosha
        hp_result = await db.execute(
            select(HealthProfile).where(HealthProfile.patient_id == p.id)
        )
        hp = hp_result.scalar_one_or_none()

        summary = f"- {p.full_name} (dosha: {hp.dosha_primary if hp else 'unknown'})"
        if plan:
            days_on = (date.today() - plan.start_date).days if plan.start_date else 0
            summary += f", active plan '{plan.title}' (day {days_on})"
        else:
            summary += ", NO active plan (needs attention)"

        if recent_checkins:
            avg_compliance = sum(ci.habit_completion_pct for ci in recent_checkins) / len(recent_checkins)
            avg_symptoms = sum((ci.avg_symptom_score or 0) for ci in recent_checkins) / len(recent_checkins)
            last_date = recent_checkins[0].date
            summary += f", last check-in: {last_date}, avg compliance: {avg_compliance:.0f}%, avg symptom score: {avg_symptoms:.1f}/5"
        else:
            summary += ", NO check-ins"

        patient_summaries.append(summary)

    import anthropic as ac
    from datetime import date as date_type

    client = ac.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

    prompt = f"""You are an AI assistant for {current.name} at {current.practice_name or 'their Ayurveda practice'}.

Here is a summary of all patients:
{chr(10).join(patient_summaries)}

Today is {date.today().isoformat()}.

In 3-5 concise sentences, provide a practice overview:
1. Which patients are progressing well
2. Which need attention or follow-up
3. Any actionable suggestions for the day

Be warm, specific (use patient names), and concise. Use a professional clinical tone."""

    message = client.messages.create(
        model=settings.AI_MODEL,
        max_tokens=500,
        messages=[{"role": "user", "content": prompt}],
    )

    return {
        "summary": message.content[0].text,
        "patient_count": len(patients),
        "generated_at": datetime.now().isoformat(),
    }


# ── Helpers ────────────────────────────────────────────────────────────────

def _format_ashtavidha(responses: dict) -> str:
    """Format ashtavidha responses into readable text."""
    if not responses:
        return "Not performed"
    parts = []
    for key, val in responses.items():
        if isinstance(val, dict):
            finding = val.get("finding", "")
            notes = val.get("notes", "")
            parts.append(f"{key}: {finding}" + (f" — {notes}" if notes else ""))
    return "\n".join(parts)


def _age(dob) -> int:
    from datetime import date
    today = date.today()
    return today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
