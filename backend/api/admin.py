from fastapi import APIRouter, Depends, Query
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
async def get_admin_logs(
    session: AsyncSession = Depends(get_session),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(50, ge=1, le=500, description="Items per page"),
) -> schemas.AdminLogResponse:
    offset = (page - 1) * limit
    logs = await crud.audit.get_all(session, limit=limit, offset=offset)
    total = await crud.audit.count_all(session)
    return schemas.AdminLogResponse(
        items=logs,
        pagination=schemas.PaginationMeta.create(page=page, limit=limit, total=total),
    )


from ..services.email import send_email

@router.post("/send-email")
async def send_admin_email(payload: schemas.EmailSchema, session: AsyncSession = Depends(get_session)):
    await send_email(payload.to, payload.subject, payload.body)
    return {"message": "Email sent"}


@router.get("/users", response_model=schemas.AdminUserListResponse)
async def get_admin_users(
    session: AsyncSession = Depends(get_session),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(50, ge=1, le=500, description="Items per page"),
) -> schemas.AdminUserListResponse:
    offset = (page - 1) * limit
    users = await crud.users.list_users(session, limit=limit, offset=offset)
    total = await crud.analytics.get_total_users(session)
    return schemas.AdminUserListResponse(
        items=users,
        pagination=schemas.PaginationMeta.create(page=page, limit=limit, total=total),
    )


@router.get("/waitlist", response_model=schemas.AdminWaitlistResponse)
async def get_admin_waitlist(
    session: AsyncSession = Depends(get_session),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(50, ge=1, le=500, description="Items per page"),
) -> schemas.AdminWaitlistResponse:
    offset = (page - 1) * limit
    waitlist = await crud.waitlist.list_all(session, limit=limit, offset=offset)
    total = await crud.waitlist.count_waitlist(session)
    return schemas.AdminWaitlistResponse(
        items=waitlist,
        pagination=schemas.PaginationMeta.create(page=page, limit=limit, total=total),
    )


@router.get("/contacts", response_model=schemas.AdminContactResponse)
async def get_admin_contacts(
    session: AsyncSession = Depends(get_session),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(50, ge=1, le=500, description="Items per page"),
) -> schemas.AdminContactResponse:
    offset = (page - 1) * limit
    contacts = await crud.contact.list_all(session, limit=limit, offset=offset)
    total = await crud.contact.count_contacts(session)
    return schemas.AdminContactResponse(
        items=contacts,
        pagination=schemas.PaginationMeta.create(page=page, limit=limit, total=total),
    )


@router.get("/pilot-requests", response_model=schemas.AdminPilotResponse)
async def get_admin_pilot_requests(
    session: AsyncSession = Depends(get_session),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(50, ge=1, le=500, description="Items per page"),
) -> schemas.AdminPilotResponse:
    offset = (page - 1) * limit
    pilots = await crud.pilot.list_all(session, limit=limit, offset=offset)
    total = await crud.pilot.count_pilot_requests(session)
    return schemas.AdminPilotResponse(
        items=pilots,
        pagination=schemas.PaginationMeta.create(page=page, limit=limit, total=total),
    )


@router.get("/investor-interest", response_model=schemas.AdminInvestorResponse)
async def get_admin_investor_interest(
    session: AsyncSession = Depends(get_session),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(50, ge=1, le=500, description="Items per page"),
) -> schemas.AdminInvestorResponse:
    offset = (page - 1) * limit
    investors = await crud.investor.list_all(session, limit=limit, offset=offset)
    total = await crud.investor.count_interest(session)
    return schemas.AdminInvestorResponse(
        items=investors,
        pagination=schemas.PaginationMeta.create(page=page, limit=limit, total=total),
    )