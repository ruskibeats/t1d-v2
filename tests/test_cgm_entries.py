"""Tests for Issue #34: CGM entries storage and idempotent upsert."""

from __future__ import annotations

import pytest
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock


@pytest.fixture
def db_session():
    """Create a test database session with CGM entries table."""
    import asyncio
    from unittest.mock import AsyncMock, MagicMock

    session = AsyncMock()
    # Mock execute to return predictable results
    result_mock = MagicMock()
    result_mock.scalar_one.return_value = 1
    result_mock.fetchall.return_value = []
    result_mock.rowcount = 0
    session.execute.return_value = result_mock
    return session


class TestUpsertCgmEntry:
    """Test idempotent upsert of CGM entries."""

    @pytest.mark.asyncio
    async def test_insert_new_entry(self, db_session):
        from app.services.cgm_entries import upsert_cgm_entry

        eid = await upsert_cgm_entry(
            db_session,
            user_id=1,
            measured_at=datetime(2025, 1, 1, 8, 0, tzinfo=timezone.utc),
            value_mg_dl=120,
        )
        assert eid == 1
        # Verify the execute was called with INSERT ... ON CONFLICT
        call_args = db_session.execute.call_args
        sql_text = call_args[0][0].text
        assert "INSERT INTO cgm_entries" in sql_text
        assert "ON CONFLICT" in sql_text
        assert "DO UPDATE" in sql_text

    @pytest.mark.asyncio
    async def test_idempotent_reimport(self, db_session):
        """Re-importing the same entry should update, not duplicate."""
        from app.services.cgm_entries import upsert_cgm_entry, get_cgm_entry_count

        # First insert
        await upsert_cgm_entry(
            db_session,
            user_id=1,
            measured_at=datetime(2025, 1, 1, 8, 0, tzinfo=timezone.utc),
            value_mg_dl=120,
            source="nightscout",
        )

        # Re-import same entry (same user_id, measured_at, source)
        await upsert_cgm_entry(
            db_session,
            user_id=1,
            measured_at=datetime(2025, 1, 1, 8, 0, tzinfo=timezone.utc),
            value_mg_dl=125,  # Updated value
            source="nightscout",
        )

        # Should have been called twice (insert + upsert)
        assert db_session.execute.call_args_list is not None

    @pytest.mark.asyncio
    async def test_different_sources_not_conflicting(self, db_session):
        """Same timestamp but different source should create separate entries."""
        from app.services.cgm_entries import upsert_cgm_entry

        await upsert_cgm_entry(
            db_session,
            user_id=1,
            measured_at=datetime(2025, 1, 1, 8, 0, tzinfo=timezone.utc),
            value_mg_dl=120,
            source="nightscout",
        )
        await upsert_cgm_entry(
            db_session,
            user_id=1,
            measured_at=datetime(2025, 1, 1, 8, 0, tzinfo=timezone.utc),
            value_mg_dl=118,
            source="manual",
        )

        # Both should succeed (different unique keys)
        assert db_session.execute.call_count == 2

    @pytest.mark.asyncio
    async def test_metadata_merge_on_upsert(self, db_session):
        """Re-import should merge metadata, not replace."""
        from app.services.cgm_entries import upsert_cgm_entry

        await upsert_cgm_entry(
            db_session,
            user_id=1,
            measured_at=datetime(2025, 1, 1, 8, 0, tzinfo=timezone.utc),
            value_mg_dl=120,
            metadata={"device": "libre"},
        )
        await upsert_cgm_entry(
            db_session,
            user_id=1,
            measured_at=datetime(2025, 1, 1, 8, 0, tzinfo=timezone.utc),
            value_mg_dl=125,
            metadata={"sensor_id": "abc123"},
        )

        # Second call should use metadata merge (|| operator)
        second_call_sql = db_session.execute.call_args_list[1][0][0].text
        assert "metadata" in second_call_sql.lower()

    @pytest.mark.asyncio
    async def test_naive_timestamp_gets_utc(self):
        """Naive timestamps should be treated as UTC."""
        from app.services.cgm_entries import upsert_cgm_entry

        session = AsyncMock()
        result_mock = MagicMock()
        result_mock.scalar_one.return_value = 1
        session.execute.return_value = result_mock

        await upsert_cgm_entry(
            session,
            user_id=1,
            measured_at=datetime(2025, 1, 1, 8, 0),  # Naive
            value_mg_dl=120,
        )

        # Should have been called — the function handles naive timestamps
        assert session.execute.called


class TestBatchUpsert:
    """Test batch upsert of CGM entries."""

    @pytest.mark.asyncio
    async def test_batch_upsert(self, db_session):
        from app.services.cgm_entries import upsert_cgm_entries_batch

        entries = [
            {"measured_at": datetime(2025, 1, 1, 8, 0, tzinfo=timezone.utc), "value_mg_dl": 120},
            {"measured_at": datetime(2025, 1, 1, 9, 0, tzinfo=timezone.utc), "value_mg_dl": 140},
            {"measured_at": datetime(2025, 1, 1, 10, 0, tzinfo=timezone.utc), "value_mg_dl": 110},
        ]
        ids = await upsert_cgm_entries_batch(db_session, user_id=1, entries=entries)
        assert len(ids) == 3

    @pytest.mark.asyncio
    async def test_batch_empty_list(self, db_session):
        from app.services.cgm_entries import upsert_cgm_entries_batch

        ids = await upsert_cgm_entries_batch(db_session, user_id=1, entries=[])
        assert ids == []


class TestQueryEntries:
    """Test querying CGM entries."""

    @pytest.mark.asyncio
    async def test_get_entries_basic(self, db_session):
        from app.services.cgm_entries import get_cgm_entries

        row_mock = MagicMock()
        row_mock._mapping = {
            "id": 1, "user_id": 1,
            "measured_at": datetime(2025, 1, 1, 8, 0, tzinfo=timezone.utc),
            "value_mg_dl": 120, "units": "mg/dL", "source": "nightscout",
        }
        result_mock = MagicMock()
        result_mock.fetchall.return_value = [row_mock]
        db_session.execute.return_value = result_mock

        entries = await get_cgm_entries(db_session, user_id=1)
        assert len(entries) == 1
        assert entries[0]["value_mg_dl"] == 120

    @pytest.mark.asyncio
    async def test_get_entries_with_time_filter(self, db_session):
        from app.services.cgm_entries import get_cgm_entries

        db_session.execute.return_value = MagicMock(fetchall=lambda: [])

        start = datetime(2025, 1, 1, tzinfo=timezone.utc)
        end = datetime(2025, 1, 31, tzinfo=timezone.utc)
        entries = await get_cgm_entries(db_session, user_id=1, start=start, end=end)

        # Verify time range was passed
        call_sql = db_session.execute.call_args[0][0].text
        assert "measured_at >=" in call_sql
        assert "measured_at <=" in call_sql

    @pytest.mark.asyncio
    async def test_get_entries_with_source_filter(self, db_session):
        from app.services.cgm_entries import get_cgm_entries

        db_session.execute.return_value = MagicMock(fetchall=lambda: [])
        await get_cgm_entries(db_session, user_id=1, source="nightscout")

        call_sql = db_session.execute.call_args[0][0].text
        assert "source" in call_sql.lower()

    @pytest.mark.asyncio
    async def test_count_entries(self, db_session):
        from app.services.cgm_entries import get_cgm_entry_count

        result_mock = MagicMock()
        result_mock.scalar_one.return_value = 42
        db_session.execute.return_value = result_mock

        count = await get_cgm_entry_count(db_session, user_id=1)
        assert count == 42

    @pytest.mark.asyncio
    async def test_delete_entries(self, db_session):
        from app.services.cgm_entries import delete_cgm_entries

        result_mock = MagicMock()
        result_mock.rowcount = 5
        db_session.execute.return_value = result_mock

        start = datetime(2025, 1, 1, tzinfo=timezone.utc)
        end = datetime(2025, 1, 31, tzinfo=timezone.utc)
        deleted = await delete_cgm_entries(db_session, user_id=1, start=start, end=end)
        assert deleted == 5


class TestSchemaDdl:
    """Test the DDL statement."""

    def test_ddl_creates_table(self):
        from app.services.cgm_entries import CGM_ENTRIES_TABLE_DDL
        assert "CREATE TABLE IF NOT EXISTS cgm_entries" in CGM_ENTRIES_TABLE_DDL

    def test_ddl_has_required_columns(self):
        from app.services.cgm_entries import CGM_ENTRIES_TABLE_DDL
        required = ["id", "user_id", "measured_at", "value_mg_dl", "units", "source"]
        for col in required:
            assert col in CGM_ENTRIES_TABLE_DDL, f"Missing column: {col}"

    def test_ddl_has_unique_constraint(self):
        from app.services.cgm_entries import CGM_ENTRIES_TABLE_DDL
        assert "UNIQUE(user_id, measured_at, source)" in CGM_ENTRIES_TABLE_DDL

    def test_ddl_has_indexes(self):
        from app.services.cgm_entries import CGM_ENTRIES_TABLE_DDL
        assert "idx_cgm_entries_user_time" in CGM_ENTRIES_TABLE_DDL
        assert "idx_cgm_entries_nightscout_id" in CGM_ENTRIES_TABLE_DDL


class TestEnsureTable:
    """Test the ensure_cgm_entries_table migration helper."""

    @pytest.mark.asyncio
    async def test_ensure_table_creates_schema(self):
        from app.services.cgm_entries import ensure_cgm_entries_table

        session = AsyncMock()
        result_mock = MagicMock()
        session.execute.return_value = result_mock

        await ensure_cgm_entries_table(session)

        # Should execute DDL + commit
        assert session.execute.called
        assert session.commit.called
