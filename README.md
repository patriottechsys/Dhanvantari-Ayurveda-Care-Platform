# Dhanvantari Ayurveda Care Platform

AI-powered Ayurvedic practice management platform for practitioners. Manage patients, create personalized care plans, track daily check-ins, and leverage AI for clinical insights.

## Features

- **Patient Management** — Demographics, health profiles, dosha assessments, portal access
- **Care Plans** — Supplements, recipes, yoga assignments, lifestyle protocols
- **Dosha Assessment Wizard** — Structured Prakriti/Vikriti evaluation with radar chart visualization
- **AI Assistant** — Claude-powered plan drafting, consultation notes, patient insights
- **Yoga Library** — 20 asanas with video integration, difficulty levels, dosha effects
- **Pranayama Library** — Breathing exercises with technique guides and contraindications
- **Supplements Library** — Classical Ayurvedic herbs with image upload support
- **Recipe Authoring** — Create recipes with Ayurvedic properties (rasa, virya, vipaka)
- **Patient Portal** — QR-code accessible portal for daily check-ins and plan viewing
- **Consultation Notes** — AI-drafted, multi-section notes with send-to-patient
- **Video Management** — YouTube/Vimeo integration for yoga and pranayama
- **Print/Export** — Printable care plans with QR codes to patient portal
- **Billing** — Stripe subscription tiers (Seed, Practice, Clinic)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4, React Query, Recharts |
| Backend | FastAPI, SQLAlchemy 2 (async), Alembic, Pydantic 2 |
| Database | PostgreSQL 16 |
| AI | Anthropic Claude (claude-sonnet-4-6) |
| Email | Resend |
| Payments | Stripe |
| Auth | JWT (access + refresh tokens) |

## Quick Start

### Prerequisites

- Python 3.13+
- Node.js 20+
- PostgreSQL 16+

### 1. Database

```bash
createdb dhanvantari
```

### 2. Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Create .env from the example in config.py, minimum needed:
# DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/dhanvantari
# SECRET_KEY=your-secret-key
# ANTHROPIC_API_KEY=sk-ant-...  (optional, for AI features)

alembic upgrade head
python scripts/seed_demo.py
uvicorn app.main:app --reload --port 8747
```

### 3. Frontend

```bash
cd frontend
npm install

# Create .env.local:
# NEXT_PUBLIC_API_URL=http://localhost:8747

npm run dev -- --port 3747
```

### 4. Login

Open http://localhost:3747 and sign in:
- **Email:** demo@dhanvantari.app
- **Password:** demo1234

## Docker Compose

```bash
# Start all services
docker compose up -d

# Seed demo data (run once)
docker compose --profile seed run seed

# View logs
docker compose logs -f backend
```

Services:
- Frontend: http://localhost:3747
- Backend API: http://localhost:8747
- API Docs: http://localhost:8747/api/docs

## Project Structure

```
backend/
  app/
    api/routes/       # FastAPI route handlers
    core/             # Config, database, dependencies
    models/           # SQLAlchemy models
  alembic/versions/   # Database migrations (0001-0006)
  scripts/            # seed_demo.py
  Dockerfile

frontend/
  src/
    app/(dashboard)/  # Dashboard pages (patients, supplements, yoga, etc.)
    app/(portal)/     # Patient portal pages
    components/       # Shared components (video player, dosha chart, etc.)
    lib/              # API client, utilities, video helpers
  Dockerfile

docker-compose.yml
```

## Database Migrations

```bash
cd backend

# Apply all migrations
alembic upgrade head

# Create a new migration
alembic revision --autogenerate -m "description"

# Rollback one step
alembic downgrade -1
```

Current migrations:
- `0001` — Users, practitioners, patients, health profiles
- `0002` — Consultation plans, supplements, recipes, check-ins
- `0003` — Follow-ups, billing, consultation notes
- `0004` — Dosha assessments
- `0005` — Yoga asanas, video references, plan yoga assignments
- `0006` — Supplement image URLs

## API Endpoints

All endpoints require authentication (Bearer token) unless noted.

| Group | Endpoints |
|-------|-----------|
| Auth | `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me` |
| Patients | `GET/POST /api/patients`, `GET/PATCH/DELETE /api/patients/{id}` |
| Plans | `GET/POST/PATCH /api/patients/{id}/plan`, supplements + recipes |
| Supplements | `GET/POST /api/supplements`, `POST /api/supplements/{id}/image` |
| Recipes | `GET/POST/PATCH/DELETE /api/recipes` |
| Yoga | `GET/POST/PATCH/DELETE /api/yoga-asanas` |
| Videos | `GET/POST/PATCH/DELETE /api/videos` |
| AI | `POST /api/ai/chat`, `POST /api/ai/draft-plan/{id}`, `GET /api/ai/insights/{id}` |
| Portal | `GET /api/portal/{token}`, check-ins, plan, history (no auth) |
| Billing | `POST /api/billing/checkout`, `GET /api/billing/subscription` |

Full API docs available at `/api/docs` when `DEBUG=true`.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string (asyncpg) |
| `SECRET_KEY` | Yes | JWT signing key |
| `ANTHROPIC_API_KEY` | No | Claude API key for AI features |
| `STRIPE_SECRET_KEY` | No | Stripe secret for billing |
| `STRIPE_WEBHOOK_SECRET` | No | Stripe webhook verification |
| `RESEND_API_KEY` | No | Resend API key for email |
| `FRONTEND_URL` | No | Frontend URL for CORS (default: http://localhost:3747) |
| `NEXT_PUBLIC_API_URL` | No | Backend URL for frontend (default: http://localhost:8747) |

## License

Proprietary. All rights reserved.
