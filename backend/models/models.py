"""
TypeForge AI — Pydantic Models
"""
from pydantic import BaseModel, UUID4, Field, EmailStr, validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


# ── Enums ─────────────────────────────────────────────────────────
class TypingMode(str, Enum):
    CLASSIC    = "classic"
    DEV        = "dev"
    STUDENT    = "student"
    CUSTOM     = "custom"
    ZEN        = "zen"
    CHALLENGE  = "challenge"
    INTERVIEW  = "interview"
    FOCUS      = "focus"

class ProgrammingLanguage(str, Enum):
    PYTHON     = "python"
    JAVASCRIPT = "javascript"
    TYPESCRIPT = "typescript"
    SQL        = "sql"
    BASH       = "bash"
    JSON       = "json"
    HTML       = "html"
    CSS        = "css"
    MARKDOWN   = "markdown"
    YAML       = "yaml"
    GIT        = "git"

class TypingGoal(str, Enum):
    SPEED       = "speed"
    ACCURACY    = "accuracy"
    CODING      = "coding"
    COMPETITIVE = "competitive"
    PRODUCTIVITY = "productivity"
    CONSISTENCY = "consistency"

class ExperienceLevel(str, Enum):
    BEGINNER     = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED     = "advanced"
    EXPERT       = "expert"


# ── User Profile Models ───────────────────────────────────────────
class UserProfile(BaseModel):
    id:              UUID4
    clerk_id:        str
    username:        Optional[str]     = None
    email:           EmailStr
    avatar_url:      Optional[str]     = None
    typing_type:     Optional[str]     = "mixed"
    goal:            Optional[TypingGoal] = TypingGoal.SPEED
    experience:      Optional[ExperienceLevel] = ExperienceLevel.INTERMEDIATE
    baseline_wpm:    Optional[int]     = 60
    archetype:       Optional[str]     = None
    archetype_icon:  Optional[str]     = None
    focus_score:     int               = 0
    consistency_score: int             = 0
    confidence_score:  int             = 0
    improvement_score: int             = 0
    xp:              int               = 0
    level:           int               = 1
    total_sessions:  int               = 0
    best_wpm:        int               = 0
    is_pro:          bool              = False
    anonymous_mode:  bool              = False
    created_at:      datetime          = Field(default_factory=datetime.utcnow)
    updated_at:      datetime          = Field(default_factory=datetime.utcnow)

class UserCreate(BaseModel):
    clerk_id:    str
    email:       EmailStr
    username:    Optional[str] = None
    avatar_url:  Optional[str] = None

class UserUpdate(BaseModel):
    username:    Optional[str]         = None
    typing_type: Optional[str]         = None
    goal:        Optional[TypingGoal]  = None
    experience:  Optional[ExperienceLevel] = None
    anonymous_mode: Optional[bool]     = None


# ── Keystroke Log ─────────────────────────────────────────────────
class KeystrokeEntry(BaseModel):
    char:      str
    typed:     str
    correct:   bool
    delay_ms:  float       # milliseconds since previous key
    timestamp: float       # performance.now() relative
    index:     int


# ── Session Models ────────────────────────────────────────────────
class SessionCreate(BaseModel):
    mode:            TypingMode                    = TypingMode.CLASSIC
    language:        Optional[ProgrammingLanguage] = None
    duration_secs:   int                           = Field(60, ge=1, le=1800)
    text_used:       str                           = ""
    wpm:             int                           = Field(0, ge=0, le=1000)
    raw_wpm:         int                           = Field(0, ge=0, le=1000)
    accuracy:        float                         = Field(0.0, ge=0, le=100)
    correct_chars:   int                           = Field(0, ge=0)
    error_chars:     int                           = Field(0, ge=0)
    total_chars:     int                           = Field(0, ge=0)
    errors:          int                           = Field(0, ge=0)
    consistency:     float                         = Field(0.0, ge=0, le=100)
    max_streak:      int                           = Field(0, ge=0)
    keystroke_log:   List[KeystrokeEntry]          = []
    key_stats:       Dict[str, Any]                = {}
    wpm_history:     List[float]                   = []
    time_to_first_key_ms: float                    = 0

class SessionResponse(BaseModel):
    id:             UUID4
    user_id:        UUID4
    mode:           TypingMode
    language:       Optional[ProgrammingLanguage]
    duration_secs:  int
    wpm:            int
    raw_wpm:        int
    accuracy:       float
    errors:         int
    consistency:    float
    xp_earned:      int
    badges_earned:  List[str]         = []
    ai_insight:     Optional[str]     = None
    weak_keys:      List[str]         = []
    created_at:     datetime


# ── Analytics Models ──────────────────────────────────────────────
class WPMTrendPoint(BaseModel):
    date:     datetime
    wpm:      float
    accuracy: float
    sessions: int

class ErrorHeatmapEntry(BaseModel):
    key:        str
    hits:       int
    misses:     int
    error_rate: float
    avg_delay:  float

class FingerStats(BaseModel):
    finger:     str
    side:       str
    keys:       List[str]
    total_hits: int
    error_rate: float
    avg_delay:  float

class WeakPattern(BaseModel):
    pattern:    str
    pattern_type: str  # "key", "bigram", "trigram", "word"
    error_rate: float
    avg_delay:  float
    occurrences: int
    priority:   int

class TypingDNA(BaseModel):
    user_id:          UUID4
    archetype:        str
    archetype_icon:   str
    archetype_desc:   str
    focus_score:      int
    consistency_score: int
    confidence_score: int
    improvement_score: int
    coding_confidence: int
    punctuation_confidence: int
    capitalization_confidence: int
    weak_keys:        List[str]
    weak_bigrams:     List[str]
    best_fingers:     List[str]
    worst_fingers:    List[str]
    wpm_trend:        str   # "improving", "stable", "declining"
    sessions_analyzed: int
    dna_id:           str   # TF-DNA-XXXXXXXX
    generated_at:     datetime

class PerformancePrediction(BaseModel):
    predicted_wpm_7d:  int
    predicted_wpm_30d: int
    confidence:        float
    factors:           List[str]


# ── Training Models ───────────────────────────────────────────────
class TrainingExercise(BaseModel):
    id:          UUID4
    title:       str
    description: str
    text:        str
    mode:        TypingMode
    language:    Optional[ProgrammingLanguage]
    difficulty:  str   # easy, medium, hard
    target_keys: List[str]
    duration_secs: int
    estimated_improvement: str
    priority:    int

class TrainingPlan(BaseModel):
    user_id:      UUID4
    exercises:    List[TrainingExercise]
    daily_goal_secs: int
    weak_focus:   List[str]
    generated_at: datetime
    valid_until:  datetime


# ── Achievement Models ────────────────────────────────────────────
class Achievement(BaseModel):
    id:          str
    name:        str
    icon:        str
    description: str
    category:    str
    unlocked_at: Optional[datetime] = None
    is_unlocked: bool               = False
    progress:    float              = 0.0  # 0-100%

class Badge(BaseModel):
    id:         str
    name:       str
    icon:       str
    rarity:     str  # common, rare, epic, legendary
    earned_at:  Optional[datetime] = None


# ── Auth Models ───────────────────────────────────────────────────
class TurnstileVerify(BaseModel):
    token: str

class TokenResponse(BaseModel):
    access_token:  str
    refresh_token: str
    token_type:    str = "bearer"
    expires_in:    int
