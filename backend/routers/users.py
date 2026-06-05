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
    record = await DB.fetchone("SELECT * FROM users WHERE id = $1::uuid", user.id)
    if not record:
        raise HTTPException(status_code=404, detail="User profile not found")
    
    u_dict = dict(record)
    
    # Fetch weak keys from typing_dna table
    weak_keys = []
    try:
        dna_record = await DB.fetchone(
            "SELECT weak_keys FROM typing_dna WHERE user_id = $1::uuid ORDER BY generated_at DESC LIMIT 1",
            user.id
        )
        if dna_record and dna_record["weak_keys"]:
            weak_keys = dna_record["weak_keys"]
    except Exception:
        pass

    return {
        "id": str(u_dict["id"]),
        "clerk_id": u_dict["clerk_id"],
        "email": u_dict["email"],
        "username": u_dict["username"],
        "xp": u_dict["xp"],
        "level": u_dict["level"],
        "total_sessions": u_dict["total_sessions"],
        "best_wpm": u_dict["best_wpm"],
        "weak_keys": weak_keys,
        "created_at": u_dict["created_at"],
    }

@router.get("/me/achievements")
async def get_user_achievements(user: UserProfile = Depends(get_current_user)):
    """Get all achievements for the user annotated with unlocked status."""
    user_id = str(user.id)
    records = await DB.fetchall("SELECT badge_id FROM achievements WHERE user_id = $1::uuid", user.id)
    unlocked_ids = [r["badge_id"] for r in records]
    
    engine = AchievementEngine(user_id)
    return engine.get_all_achievements(unlocked_ids)

@router.patch("/me")
async def update_user_profile(
    body: dict,
    user: UserProfile = Depends(get_current_user)
):
    """Update display name / username for the current user."""
    username = (body.get("username") or "").strip()
    if not username:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Username cannot be empty")
    if len(username) > 50:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Username too long (max 50 chars)")
    
    await DB.execute(
        "UPDATE users SET username = $1, updated_at = NOW() WHERE id = $2::uuid",
        username, user.id
    )
    return {"username": username, "message": "Profile updated successfully"}


@router.post("/me/sync-profile")
async def sync_clerk_profile(
    body: dict,
    user: UserProfile = Depends(get_current_user)
):
    """Sync Clerk profile data (name, email) into Supabase users table.
    Called by frontend after user updates their profile in the Clerk widget."""
    first_name = (body.get("firstName") or "").strip()
    last_name  = (body.get("lastName") or "").strip()
    email      = (body.get("email") or "").strip()
    username   = (body.get("username") or "").strip()
    
    # Fetch current username to check if it's currently a Clerk ID placeholder
    record = await DB.fetchone("SELECT username FROM users WHERE id = $1::uuid", user.id)
    current_username = record["username"] if record else ""
    
    # Build display name: full name > username > keep existing
    full_name = f"{first_name} {last_name}".strip()
    new_username = username or full_name or None
    
    # Fallback to email prefix if current DB username is a Clerk ID or empty, and no names are set
    if not new_username and (not current_username or current_username.startswith("user_")):
        if email and not email.startswith("user_"):
            new_username = email.split("@")[0]
            
    if new_username:
        await DB.execute(
            "UPDATE users SET username = $1, updated_at = NOW() WHERE id = $2::uuid",
            new_username, user.id
        )
    if email:
        await DB.execute(
            "UPDATE users SET email = $1, updated_at = NOW() WHERE id = $2::uuid",
            email, user.id
        )
    
    return {"message": "Profile synced", "username": new_username or current_username}

@router.delete("/me")
async def delete_account(user: UserProfile = Depends(get_current_user)):
    return {"message": "Delete account — requires Clerk auth"}

@router.get("/me/export")
async def export_user_data(user: UserProfile = Depends(get_current_user)):
    return {"message": "Export GDPR data — requires Clerk auth"}


@router.get("/db-test")
async def db_test():
    from database import _pool

    return {
        "db_connected": _pool is not None
    }