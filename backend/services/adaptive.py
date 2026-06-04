"""
TypeForge AI — Adaptive Learning Service
Analyzes user behavior and generates personalized training
"""
import logging
import random
from typing import List, Dict, Optional, Tuple
from datetime import datetime, timedelta
from collections import defaultdict

logger = logging.getLogger("typeforge.adaptive")


def normalize_key_stats(key_stats: Dict[str, Dict]) -> Dict[str, Dict]:
    """Normalize client key_stats (totalDelay) for server-side analysis."""
    normalized: Dict[str, Dict] = {}
    for key, stats in (key_stats or {}).items():
        hits = int(stats.get("hits", 0) or 0)
        misses = int(stats.get("misses", 0) or 0)
        total_delay = float(stats.get("totalDelay") or stats.get("total_delay") or 0)
        avg_delay = float(stats.get("avg_delay", 0) or 0)
        if avg_delay <= 0 and hits > 0:
            avg_delay = total_delay / hits
        normalized[key] = {
            "hits": hits,
            "misses": misses,
            "totalDelay": total_delay,
            "avg_delay": avg_delay,
        }
    return normalized


# ── Weak Key Analyzer ─────────────────────────────────────────────
class WeakKeyAnalyzer:
    """Identifies weak keys and patterns from keystroke data."""

    def __init__(self, key_stats: Dict[str, Dict]):
        self.key_stats = normalize_key_stats(key_stats)

    def get_weak_keys(self, threshold: float = 0.15) -> List[str]:
        """Keys with error rate above threshold."""
        weak = []
        for key, stats in self.key_stats.items():
            total = stats.get("hits", 0) + stats.get("misses", 0)
            if total < 3:
                continue
            error_rate = stats.get("misses", 0) / total
            if error_rate >= threshold:
                weak.append((key, error_rate, stats.get("avg_delay", 0)))
        return [k for k, _, _ in sorted(weak, key=lambda x: x[1], reverse=True)]

    def get_slow_keys(self, percentile: float = 0.75) -> List[str]:
        """Keys significantly slower than the user's average."""
        delays = {k: v.get("avg_delay", 0) for k, v in self.key_stats.items() if v.get("avg_delay", 0) > 0}
        if not delays:
            return []
        sorted_delays = sorted(delays.values())
        cutoff = sorted_delays[int(len(sorted_delays) * percentile)]
        return [k for k, d in delays.items() if d >= cutoff]

    def get_error_rate(self, key: str) -> float:
        stats = self.key_stats.get(key, {})
        total = stats.get("hits", 0) + stats.get("misses", 0)
        return stats.get("misses", 0) / total if total > 0 else 0

    def get_bigram_stats(self, keystroke_log: List[Dict]) -> Dict[str, Dict]:
        """Analyze 2-character sequences for weak bigrams."""
        bigrams = defaultdict(lambda: {"hits": 0, "misses": 0, "delays": []})
        for i in range(len(keystroke_log) - 1):
            a = keystroke_log[i]
            b = keystroke_log[i + 1]
            bigram = (a.get("char","") + b.get("char","")).lower()
            if len(bigram) == 2 and bigram.isalpha():
                if b.get("correct", True):
                    bigrams[bigram]["hits"] += 1
                else:
                    bigrams[bigram]["misses"] += 1
                delay = b.get("delay_ms", 0)
                if delay > 0:
                    bigrams[bigram]["delays"].append(delay)
        return dict(bigrams)


# ── Text Generator ────────────────────────────────────────────────
class AdaptiveTextGenerator:
    """Generates training text weighted toward weak keys and patterns."""

    WORD_BANKS = {
        "general": [
            "the", "and", "for", "are", "but", "not", "you", "all", "can", "had",
            "her", "was", "one", "our", "out", "day", "get", "has", "him", "his",
            "how", "man", "new", "now", "old", "see", "two", "way", "who", "boy",
            "did", "its", "let", "put", "say", "she", "too", "use",
        ],
        "code": [
            "return", "function", "const", "let", "var", "class", "import",
            "export", "default", "async", "await", "if", "else", "for", "while",
            "true", "false", "null", "undefined", "this", "new", "typeof",
        ],
        "punctuation": [
            "it's", "don't", "can't", "won't", "isn't", "didn't", "couldn't",
            "that's", "here's", "there's", "we're", "they're",
        ],
    }

    def __init__(self, weak_keys: List[str], mode: str = "classic"):
        self.weak_keys = weak_keys
        self.mode = mode

    def generate(self, target_chars: int = 200) -> str:
        """Generate adaptive training text."""
        if not self.weak_keys:
            return self._random_text(target_chars)

        # Build weighted word list with weak keys appearing more
        words = []
        bank = self.WORD_BANKS.get("code" if self.mode == "dev" else "general", self.WORD_BANKS["general"])

        # Words containing weak keys get higher weight
        weighted = []
        for word in bank:
            weight = 1
            for key in self.weak_keys[:5]:
                if key in word.lower():
                    weight += 3
            weighted.extend([word] * weight)

        # Also add nonsense words built from weak keys
        for _ in range(10):
            syllable = self._build_syllable()
            if syllable:
                weighted.append(syllable)

        random.shuffle(weighted)
        text = " ".join(weighted)
        return text[:target_chars].strip()

    def _build_syllable(self) -> str:
        """Create a short word containing weak keys."""
        vowels = "aeiou"
        consonants = "bcdfghjklmnpqrstvwxyz"
        if not self.weak_keys:
            return ""
        key = random.choice(self.weak_keys[:3])
        if len(key) != 1:
            return ""
        if key in vowels:
            return random.choice(consonants) + key + random.choice(consonants)
        return key + random.choice(vowels) + random.choice(consonants)

    def _random_text(self, chars: int) -> str:
        bank = self.WORD_BANKS["general"]
        words = []
        total = 0
        while total < chars:
            word = random.choice(bank)
            words.append(word)
            total += len(word) + 1
        return " ".join(words)[:chars]


# ── Performance Analyzer ──────────────────────────────────────────
class PerformanceAnalyzer:
    """Analyzes session history for trends and insights."""

    def __init__(self, sessions: List[Dict]):
        self.sessions = sorted(sessions, key=lambda s: str(s.get("created_at") or ""))

    def wpm_trend(self) -> str:
        """Determine if user is improving, stable, or declining."""
        if len(self.sessions) < 5:
            return "insufficient_data"
        recent_wpm   = [s.get("wpm", 0) for s in self.sessions[-5:]]
        previous_wpm = [s.get("wpm", 0) for s in self.sessions[-10:-5]] if len(self.sessions) >= 10 else recent_wpm
        recent_avg   = sum(recent_wpm) / len(recent_wpm)
        previous_avg = sum(previous_wpm) / len(previous_wpm)
        if previous_avg == 0:
            return "stable"
        pct_change = (recent_avg - previous_avg) / previous_avg * 100
        if pct_change > 3:
            return "improving"
        if pct_change < -3:
            return "declining"
        return "stable"

    def best_session_time(self) -> Optional[int]:
        """Hour of day with best performance."""
        if not self.sessions:
            return None
        hourly = defaultdict(list)
        for s in self.sessions:
            ts = s.get("created_at")
            if ts:
                try:
                    if isinstance(ts, datetime):
                        hour = ts.hour
                    else:
                        hour = datetime.fromisoformat(str(ts).replace('Z', '+00:00')).hour
                    hourly[hour].append(s.get("wpm", 0))
                except Exception as e:
                    logger.warning(f"Could not parse created_at timestamp '{ts}': {e}")
        if not hourly:
            return None
        return max(hourly, key=lambda h: sum(hourly[h]) / len(hourly[h]))

    def average_wpm(self, n: int = 10) -> float:
        recent = self.sessions[-n:]
        if not recent:
            return 0.0
        return sum(s.get("wpm", 0) for s in recent) / len(recent)

    def average_accuracy(self, n: int = 10) -> float:
        recent = self.sessions[-n:]
        if not recent:
            return 0.0
        return sum(s.get("accuracy", 0) for s in recent) / len(recent)

    def consistency_score(self) -> int:
        if len(self.sessions) < 3:
            return 0
        wpms = [s.get("wpm", 0) for s in self.sessions[-10:]]
        avg  = sum(wpms) / len(wpms)
        variance = sum((w - avg)**2 for w in wpms) / len(wpms)
        std_dev = variance ** 0.5
        cv = (std_dev / avg * 100) if avg > 0 else 100
        return max(0, min(100, int(100 - cv)))

    def generate_insight(self) -> str:
        """Generate a natural language insight about performance."""
        if not self.sessions:
            return "Complete your first session to get AI insights!"
        trend = self.wpm_trend()
        avg_wpm = self.average_wpm()
        avg_acc = self.average_accuracy()
        if trend == "improving":
            return f"You're on a roll! Your WPM has been climbing steadily. Keep this pace and you'll hit {int(avg_wpm * 1.15)} WPM within a week."
        if trend == "declining":
            return f"Your WPM has dipped slightly recently. Try shorter 30s sessions to rebuild your rhythm before pushing for speed."
        if avg_acc < 93:
            return f"Accuracy at {avg_acc:.0f}% is below target. Slow down by 10-15% and focus on hitting the right key first."
        return f"Solid and consistent at {avg_wpm:.0f} WPM / {avg_acc:.0f}% accuracy. Focus on your weakest key pairs to break your plateau."


# ── Adaptive Session Planner ──────────────────────────────────────
class AdaptiveSessionPlanner:
    """Plans the next optimal training session for a user."""

    def __init__(self, user_profile: Dict, sessions: List[Dict], key_stats: Dict):
        self.profile   = user_profile
        self.analyzer  = PerformanceAnalyzer(sessions)
        self.key_analyzer = WeakKeyAnalyzer(key_stats)

    def recommended_duration(self) -> int:
        """Recommend optimal session duration in seconds."""
        avg_wpm = self.analyzer.average_wpm()
        sessions = len(self.analyzer.sessions)
        if sessions < 5:
            return 60
        if avg_wpm < 40:
            return 30
        if avg_wpm > 100:
            return 120
        return 60

    def recommended_mode(self) -> str:
        """Recommend optimal mode for next session."""
        goal = self.profile.get("goal", "speed")
        if goal == "coding":
            return "dev"
        if goal == "consistency":
            return "classic"
        return "classic"

    def plan_exercises(self, n: int = 5) -> List[Dict]:
        """Generate N recommended exercises."""
        weak_keys = self.key_analyzer.get_weak_keys()
        generator = AdaptiveTextGenerator(weak_keys, self.recommended_mode())
        exercises = []

        if weak_keys:
            exercises.append({
                "title": f"Weak Key Focus: {', '.join(weak_keys[:3])}",
                "description": f"Targeted training on your slowest keys",
                "difficulty": "medium",
                "duration_secs": 30,
                "text": generator.generate(150),
                "target_keys": weak_keys[:5],
            })

        exercises.append({
            "title": "Speed Burst",
            "description": "30-second maximum speed attempt",
            "difficulty": "hard",
            "duration_secs": 30,
            "text": generator._random_text(100),
            "target_keys": [],
        })

        exercises.append({
            "title": "Accuracy Builder",
            "description": "Slow down and nail every character",
            "difficulty": "easy",
            "duration_secs": 60,
            "text": generator._random_text(200),
            "target_keys": [],
        })

        return exercises[:n]

    def daily_xp_target(self) -> int:
        sessions = len(self.analyzer.sessions)
        base = 200
        if sessions > 50: base = 500
        elif sessions > 20: base = 350
        return base
