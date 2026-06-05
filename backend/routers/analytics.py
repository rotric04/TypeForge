import logging
from fastapi import APIRouter, Depends
from database import DB, is_db_connected
from dependencies import get_current_user
from models.models import UserProfile
from services.adaptive import PerformanceAnalyzer
from ml.pipeline import TypingClusterer, PerformancePredictor, extract_features

logger = logging.getLogger("typeforge.analytics")
router = APIRouter()


@router.get("/platform-stats")
async def get_platform_stats():
    """Aggregated platform metrics from the database (no inflated baselines)."""
    if not await _db_available():
        return {
            "active_typists": 0,
            "keystrokes_analyzed": 0,
            "wpm_improvement": 0,
            "total_sessions": 0,
            "db_connected": False,
        }

    try:
        user_count_rec = await DB.fetchone("SELECT COUNT(*)::int AS count FROM users")
        session_count_rec = await DB.fetchone("SELECT COUNT(*)::int AS count FROM sessions")
        keystrokes_rec = await DB.fetchone(
            "SELECT COALESCE(SUM(total_chars), 0)::bigint AS total FROM sessions"
        )
        avg_imp_rec = await DB.fetchone("""
            SELECT ROUND(AVG(s.wpm - u.baseline_wpm))::int AS avg_imp
            FROM sessions s
            JOIN users u ON s.user_id = u.id
            WHERE u.baseline_wpm IS NOT NULL
              AND s.wpm IS NOT NULL
        """)

        user_count = int(user_count_rec["count"]) if user_count_rec else 0
        session_count = int(session_count_rec["count"]) if session_count_rec else 0
        keystrokes = int(keystrokes_rec["total"]) if keystrokes_rec else 0
        avg_imp = int(avg_imp_rec["avg_imp"]) if avg_imp_rec and avg_imp_rec["avg_imp"] is not None else 0

        return {
            "active_typists": user_count,
            "keystrokes_analyzed": keystrokes,
            "wpm_improvement": avg_imp,
            "total_sessions": session_count,
            "db_connected": True,
        }
    except Exception as e:
        logger.error("platform-stats query failed: %s", e, exc_info=True)
        return {
            "active_typists": 0,
            "keystrokes_analyzed": 0,
            "wpm_improvement": 0,
            "total_sessions": 0,
            "db_connected": False,
        }


async def _db_available() -> bool:
    if not is_db_connected():
        return False
    try:
        row = await DB.fetchone("SELECT 1 AS ok")
        return row is not None
    except Exception:
        return False


@router.get("/dashboard")
async def get_dashboard_analytics(user: UserProfile = Depends(get_current_user)):
    """Per-user dashboard series from stored sessions."""
    records = await DB.fetchall(
        """
        SELECT wpm, accuracy::float AS accuracy, consistency::float AS consistency, created_at
        FROM sessions
        WHERE user_id = $1::uuid
        ORDER BY created_at ASC
        LIMIT 120
        """,
        user.id,
    )
    sessions = [dict(r) for r in records]
    analyzer = PerformanceAnalyzer(sessions)

    wpm_trend = [
        {
            "date": s["created_at"].isoformat() if s.get("created_at") else None,
            "wpm": float(s.get("wpm") or 0),
            "accuracy": float(s.get("accuracy") or 0),
        }
        for s in sessions
    ]

    return {
        "wpm_trend": wpm_trend,
        "accuracy_trend": [p["accuracy"] for p in wpm_trend],
        "average_wpm": round(analyzer.average_wpm(), 1),
        "average_accuracy": round(analyzer.average_accuracy(), 1),
        "consistency_score": analyzer.consistency_score(),
        "trend": analyzer.wpm_trend(),
        "insight": analyzer.generate_insight(),
        "sessions_analyzed": len(sessions),
    }


@router.get("/dna")
async def get_typing_dna(user: UserProfile = Depends(get_current_user)):
    """Typing DNA derived from session history and stored weak keys."""
    records = await DB.fetchall(
        """
        SELECT wpm, accuracy::float AS accuracy, consistency::float AS consistency, errors, created_at
        FROM sessions
        WHERE user_id = $1::uuid
        ORDER BY created_at ASC
        LIMIT 100
        """,
        user.id,
    )
    sessions = [dict(r) for r in records]
    features = extract_features(sessions)
    clusterer = TypingClusterer()
    clusterer.load()
    archetype = clusterer.predict_archetype(features)
    analyzer = PerformanceAnalyzer(sessions)

    dna_row = await DB.fetchone(
        "SELECT weak_keys, archetype FROM typing_dna WHERE user_id = $1::uuid ORDER BY generated_at DESC LIMIT 1",
        user.id,
    )
    weak_keys = list(dna_row["weak_keys"]) if dna_row and dna_row["weak_keys"] else []

    return {
        "archetype": archetype["name"],
        "archetype_icon": archetype.get("icon", "⌨️"),
        "archetype_desc": archetype.get("desc", ""),
        "focus_score": user.focus_score or 0,
        "consistency_score": analyzer.consistency_score(),
        "weak_keys": weak_keys,
        "wpm_trend": analyzer.wpm_trend(),
        "sessions_analyzed": len(sessions),
    }


@router.get("/heatmap")
async def get_error_heatmap(user: UserProfile = Depends(get_current_user)):
    """Weak-key heatmap from the latest typing DNA snapshot."""
    dna_row = await DB.fetchone(
        "SELECT weak_keys FROM typing_dna WHERE user_id = $1::uuid ORDER BY generated_at DESC LIMIT 1",
        user.id,
    )
    weak_keys = list(dna_row["weak_keys"]) if dna_row and dna_row["weak_keys"] else []
    heatmap = {k: {"error_rate": 1.0, "priority": "high"} for k in weak_keys}
    return {"heatmap": heatmap, "weak_keys": weak_keys}


@router.get("/prediction")
async def get_performance_prediction(user: UserProfile = Depends(get_current_user)):
    """WPM forecast from session history."""
    records = await DB.fetchall(
        """
        SELECT wpm, accuracy::float AS accuracy, consistency::float AS consistency, errors, created_at
        FROM sessions
        WHERE user_id = $1::uuid
        ORDER BY created_at ASC
        LIMIT 100
        """,
        user.id,
    )
    sessions = [dict(r) for r in records]
    predictor = PerformancePredictor()
    wpm_7d, conf_7d = predictor.predict_wpm(sessions, days_ahead=7)
    wpm_30d, conf_30d = predictor.predict_wpm(sessions, days_ahead=30)
    return {
        "predicted_wpm_7d": wpm_7d,
        "predicted_wpm_30d": wpm_30d,
        "confidence": round((conf_7d + conf_30d) / 2, 2) if sessions else 0.0,
    }
