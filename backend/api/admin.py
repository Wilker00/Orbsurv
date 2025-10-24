from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from .. import crud, schemas
from ..database import get_session
from ..security import require_role
from ..models import UserRole

router = APIRouter(
    prefix="/admin",
    tags=["admin"],
    dependencies=[Depends(require_role(UserRole.DEV))],
)


@router.get("/summary", response_model=schemas.AdminSummary)
async def get_admin_summary(session: AsyncSession = Depends(get_session)) -> schemas.AdminSummary:
    total_users = await crud.analytics.get_total_users(session)
    total_contacts = await crud.analytics.get_total_contacts(session)
    total_waitlist = await crud.analytics.get_total_waitlist(session)
    total_pilot_requests = await crud.analytics.get_total_pilot_requests(session)
    total_investor_interest = await crud.analytics.get_total_investor_interest(session)
    return schemas.AdminSummary(
        total_users=total_users,
        total_contacts=total_contacts,
        total_waitlist=total_waitlist,
        total_pilot_requests=total_pilot_requests,
        total_investor_interest=total_investor_interest,
    )


@router.get("/logs", response_model=schemas.AdminLogResponse)
async def get_admin_logs(session: AsyncSession = Depends(get_session)) -> schemas.AdminLogResponse:
    logs = await crud.audit.get_all(session)
    return schemas.AdminLogResponse(items=logs)


from ..services.email import send_email

@router.post("/send-email")
async def send_admin_email(payload: schemas.EmailSchema, session: AsyncSession = Depends(get_session)):
    await send_email(payload.to, payload.subject, payload.body)
    return {"message": "Email sent"}


@router.get("/users", response_model=schemas.AdminUserListResponse)
async def get_admin_users(session: AsyncSession = Depends(get_session)) -> schemas.AdminUserListResponse:
    users = await crud.users.list_users(session)
    return schemas.AdminUserListResponse(items=users, total=len(users))