from fastapi import APIRouter
router = APIRouter()

@router.get("/plan")
async def get_training_plan():
    return {"exercises": [], "daily_goal_secs": 600, "weak_focus": []}

@router.get("/text")
async def generate_text(mode: str = "classic", lang: str = "python", weak_keys: str = ""):
    return {"text": "The quick brown fox jumps over the lazy dog", "target_keys": weak_keys.split(",")}

@router.post("/complete/{exercise_id}")
async def complete_exercise(exercise_id: str):
    return {"xp_earned": 50, "next_exercise": None}
