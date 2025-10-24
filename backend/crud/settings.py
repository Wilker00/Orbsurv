from __future__ import annotations

import json

from sqlalchemy.ext.asyncio import AsyncSession

from .. import models, schemas


def _ensure_dict(value: object) -> dict:
    if isinstance(value, str):
        return json.loads(value)
    return value or {}


async def get_settings(user: models.User) -> tuple[dict, dict]:
    notifications = _ensure_dict(user.notification_settings)
    automation = _ensure_dict(user.automation_settings)
    return notifications, automation


async def update_notifications(
    session: AsyncSession,
    *,
    user: models.User,
    payload: schemas.NotificationSettingsUpdate,
) -> dict:
    user.notification_settings = {
        "alert_email": payload.alert_email,
        "sms_stage": payload.sms_stage,
        "weekly_summary": payload.weekly_summary,
    }
    await session.flush()
    return user.notification_settings


async def update_automation(
    session: AsyncSession,
    *,
    user: models.User,
    payload: schemas.AutomationSettingsUpdate,
) -> dict:
    user.automation_settings = {
        "default_patrol": payload.default_patrol,
        "auto_reengage": payload.auto_reengage,
    }
    await session.flush()
    return user.automation_settings
