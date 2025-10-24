from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from .. import models, schemas


async def create_pilot_request(session: AsyncSession, payload: schemas.PilotRequestCreate) -> models.PilotRequest:
    pilot_request = models.PilotRequest(
        name=payload.name,
        org=payload.org,
        email=payload.email,
        use_case=payload.use_case,
    )
    session.add(pilot_request)
    await session.flush()
    return pilot_request


async def count_pilot_requests(session: AsyncSession) -> int:
    result = await session.execute(select(func.count(models.PilotRequest.id)))
    return result.scalar_one()
