"""
TypeForge AI — FastAPI Backend
Main application entry point
"""
from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse, PlainTextResponse
from contextlib import asynccontextmanager
import logging
import time
import os

from config import settings
from database import init_db, close_db, is_db_connected, DatabaseUnavailableError
from routers import auth, users, sessions, analytics, training

# ── Logging ──────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s"
)
logger = logging.getLogger("typeforge")

# ── Lifespan ──────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🚀 TypeForge AI starting up…")
    await init_db()
    yield
    logger.info("👋 TypeForge AI shutting down…")
    await close_db()

# ── App ───────────────────────────────────────────────────────────
app = FastAPI(
    title="TypeForge AI API",
    description="Adaptive typing intelligence platform API",
    version="1.0.0",
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    lifespan=lifespan,
)

# ── Middleware ────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

if not settings.DEBUG:
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=settings.ALLOWED_HOSTS,
    )

# ── Request Timing & Security Middleware ───────────────────────────
@app.middleware("http")
async def add_timing_and_security_headers(request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    duration = time.perf_counter() - start
    
    # Timing & custom branding headers
    response.headers["X-Response-Time"] = f"{duration * 1000:.2f}ms"
    response.headers["X-Powered-By"] = "TypeForge AI"
    
    # Robust Security Headers
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com https://cdnjs.cloudflare.com https://*.clerk.accounts.dev https://*.clerk.com https://va.vercel-scripts.com https://static.cloudflareinsights.com https://esm.sh https://*.esm.sh; "
        "worker-src blob: 'self'; "
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
        "font-src 'self' https://fonts.gstatic.com; "
        "img-src 'self' data: https://images.clerk.dev https://*.clerk.com; "
        "connect-src 'self' https://typeforge-tkw8.onrender.com https://*.clerk.accounts.dev https://*.clerk.com wss://*.clerk.accounts.dev https://va.vercel-scripts.com https://vitals.vercel-insights.com https://vitals.vercel-analytics.com https://cloudflareinsights.com https://esm.sh https://*.esm.sh; "
        "frame-src 'self' https://challenges.cloudflare.com;"
    )
    response.headers["Cross-Origin-Opener-Policy"] = "same-origin-allow-popups"
    response.headers["Cross-Origin-Resource-Policy"] = "same-origin"
    response.headers["Cross-Origin-Embedder-Policy"] = "credentialless"
    response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains; preload"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    
    return response

# ── Routers ───────────────────────────────────────────────────────
app.include_router(auth.router,      prefix="/api/v1/auth",      tags=["Authentication"])
app.include_router(users.router,     prefix="/api/v1/users",     tags=["Users"])
app.include_router(sessions.router,  prefix="/api/v1/sessions",  tags=["Sessions"])
app.include_router(analytics.router, prefix="/api/v1/analytics", tags=["Analytics"])
app.include_router(training.router,  prefix="/api/v1/training",  tags=["Training"])

# ── Health Check ──────────────────────────────────────────────────
@app.get("/health", tags=["System"])
async def health_check():
    db_ok = is_db_connected()
    if db_ok:
        try:
            from database import DB
            row = await DB.fetchone("SELECT 1 AS ok")
            db_ok = row is not None
        except Exception:
            db_ok = False
    return {
        "status": "healthy" if db_ok else "degraded",
        "service": "TypeForge AI API",
        "version": "1.0.0",
        "db_connected": db_ok,
        "timestamp": time.time(),
    }


@app.exception_handler(DatabaseUnavailableError)
async def database_unavailable_handler(request, exc):
    return JSONResponse(
        status_code=503,
        content={
            "detail": str(exc),
            "hint": "Configure DATABASE_URL on the API host using the Supabase Session pooler URI (port 5432).",
        },
    )

@app.get("/", tags=["System"])
async def root():
    return {
        "message": "TypeForge AI API",
        "docs": "/docs",
        "version": "1.0.0",
    }

@app.get("/.well-known/security.txt", response_class=PlainTextResponse, tags=["System"])
@app.get("/security.txt", response_class=PlainTextResponse, tags=["System"])
async def security_txt():
    content = (
        "Contact: mailto:security@typeforge.fun\n"
        "Expires: 2027-06-04T17:00:00.000Z\n"
        "Preferred-Languages: en\n"
        "Canonical: https://typeforge.fun/.well-known/security.txt\n"
        "Acknowledgement: https://typeforge.fun/security\n"
        "Policy: https://typeforge.fun/security\n"
    )
    return PlainTextResponse(content=content)

# ── Global Exception Handler ──────────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "error_id": str(time.time())}
    )

if __name__ == "__main__":
    import uvicorn
    # Render (and most PaaS) inject PORT as an env var.
    # Falling back to 8001 for local dev.
    port = int(os.environ.get("PORT", 8001))
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=settings.DEBUG,
        log_level="info",
    )
