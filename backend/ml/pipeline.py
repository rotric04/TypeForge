"""
TypeForge AI — ML Pipeline
Clustering, prediction, and recommendation models
"""
import logging
import numpy as np
from typing import Dict, List, Optional, Tuple
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier, IsolationForest
import joblib
import os

logger = logging.getLogger("typeforge.ml")


# ── Feature Engineering ───────────────────────────────────────────
def extract_features(sessions: List[Dict]) -> np.ndarray:
    """Convert raw session data to ML feature vector."""
    if not sessions:
        return np.zeros((1, 10))

    recent = sessions[-20:]
    wpms   = [s.get("wpm", 0) for s in recent]
    accs   = [s.get("accuracy", 0) for s in recent]
    errs   = [s.get("errors", 0) for s in recent]
    consis = [s.get("consistency", 0) for s in recent]

    def safe_stats(vals):
        if not vals: return 0, 0, 0
        return np.mean(vals), np.std(vals), max(vals)

    wpm_mean, wpm_std, wpm_max  = safe_stats(wpms)
    acc_mean, acc_std, acc_max  = safe_stats(accs)
    err_mean, _, _              = safe_stats(errs)
    con_mean, _, _              = safe_stats(consis)

    return np.array([[
        wpm_mean, wpm_std, wpm_max,
        acc_mean, acc_std, acc_max,
        err_mean, con_mean,
        len(sessions),  # total sessions
        wpm_mean / acc_mean if acc_mean > 0 else 0,  # speed-accuracy ratio
    ]])


# ── Archetype Clustering (K-Means) ───────────────────────────────
ARCHETYPE_PROFILES = {
    0: {"name": "Ghost Fingers",    "icon": "👻", "desc": "Speed and precision incarnate"},
    1: {"name": "Precision Builder", "icon": "🎯", "desc": "Every keystroke is intentional"},
    2: {"name": "Velocity Crafter", "icon": "⚡", "desc": "Built for raw speed"},
    3: {"name": "Rhythm Seeker",    "icon": "🎵", "desc": "Steady, flowing cadence"},
    4: {"name": "Code Monk",        "icon": "🧘", "desc": "Deep focus, zero distraction"},
    5: {"name": "Syntax Hunter",    "icon": "🦅", "desc": "Hunting errors before they land"},
    6: {"name": "Typing Architect", "icon": "🏗️", "desc": "Building speed brick by brick"},
    7: {"name": "Keyboard Wanderer","icon": "🗺️", "desc": "Exploring the keyboard"},
}


class TypingClusterer:
    """K-Means clustering to assign user archetypes."""

    def __init__(self, n_clusters: int = 8, model_path: str = "ml/models/clusterer.pkl"):
        self.n_clusters  = n_clusters
        self.model_path  = model_path
        self.model:       Optional[KMeans] = None
        self.scaler:      Optional[StandardScaler] = None

    def train(self, feature_matrix: np.ndarray) -> None:
        """Train the clustering model."""
        self.scaler = StandardScaler()
        X_scaled = self.scaler.fit_transform(feature_matrix)
        self.model = KMeans(
            n_clusters=self.n_clusters,
            random_state=42,
            n_init=20,
            max_iter=500,
        )
        self.model.fit(X_scaled)
        os.makedirs(os.path.dirname(self.model_path), exist_ok=True)
        joblib.dump({"model": self.model, "scaler": self.scaler}, self.model_path)
        logger.info(f"✅ Clusterer trained and saved to {self.model_path}")

    def load(self) -> bool:
        """Load pre-trained model."""
        try:
            if os.path.exists(self.model_path):
                data = joblib.load(self.model_path)
                self.model  = data["model"]
                self.scaler = data["scaler"]
                return True
        except Exception as e:
            logger.warning(f"Could not load clusterer: {e}")
        return False

    def predict_archetype(self, features: np.ndarray) -> Dict:
        """Predict user archetype from feature vector."""
        if self.model is None:
            # Fallback: rule-based assignment
            return self._rule_based(features)
        try:
            X_scaled = self.scaler.transform(features)
            cluster  = int(self.model.predict(X_scaled)[0])
            return ARCHETYPE_PROFILES.get(cluster, ARCHETYPE_PROFILES[7])
        except Exception as e:
            logger.error(f"Archetype prediction failed: {e}")
            return self._rule_based(features)

    def _rule_based(self, features: np.ndarray) -> Dict:
        """Fallback rule-based archetype assignment."""
        f = features[0]
        wpm_mean, _, wpm_max, acc_mean, _, _, err_mean, con_mean, sessions, _ = f
        if wpm_mean >= 120 and acc_mean >= 98: return ARCHETYPE_PROFILES[0]
        if acc_mean >= 97:                     return ARCHETYPE_PROFILES[1]
        if wpm_mean >= 100:                    return ARCHETYPE_PROFILES[2]
        if con_mean >= 85:                     return ARCHETYPE_PROFILES[3]
        if wpm_mean >= 70:                     return ARCHETYPE_PROFILES[6]
        return ARCHETYPE_PROFILES[7]


# ── Performance Predictor (XGBoost-style logic) ───────────────────
class PerformancePredictor:
    """Predicts future WPM based on session history."""

    def predict_wpm(self, sessions: List[Dict], days_ahead: int = 7) -> Tuple[int, float]:
        """
        Predict WPM n days in the future.
        Returns (predicted_wpm, confidence 0-1)
        """
        if len(sessions) < 5:
            return (0, 0.0)

        wpms = [s.get("wpm", 0) for s in sorted(sessions, key=lambda x: str(x.get("created_at") or ""))]
        if not wpms:
            return (0, 0.0)

        # Simple linear regression for trend
        n = len(wpms)
        x = np.arange(n)
        slope, intercept = np.polyfit(x, wpms, 1)

        sessions_per_day = max(1, n / max(1, 30))  # estimate
        future_sessions  = days_ahead * sessions_per_day
        predicted = intercept + slope * (n + future_sessions)
        predicted = max(0, int(predicted))

        # Confidence based on data points and variance
        variance = np.var(wpms)
        confidence = min(0.95, max(0.1, 1.0 - (variance / (np.mean(wpms)**2 + 1)) * 0.5))

        return (predicted, round(confidence, 2))


# ── Anomaly Detector (Isolation Forest) ──────────────────────────
class SessionAnomalyDetector:
    """Detects unusual sessions (fatigue, distraction, cheating)."""

    def is_anomalous(self, session: Dict, user_history: List[Dict]) -> bool:
        """Return True if session looks anomalous."""
        if len(user_history) < 10:
            return False
        avg_wpm = np.mean([s.get("wpm", 0) for s in user_history[-10:]])
        session_wpm = session.get("wpm", 0)
        # Flag if wpm is 3x average (possible cheat) or 30% below (fatigue)
        if avg_wpm > 0:
            ratio = session_wpm / avg_wpm
            if ratio > 3.0 or ratio < 0.3:
                return True
        return False


# ── Recommendation Ranker (LightGBM-style) ────────────────────────
class ExerciseRanker:
    """Ranks training exercises by expected improvement."""

    def rank_exercises(self, exercises: List[Dict], user_profile: Dict, history: List[Dict]) -> List[Dict]:
        """Return exercises sorted by priority score."""
        if not exercises:
            return []

        scored = []
        for ex in exercises:
            score = self._score_exercise(ex, user_profile, history)
            scored.append({**ex, "_priority_score": score})

        return sorted(scored, key=lambda x: x["_priority_score"], reverse=True)

    def _score_exercise(self, exercise: Dict, profile: Dict, history: List[Dict]) -> float:
        """Score a single exercise for relevance."""
        score = 50.0  # base
        goal  = profile.get("goal", "speed")

        # Align with user goal
        ex_type = exercise.get("type", "")
        if goal == "speed"    and ex_type == "speed_burst":   score += 30
        if goal == "accuracy" and ex_type == "accuracy":      score += 30
        if goal == "coding"   and ex_type == "code":          score += 30

        # Freshness penalty (don't repeat recently done exercises)
        recent_ids = [s.get("exercise_id") for s in history[-5:] if s.get("exercise_id")]
        if exercise.get("id") in recent_ids:
            score -= 40

        # Weak key bonus
        weak_keys  = profile.get("weak_keys", [])
        target_keys = exercise.get("target_keys", [])
        overlap = len(set(weak_keys) & set(target_keys))
        score += overlap * 10

        return score
