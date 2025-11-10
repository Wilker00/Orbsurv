from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from .. import models, schemas


async def create_waitlist(session: AsyncSession, payload: schemas.WaitlistCreate) -> models.Waitlist:
    entry = models.Waitlist(name=payload.name, email=payload.email, source=payload.source)
    session.add(entry)
    await session.flush()
    return entry


async def count_waitlist(session: AsyncSession) -> int:
    result = await session.execute(select(func.count(models.Waitlist.id)))
    return result.scalar_one()


async def list_all(session: AsyncSession, *, limit: int = 100, offset: int = 0) -> list[models.Waitlist]:
    stmt = select(models.Waitlist).order_by(models.Waitlist.created_at.desc()).limit(limit).offset(offset)
    result = await session.execute(stmt)
    return result.scalars().all()