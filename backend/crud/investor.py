from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from .. import models, schemas


async def create_interest(session: AsyncSession, payload: schemas.InvestorInterestCreate) -> models.InvestorInterest:
    interest = models.InvestorInterest(
        name=payload.name,
        email=payload.email,
        amount=payload.amount,
        note=payload.note,
    )
    session.add(interest)
    await session.flush()
    return interest


async def count_interest(session: AsyncSession) -> int:
    result = await session.execute(select(func.count(models.InvestorInterest.id)))
    return result.scalar_one()


async def list_all(session: AsyncSession, *, limit: int = 100, offset: int = 0) -> list[models.InvestorInterest]:
    stmt = select(models.InvestorInterest).order_by(models.InvestorInterest.created_at.desc()).limit(limit).offset(offset)
    result = await session.execute(stmt)
    return result.scalars().all()