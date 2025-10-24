from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession

from .. import crud, models, schemas
from ..database import get_session
from ..security import get_current_user, record_audit_log, require_role, verify_password

router = APIRouter(tags=["app"])

COMMAND_CENTER_URL = "https://console.orbsurv.local/command-center"


@router.get("/dashboard/summary", response_model=schemas.DashboardSummary)
async def dashboard_summary(
    session: AsyncSession = Depends(get_session),
    user: models.User = Depends(require_role(models.UserRole.USER, models.UserRole.DEV)),
) -> schemas.DashboardSummary:
    metric_values = await crud.analytics.dashboard_metrics(session)
    logs = await crud.analytics.recent_dashboard_logs(session)

    recent_logs = [
        schemas.DashboardLog(
            id=log.id,
            action=log.action,
            description=log.metadata_json,
            created_at=log.created_at,
        )
        for log in logs
    ]

    metrics = schemas.DashboardMetrics(**metric_values)

    return schemas.DashboardSummary(metrics=metrics, recent_logs=recent_logs, command_center_url=COMMAND_CENTER_URL)


@router.get("/users/me", response_model=schemas.UserOut)
async def get_me(user: models.User = Depends(get_current_user)) -> schemas.UserOut:
    return schemas.UserOut.model_validate(user)


@router.patch("/account/profile", response_model=schemas.UserOut)
async def update_profile(
    payload: schemas.AccountProfileUpdate,
    request: Request,
    session: AsyncSession = Depends(get_session),
    user: models.User = Depends(get_current_user),
) -> schemas.UserOut:
    updated = await crud.users.update_profile(session, user=user, data=payload)
    await record_audit_log(session, actor=user, action="account.profile.update", request=request)
    await session.commit()
    return schemas.UserOut.model_validate(updated)


@router.patch("/account/password", response_model=schemas.MessageResponse)
async def update_password(
    payload: schemas.AccountPasswordUpdate,
    request: Request,
    session: AsyncSession = Depends(get_session),
    user: models.User = Depends(get_current_user),
) -> schemas.MessageResponse:
    if not verify_password(payload.current_password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect")
    await crud.users.update_password(session, user=user, new_password=payload.new_password)
    await record_audit_log(session, actor=user, action="account.password.update", request=request)
    await session.commit()
    return schemas.MessageResponse(message="Password updated.")


@router.patch("/account/organization", response_model=schemas.UserOut)
async def update_organization(
    payload: schemas.AccountOrganizationUpdate,
    request: Request,
    session: AsyncSession = Depends(get_session),
    user: models.User = Depends(get_current_user),
) -> schemas.UserOut:
    user.organization = payload.organization
    if payload.timezone:
        user.notification_settings = {**(user.notification_settings or {}), "timezone": payload.timezone}
    await session.flush()
    await record_audit_log(session, actor=user, action="account.organization.update", request=request)
    await session.commit()
    return schemas.UserOut.model_validate(user)


@router.get("/settings", response_model=schemas.SettingsResponse)
async def get_settings(
    user: models.User = Depends(get_current_user),
) -> schemas.SettingsResponse:
    notifications, automation = await crud.settings.get_settings(user)
    return schemas.SettingsResponse(
        notifications=schemas.NotificationSettingsUpdate(**notifications),
        automation=schemas.AutomationSettingsUpdate(**automation),
    )


@router.patch("/settings/notifications", response_model=schemas.MessageResponse)
async def update_notifications(
    payload: schemas.NotificationSettingsUpdate,
    request: Request,
    session: AsyncSession = Depends(get_session),
    user: models.User = Depends(get_current_user),
) -> schemas.MessageResponse:
    await crud.settings.update_notifications(session, user=user, payload=payload)
    await record_audit_log(session, actor=user, action="settings.notifications.update", request=request)
    await session.commit()
    return schemas.MessageResponse(message="Notification preferences saved.")


@router.patch("/settings/automation", response_model=schemas.MessageResponse)
async def update_automation(
    payload: schemas.AutomationSettingsUpdate,
    request: Request,
    session: AsyncSession = Depends(get_session),
    user: models.User = Depends(get_current_user),
) -> schemas.MessageResponse:
    await crud.settings.update_automation(session, user=user, payload=payload)
    await record_audit_log(session, actor=user, action="settings.automation.update", request=request)
    await session.commit()
    return schemas.MessageResponse(message="Automation settings saved.")
