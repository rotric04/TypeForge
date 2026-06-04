"""
TypeForge AI — Application Configuration
"""
from pydantic_settings import BaseSettings
from typing import List
import os


class Settings(BaseSettings):
    # ── Core ──────────────────────────────────────────
    APP_NAME: str = "TypeForge AI"
    VERSION:  str = "1.0.0"
    DEBUG:    bool = False
    SECRET_KEY: str = "change-this-in-production-min-32-chars"

    # ── Database (Supabase) ───────────────────────────
    SUPABASE_URL:        str = ""
    SUPABASE_ANON_KEY:   str = ""
    SUPABASE_SERVICE_KEY: str = ""
    DATABASE_URL:        str = ""  # Direct Postgres connection

    # ── Redis ─────────────────────────────────────────
    REDIS_URL:      str = "redis://localhost:6379"
    REDIS_PASSWORD: str = ""

    # ── Authentication (Clerk) ─────────────────────────
    CLERK_SECRET_KEY:       str = ""
    CLERK_PUBLISHABLE_KEY:  str = ""
    CLERK_WEBHOOK_SECRET:   str = ""
    CLERK_JWT_KEY:          str = ""

    # ── Email (Resend) ─────────────────────────────────
    RESEND_API_KEY:   str = ""
    EMAIL_FROM:       str = "noreply@typeforge.ai"
    EMAIL_FROM_NAME:  str = "TypeForge AI"

    # ── Cloudflare Turnstile ──────────────────────────
    TURNSTILE_SECRET_KEY: str = ""
    TURNSTILE_SITE_KEY:   str = ""

    # ── Analytics ─────────────────────────────────────
    PLAUSIBLE_API_KEY: str = ""
    POSTHOG_API_KEY:   str = ""

    # ── Error Monitoring (Sentry) ─────────────────────
    SENTRY_DSN: str = ""

    # ── Feature Flags (Flagsmith) ─────────────────────
    FLAGSMITH_API_KEY:     str = ""
    FLAGSMITH_ENVIRONMENT: str = "development"

    # ── Search (Typesense) ────────────────────────────
    TYPESENSE_HOST:   str = "localhost"
    TYPESENSE_PORT:   int = 8108
    TYPESENSE_API_KEY: str = ""

    # ── Storage (Supabase Storage) ────────────────────
    STORAGE_BUCKET: str = "typeforge-assets"

    # ── CORS / Security ───────────────────────────────
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "http://localhost:3000",
        "http://localhost:8080",
        "https://typeforge.ai",
        "https://www.typeforge.ai",
        "https://app.typeforge.ai",
    ]
    ALLOWED_HOSTS: List[str] = ["typeforge.ai", "api.typeforge.ai", "localhost"]

    # ── Rate Limiting ─────────────────────────────────
    RATE_LIMIT_DEFAULT:     int = 100   # requests per minute
    RATE_LIMIT_AUTH:        int = 10    # auth endpoints per minute
    RATE_LIMIT_API:         int = 300   # general API per minute

    # ── ML Settings ───────────────────────────────────
    ML_MODEL_PATH: str = "ml/models"
    ML_RETRAIN_AFTER_SESSIONS: int = 100
    CLUSTERING_N_CLUSTERS: int = 8

    # ── Session Settings ──────────────────────────────
    SESSION_SAVE_INTERVAL_SECONDS: int = 5
    MAX_SESSIONS_PER_USER_PER_DAY: int = 200
    MAX_SESSION_DURATION_SECONDS:  int = 600  # 10 minutes max

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


settings = Settings()
