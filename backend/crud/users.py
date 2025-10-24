from __future__ import annotations

from typing import Sequence

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from .. import models, schemas
from ..security import hash_password, normalize_email


async def get_by_email(session: AsyncSession, *, email: str) -> models.User | None:
    stmt = select(models.User).where(func.lower(models.User.email) == normalize_email(email))
    result = await session.execute(stmt)
    return result.scalars().first()


async def create_user(
    session: AsyncSession,
    *,
    payload: schemas.UserCreate,
    role: models.UserRole = models.UserRole.USER,
) -> models.User:
    user = models.User(
        email=normalize_email(payload.email),
        name=payload.name,
        organization=payload.organization,
        password_hash=hash_password(payload.password),
        role=role,
    )
    session.add(user)
    await session.flush()
    return user


async def list_users(session: AsyncSession, *, limit: int = 100, offset: int = 0) -> Sequence[models.User]:
    stmt = select(models.User).order_by(models.User.created_at.desc()).limit(limit).offset(offset)
    result = await session.execute(stmt)
    return result.scalars().all()


async def update_role(session: AsyncSession, *, user_id: int, role: models.UserRole) -> models.User | None:
    stmt = (
        update(models.User)
        .where(models.User.id == user_id)
        .values(role=role, token_version=models.User.token_version + 1)
        .returning(models.User)
    )
    result = await session.execute(stmt)
    return result.scalars().first()


async def update_profile(session: AsyncSession, *, user: models.User, data: schemas.AccountProfileUpdate) -> models.User:
    if data.email:
        user.email = normalize_email(data.email)
    if data.name is not None:
        user.name = data.name
    if data.organization is not None:
        user.organization = data.organization
    await session.flush()
    return user


async def update_password(session: AsyncSession, *, user: models.User, new_password: str) -> None:
    user.password_hash = hash_password(new_password)
    user.token_version += 1
    await session.flush()


async def bump_token_version(session: AsyncSession, *, user: models.User) -> models.User:
    user.token_version += 1
    await session.flush()
    return user
