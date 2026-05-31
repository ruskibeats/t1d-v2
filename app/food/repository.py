#!/usr/bin/env python3
"""Food repository base — abstract contract for food data sources."""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any

from .foods import FoodCandidate


class FoodRepository(ABC):
    """Abstract base for food data repositories.

    Implementations:
      - PostgresFoodRepository: searches OpenFoodFacts Postgres table
      - ArchetypeFoodRepository: deterministic built-in food data
    """

    @abstractmethod
    async def search_food_candidates(
        self,
        item_name: str,
        search_terms: list[str] | None = None,
        limit: int = 8,
    ) -> list[dict[str, Any]]:
        """Search for food candidates matching the given item.

        Args:
            item_name: Canonical food item name
            search_terms: Additional search terms for matching
            limit: Max results to return

        Returns:
            List of candidate dicts with keys: name, serving_g, carbs_per_100g,
            fat_per_100g, sugars_per_100g, protein_per_100g, kcal_per_100g,
            match_score, estimated_serving_g, etc.
        """
        ...
