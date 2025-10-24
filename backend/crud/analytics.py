from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from .. import models


async def get_total_users(session: AsyncSession) -> int:
    result = await session.execute(select(func.count(models.User.id)))
    return result.scalar_one()


async def get_total_contacts(session: AsyncSession) -> int:
    result = await session.execute(select(func.count(models.Contact.id)))
    return result.scalar_one()


async def get_total_waitlist(session: AsyncSession) -> int:
    result = await session.execute(select(func.count(models.Waitlist.id)))
    return result.scalar_one()


async def get_total_pilot_requests(session: AsyncSession) -> int:
    result = await session.execute(select(func.count(models.PilotRequest.id)))
    return result.scalar_one()


async def get_total_investor_interest(session: AsyncSession) -> int:
    result = await session.execute(select(func.count(models.InvestorInterest.id)))
    return result.scalar_one()