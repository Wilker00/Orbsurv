from __future__ import annotations

import logging
from typing import Any

import httpx
from fastapi import HTTPException, Request, status

from ..settings import settings

logger = logging.getLogger(__name__)

DEFAULT_VERIFY_URL = "https://hcaptcha.com/siteverify"


async def verify_captcha_token(
    token: str | None,
    request: Request,
    *,
    require: bool,
) -> None:
    """
    Verify a captcha token when enforcement is enabled.

    Args:
        token: Captcha token from the client.
        request: Current request (used for remote IP logging).
        require: Whether to enforce captcha completion.
    """
    if not settings.captcha_secret_key:
        if require:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Captcha service is not configured.",
            )
        return

    if not token:
        if require:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Captcha token is required.",
            )
        return

    payload: dict[str, Any] = {
        "secret": settings.captcha_secret_key,
        "response": token,
    }

    # Provide remote IP when available to improve challenge scoring.
    if request.client and request.client.host:
        payload["remoteip"] = request.client.host

    verify_url = settings.captcha_verify_url or DEFAULT_VERIFY_URL

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.post(verify_url, data=payload)
            response.raise_for_status()
            result = response.json()
    except httpx.HTTPError as exc:
        logger.warning("Captcha verification request failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Captcha verification failed. Please try again later.",
        ) from exc

    if not bool(result.get("success")):
        logger.info(
            "Captcha verification denied",
            extra={
                "host": request.client.host if request.client else None,
                "error_codes": result.get("error-codes"),
            },
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Captcha verification failed. Please refresh and try again.",
        )

