"""
TypeForge AI — Sessions Router
Handles typing session creation, retrieval, and real-time updates
"""
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from datetime import datetime, timedelta
import uuid
import logging

from database import get_db, DB
from dependencies import get_current_user
from models.models import SessionCreate, SessionResponse, UserProfile
from services.adaptive import WeakKeyAnalyzer, PerformanceAnalyzer, normalize_key_stats
from services.achievements import AchievementEngine
from config import settings

router = APIRouter()
logger = logging.getLogger("typeforge.sessions")


def calc_xp(wpm: int, accuracy: float, consistency: float, errors: int) -> int:
    """Calculate XP earned for a session."""
    xp = 0
    xp += min(100, int(wpm * 0.5))
    xp += min(50,  int(accuracy * 0.3))
    xp += min(30,  int(consistency * 0.2))
    # Bonuses
    if accuracy >= 99: xp += 100
    elif accuracy >= 97: xp += 50
    elif accuracy >= 95: xp += 25
    if wpm >= 150: xp += 200
    elif wpm >= 120: xp += 100
    elif wpm >= 100: xp += 60
    elif wpm >= 80:  xp += 30
    if errors == 0: xp += 50
    return max(10, xp)


def generate_ai_insight(wpm: int, accuracy: float, consistency: float, weak_keys: List[str]) -> str:
    """Generate personalized AI insight for session results."""
    if accuracy < 90:
        return f"Accuracy at {accuracy:.0f}% is holding you back. Slow down 10 WPM and focus on precision first."
    if weak_keys:
        keys_str = ", ".join(f"'{k}'" for k in weak_keys[:3])
        return f"Your slowest keys this session: {keys_str}. Your next session will prioritize these."
    if consistency < 70:
        return f"Your speed varied significantly. Try to maintain a steady rhythm — think of typing like a metronome."
    if wpm >= 120:
        return f"Exceptional! {wpm} WPM puts you in the top 3% of TypeForge users. Consider Challenge Mode."
    if wpm >= 90:
        return f"Solid {wpm} WPM. Work on punctuation speed to crack 100 WPM consistently."
    return f"Good session! Target {int(wpm * 1.12)} WPM next time. Keep your fingers on home row between words."


@router.post("/", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
async def create_session(
    session: SessionCreate,
    user: UserProfile = Depends(get_current_user),
    db = Depends(get_db),
):
    """
    Save a completed typing session.
    Computes XP, identifies weak patterns, awards achievements.
    """
    # Validate duration
    if session.duration_secs > settings.MAX_SESSION_DURATION_SECONDS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Session duration exceeds maximum of {settings.MAX_SESSION_DURATION_SECONDS}s"
        )

    # Analyze weak patterns from normalized per-key stats
    analyzer = WeakKeyAnalyzer(normalize_key_stats(session.key_stats))
    weak_keys = analyzer.get_weak_keys()

    # Calculate XP
    xp_earned = calc_xp(session.wpm, session.accuracy, session.consistency, session.errors)

    # Generate AI insight
    ai_insight = generate_ai_insight(session.wpm, session.accuracy, session.consistency, weak_keys)

    session_id = str(uuid.uuid4())
    user_id = str(user.id)

    # Save to database
    query = """
        INSERT INTO sessions 
        (id, user_id, mode, language, duration_secs, wpm, raw_wpm, accuracy, correct_chars, error_chars, total_chars, errors, consistency, max_streak, xp_earned)
        VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    """
    await DB.execute(query, session_id, user_id, session.mode.value, 
                     session.language.value if session.language else None, 
                     session.duration_secs, 
                     session.wpm, session.raw_wpm or session.wpm, session.accuracy, session.correct_chars, 
                     session.error_chars, session.total_chars, session.errors, session.consistency, 
                     session.max_streak, xp_earned)

    # Update user XP, level, total_sessions, best_wpm
    # Level formula: every level requires 500 * level XP (progressive curve)
    # Level 1: 0-499, Level 2: 500-1499, Level 3: 1500-2999, etc.
    # We derive level from total XP after update: FLOOR(SQRT(new_xp / 250)) + 1
    update_user_query = """
        UPDATE users 
        SET xp = xp + $1, 
            level = GREATEST(1, FLOOR(SQRT((xp + $1)::float / 250.0))::int + 1),
            total_sessions = total_sessions + 1,
            best_wpm = GREATEST(best_wpm, $2),
            updated_at = NOW()
        WHERE id = $3::uuid
    """
    await DB.execute(update_user_query, xp_earned, session.wpm, user_id)

    # Save/update typing DNA for the user
    try:
        dna_id = f"TF-DNA-{user_id[:8].upper()}"
        dna_record = await DB.fetchone("SELECT id FROM typing_dna WHERE user_id = $1::uuid", user.id)
        if dna_record:
            await DB.execute(
                "UPDATE typing_dna SET weak_keys = $1, generated_at = NOW() WHERE user_id = $2::uuid",
                weak_keys, user.id
            )
        else:
            await DB.execute(
                "INSERT INTO typing_dna (user_id, dna_id, archetype, weak_keys) VALUES ($1::uuid, $2, $3, $4)",
                user.id, dna_id, "Typist", weak_keys
            )
    except Exception as dna_err:
        logger.error(f"Failed to update typing DNA in database: {dna_err}")

    badges_earned = await check_achievements_sync(
        user_id, session.wpm, session.accuracy, session.errors,
        session.max_streak, session.mode.value,
    )

    return SessionResponse(
        id=session_id,
        user_id=user_id,
        mode=session.mode,
        language=session.language,
        duration_secs=session.duration_secs,
        wpm=session.wpm,
        raw_wpm=session.raw_wpm or session.wpm,
        accuracy=session.accuracy,
        errors=session.errors,
        consistency=session.consistency,
        xp_earned=xp_earned,
        badges_earned=[b["id"] for b in badges_earned],
        ai_insight=ai_insight,
        weak_keys=weak_keys,
        created_at=datetime.utcnow(),
    )


@router.get("/history", response_model=List[dict])
async def get_session_history(
    limit: int = 20,
    offset: int = 0,
    mode: Optional[str] = None,
    user: UserProfile = Depends(get_current_user),
    db = Depends(get_db),
):
    """Get session history with optional filtering."""
    user_id = user.id
    if mode:
        query = """
            SELECT id, mode, language, duration_secs, wpm, raw_wpm, accuracy::float AS accuracy, correct_chars, error_chars, total_chars, errors, consistency::float AS consistency, max_streak, xp_earned, created_at
            FROM sessions
            WHERE user_id = $1::uuid AND mode = $2
            ORDER BY created_at DESC
            LIMIT $3 OFFSET $4
        """
        records = await DB.fetchall(query, user_id, mode, limit, offset)
    else:
        query = """
            SELECT id, mode, language, duration_secs, wpm, raw_wpm, accuracy::float AS accuracy, correct_chars, error_chars, total_chars, errors, consistency::float AS consistency, max_streak, xp_earned, created_at
            FROM sessions
            WHERE user_id = $1::uuid
            ORDER BY created_at DESC
            LIMIT $2 OFFSET $3
        """
        records = await DB.fetchall(query, user_id, limit, offset)
    
    return [dict(r) for r in records]


@router.get("/{session_id}")
async def get_session(session_id: str, db = Depends(get_db)):
    """Get a specific session by ID."""
    # TODO: implement with real DB query
    raise HTTPException(status_code=404, detail="Session not found")


async def check_achievements_sync(
    user_id: str,
    wpm: int,
    accuracy: float,
    errors: int,
    max_streak: int,
    mode: str,
) -> list:
    """Check and award achievements; return newly earned badge metadata."""
    engine = AchievementEngine(user_id)
    return await engine.check_session_achievements(wpm, accuracy, errors, max_streak, mode)
