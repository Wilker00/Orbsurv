from typing import Sequence

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .. import models


async def get_all(session: AsyncSession, *, limit: int = 100, offset: int = 0) -> Sequence[models.AuditLog]:
    stmt = select(models.AuditLog).order_by(models.AuditLog.created_at.desc()).limit(limit).offset(offset)
    result = await session.execute(stmt)
    return result.scalars().all()