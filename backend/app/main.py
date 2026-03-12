"""
Dhanvantari Ayurveda Care Platform — FastAPI Application
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware

from app.core.config import settings
from app.core.database import engine, Base
from app.api.routes import auth, practitioners, patients, plans, checkins, portal, ai, billing, supplements, recipes


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables on startup (use Alembic for production migrations)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="AI-powered Ayurvedic practice management platform",
    lifespan=lifespan,
    docs_url="/api/docs" if settings.DEBUG else None,
    redoc_url="/api/redoc" if settings.DEBUG else None,
)

# ── Middleware ────────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────

app.include_router(auth.router,          prefix="/api/auth",         tags=["auth"])
app.include_router(practitioners.router, prefix="/api/practitioners", tags=["practitioners"])
app.include_router(patients.router,      prefix="/api/patients",      tags=["patients"])
app.include_router(plans.router,         prefix="/api/plans",         tags=["plans"])
app.include_router(supplements.router,   prefix="/api/supplements",   tags=["supplements"])
app.include_router(recipes.router,       prefix="/api/recipes",       tags=["recipes"])
app.include_router(checkins.router,      prefix="/api/checkins",      tags=["checkins"])
app.include_router(portal.router,        prefix="/api/portal",        tags=["portal"])
app.include_router(ai.router,            prefix="/api/ai",            tags=["ai"])
app.include_router(billing.router,       prefix="/api/billing",       tags=["billing"])


@app.get("/api/health")
async def health():
    return {"status": "ok", "version": settings.APP_VERSION}
