"""
Application configuration — loaded from environment variables.
"""
from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # ── App ──────────────────────────────────────────────────────────────────
    APP_NAME: str = "Dhanvantari Ayurveda Care Platform"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    FRONTEND_URL: str = "http://localhost:3747"

    # ── Database ─────────────────────────────────────────────────────────────
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/dhanvantari"

    # ── Auth / JWT ───────────────────────────────────────────────────────────
    SECRET_KEY: str = "change-me-in-production-use-secrets-token-hex-32"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7   # 7 days
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # ── Stripe ───────────────────────────────────────────────────────────────
    STRIPE_SECRET_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""
    STRIPE_PRICE_SEED: str = ""     # $49/mo
    STRIPE_PRICE_PRACTICE: str = "" # $89/mo
    STRIPE_PRICE_CLINIC: str = ""   # $149/mo

    # ── Email (Resend) ───────────────────────────────────────────────────────
    RESEND_API_KEY: str = ""
    EMAIL_FROM: str = "noreply@dhanvantari.app"
    EMAIL_FROM_NAME: str = "Dhanvantari Care"

    # ── AI ───────────────────────────────────────────────────────────────────
    ANTHROPIC_API_KEY: str = ""
    AI_MODEL: str = "claude-sonnet-4-6"

    # ── File Storage (future: S3/R2) ─────────────────────────────────────────
    STORAGE_BACKEND: str = "local"  # "local" | "s3"
    STORAGE_LOCAL_PATH: str = "./uploads"
    AWS_BUCKET: str = ""
    AWS_REGION: str = "us-east-1"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
