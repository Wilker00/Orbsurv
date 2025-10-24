from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from typing import Any, Optional

import httpx

from ..settings import settings

logger = logging.getLogger(__name__)


@dataclass(slots=True)
class EmailMessage:
    to: str
    subject: str
    content: str
    html_content: Optional[str] = None


def _is_sendgrid() -> bool:
    return (settings.email_provider or "").lower() == "sendgrid"


async def send_password_reset_email(*, to: str, reset_url: str) -> None:
    """
    Send the password reset email, defaulting to SendGrid when configured. Gracefully
    exits if email credentials are not available so the API can respond without error.
    """
    if not to or not reset_url:
        logger.warning("Password reset email missing recipient or reset URL")
        return

    if not settings.email_api_key or not settings.email_from_email:
        logger.warning("Email credentials not configured; skipping password reset email send.")
        return

    subject = "Reset your Orbsurv password"
    plain = (
        "You recently requested to reset your Orbsurv password.\n\n"
        f"Reset link: {reset_url}\n\n"
        "If you did not request a reset you can ignore this email."
    )
    html = (
        "<p>You recently requested to reset your Orbsurv password.</p>"
        f'<p><a href="{reset_url}" style="font-weight:600;color:#0d6efd;">Reset your password</a></p>'
        "<p>If you did not request this reset you can ignore this message.</p>"
    )

    message = EmailMessage(
        to=to,
        subject=subject,
        content=plain,
        html_content=html,
    )

    try:
        if _is_sendgrid():
            await _send_via_sendgrid(message)
            return
    except httpx.HTTPError:
        logger.exception("Email delivery failed due to HTTP error.")
        return
    except Exception:  # pragma: no cover - defensive logging
        logger.exception("Unexpected failure delivering password reset email.")
        return

    logger.warning("Email provider %s is not supported; email not sent.", settings.email_provider)


async def send_email(to: str, subject: str, content: str) -> None:
    if not to or not subject or not content:
        logger.warning("Email missing recipient, subject, or content")
        return

    if not settings.email_api_key or not settings.email_from_email:
        logger.warning("Email credentials not configured; skipping email send.")
        return

    message = EmailMessage(
        to=to,
        subject=subject,
        content=content,
    )

    try:
        if _is_sendgrid():
            await _send_via_sendgrid(message)
            return
    except httpx.HTTPError:
        logger.exception("Email delivery failed due to HTTP error.")
        return
    except Exception:  # pragma: no cover - defensive logging
        logger.exception("Unexpected failure delivering email.")
        return

    logger.warning("Email provider %s is not supported; email not sent.", settings.email_provider)


async def _send_via_sendgrid(message: EmailMessage) -> None:
    url = "https://api.sendgrid.com/v3/mail/send"
    payload: dict[str, Any] = {
        "personalizations": [{"to": [{"email": message.to}], "subject": message.subject}],
        "from": {
            "email": settings.email_from_email,
            "name": settings.email_from_name or "Orbsurv",
        },
        "content": [
            {"type": "text/plain", "value": message.content},
        ],
    }
    if message.html_content:
        payload["content"].append({"type": "text/html", "value": message.html_content})

    headers = {
        "Authorization": f"Bearer {settings.email_api_key}",
        "Content-Type": "application/json",
    }
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.post(url, headers=headers, content=json.dumps(payload))
        response.raise_for_status()
