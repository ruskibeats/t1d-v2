"""Tests for graph provenance and confidence labeling (Issue #17)."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock

import pytest

from src.graph import HealthMetricStore, GraphEngine
from src.graph.engine import GraphEngine


class TestGraphProvenance:
    """Test provenance tracking on edge creation."""

    @pytest.fixture
    def mock_session(self):
        session = MagicMock()
        session.execute = AsyncMock()
        return session

    @pytest.fixture
    def store(self, mock_session):
        return HealthMetricStore(mock_session)

    @pytest.mark.asyncio
    async def test_create_edge_with_provenance(self, store, mock_session):
        """Edge creation stores provenance."""
        result = MagicMock()
        result.fetchone.return_value = (77,)
        mock_session.execute.return_value = result

        edge_id = await store.create_edge(
            1, 10, 20, "meal_to_glucose_spike",
            provenance="synthetic_legend",
        )
        assert edge_id == 77
        _, params = mock_session.execute.call_args[0]
        prov_json = json.loads(params["prov"])
        assert prov_json["source"] == "synthetic_legend"

    @pytest.mark.asyncio
    async def test_create_edge_default_provenance(self, store, mock_session):
        """Default provenance is simulator_output."""
        result = MagicMock()
        result.fetchone.return_value = (78,)
        mock_session.execute.return_value = result

        edge_id = await store.create_edge(
            1, 10, 20, "meal_to_glucose_spike",
        )
        assert edge_id == 78
        _, params = mock_session.execute.call_args[0]
        prov_json = json.loads(params["prov"])
        assert prov_json["source"] == "simulator_output"

    @pytest.mark.asyncio
    async def test_create_edge_with_confidence_tier(self, store, mock_session):
        """Edge creation stores confidence components."""
        result = MagicMock()
        result.fetchone.return_value = (79,)
        mock_session.execute.return_value = result

        await store.create_edge(
            1, 10, 20, "meal_to_glucose_spike",
            confidence=0.9, confidence_tier="direct_derived",
        )
        _, params = mock_session.execute.call_args[0]
        cc_json = json.loads(params["cc"])
        assert cc_json["tier"] == "direct_derived"
        assert cc_json["base_score"] == 0.9


class TestHopConfidence:
    """Test per-hop confidence labeling."""

    def test_direct_derived_from_high_confidence(self):
        """Confidence >= 0.8 is direct_derived."""
        engine = GraphEngine.__new__(GraphEngine)
        result = engine._resolve_hop_confidence({"confidence": 0.9, "confidence_components_json": {}})
        assert result == "direct_derived"

    def test_inferred_from_medium_confidence(self):
        """Confidence 0.5-0.79 is inferred."""
        engine = GraphEngine.__new__(GraphEngine)
        result = engine._resolve_hop_confidence({"confidence": 0.6, "confidence_components_json": {}})
        assert result == "inferred"

    def test_simulated_from_low_confidence(self):
        """Confidence < 0.5 is simulated."""
        engine = GraphEngine.__new__(GraphEngine)
        result = engine._resolve_hop_confidence({"confidence": 0.4, "confidence_components_json": {}})
        assert result == "simulated"

    def test_explicit_confidence_tier_overrides(self):
        """Explicit confidence_tier in components overrides computed."""
        engine = GraphEngine.__new__(GraphEngine)
        result = engine._resolve_hop_confidence({
            "confidence": 0.4,
            "confidence_components_json": {"tier": "direct_derived", "base_score": 0.4},
        })
        assert result == "direct_derived"

    def test_provenance_from_row(self):
        """Provenance extracted from provenance_json."""
        engine = GraphEngine.__new__(GraphEngine)
        result = engine._resolve_provenance({
            "provenance_json": {"source": "synthetic_legend"},
        })
        assert result == "synthetic_legend"

    def test_default_provenance(self):
        """Default provenance is simulator_output."""
        engine = GraphEngine.__new__(GraphEngine)
        result = engine._resolve_provenance({"provenance_json": {}})
        assert result == "simulator_output"


class TestHistoricalContextProvenance:
    """Test provenance and graph_confidence in historical context."""

    @pytest.fixture
    def mock_session(self):
        session = MagicMock()
        session.execute = AsyncMock()
        return session

    @pytest.fixture
    def store(self, mock_session):
        return HealthMetricStore(mock_session)

    @pytest.mark.asyncio
    async def test_meal_to_glucose_creates_direct_derived(self, mock_session):
        """Meal-to-glucose edges use direct_derived confidence tier."""
        store = HealthMetricStore(mock_session)
        select_result = MagicMock()
        select_result.fetchone.return_value = (10,)
        insert_result = MagicMock()
        insert_result.fetchone.return_value = (1,)
        edge_result = MagicMock()
        edge_result.fetchone.return_value = (100,)
        select_result2 = MagicMock()
        select_result2.fetchone.return_value = (20,)
        mock_session.execute.side_effect = [
            select_result,   # find meal node
            select_result2,  # find glucose node
            edge_result,     # create edge
        ]

        engine = GraphEngine(store)
        result = await engine.link_meal_to_glucose(
            1,
            datetime(2025, 1, 1, 12, 0, tzinfo=timezone.utc),
            50.0, 150, 90,
        )
        assert result == 100

        # The edge creation call should have provenance and confidence_tier
        _, params = mock_session.execute.await_args_list[2][0]
        prov_json = json.loads(params["prov"])
        cc_json = json.loads(params["cc"])
        assert prov_json["source"] == "simulator_output"
        assert cc_json["tier"] == "direct_derived"

    @pytest.mark.asyncio
    async def test_sleep_edge_uses_inferred(self, mock_session):
        """Sleep-to-morning edges use inferred confidence tier."""
        store = HealthMetricStore(mock_session)
        select_result = MagicMock()
        select_result.fetchone.return_value = (10,)
        select_result2 = MagicMock()
        select_result2.fetchone.return_value = (20,)
        edge_result = MagicMock()
        edge_result.fetchone.return_value = (200,)
        mock_session.execute.side_effect = [
            select_result,
            select_result2,
            edge_result,
        ]

        engine = GraphEngine(store)
        result = await engine.link_sleep_to_next_day_glucose(
            1,
            datetime(2025, 1, 1, 12, 0, tzinfo=timezone.utc),
            70.0, 120.0, 110.0,
        )
        assert result == 200
        _, params = mock_session.execute.await_args_list[2][0]
        cc_json = json.loads(params["cc"])
        assert cc_json["tier"] == "inferred"


class TestGraphConfidenceInHistoricalContext:
    """Test graph_confidence derivation."""
    
    def test_synthetic_demo(self):
        """synthetic_legends_demo gets synthetic_demo confidence."""
        from app.services.historical_meal_matcher import historical_context_for_meal
        ctx = historical_context_for_meal(
            "test", carbs_g=50, food_name="test",
        )
        assert "graph_confidence" in ctx
        assert "provenance" in ctx

    def test_rich_history_with_many_matches(self):
        """Many matches with high confidence gets rich_history."""
        from app.services.historical_meal_matcher import _derive_graph_confidence
        result = _derive_graph_confidence("user_history", 15, 0.8)
        assert result == "rich_history"

    def test_partial_history_with_few_matches(self):
        """Few matches with moderate confidence gets partial_history."""
        from app.services.historical_meal_matcher import _derive_graph_confidence
        result = _derive_graph_confidence("user_history", 5, 0.5)
        assert result == "partial_history"

    def test_synthetic_always_demo(self):
        """Synthetic data always gets synthetic_demo regardless of count."""
        from app.services.historical_meal_matcher import _derive_graph_confidence
        result = _derive_graph_confidence("synthetic_legends_demo", 50, 0.9)
        assert result == "synthetic_demo"

    def test_no_data_gets_synthetic_demo(self):
        """No matches with low confidence gets synthetic_demo."""
        from app.services.historical_meal_matcher import _derive_graph_confidence
        result = _derive_graph_confidence("no_history", 0, 0.0)
        assert result == "synthetic_demo"
