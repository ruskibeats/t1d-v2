"""Database configuration for T1D Companion v2.

Uses SQLAlchemy async sessions when DATABASE_URL is available. Falls back to a
no-op session so standalone demos still work without Postgres.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from contextlib import asynccontextmanager
from typing import AsyncIterator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine


@dataclass
class Settings:
    database_url: str = os.getenv(
        "DATABASE_URL",
        "postgresql+asyncpg://postgres:postgres@localhost:5432/t1d_companion",
    )
    llm_provider: str = os.getenv("LLM_PROVIDER", "ollama")
    llm_model: str = os.getenv("T1D_LOCAL_MODEL", "llama3.1:latest")


class _NoopSession:
    async def execute(self, *args, **kwargs):
        raise RuntimeError("Database session is not configured")


class DBManager:
    def __init__(self) -> None:
        self._engine = None
        self._sessionmaker: async_sessionmaker[AsyncSession] | None = None
        self._url: str | None = None

    def init_db(self, url: str | None = None) -> None:
        db_url = url or get_settings().database_url
        if not db_url or db_url == ":memory":
            self._engine = None
            self._sessionmaker = None
            self._url = None
            return
        if self._engine is not None and self._url == db_url:
            return
        self._engine = create_async_engine(db_url, pool_pre_ping=True)
        self._sessionmaker = async_sessionmaker(self._engine, expire_on_commit=False)
        self._url = db_url

    @asynccontextmanager
    async def get_session(self) -> AsyncIterator[AsyncSession | _NoopSession]:
        if self._sessionmaker is None:
            yield _NoopSession()
            return
        async with self._sessionmaker() as session:
            yield session


db_manager = DBManager()


def get_settings() -> Settings:
    return Settings()
