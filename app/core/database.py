"""Database configuration for T1D Companion v2.

Production uses Postgres+asyncpg. The module raises RuntimeError when the
database is not initialized so callers always know the connection state.
"""

from __future__ import annotations

import os
from contextlib import asynccontextmanager
from typing import AsyncIterator

from sqlalchemy import pool
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine


_DEFAULT_DATABASE_URL = "postgresql+asyncpg://postgres:postgres@localhost:5432/t1d_companion"


class Settings:
    def __init__(self) -> None:
        self.database_url: str = os.getenv("DATABASE_URL", _DEFAULT_DATABASE_URL)
        self.llm_provider: str = os.getenv("LLM_PROVIDER", "ollama")
        self.llm_model: str = os.getenv("T1D_LOCAL_MODEL", "llama3.1:latest")


class DBManager:
    """Async database manager. Raises RuntimeError until init_db() is called."""

    def __init__(self) -> None:
        self._engine = None
        self._sessionmaker: async_sessionmaker[AsyncSession] | None = None
        self._initialized = False

    def init_db(self, database_url: str | None = None) -> None:
        db_url = database_url or get_settings().database_url
        if self._initialized and self._url == db_url:
            return
        self._url = db_url
        self._engine = create_async_engine(
            db_url,
            poolclass=pool.AsyncAdaptedQueuePool,
            pool_size=5,
            max_overflow=10,
            pool_pre_ping=True,
            pool_recycle=3600,
        )
        self._sessionmaker = async_sessionmaker(
            self._engine, expire_on_commit=False, autoflush=False,
        )
        self._initialized = True

    @asynccontextmanager
    async def get_session(self) -> AsyncIterator[AsyncSession]:
        if not self._initialized:
            raise RuntimeError("Database not initialized. Call init_db() first.")
        async with self._sessionmaker() as session:  # type: ignore
            try:
                yield session
            except Exception:
                await session.rollback()
                raise

    async def close(self) -> None:
        if self._engine:
            await self._engine.dispose()
        self._initialized = False


db_manager = DBManager()


def get_settings() -> Settings:
    return Settings()
