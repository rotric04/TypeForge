"""
TypeForge AI — Achievement Engine
Checks, awards, and manages badges and achievements
"""
import logging
from typing import List, Dict, Optional
from datetime import datetime

logger = logging.getLogger("typeforge.achievements")

# ── Achievement Definitions ───────────────────────────────────────
ALL_ACHIEVEMENTS = [
    # Speed
    {"id": "wpm_50",   "name": "Half Century",    "icon": "🔥", "desc": "Reach 50 WPM",           "category": "speed",    "rarity": "common"},
    {"id": "wpm_80",   "name": "Fast Fingers",    "icon": "⚡", "desc": "Reach 80 WPM",           "category": "speed",    "rarity": "common"},
    {"id": "wpm_100",  "name": "Century Club",    "icon": "💯", "desc": "Reach 100 WPM",          "category": "speed",    "rarity": "rare"},
    {"id": "wpm_120",  "name": "Speed Demon",     "icon": "🏎️", "desc": "Reach 120 WPM",          "category": "speed",    "rarity": "epic"},
    {"id": "wpm_150",  "name": "Ghost Fingers",   "icon": "👻", "desc": "Reach 150 WPM",          "category": "speed",    "rarity": "legendary"},

    # Accuracy
    {"id": "acc_95",   "name": "Sharp Eyes",      "icon": "👁️", "desc": "95% accuracy in a session","category": "accuracy","rarity": "common"},
    {"id": "acc_99",   "name": "Perfect Aim",     "icon": "🎯", "desc": "99% accuracy in a session","category": "accuracy","rarity": "rare"},
    {"id": "acc_100",  "name": "Flawless",        "icon": "💎", "desc": "100% accuracy session",  "category": "accuracy", "rarity": "epic"},

    # Special Conditions
    {"id": "no_errors","name": "Zero Error",      "icon": "🧊", "desc": "Complete with 0 errors", "category": "special",  "rarity": "rare"},
    {"id": "survivor", "name": "The Survivor",    "icon": "🦺", "desc": "Finish with 20+ errors", "category": "special",  "rarity": "common"},
    {"id": "on_fire",  "name": "On Fire",         "icon": "🔥", "desc": "50-key error-free streak","category": "special", "rarity": "rare"},

    # Consistency
    {"id": "sessions_10",  "name": "Getting Started",  "icon": "🌱", "desc": "10 sessions",          "category": "streak","rarity": "common"},
    {"id": "sessions_50",  "name": "Dedicated",        "icon": "📅", "desc": "50 sessions",          "category": "streak","rarity": "rare"},
    {"id": "sessions_100", "name": "Century Typist",   "icon": "💯", "desc": "100 sessions",         "category": "streak","rarity": "epic"},

    # Developer
    {"id": "dev_10",   "name": "Code Curious",    "icon": "💻", "desc": "10 developer sessions",  "category": "dev",     "rarity": "common"},
    {"id": "dev_100",  "name": "Code Assassin",   "icon": "💀", "desc": "100 developer sessions", "category": "dev",     "rarity": "legendary"},

    # Time-based
    {"id": "night_owl","name": "Night Owl",       "icon": "🦉", "desc": "30 midnight sessions",   "category": "time",    "rarity": "rare"},
    {"id": "early_bird","name": "Early Bird",     "icon": "🐦", "desc": "10 sessions before 7am", "category": "time",    "rarity": "common"},

    # Punctuation
    {"id": "punct_pro","name": "Punctuation Slayer","icon":"🥷","desc": "98% punctuation accuracy","category":"accuracy", "rarity": "epic"},

    # First
    {"id": "first_session","name": "Launched",   "icon": "🚀", "desc": "Complete first session",  "category": "milestone","rarity": "common"},
]

ACHIEVEMENT_MAP = {a["id"]: a for a in ALL_ACHIEVEMENTS}


class AchievementEngine:
    """Manages achievement checking and awarding."""

    def __init__(self, user_id: str):
        self.user_id = user_id

    async def check_session_achievements(self, wpm: int, accuracy: float, errors: int) -> List[str]:
        """Check which achievements were earned this session."""
        earned = []

        # Speed achievements
        if wpm >= 150: earned.append("wpm_150")
        elif wpm >= 120: earned.append("wpm_120")
        elif wpm >= 100: earned.append("wpm_100")
        elif wpm >= 80:  earned.append("wpm_80")
        elif wpm >= 50:  earned.append("wpm_50")

        # Accuracy achievements
        if accuracy >= 100: earned.append("acc_100")
        elif accuracy >= 99: earned.append("acc_99")
        elif accuracy >= 95: earned.append("acc_95")

        # Special
        if errors == 0: earned.append("no_errors")
        if errors >= 20: earned.append("survivor")

        # First session
        earned.append("first_session")

        # Save earned achievements to DB
        new_achievements = [ACHIEVEMENT_MAP[a] for a in earned if a in ACHIEVEMENT_MAP]
        if new_achievements:
            logger.info(f"User {self.user_id} earned: {[a['name'] for a in new_achievements]}")
            from database import DB
            for ach in new_achievements:
                await DB.execute(
                    "INSERT INTO achievements (user_id, badge_id) VALUES ($1, $2) ON CONFLICT (user_id, badge_id) DO NOTHING",
                    self.user_id, ach["id"]
                )

        return [a["id"] for a in new_achievements]

    def get_all_achievements(self, user_unlocked_ids: List[str]) -> List[Dict]:
        """Return all achievements with unlock status."""
        result = []
        for ach in ALL_ACHIEVEMENTS:
            result.append({
                **ach,
                "is_unlocked": ach["id"] in user_unlocked_ids,
                "unlocked_at": None,  # would come from DB
            })
        return result

    @staticmethod
    def get_badge_display(achievement_id: str) -> Optional[Dict]:
        """Get display info for a single achievement."""
        return ACHIEVEMENT_MAP.get(achievement_id)
