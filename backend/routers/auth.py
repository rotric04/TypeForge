from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import httpx
from config import settings

router = APIRouter()

class MagicLinkRequest(BaseModel):
    email: str
    redirect_url: str = "https://typeforge.fun/app/dashboard"

class TurnstileRequest(BaseModel):
    token: str

@router.post("/verify-turnstile")
async def verify_turnstile(req: TurnstileRequest):
    """Verify Cloudflare Turnstile token."""
    async with httpx.AsyncClient() as client:
        resp = await client.post("https://challenges.cloudflare.com/turnstile/v0/siteverify", data={
            "secret": settings.TURNSTILE_SECRET_KEY,
            "response": req.token,
        })
        data = resp.json()
    if not data.get("success"):
        raise HTTPException(status_code=400, detail="Turnstile verification failed")
    return {"success": True}

@router.post("/webhook/clerk")
async def clerk_webhook(request: dict):
    """Handle Clerk webhook events (user.created, user.updated, etc.)."""
    event_type = request.get("type")
    if event_type == "user.created":
        # Create user profile in our DB
        pass
    elif event_type == "user.deleted":
        # Delete user data (GDPR)
        pass
    return {"received": True}
