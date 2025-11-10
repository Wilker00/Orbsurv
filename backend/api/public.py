import json
import logging

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from .. import crud, schemas
from ..database import get_session
from ..security import record_audit_log
from ..services.email import send_templated_email
from ..settings import settings

router = APIRouter(tags=["public"])
logger = logging.getLogger(__name__)


@router.post("/waitlist", response_model=schemas.MessageResponse, status_code=201)
async def join_waitlist(
    payload: schemas.WaitlistCreate,
    request: Request,
    session: AsyncSession = Depends(get_session),
) -> schemas.MessageResponse:
    await crud.waitlist.create_waitlist(session, payload)
    await record_audit_log(session, actor=None, action="waitlist.join", request=request)
    await session.commit()
    return schemas.MessageResponse(message="Successfully joined the waitlist.")


@router.post("/contact", response_model=schemas.MessageResponse, status_code=201)
async def submit_contact(
    payload: schemas.ContactCreate,
    request: Request,
    session: AsyncSession = Depends(get_session),
) -> schemas.MessageResponse:
    await crud.contact.create_contact(session, payload)
    await record_audit_log(session, actor=None, action="contact.submit", request=request)
    await session.commit()
    await send_templated_email(
        "contact_ack",
        to=payload.email,
        subject="Thanks for contacting Orbsurv",
        context={"name": payload.name, "message": payload.message},
    )
    return schemas.MessageResponse(message="Thanks for reaching out. We will respond shortly.")


@router.post("/investor_interest", response_model=schemas.MessageResponse, status_code=201)
async def submit_investor_interest(
    payload: schemas.InvestorInterestCreate,
    request: Request,
    session: AsyncSession = Depends(get_session),
) -> schemas.MessageResponse:
    await crud.investor.create_interest(session, payload)
    await record_audit_log(session, actor=None, action="investor.interest", request=request)
    await session.commit()
    await send_templated_email(
        "investor_ack",
        to=payload.email,
        subject="Thanks for investing in Orbsurv",
        context={"name": payload.name, "amount": payload.amount},
    )
    return schemas.MessageResponse(message="Investor interest recorded.")


@router.post("/pilot_request", response_model=schemas.MessageResponse, status_code=201)
async def submit_pilot_request(
    payload: schemas.PilotRequestCreate,
    request: Request,
    session: AsyncSession = Depends(get_session),
) -> schemas.MessageResponse:
    await crud.pilot.create_pilot_request(session, payload)
    await record_audit_log(session, actor=None, action="pilot.request", request=request)
    await session.commit()
    await send_templated_email(
        "pilot_ack",
        to=payload.email,
        subject="Thanks for requesting an Orbsurv pilot",
        context={"name": payload.name, "org": payload.org},
    )
    return schemas.MessageResponse(message="Pilot request submitted.")


@router.post("/orders", response_model=schemas.OrderResponse, status_code=status.HTTP_201_CREATED)
async def create_order(
    payload: schemas.OrderCreate,
    request: Request,
    session: AsyncSession = Depends(get_session),
) -> schemas.OrderResponse:
    """Create a new order and send registration email."""
    # Validate plan types (you can expand this with actual plan validation)
    valid_plans = ["starter", "perimeter", "enterprise"]
    if payload.plan_type.lower() not in valid_plans:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid plan type. Must be one of: {', '.join(valid_plans)}",
        )

    # Create order
    order = await crud.order.create_order(session, payload)
    await record_audit_log(session, actor=None, action="order.create", request=request)
    await session.commit()

    # Generate registration URL
    frontend_url = settings.frontend_base_url or "http://localhost"
    registration_url = f"{frontend_url}/signup.html?token={order.registration_token}"

    # Send registration email
    await send_templated_email(
        "registration_link",
        to=payload.email,
        subject="Complete your Orbsurv purchase - Create your account",
        context={
            "name": payload.name,
            "plan_type": payload.plan_type,
            "price": f"${payload.price:.2f}",
            "registration_url": registration_url,
        },
    )

    return schemas.OrderResponse.model_validate(order)


@router.post("/client_errors", response_model=schemas.MessageResponse, status_code=202)
async def report_client_error(
    payload: schemas.ClientErrorReport,
    request: Request,
    session: AsyncSession = Depends(get_session),
) -> schemas.MessageResponse:
    def _clip(value: str | None, limit: int) -> str | None:
        if value is None:
            return None
        return value if len(value) <= limit else value[:limit]

    agent = payload.user_agent or request.headers.get("user-agent")
    report = {
        "message": _clip(payload.message, 2000),
        "stack": _clip(payload.stack, 8000),
        "url": _clip(payload.url, 2000),
        "line": payload.line,
        "column": payload.column,
        "user_agent": _clip(agent, 512),
        "referer": _clip(request.headers.get("referer"), 2000),
    }
    metadata = json.dumps({key: value for key, value in report.items() if value not in (None, "")})
    await record_audit_log(session, actor=None, action="client.error", request=request, metadata=metadata)
    await session.commit()
    return schemas.MessageResponse(message="Client error recorded.")
