from __future__ import annotations

import secrets

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .. import models, schemas
from ..security import normalize_email


def generate_registration_token() -> str:
    """Generate a secure URL-safe token for order registration."""
    return secrets.token_urlsafe(32)


async def create_order(session: AsyncSession, payload: schemas.OrderCreate) -> models.Order:
    """Create a new order with a generated registration token."""
    registration_token = generate_registration_token()
    order = models.Order(
        email=normalize_email(payload.email),
        name=payload.name,
        plan_type=payload.plan_type,
        price=payload.price,
        registration_token=registration_token,
        status=models.OrderStatus.PENDING,
    )
    session.add(order)
    await session.flush()
    return order


async def get_order_by_token(session: AsyncSession, token: str) -> models.Order | None:
    """Retrieve an order by its registration token."""
    stmt = select(models.Order).where(models.Order.registration_token == token)
    result = await session.execute(stmt)
    return result.scalars().first()


async def link_order_to_user(session: AsyncSession, order: models.Order, user: models.User) -> models.Order:
    """Associate an order with a user account after registration."""
    order.user_id = user.id
    order.status = models.OrderStatus.COMPLETED
    await session.flush()
    return order

