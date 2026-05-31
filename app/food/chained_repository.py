#!/usr/bin/env python3
"""Chained food repository — tries DB first, falls back to archetypes."""

from __future__ import annotations

from typing import Any

from .repository import FoodRepository


class ChainedFoodRepository(FoodRepository):
    """Composite repository that tries each sub-repository in order.

    Usage:
        repo = ChainedFoodRepository([
            PostgresFoodRepository(session),
            ArchetypeFoodRepository(),
        ])
        candidates = await repo.search_food_candidates("pizza")
    """

    def __init__(self, repositories: list[FoodRepository]):
        self.repositories = repositories

    async def search_food_candidates(
        self,
        item_name: str,
        search_terms: list[str] | None = None,
        limit: int = 8,
    ) -> list[dict[str, Any]]:
        for repo in self.repositories:
            try:
                results = await repo.search_food_candidates(item_name, search_terms, limit)
                if results:
                    return results
            except Exception:
                continue  # Try next repository
        return []
