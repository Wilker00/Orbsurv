import json

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from .. import crud, schemas
from ..database import get_session
from ..security import record_audit_log

router = APIRouter(tags=["public"])


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
    return schemas.MessageResponse(message="Pilot request submitted.")


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
