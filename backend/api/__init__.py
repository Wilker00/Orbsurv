# ruff: noqa: F401

from .auth import router as auth_router
from .public import router as public_router
from .app import router as app_router
from .admin import router as admin_router
from .health import router as health_router

__all__ = [
    "auth_router",
    "public_router",
    "app_router",
    "admin_router",
    "health_router",
]
