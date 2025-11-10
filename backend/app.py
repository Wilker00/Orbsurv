from __future__ import annotations

import logging
import uuid
from typing import Awaitable, Callable

from fastapi import FastAPI, Request, Response, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import ValidationError

from .api import admin_router, app_router, auth_router, health_router, public_router
from .settings import settings

logger = logging.getLogger("orbsurv.api")


def create_application() -> FastAPI:
    app = FastAPI(
        title=settings.project_name,
        version="1.0.0",
        docs_url=settings.docs_url,
        redoc_url=settings.redoc_url,
        openapi_url=f"{settings.api_prefix}/openapi.json",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_allow_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.middleware("http")
    async def add_request_context(
        request: Request,
        call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:  # type: ignore[override]
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response

    @app.middleware("http")
    async def log_requests(
        request: Request,
        call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:  # type: ignore[override]
        logger.info(
            "request.start",
            extra={
                "path": request.url.path,
                "method": request.method,
                "request_id": getattr(request.state, "request_id", "n/a"),
            },
        )
        response = await call_next(request)
        logger.info(
            "request.end",
            extra={
                "status_code": response.status_code,
                "path": request.url.path,
                "request_id": getattr(request.state, "request_id", "n/a"),
            },
        )
        return response

    # Global exception handlers
    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        """Handle request validation errors."""
        request_id = getattr(request.state, "request_id", "n/a")
        logger.warning(
            "validation.error",
            extra={
                "request_id": request_id,
                "path": request.url.path,
                "errors": exc.errors(),
            },
        )
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": "Request validation failed",
                    "details": exc.errors(),
                    "request_id": request_id,
                }
            },
        )

    @app.exception_handler(ValidationError)
    async def pydantic_validation_exception_handler(
        request: Request, exc: ValidationError
    ) -> JSONResponse:
        """Handle Pydantic validation errors."""
        request_id = getattr(request.state, "request_id", "n/a")
        logger.warning(
            "pydantic.validation.error",
            extra={
                "request_id": request_id,
                "path": request.url.path,
                "errors": exc.errors(),
            },
        )
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": "Data validation failed",
                    "details": exc.errors(),
                    "request_id": request_id,
                }
            },
        )

    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        """Handle all unhandled exceptions."""
        request_id = getattr(request.state, "request_id", "n/a")
        logger.error(
            "unhandled.exception",
            extra={
                "request_id": request_id,
                "path": request.url.path,
                "method": request.method,
                "exception_type": type(exc).__name__,
            },
            exc_info=True,
        )
        
        # In production, don't expose internal error details
        if settings.env == "production":
            message = "An internal error occurred"
            details = None
        else:
            message = str(exc) or "An internal error occurred"
            details = {
                "type": type(exc).__name__,
                "message": str(exc),
            }
        
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "error": {
                    "code": "INTERNAL_ERROR",
                    "message": message,
                    "details": details,
                    "request_id": request_id,
                }
            },
        )

    prefix = settings.api_prefix
    app.include_router(health_router, prefix=prefix)
    app.include_router(public_router, prefix=prefix)
    app.include_router(auth_router, prefix=prefix)
    app.include_router(app_router, prefix=prefix)
    app.include_router(admin_router, prefix=prefix)

    return app


app = create_application()
