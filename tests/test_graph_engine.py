"""Tests for GraphEngine and HealthMetricStore."""

from __future__ import annotations

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock

import pytest

from src.graph import HealthMetricStore, GraphEngine


class TestHealthMetricStore:
    """Test the SQL-encapsulating store."""

    @pytest.fixture
    def mock_session(self):
        session = MagicMock()
        session.execute = AsyncMock()
        return session

    @pytest.fixture
    def store(self, mock_session):
        return HealthMetricStore(mock_session)

    @pytest.mark.asyncio
    async def test_find_or_create_metric_found(self, store, mock_session):
        mock_result = MagicMock()
        mock_result.fetchone.return_value = (42,)
        mock_session.execute.return_value = mock_result

        metric_id = await store.find_or_create_metric(
            1, "carbs", datetime(2025, 1, 1, 12, 0, tzinfo=timezone.utc), 50.0
        )
        assert metric_id == 42
        assert mock_session.execute.call_count == 1  # SELECT only

    @pytest.mark.asyncio
    async def test_find_or_create_metric_not_found(self, store, mock_session):
        select_result = MagicMock()
        select_result.fetchone.return_value = None
        insert_result = MagicMock()
        insert_result.scalar_one.return_value = 99

        mock_session.execute.side_effect = [select_result, insert_result]

        metric_id = await store.find_or_create_metric(
            1, "carbs", datetime(2025, 1, 1, 12, 0, tzinfo=timezone.utc), 50.0
        )
        assert metric_id == 99
        assert mock_session.execute.call_count == 2  # SELECT + INSERT

    @pytest.mark.asyncio
    async def test_create_edge(self, store, mock_session):
        result = MagicMock()
        result.fetchone.return_value = (77,)
        mock_session.execute.return_value = result

        edge_id = await store.create_edge(1, 10, 20, "meal_to_glucose_spike")
        assert edge_id == 77

    @pytest.mark.asyncio
    async def test_create_edge_conflict(self, store, mock_session):
        result = MagicMock()
        result.fetchone.return_value = None
        mock_session.execute.return_value = result

        edge_id = await store.create_edge(1, 10, 20, "meal_to_glucose_spike")
        assert edge_id == -1

    @pytest.mark.asyncio
    async def test_get_neighbors(self, store, mock_session):
        out_result = MagicMock()
        out_result.fetchall.return_value = [
            MagicMock(_mapping={"id": 1, "target_metric_id": 20, "edge_type": "meal_to_glucose_spike"}),
        ]
        in_result = MagicMock()
        in_result.fetchall.return_value = []

        mock_session.execute.side_effect = [out_result, in_result]

        neighbors = await store.get_neighbors(1, 10)
        assert len(neighbors["outgoing"]) == 1
        assert len(neighbors["incoming"]) == 0

    @pytest.mark.asyncio
    async def test_find_next_metric(self, store, mock_session):
        result = MagicMock()
        result.fetchone.return_value = (100, datetime(2025, 1, 1, 14, 0, tzinfo=timezone.utc))
        mock_session.execute.return_value = result

        found = await store.find_next_metric(
            1, "exercise_minutes", datetime(2025, 1, 1, 12, 0, tzinfo=timezone.utc)
        )
        assert found is not None
        assert found[0] == 100

    @pytest.mark.asyncio
    async def test_find_next_metric_none(self, store, mock_session):
        result = MagicMock()
        result.fetchone.return_value = None
        mock_session.execute.return_value = result

        found = await store.find_next_metric(
            1, "exercise_minutes", datetime(2025, 1, 1, 12, 0, tzinfo=timezone.utc)
        )
        assert found is None

    @pytest.mark.asyncio
    async def test_execute_raw(self, store, mock_session):
        result = MagicMock()
        result.fetchall.return_value = [
            MagicMock(_mapping={"id": 1, "carbs_g": 50}),
        ]
        mock_session.execute.return_value = result

        rows = await store.execute_raw("SELECT * FROM test WHERE id = :id", {"id": 1})
        assert len(rows) == 1
        assert rows[0]["carbs_g"] == 50


class TestGraphEngine:
    """Test graph traversal logic (no SQL)."""

    @pytest.fixture
    def mock_store(self):
        return MagicMock(spec=HealthMetricStore)

    @pytest.fixture
    def engine(self, mock_store):
        return GraphEngine(mock_store)

    @pytest.mark.asyncio
    async def test_link_meal_to_glucose(self, engine, mock_store):
        mock_store.find_or_create_metric = AsyncMock(side_effect=[10, 20])
        mock_store.create_edge = AsyncMock(return_value=100)

        result = await engine.link_meal_to_glucose(
            1, datetime(2025, 1, 1, 12, 0, tzinfo=timezone.utc),
            50.0, 150, 90, fat_g=10.0,
        )
        assert result == 100
        mock_store.find_or_create_metric.assert_any_call(
            1, "carbs", datetime(2025, 1, 1, 12, 0, tzinfo=timezone.utc), 50.0,
            unit="g", source="graph_engine.meal", metadata_json={"fat_g": 10.0},
        )

    @pytest.mark.asyncio
    async def test_link_high_fat_to_delayed_peak_skips_low_fat(self, engine, mock_store):
        result = await engine.link_high_fat_to_delayed_peak(
            1, datetime(2025, 1, 1, 12, 0, tzinfo=timezone.utc), 10.0, 120,
        )
        assert result is None
        mock_store.find_or_create_metric.assert_not_called()

    @pytest.mark.asyncio
    async def test_link_high_fat_to_delayed_peak_skips_short_peak(self, engine, mock_store):
        result = await engine.link_high_fat_to_delayed_peak(
            1, datetime(2025, 1, 1, 12, 0, tzinfo=timezone.utc), 20.0, 60,
        )
        assert result is None

    @pytest.mark.asyncio
    async def test_link_meal_to_next_sleep_no_sleep_found(self, engine, mock_store):
        mock_store.find_next_metric = AsyncMock(return_value=None)

        result = await engine.link_meal_to_next_sleep(
            1, 10, datetime(2025, 1, 1, 12, 0, tzinfo=timezone.utc),
        )
        assert result is None

    @pytest.mark.asyncio
    async def test_link_meal_to_next_sleep_too_far(self, engine, mock_store):
        far_sleep_ts = datetime(2025, 1, 1, 20, 0, tzinfo=timezone.utc)
        mock_store.find_next_metric = AsyncMock(return_value=(100, far_sleep_ts))

        result = await engine.link_meal_to_next_sleep(
            1, 10, datetime(2025, 1, 1, 12, 0, tzinfo=timezone.utc),
        )
        assert result is None

    @pytest.mark.asyncio
    async def test_link_meal_to_next_sleep_success(self, engine, mock_store):
        sleep_ts = datetime(2025, 1, 1, 14, 0, tzinfo=timezone.utc)
        mock_store.find_next_metric = AsyncMock(return_value=(100, sleep_ts))
        mock_store.create_edge = AsyncMock(return_value=77)

        result = await engine.link_meal_to_next_sleep(
            1, 10, datetime(2025, 1, 1, 12, 0, tzinfo=timezone.utc), meal_slot="lunch",
        )
        assert result == 77
        mock_store.create_edge.assert_called_once()

    @pytest.mark.asyncio
    async def test_find_similar_meals_delegates_to_store(self, engine, mock_store):
        mock_store.execute_raw = AsyncMock(return_value=[{"id": 1, "carbs_g": 50}])

        results = await engine.find_similar_meals_with_better_outcomes(1, reference_carbs_g=50)
        assert len(results) == 1
        mock_store.execute_raw.assert_called_once()

    @pytest.mark.asyncio
    async def test_compare_meal_outcomes_delegates_to_store(self, engine, mock_store):
        mock_store.execute_raw = AsyncMock(return_value=[])

        results = await engine.compare_meal_outcomes_by_sleep_quality(1)
        assert results == []

    @pytest.mark.asyncio
    async def test_trace_backward_delegates_to_store(self, engine, mock_store):
        mock_store.execute_raw = AsyncMock(return_value=[])

        results = await engine.trace_backward_from_good_morning_glucose(1)
        assert results == []

    @pytest.mark.asyncio
    async def test_find_low_risk_motifs_delegates_to_store(self, engine, mock_store):
        mock_store.execute_raw = AsyncMock(return_value=[])

        results = await engine.find_repeating_low_risk_motifs(1)
        assert results == []
