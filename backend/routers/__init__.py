from .sessions import router as sessions_router
from .users import router as users_router
from .analytics import router as analytics_router
from .training import router as training_router
from .auth import router as auth_router

__all__ = ["sessions_router","users_router","analytics_router","training_router","auth_router"]
