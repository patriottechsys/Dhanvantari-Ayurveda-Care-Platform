"""Seed pranayama exercises into the database."""
import asyncio
from app.core.database import AsyncSessionLocal as async_session, engine
from app.models.pranayama import Pranayama
from sqlalchemy import select

EXERCISES = [
    {
        "name": "Nadi Shodhana", "name_sanskrit": "नाडी शोधन",
        "category": "Balancing", "difficulty": "Beginner",
        "description": "Alternate nostril breathing that balances the left and right hemispheres of the brain, calms the nervous system, and promotes overall balance.",
        "technique_steps": ["Sit comfortably with spine erect", "Close right nostril with right thumb", "Inhale through left nostril for 4 counts", "Close left nostril with ring finger", "Release right nostril and exhale for 4 counts", "Inhale through right nostril for 4 counts", "Close right nostril, release left", "Exhale through left nostril for 4 counts"],
        "benefits": ["Balances nervous system", "Reduces anxiety and stress", "Improves focus and concentration", "Harmonizes left-right brain activity"],
        "contraindications": ["Cold or nasal congestion", "Recent nasal surgery"],
        "dosha_effect": "Balances Vata & Pitta", "duration_range": "5-15 minutes", "default_rounds": "9 rounds",
    },
    {
        "name": "Kapalabhati", "name_sanskrit": "कपालभाति",
        "category": "Energizing", "difficulty": "Intermediate",
        "description": "Skull-shining breath involving rapid, forceful exhalations and passive inhalations. Cleanses the respiratory system and energizes the mind.",
        "technique_steps": ["Sit in comfortable position with straight spine", "Take a deep breath in", "Exhale forcefully through nose, pulling navel in", "Let inhalation happen passively", "Start with 20 repetitions per round", "Rest between rounds with normal breathing", "Gradually increase to 60 repetitions"],
        "benefits": ["Cleanses respiratory system", "Increases metabolic rate", "Strengthens abdominal muscles", "Improves digestion", "Energizes the mind"],
        "contraindications": ["Pregnancy", "Heart disease", "High blood pressure", "Hernia", "Recent abdominal surgery"],
        "dosha_effect": "Reduces Kapha", "duration_range": "3-10 minutes", "default_rounds": "3 rounds",
    },
    {
        "name": "Ujjayi", "name_sanskrit": "उज्जायी",
        "category": "Calming", "difficulty": "Beginner",
        "description": "Ocean breath or victorious breath. A gentle, warming pranayama that creates a soft sound in the throat, promoting focus and calm.",
        "technique_steps": ["Sit comfortably or practice during asana", "Slightly constrict the back of throat", "Inhale slowly through nose with throat constriction", "Create a gentle ocean-like sound", "Exhale slowly through nose maintaining constriction", "Keep breath smooth and even", "Practice equal inhale and exhale lengths"],
        "benefits": ["Calms the nervous system", "Builds internal heat", "Improves concentration", "Regulates blood pressure", "Strengthens lungs"],
        "contraindications": ["Low blood pressure", "If feeling dizzy, stop immediately"],
        "dosha_effect": "Balances Vata", "duration_range": "5-20 minutes", "default_rounds": "Continuous",
    },
    {
        "name": "Bhastrika", "name_sanskrit": "भस्त्रिका",
        "category": "Energizing", "difficulty": "Advanced",
        "description": "Bellows breath — vigorous breathing technique that rapidly increases prana. Both inhalation and exhalation are forceful and equal.",
        "technique_steps": ["Sit in firm posture with straight spine", "Take a deep breath in", "Begin rapid, forceful breathing through both nostrils", "Both inhale and exhale are active and forceful", "Complete 10-20 breaths per round", "End with deep inhale, hold, then slow exhale", "Rest between rounds"],
        "benefits": ["Increases vital energy dramatically", "Clears sinuses and nasal passages", "Strengthens lungs and diaphragm", "Boosts metabolism", "Awakens kundalini energy"],
        "contraindications": ["Heart disease", "High blood pressure", "Pregnancy", "Epilepsy", "Hernia", "Recent surgery"],
        "dosha_effect": "Reduces Kapha, may increase Pitta", "duration_range": "3-5 minutes", "default_rounds": "3 rounds",
    },
    {
        "name": "Sheetali", "name_sanskrit": "शीतली",
        "category": "Cooling", "difficulty": "Beginner",
        "description": "Cooling breath performed by inhaling through a curled tongue. Excellent for reducing body heat and calming pitta.",
        "technique_steps": ["Sit comfortably with eyes closed", "Curl tongue into a tube shape", "Extend curled tongue slightly past lips", "Inhale slowly through the curled tongue", "Close mouth and exhale through nose", "Feel the cooling sensation", "Continue for desired number of rounds"],
        "benefits": ["Cools the body", "Reduces pitta and acidity", "Calms anger and agitation", "Reduces blood pressure", "Helps with hot flashes"],
        "contraindications": ["Asthma", "Bronchitis", "Cold weather practice", "Low blood pressure"],
        "dosha_effect": "Reduces Pitta", "duration_range": "5-10 minutes", "default_rounds": "15-20 rounds",
    },
    {
        "name": "Bhramari", "name_sanskrit": "भ्रामरी",
        "category": "Calming", "difficulty": "Beginner",
        "description": "Humming bee breath. The vibration of the humming sound calms the mind, reduces anxiety, and is excellent for meditation preparation.",
        "technique_steps": ["Sit comfortably with eyes closed", "Place index fingers on ear cartilage (tragus)", "Take a deep breath in", "While exhaling, gently press tragus and hum", "Create a steady, medium-pitched humming sound", "Feel vibrations in head and face", "Release fingers, breathe normally", "Repeat 5-7 times"],
        "benefits": ["Immediately calms the mind", "Reduces anxiety and anger", "Lowers blood pressure", "Improves concentration", "Beneficial for insomnia", "Strengthens vocal cords"],
        "contraindications": ["Ear infection", "Do not press ear too hard"],
        "dosha_effect": "Balances Vata & Pitta", "duration_range": "5-10 minutes", "default_rounds": "7 rounds",
    },
    {
        "name": "Surya Bhedana", "name_sanskrit": "सूर्य भेदन",
        "category": "Energizing", "difficulty": "Intermediate",
        "description": "Right nostril breathing that activates the solar (pingala) energy channel. Warming and stimulating for body and mind.",
        "technique_steps": ["Sit in comfortable meditative posture", "Close left nostril with ring finger", "Inhale slowly through right nostril", "Close both nostrils, hold briefly", "Release left nostril", "Exhale slowly through left nostril", "This completes one round", "Continue inhaling through right only"],
        "benefits": ["Increases body heat", "Stimulates sympathetic nervous system", "Improves digestion", "Increases alertness", "Clears tamas (lethargy)"],
        "contraindications": ["Heart disease", "High blood pressure", "Epilepsy", "Hyperthyroidism", "Fever"],
        "dosha_effect": "Reduces Vata & Kapha, increases Pitta", "duration_range": "5-10 minutes", "default_rounds": "10 rounds",
    },
    {
        "name": "Dirga", "name_sanskrit": "दीर्घ",
        "category": "Calming", "difficulty": "Beginner",
        "description": "Three-part breath or complete yogic breath. Fills the lungs completely in three stages: belly, ribcage, and chest.",
        "technique_steps": ["Lie down or sit comfortably", "Place one hand on belly, one on chest", "Inhale into belly first, feel it expand", "Continue inhaling into ribcage area", "Finally fill upper chest", "Exhale in reverse: chest, ribs, belly", "Keep breath smooth and continuous", "Practice with gentle, natural rhythm"],
        "benefits": ["Increases lung capacity", "Reduces stress and anxiety", "Improves oxygenation", "Calms the nervous system", "Foundation for all pranayama", "Improves sleep quality"],
        "contraindications": ["None for gentle practice", "Reduce depth if dizzy"],
        "dosha_effect": "Balances all doshas", "duration_range": "5-15 minutes", "default_rounds": "Continuous",
    },
]


async def seed():
    async with async_session() as session:
        result = await session.execute(select(Pranayama))
        existing = {p.name for p in result.scalars().all()}

        added = 0
        for ex in EXERCISES:
            if ex["name"] not in existing:
                session.add(Pranayama(**ex))
                added += 1
                print(f"  + {ex['name']}")
            else:
                print(f"  = {ex['name']} (already exists)")

        await session.commit()
        print(f"\nSeeded {added} new pranayama exercises.")
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed())
