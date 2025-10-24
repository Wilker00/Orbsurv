from __future__ import annotations

from pathlib import Path
from typing import AsyncGenerator, Awaitable, Callable, Generator

import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from backend import database
from backend.app import app
from backend.database import Base, async_session_factory
from backend.models import User, UserRole
from backend.security import hash_password
from backend.settings import settings

TEST_DB_PATH = Path("test_orbsurv.db")
TEST_DATABASE_URL = f"sqlite+aiosqlite:///{TEST_DB_PATH}"


@pytest.fixture(scope="session", autouse=True)
def override_settings() -> Generator[None, None, None]:
    original_url = settings.database_url
    settings.database_url = TEST_DATABASE_URL
    yield
    settings.database_url = original_url
    if TEST_DB_PATH.exists():
        TEST_DB_PATH.unlink()


@pytest_asyncio.fixture()
async def db_session(monkeypatch) -> AsyncGenerator[async_sessionmaker[AsyncSession], None]:
    engine = create_async_engine(TEST_DATABASE_URL, future=True)
    test_session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    monkeypatch.setattr(database, "async_session_factory", test_session_factory)

    try:
        yield test_session_factory
    finally:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)
        await engine.dispose()
        monkeypatch.setattr(database, "async_session_factory", async_session_factory)


@pytest_asyncio.fixture()
async def client(db_session) -> AsyncGenerator[AsyncClient, None]:
    async with AsyncClient(app=app, base_url="http://testserver") as ac:
        yield ac


@pytest_asyncio.fixture()
async def user_factory(db_session) -> Callable[[str, str, UserRole], Awaitable[User]]:
    async def _create_user(email: str, password: str, role: UserRole = UserRole.USER) -> User:
        async with db_session() as session:
            user = User(email=email, password_hash=hash_password(password), role=role)
            session.add(user)
            await session.commit()
            await session.refresh(user)
            return user

    return _create_user
