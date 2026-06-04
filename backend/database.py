"""
TypeForge AI — Database Connection Manager
Supabase + Direct PostgreSQL via asyncpg
"""
import asyncpg
import logging
from typing import Optional
from supabase import create_client, Client

from config import settings

logger = logging.getLogger("typeforge.db")

# ── Connection Pool ───────────────────────────────────────────────
_pool: Optional[asyncpg.Pool] = None
_supabase: Optional[Client] = None


async def init_db():
    """Initialize database connections."""
    global _pool, _supabase

    # Direct Postgres pool for complex queries
    if settings.DATABASE_URL:
        try:
            _pool = await asyncpg.create_pool(
                settings.DATABASE_URL,
                min_size=2,
                max_size=10,
                command_timeout=30,
                # Supabase pooler in session mode (port 5432) or direct connections
                # are used to support prepared statements. statement_cache_size is set to 0.
                statement_cache_size=0,
            )
            logger.info("✅ PostgreSQL pool created")
        except Exception as e:
            logger.error(f"❌ PostgreSQL pool failed: {e}")

    # Supabase client for Auth, Storage, Realtime
    if settings.SUPABASE_URL and settings.SUPABASE_SERVICE_KEY:
        try:
            _supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
            logger.info("✅ Supabase client initialized")
        except Exception as e:
            logger.error(f"❌ Supabase client failed: {e}")


async def close_db():
    """Close database connections."""
    global _pool
    if _pool:
        await _pool.close()
        logger.info("🔌 PostgreSQL pool closed")


def get_supabase() -> Client:
    """Get Supabase client."""
    if not _supabase:
        raise RuntimeError("Supabase not initialized")
    return _supabase


async def get_db() -> asyncpg.Connection:
    """FastAPI dependency: get database connection."""
    if not _pool:
        raise RuntimeError("Database pool not initialized")
    async with _pool.acquire() as conn:
        yield conn


class DB:
    """Utility class for common database operations."""

    @staticmethod
    async def fetchone(query: str, *args) -> Optional[asyncpg.Record]:
        if not _pool:
            return None
        async with _pool.acquire() as conn:
            return await conn.fetchrow(query, *args)

    @staticmethod
    async def fetchall(query: str, *args) -> list:
        if not _pool:
            return []
        async with _pool.acquire() as conn:
            return await conn.fetch(query, *args)

    @staticmethod
    async def execute(query: str, *args) -> str:
        if not _pool:
            return ""
        async with _pool.acquire() as conn:
            return await conn.execute(query, *args)

    @staticmethod
    async def executemany(query: str, args_list: list) -> None:
        if not _pool:
            return
        async with _pool.acquire() as conn:
            await conn.executemany(query, args_list)
