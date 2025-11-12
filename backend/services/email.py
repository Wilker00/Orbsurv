from __future__ import annotations

import asyncio
import json
import logging
import smtplib
import ssl
from dataclasses import dataclass
from email.message import EmailMessage as SMTPMessage
from pathlib import Path
from typing import Any, Mapping, MutableMapping, Optional

import httpx
from jinja2 import Environment, FileSystemLoader, TemplateNotFound, select_autoescape

from ..settings import settings

logger = logging.getLogger(__name__)

TEMPLATE_ROOT = Path(__file__).resolve().parent.parent / "templates" / "email"
_template_env = Environment(
    loader=FileSystemLoader(str(TEMPLATE_ROOT)),
    autoescape=select_autoescape(["html", "xml"]),
    trim_blocks=True,
    lstrip_blocks=True,
)

RETRY_DELAYS = (0, 2, 5)
SMTP_TIMEOUT_SECONDS = 15


@dataclass(slots=True)
class CompiledEmail:
    to: str
    subject: str
    text_body: str
    html_body: Optional[str]
    from_email: str


def _smtp_configured() -> bool:
    return bool(settings.email_host and settings.email_from)


def _resolve_from_address() -> Optional[str]:
    return settings.email_from or settings.email_from_email


def _render_template(template_name: str, context: Mapping[str, Any] | None, extension: str) -> Optional[str]:
    try:
        template = _template_env.get_template(f"{template_name}.{extension}")
    except TemplateNotFound:
        logger.error("Email template missing: %s.%s", template_name, extension)
        return None
    try:
        rendered = template.render(**(context or {}))
    except Exception:  # pragma: no cover - defensive logging
        logger.exception("Unable to render email template %s.%s", template_name, extension)
        return None
    return rendered.strip()


def _compile_email(template: str, *, to: str, subject: str, context: Mapping[str, Any] | None = None) -> Optional[CompiledEmail]:
    if not to or not subject:
        logger.warning("Email missing recipient or subject; subject=%s to=%s", subject, to)
        return None

    from_address = _resolve_from_address()
    if not from_address:
        logger.warning("EMAIL_FROM not configured; skipping template=%s to=%s", template, to)
        return None

    merged_context: MutableMapping[str, Any] = dict(context or {})
    merged_context.setdefault("app_name", "Orbsurv")
    merged_context.setdefault("support_email", from_address)

    text = _render_template(template, merged_context, "txt")
    html = _render_template(template, merged_context, "html")
    if not text:
        logger.error("Email template %s missing text body; aborting send", template)
        return None

    return CompiledEmail(
        to=to,
        subject=subject,
        text_body=text,
        html_body=html,
        from_email=from_address,
    )


def _build_smtp_message(compiled: CompiledEmail) -> SMTPMessage:
    message = SMTPMessage()
    message["To"] = compiled.to
    message["From"] = compiled.from_email
    message["Subject"] = compiled.subject
    message.set_content(compiled.text_body)
    if compiled.html_body:
        message.add_alternative(compiled.html_body, subtype="html")
    return message


def _send_via_smtp(compiled: CompiledEmail) -> None:
    if not settings.email_host:
        raise RuntimeError("EMAIL_HOST is not configured")

    port = settings.email_port or 587
    username = settings.email_username
    password = settings.email_password
    use_ssl = port == 465
    context = ssl.create_default_context()

    if use_ssl:
        with smtplib.SMTP_SSL(settings.email_host, port, timeout=SMTP_TIMEOUT_SECONDS, context=context) as client:
            if username and password:
                client.login(username, password)
            client.send_message(_build_smtp_message(compiled))
            return

    with smtplib.SMTP(settings.email_host, port, timeout=SMTP_TIMEOUT_SECONDS) as client:
        client.ehlo()
        try:
            client.starttls(context=context)
            client.ehlo()
        except smtplib.SMTPException:
            logger.debug("SMTP server did not accept STARTTLS; continuing without TLS")
        if username and password:
            client.login(username, password)
        client.send_message(_build_smtp_message(compiled))


def _is_sendgrid() -> bool:
    provider = (settings.email_provider or "").strip().lower()
    return provider == "sendgrid" and bool(settings.email_api_key)


async def _send_via_sendgrid(compiled: CompiledEmail) -> None:
    payload: dict[str, Any] = {
        "personalizations": [{"to": [{"email": compiled.to}], "subject": compiled.subject}],
        "from": {
            "email": compiled.from_email,
            "name": settings.email_from_name or "Orbsurv",
        },
        "content": [
            {"type": "text/plain", "value": compiled.text_body},
        ],
    }
    if compiled.html_body:
        payload["content"].append({"type": "text/html", "value": compiled.html_body})

    headers = {
        "Authorization": f"Bearer {settings.email_api_key}",
        "Content-Type": "application/json",
    }
    async with httpx.AsyncClient(timeout=SMTP_TIMEOUT_SECONDS) as client:
        response = await client.post("https://api.sendgrid.com/v3/mail/send", headers=headers, content=json.dumps(payload))
        response.raise_for_status()


async def _deliver(compiled: CompiledEmail) -> None:
    if _smtp_configured():
        await asyncio.to_thread(_send_via_smtp, compiled)
        return
    if _is_sendgrid():
        await _send_via_sendgrid(compiled)
        return
    raise RuntimeError("No email transport configured")


async def send_templated_email(
    template: str,
    *,
    to: str,
    subject: str,
    context: Mapping[str, Any] | None = None,
    retries: int = len(RETRY_DELAYS),
) -> bool:
    compiled = _compile_email(template, to=to, subject=subject, context=context)
    if not compiled:
        return False

    attempts = max(1, retries)
    last_error: Optional[BaseException] = None

    for attempt, delay in enumerate(RETRY_DELAYS[:attempts], start=1):
        if delay:
            await asyncio.sleep(delay)
        try:
            await _deliver(compiled)
            logger.info("Email delivered template=%s to=%s attempt=%d", template, to, attempt)
            return True
        except Exception as exc:  # pragma: no cover - log & retry
            last_error = exc
            logger.exception("Email delivery failed template=%s to=%s attempt=%d", template, to, attempt)

    if last_error:
        logger.error("All attempts exhausted for template=%s to=%s", template, to)
    return False


async def send_password_reset_email(*, to: str, reset_url: str) -> bool:
    if not to or not reset_url:
        logger.warning("Password reset email missing recipient or reset URL")
        return False
    return await send_templated_email(
        "password_reset",
        to=to,
        subject="Reset your Orbsurv password",
        context={
            "reset_url": reset_url,
        },
    )


async def send_email(*, to: str, subject: str, body: str, html_body: str | None = None) -> bool:
    """
    Send a raw email without requiring a stored template.
    """
    from_address = _resolve_from_address()
    if not from_address:
        logger.warning("EMAIL_FROM not configured; skipping ad-hoc email to=%s", to)
        return False
    compiled = CompiledEmail(
        to=to,
        subject=subject,
        text_body=body,
        html_body=html_body,
        from_email=from_address,
    )
    try:
        await _deliver(compiled)
        logger.info("Ad-hoc email delivered to=%s", to)
        return True
    except Exception:
        logger.exception("Unable to deliver ad-hoc email to=%s", to)
        return False
