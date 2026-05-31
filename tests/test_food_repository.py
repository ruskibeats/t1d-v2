"""Tests for food repository pattern."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock

import pytest

from app.food import (
    ArchetypeFoodRepository,
    ChainedFoodRepository,
    PostgresFoodRepository,
)


class TestArchetypeFoodRepository:
    """Test deterministic built-in food data."""

    @pytest.mark.asyncio
    async def test_direct_match(self):
        repo = ArchetypeFoodRepository()
        results = await repo.search_food_candidates("pizza")
        assert len(results) == 1
        assert results[0]["name"] == "pizza"
        assert results[0]["carbs_per_100g"] > 0

    @pytest.mark.asyncio
    async def test_search_term_match(self):
        repo = ArchetypeFoodRepository()
        results = await repo.search_food_candidates("unknown", search_terms=["coke"])
        assert len(results) == 1
        assert results[0]["name"] == "coke"

    @pytest.mark.asyncio
    async def test_partial_match(self):
        repo = ArchetypeFoodRepository()
        results = await repo.search_food_candidates("iced donut")
        assert len(results) == 1

    @pytest.mark.asyncio
    async def test_no_match(self):
        repo = ArchetypeFoodRepository()
        results = await repo.search_food_candidates("mystery food xyz")
        assert len(results) == 0

    @pytest.mark.asyncio
    async def test_archetype_has_barcode_marker(self):
        repo = ArchetypeFoodRepository()
        results = await repo.search_food_candidates("pizza")
        assert results[0]["barcode"] == "archetype"

    @pytest.mark.asyncio
    async def test_essential_foods_covered(self):
        repo = ArchetypeFoodRepository()
        essential = ["pizza", "coke", "donut", "fries", "chicken", "rice", "burger"]
        for food in essential:
            results = await repo.search_food_candidates(food)
            assert len(results) > 0, f"Missing archetype for: {food}"


class TestChainedFoodRepository:
    """Test composite repository."""

    @pytest.mark.asyncio
    async def test_first_repo_returns_results(self):
        mock_repo = MagicMock()
        mock_repo.search_food_candidates = AsyncMock(return_value=[{"name": "found"}])
        fallback = MagicMock()

        chained = ChainedFoodRepository([mock_repo, fallback])
        results = await chained.search_food_candidates("pizza")

        assert len(results) == 1
        assert results[0]["name"] == "found"
        fallback.search_food_candidates.assert_not_called()

    @pytest.mark.asyncio
    async def test_fallback_when_first_empty(self):
        mock_repo = MagicMock()
        mock_repo.search_food_candidates = AsyncMock(return_value=[])
        fallback = MagicMock()
        fallback.search_food_candidates = AsyncMock(return_value=[{"name": "fallback"}])

        chained = ChainedFoodRepository([mock_repo, fallback])
        results = await chained.search_food_candidates("pizza")

        assert len(results) == 1
        assert results[0]["name"] == "fallback"

    @pytest.mark.asyncio
    async def test_fallback_when_first_raises(self):
        mock_repo = MagicMock()
        mock_repo.search_food_candidates = AsyncMock(side_effect=Exception("DB error"))
        fallback = MagicMock()
        fallback.search_food_candidates = AsyncMock(return_value=[{"name": "fallback"}])

        chained = ChainedFoodRepository([mock_repo, fallback])
        results = await chained.search_food_candidates("pizza")

        assert len(results) == 1
        assert results[0]["name"] == "fallback"

    @pytest.mark.asyncio
    async def test_all_repos_fail_returns_empty(self):
        mock_repo = MagicMock()
        mock_repo.search_food_candidates = AsyncMock(side_effect=Exception("DB error"))
        fallback = MagicMock()
        fallback.search_food_candidates = AsyncMock(return_value=[])

        chained = ChainedFoodRepository([mock_repo, fallback])
        results = await chained.search_food_candidates("pizza")

        assert len(results) == 0

    @pytest.mark.asyncio
    async def test_real_chain_postgres_then_archetype(self):
        """Integration: postgres (no session) → archetype fallback."""
        chained = ChainedFoodRepository([
            PostgresFoodRepository(session=None),
            ArchetypeFoodRepository(),
        ])
        results = await chained.search_food_candidates("pizza")
        assert len(results) == 1
        assert results[0]["name"] == "pizza"


class TestPostgresFoodRepository:
    """Test Postgres repository with mocked session."""

    @pytest.mark.asyncio
    async def test_no_session_returns_empty(self):
        repo = PostgresFoodRepository(session=None)
        results = await repo.search_food_candidates("pizza")
        assert len(results) == 0

    @pytest.mark.asyncio
    async def test_session_without_execute_returns_empty(self):
        repo = PostgresFoodRepository(session="not-a-session")
        results = await repo.search_food_candidates("pizza")
        assert len(results) == 0

    @pytest.mark.asyncio
    async def test_successful_query(self):
        mock_session = MagicMock()
        mock_result = MagicMock()
        mock_result.mappings.return_value = [
            {
                "code": "12345",
                "product_name": "Test Pizza",
                "brands": "Test Brand",
                "serving_size": "100g",
                "serving_quantity": 100,
                "carbs_100g": 30,
                "sugars_100g": 3,
                "fat_100g": 10,
                "proteins_100g": 11,
                "energy_kcal_100g": 266,
            }
        ]
        mock_session.execute = AsyncMock(return_value=mock_result)

        repo = PostgresFoodRepository(session=mock_session)
        results = await repo.search_food_candidates("pizza")

        assert len(results) == 1
        assert results[0]["name"] == "Test Pizza"
        assert results[0]["carbs_per_100g"] == 30
        assert results[0]["match_score"] >= 0.5

    @pytest.mark.asyncio
    async def test_query_exception_returns_empty(self):
        mock_session = MagicMock()
        mock_session.execute = AsyncMock(side_effect=Exception("DB connection failed"))

        repo = PostgresFoodRepository(session=mock_session)
        results = await repo.search_food_candidates("pizza")

        assert len(results) == 0

    @pytest.mark.asyncio
    async def test_diet_coke_filtering(self):
        mock_session = MagicMock()
        mock_result = MagicMock()
        mock_result.mappings.return_value = [
            {
                "code": "1",
                "product_name": "Diet Coke Zero",
                "brands": "Coca-Cola",
                "serving_size": "330ml",
                "serving_quantity": 330,
                "carbs_100g": 0,
                "sugars_100g": 0,
                "fat_100g": 0,
                "proteins_100g": 0,
                "energy_kcal_100g": 1,
            }
        ]
        mock_session.execute = AsyncMock(return_value=mock_result)

        repo = PostgresFoodRepository(session=mock_session)
        results = await repo.search_food_candidates("coke")

        # Regular coke request should filter out diet products
        assert len(results) == 0
