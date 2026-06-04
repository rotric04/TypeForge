from fastapi import APIRouter
router = APIRouter()

@router.get("/dashboard")
async def get_dashboard_analytics():
    return {"wpm_trend":[], "accuracy_trend":[], "error_heatmap":[], "finger_heatmap":[], "weak_patterns":[]}

@router.get("/dna")
async def get_typing_dna():
    return {"archetype": "Keyboard Wanderer", "focus_score": 0, "consistency_score": 0}

@router.get("/heatmap")
async def get_error_heatmap():
    return {"heatmap": {}}

@router.get("/prediction")
async def get_performance_prediction():
    return {"predicted_wpm_7d": 0, "predicted_wpm_30d": 0, "confidence": 0}
