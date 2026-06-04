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


class DatabaseUnavailableError(RuntimeError):
    """Raised when PostgreSQL pool is not configured or not connected."""


# ── Connection Pool ───────────────────────────────────────────────
_pool: Optional[asyncpg.Pool] = None
_supabase: Optional[Client] = None


def is_db_connected() -> bool:
    return _pool is not None


async def init_db():
    """Initialize database connections."""
    global _pool, _supabase

    if settings.DATABASE_URL:
        try:
            _pool = await asyncpg.create_pool(
                settings.DATABASE_URL,
                min_size=2,
                max_size=10,
                command_timeout=30,
                statement_cache_size=0,
                ssl="require",
            )
            logger.info("PostgreSQL pool created")
        except Exception as e:
            logger.error("PostgreSQL pool failed: %s", e)
            _pool = None
    else:
        logger.error("DATABASE_URL is not set. Sessions and XP will not persist.")

    if settings.SUPABASE_URL and settings.SUPABASE_SERVICE_KEY:
        try:
            _supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
            logger.info("Supabase client initialized")
        except Exception as e:
            logger.error("Supabase client failed: %s", e)


async def close_db():
    """Close database connections."""
    global _pool
    if _pool:
        await _pool.close()
        _pool = None
        logger.info("PostgreSQL pool closed")


def get_supabase() -> Client:
    if not _supabase:
        raise RuntimeError("Supabase not initialized")
    return _supabase


async def get_db() -> asyncpg.Connection:
    if not _pool:
        raise DatabaseUnavailableError(
            "Database is not connected. Set DATABASE_URL on the API server (Supabase → Settings → Database → Connection string)."
        )
    async with _pool.acquire() as conn:
        yield conn


class DB:
    """Utility class for common database operations."""

    @staticmethod
    def _require_pool():
        if not _pool:
            raise DatabaseUnavailableError(
                "Database is not connected. Set DATABASE_URL on Render to your Supabase Postgres URI."
            )

    @staticmethod
    async def fetchone(query: str, *args) -> Optional[asyncpg.Record]:
        DB._require_pool()
        async with _pool.acquire() as conn:
            return await conn.fetchrow(query, *args)

    @staticmethod
    async def fetchall(query: str, *args) -> list:
        DB._require_pool()
        async with _pool.acquire() as conn:
            return await conn.fetch(query, *args)

    @staticmethod
    async def execute(query: str, *args) -> str:
        DB._require_pool()
        async with _pool.acquire() as conn:
            return await conn.execute(query, *args)

    @staticmethod
    async def executemany(query: str, args_list: list) -> None:
        DB._require_pool()
        async with _pool.acquire() as conn:
            await conn.executemany(query, args_list)
