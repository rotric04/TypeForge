"""
TypeForge AI — Achievement Engine
Checks, awards, and manages badges and achievements
"""
import logging
from typing import List, Dict, Optional
from datetime import datetime

logger = logging.getLogger("typeforge.achievements")

ALL_ACHIEVEMENTS = [
    # Speed
    {"id": "wpm_40",   "name": "Warming Up",      "icon": "WPM.40", "desc": "Reach 40 WPM",            "category": "speed",     "rarity": "common"},
    {"id": "wpm_50",   "name": "Half Century",    "icon": "WPM.50", "desc": "Reach 50 WPM",            "category": "speed",     "rarity": "common"},
    {"id": "wpm_80",   "name": "Fast Fingers",    "icon": "WPM.80", "desc": "Reach 80 WPM",            "category": "speed",     "rarity": "common"},
    {"id": "wpm_100",  "name": "Century Club",    "icon": "WPM.100", "desc": "Reach 100 WPM",           "category": "speed",     "rarity": "rare"},
    {"id": "wpm_120",  "name": "Speed Demon",     "icon": "WPM.120", "desc": "Reach 120 WPM",           "category": "speed",     "rarity": "epic"},
    {"id": "wpm_150",  "name": "Ghost Fingers",   "icon": "WPM.150", "desc": "Reach 150 WPM",           "category": "speed",     "rarity": "legendary"},

    # Accuracy
    {"id": "acc_90",   "name": "Steady Hands",    "icon": "ACC.90", "desc": "90% accuracy in a session", "category": "accuracy",  "rarity": "common"},
    {"id": "acc_95",   "name": "Sharp Eyes",      "icon": "ACC.95", "desc": "95% accuracy in a session", "category": "accuracy",  "rarity": "common"},
    {"id": "acc_99",   "name": "Perfect Aim",     "icon": "ACC.99", "desc": "99% accuracy in a session", "category": "accuracy",  "rarity": "rare"},
    {"id": "acc_100",  "name": "Flawless",        "icon": "ACC.100", "desc": "100% accuracy session",   "category": "accuracy",  "rarity": "epic"},

    # Special
    {"id": "no_errors", "name": "Zero Error",     "icon": "ERR.0", "desc": "Complete with 0 errors",  "category": "special",   "rarity": "rare"},
    {"id": "survivor",  "name": "The Survivor",   "icon": "ERR.20", "desc": "Finish with 20+ errors",  "category": "special",   "rarity": "common"},
    {"id": "on_fire",   "name": "On Fire",        "icon": "STRK.50", "desc": "50-key error-free streak", "category": "special",  "rarity": "rare"},
    {"id": "comeback",  "name": "Comeback Kid",   "icon": "CB.15", "desc": "Improve WPM by 15+ vs last session", "category": "special", "rarity": "rare"},

    # Sessions / habit
    {"id": "first_session", "name": "Launched",    "icon": "RUN.1", "desc": "Complete first session",  "category": "milestone", "rarity": "common"},
    {"id": "sessions_5",    "name": "Finding Rhythm", "icon": "RUN.5", "desc": "5 sessions",           "category": "streak",    "rarity": "common"},
    {"id": "sessions_10",   "name": "Getting Started", "icon": "RUN.10", "desc": "10 sessions",         "category": "streak",    "rarity": "common"},
    {"id": "sessions_50",   "name": "Dedicated",   "icon": "RUN.50", "desc": "50 sessions",             "category": "streak",    "rarity": "rare"},
    {"id": "sessions_100",  "name": "Century Typist", "icon": "RUN.100", "desc": "100 sessions",         "category": "streak",    "rarity": "epic"},
    {"id": "sessions_500",  "name": "Legendary Typist", "icon": "RUN.500", "desc": "500 sessions",       "category": "streak",    "rarity": "legendary"},

    # XP & levels
    {"id": "xp_200",   "name": "XP Spark",        "icon": "XP.200", "desc": "Earn 200 total XP",       "category": "xp",        "rarity": "common"},
    {"id": "xp_500",   "name": "XP Surge",        "icon": "XP.500", "desc": "Earn 500 total XP",       "category": "xp",        "rarity": "common"},
    {"id": "xp_2000",  "name": "XP Machine",      "icon": "XP.2K", "desc": "Earn 2,000 total XP",     "category": "xp",        "rarity": "rare"},
    {"id": "xp_10000", "name": "XP Legend",       "icon": "XP.10K", "desc": "Earn 10,000 total XP",    "category": "xp",        "rarity": "legendary"},
    {"id": "level_3",  "name": "Level 3 Crew",    "icon": "LVL.3", "desc": "Reach level 3",           "category": "xp",        "rarity": "common"},
    {"id": "level_5",  "name": "Rising Star",     "icon": "LVL.5", "desc": "Reach level 5",           "category": "xp",        "rarity": "rare"},
    {"id": "level_10", "name": "Typing Titan",    "icon": "LVL.10", "desc": "Reach level 10",          "category": "xp",        "rarity": "epic"},

    # Developer
    {"id": "dev_1",    "name": "Hello World",     "icon": "DEV.1", "desc": "First developer session", "category": "dev",       "rarity": "common"},
    {"id": "dev_10",   "name": "Code Curious",    "icon": "DEV.10", "desc": "10 developer sessions",   "category": "dev",       "rarity": "common"},
    {"id": "dev_100",  "name": "Code Assassin",   "icon": "DEV.100", "desc": "100 developer sessions",  "category": "dev",       "rarity": "legendary"},

    # Time
    {"id": "night_owl",  "name": "Night Owl",     "icon": "OWL.PM", "desc": "Session after midnight",  "category": "time",      "rarity": "rare"},
    {"id": "early_bird", "name": "Early Bird",    "icon": "BRD.AM", "desc": "Session before 7am",      "category": "time",      "rarity": "common"},

    # Best WPM milestones
    {"id": "best_80",  "name": "Personal Best 80", "icon": "BST.80", "desc": "Best WPM reaches 80",  "category": "milestone", "rarity": "common"},
    {"id": "best_100", "name": "Centurion",       "icon": "BST.100", "desc": "Best WPM reaches 100",   "category": "milestone", "rarity": "rare"},
    {"id": "best_120", "name": "Elite",           "icon": "BST.120", "desc": "Best WPM reaches 120",   "category": "milestone", "rarity": "epic"},
]

ACHIEVEMENT_MAP = {a["id"]: a for a in ALL_ACHIEVEMENTS}


class AchievementEngine:
    """Manages achievement checking and awarding."""

    def __init__(self, user_id: str):
        self.user_id = user_id

    async def check_session_achievements(
        self,
        wpm: int,
        accuracy: float,
        errors: int,
        max_streak: int = 0,
        mode: str = "classic",
        user_xp: int = 0,
        user_level: int = 1,
        total_sessions: int = 0,
        best_wpm: int = 0,
    ) -> List[Dict]:
        """Check and persist achievements earned this session. Returns new badge dicts."""
        from database import DB

        earned_ids: List[str] = []

        if wpm >= 150: earned_ids.append("wpm_150")
        elif wpm >= 120: earned_ids.append("wpm_120")
        elif wpm >= 100: earned_ids.append("wpm_100")
        elif wpm >= 80: earned_ids.append("wpm_80")
        elif wpm >= 50: earned_ids.append("wpm_50")
        elif wpm >= 40: earned_ids.append("wpm_40")

        if accuracy >= 100: earned_ids.append("acc_100")
        elif accuracy >= 99: earned_ids.append("acc_99")
        elif accuracy >= 95: earned_ids.append("acc_95")
        elif accuracy >= 90: earned_ids.append("acc_90")

        if errors == 0:
            earned_ids.append("no_errors")
        if errors >= 20:
            earned_ids.append("survivor")
        if max_streak >= 50:
            earned_ids.append("on_fire")

        earned_ids.append("first_session")

        if mode == "dev":
            earned_ids.append("dev_1")

        hour = datetime.utcnow().hour
        if hour >= 0 and hour < 5:
            earned_ids.append("night_owl")
        if hour >= 5 and hour < 7:
            earned_ids.append("early_bird")

        if total_sessions >= 500: earned_ids.append("sessions_500")
        elif total_sessions >= 100: earned_ids.append("sessions_100")
        elif total_sessions >= 50: earned_ids.append("sessions_50")
        elif total_sessions >= 10: earned_ids.append("sessions_10")
        elif total_sessions >= 5: earned_ids.append("sessions_5")

        if user_xp >= 10000: earned_ids.append("xp_10000")
        elif user_xp >= 2000: earned_ids.append("xp_2000")
        elif user_xp >= 500: earned_ids.append("xp_500")
        elif user_xp >= 200: earned_ids.append("xp_200")

        if user_level >= 10: earned_ids.append("level_10")
        elif user_level >= 5: earned_ids.append("level_5")
        elif user_level >= 3: earned_ids.append("level_3")

        if best_wpm >= 120: earned_ids.append("best_120")
        elif best_wpm >= 100: earned_ids.append("best_100")
        elif best_wpm >= 80: earned_ids.append("best_80")

        try:
            prev = await DB.fetchone(
                """
                SELECT wpm FROM sessions
                WHERE user_id = $1::uuid
                ORDER BY created_at DESC
                LIMIT 1 OFFSET 1
                """,
                self.user_id,
            )
            if prev and prev["wpm"] and wpm - int(prev["wpm"]) >= 15:
                earned_ids.append("comeback")
        except Exception as e:
            logger.warning("Could not fetch previous session for comeback badge: %s", e)

        try:
            dev_count_rec = await DB.fetchone(
                "SELECT COUNT(*)::int AS c FROM sessions WHERE user_id = $1::uuid AND mode = 'dev'",
                self.user_id,
            )
            dev_count = int(dev_count_rec["c"]) if dev_count_rec else 0
            if dev_count >= 100: earned_ids.append("dev_100")
            elif dev_count >= 10: earned_ids.append("dev_10")
        except Exception as e:
            logger.warning("Could not fetch dev session count: %s", e)

        new_badges: List[Dict] = []
        earned_set = set(earned_ids)
        if earned_set:
            try:
                # Check existing badges in a single query
                existing_records = await DB.fetchall(
                    "SELECT badge_id FROM achievements WHERE user_id = $1::uuid AND badge_id = ANY($2::text[])",
                    self.user_id,
                    list(earned_set),
                )
                existing_ids = {r["badge_id"] for r in existing_records}
                
                insert_data = []
                for aid in earned_set:
                    if aid not in ACHIEVEMENT_MAP or aid in existing_ids:
                        continue
                    insert_data.append((self.user_id, aid))
                    new_badges.append(ACHIEVEMENT_MAP[aid])
                    
                if insert_data:
                    await DB.executemany(
                        "INSERT INTO achievements (user_id, badge_id) VALUES ($1::uuid, $2) ON CONFLICT (user_id, badge_id) DO NOTHING",
                        insert_data
                    )
            except Exception as e:
                logger.error("Failed to query or bulk insert achievements: %s", e)

        if new_badges:
            logger.info("User %s earned badges: %s", self.user_id, [b["name"] for b in new_badges])

        return new_badges

        if new_badges:
            logger.info("User %s earned badges: %s", self.user_id, [b["name"] for b in new_badges])

        return new_badges

    def get_all_achievements(self, user_unlocked_ids: List[str]) -> List[Dict]:
        result = []
        for ach in ALL_ACHIEVEMENTS:
            result.append({
                **ach,
                "is_unlocked": ach["id"] in user_unlocked_ids,
                "unlocked_at": None,
            })
        return result

    @staticmethod
    def get_badge_display(achievement_id: str) -> Optional[Dict]:
        return ACHIEVEMENT_MAP.get(achievement_id)
