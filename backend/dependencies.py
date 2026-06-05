"""
TypeForge AI — FastAPI Dependencies
Authentication and User Context
"""
import logging
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
import httpx
import json
import os

from config import settings
from database import DB
from models.models import UserProfile

logger = logging.getLogger("typeforge.dependencies")

security = HTTPBearer()

# Cache for Clerk JWKS
_jwks = None
last_auth_error = "No authentication error recorded yet."

async def get_clerk_jwks():
    global _jwks
    if _jwks:
        return _jwks
    
    # In a real app, you get this from your Clerk Frontend API URL
    # e.g., https://clerk.your-domain.com/.well-known/jwks.json
    # We will attempt to use the JWT Key if provided, else attempt JWKS fetch.
    jwks_url = f"https://api.clerk.com/v1/jwks"
    
    try:
        async with httpx.AsyncClient() as client:
            # We need the secret key to fetch from the backend API if we use api.clerk.com
            headers = {"Authorization": f"Bearer {settings.CLERK_SECRET_KEY}"}
            response = await client.get(jwks_url, headers=headers)
            if response.status_code == 200:
                _jwks = response.json()
                return _jwks
            else:
                logger.error(f"Failed to fetch JWKS: {response.text}")
    except Exception as e:
        logger.error(f"Error fetching JWKS: {e}")
    
    return None

async def verify_clerk_token(token: str) -> dict:
    """Verify the Clerk JWT."""
    global last_auth_error
    # If no Clerk config, bypass for local dev (simulated auth)
    if not settings.CLERK_SECRET_KEY or settings.CLERK_SECRET_KEY == "":
        logger.warning("CLERK_SECRET_KEY not set. Bypassing auth validation (local dev mode).")
        # In mock mode, we assume the token is just the clerk_id or a simulated JSON
        return {"sub": token if not token.startswith("{") else json.loads(token).get("sub", "local_user")}

    # Real verification
    try:
        # We can also use CLERK_JWT_KEY if provided (PEM public key)
        if settings.CLERK_JWT_KEY:
            payload = jwt.decode(
                token, 
                settings.CLERK_JWT_KEY, 
                algorithms=["RS256"],
                options={"verify_aud": False, "verify_exp": False, "verify_nbf": False}
            )
            return payload
            
        jwks = await get_clerk_jwks()
        if not jwks:
            logger.error("TF Auth: JWKS is empty or failed to load.")
            last_auth_error = "JWKS is empty or failed to load."
            raise HTTPException(status_code=500, detail="Could not retrieve JWKS")

        unverified_header = jwt.get_unverified_header(token)
        rsa_key = {}
        for key in jwks.get("keys", []):
            if key["kid"] == unverified_header.get("kid"):
                rsa_key = {
                    "kty": key["kty"],
                    "kid": key["kid"],
                    "use": key["use"],
                    "n": key["n"],
                    "e": key["e"]
                }
                break

        if rsa_key:
            payload = jwt.decode(
                token,
                rsa_key,
                algorithms=["RS256"],
                options={"verify_aud": False, "verify_exp": False, "verify_nbf": False},
                issuer=None # Typically clerk sets azp and iss, configure as needed
            )
            return payload
        else:
            logger.warning(f"TF Auth: No matching RSA key found in JWKS for kid: {unverified_header.get('kid')}")
            last_auth_error = f"No matching RSA key found in JWKS for kid: {unverified_header.get('kid')}. Token header: {unverified_header}. JWKS keys: {[k.get('kid') for k in jwks.get('keys', [])]}"
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token signature")
            
    except JWTError as e:
        logger.error(f"TF Auth: JWT verification failed: {e}")
        last_auth_error = f"JWTError: {str(e)}"
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Could not validate credentials: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> UserProfile:
    global last_auth_error
    token = credentials.credentials
    try:
        payload = await verify_clerk_token(token)
        
        clerk_id = payload.get("sub")
        if not clerk_id:
            last_auth_error = "Invalid token payload: no sub claim"
            raise HTTPException(status_code=401, detail="Invalid token payload: no sub")
            
        # Check if user exists in our Supabase DB
        record = await DB.fetchone("SELECT * FROM users WHERE clerk_id = $1", clerk_id)
        
        if not record:
            # If user does not exist, auto-create them (Just-in-Time provisioning).
            email = payload.get("email", f"{clerk_id}@placeholder.com")
            first_name = payload.get("first_name") or payload.get("given_name") or ""
            last_name  = payload.get("last_name")  or payload.get("family_name") or ""
            full_name  = f"{first_name} {last_name}".strip()
            clerk_username = payload.get("username") or ""
            email_prefix = email.split("@")[0] if "@" in email else ""
            username = clerk_username or full_name or email_prefix or f"Typist_{clerk_id[5:11]}"
            
            if username.startswith("user_"):
                username = f"Typist_{clerk_id[5:11]}"
            
            insert_query = """
                INSERT INTO users (clerk_id, email, username)
                VALUES ($1, $2, $3)
                RETURNING *
            """
            record = await DB.fetchone(insert_query, clerk_id, email, username)
            
            if not record:
                last_auth_error = "Failed to create user record in DB: INSERT returned None"
                raise HTTPException(status_code=500, detail="Failed to create user record")

        # Map the asyncpg record to Pydantic model
        user_dict = dict(record)
        return UserProfile(**user_dict)
    except HTTPException as he:
        raise he
    except Exception as ex:
        last_auth_error = f"Unexpected Exception in get_current_user: {str(ex)}"
        logger.error(f"TF Auth: Unexpected exception in get_current_user: {ex}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal Server Error during authentication: {str(ex)}")
