"""
TypeForge AI — Users Router
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import List

from database import DB
from dependencies import get_current_user
from models.models import UserProfile
from services.achievements import AchievementEngine

router = APIRouter()

@router.get("/me")
async def get_current_user_profile(user: UserProfile = Depends(get_current_user)):
    """Get profile info of the currently logged-in user."""
    # Retrieve fresh details from the DB to reflect live XP/Level/sessions/best_wpm
    record = await DB.fetchone("SELECT * FROM users WHERE id = $1", user.id)
    if not record:
        raise HTTPException(status_code=404, detail="User profile not found")
    
    u_dict = dict(record)
    return {
        "id": str(u_dict["id"]),
        "clerk_id": u_dict["clerk_id"],
        "email": u_dict["email"],
        "username": u_dict["username"],
        "xp": u_dict["xp"],
        "level": u_dict["level"],
        "total_sessions": u_dict["total_sessions"],
        "best_wpm": u_dict["best_wpm"],
        "created_at": u_dict["created_at"],
    }

@router.get("/me/achievements")
async def get_user_achievements(user: UserProfile = Depends(get_current_user)):
    """Get all achievements for the user annotated with unlocked status."""
    user_id = str(user.id)
    records = await DB.fetchall("SELECT badge_id FROM achievements WHERE user_id = $1", user.id)
    unlocked_ids = [r["badge_id"] for r in records]
    
    engine = AchievementEngine(user_id)
    return engine.get_all_achievements(unlocked_ids)

@router.patch("/me")
async def update_user_profile(user: UserProfile = Depends(get_current_user)):
    return {"message": "Update user profile — requires Clerk auth"}

@router.delete("/me")
async def delete_account(user: UserProfile = Depends(get_current_user)):
    return {"message": "Delete account — requires Clerk auth"}

@router.get("/me/export")
async def export_user_data(user: UserProfile = Depends(get_current_user)):
    return {"message": "Export GDPR data — requires Clerk auth"}
