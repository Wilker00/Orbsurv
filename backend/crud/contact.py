from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from .. import models, schemas


async def create_contact(session: AsyncSession, payload: schemas.ContactCreate) -> models.Contact:
    contact = models.Contact(name=payload.name, email=payload.email, message=payload.message)
    session.add(contact)
    await session.flush()
    return contact


async def count_contacts(session: AsyncSession) -> int:
    result = await session.execute(select(func.count(models.Contact.id)))
    return result.scalar_one()


async def list_all(session: AsyncSession, *, limit: int = 100, offset: int = 0) -> list[models.Contact]:
    stmt = select(models.Contact).order_by(models.Contact.created_at.desc()).limit(limit).offset(offset)
    result = await session.execute(stmt)
    return result.scalars().all()