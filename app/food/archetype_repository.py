#!/usr/bin/env python3
"""Archetype food repository — deterministic built-in food data fallback."""

from __future__ import annotations

from typing import Any

from .foods import FoodCandidate
from .repository import FoodRepository


# Built-in food archetypes for when Postgres is unavailable
# Values are approximate and educational only
_FOOD_ARCHETYPES: dict[str, dict[str, float]] = {
    "pizza": {"serving_g": 100, "carbs_per_100g": 32, "fat_per_100g": 10, "sugars_per_100g": 3, "protein_per_100g": 11, "kcal_per_100g": 266},
    "coke": {"serving_g": 330, "carbs_per_100g": 10.6, "fat_per_100g": 0, "sugars_per_100g": 10.6, "protein_per_100g": 0, "kcal_per_100g": 42},
    "donut": {"serving_g": 60, "carbs_per_100g": 50, "fat_per_100g": 22, "sugars_per_100g": 25, "protein_per_100g": 5, "kcal_per_100g": 452},
    "fries": {"serving_g": 150, "carbs_per_100g": 37, "fat_per_100g": 15, "sugars_per_100g": 0.3, "protein_per_100g": 3.4, "kcal_per_100g": 312},
    "burger": {"serving_g": 219, "carbs_per_100g": 20, "fat_per_100g": 15, "sugars_per_100g": 4, "protein_per_100g": 17, "kcal_per_100g": 295},
    "chicken": {"serving_g": 150, "carbs_per_100g": 0, "fat_per_100g": 10, "sugars_per_100g": 0, "protein_per_100g": 27, "kcal_per_100g": 239},
    "rice": {"serving_g": 150, "carbs_per_100g": 28, "fat_per_100g": 0.3, "sugars_per_100g": 0.1, "protein_per_100g": 2.7, "kcal_per_100g": 130},
    "pasta": {"serving_g": 150, "carbs_per_100g": 25, "fat_per_100g": 1.1, "sugars_per_100g": 0.8, "protein_per_100g": 5, "kcal_per_100g": 131},
    "bread": {"serving_g": 40, "carbs_per_100g": 49, "fat_per_100g": 3.5, "sugars_per_100g": 5, "protein_per_100g": 9, "kcal_per_100g": 265},
    "ice cream": {"serving_g": 65, "carbs_per_100g": 24, "fat_per_100g": 11, "sugars_per_100g": 21, "protein_per_100g": 3.5, "kcal_per_100g": 207},
    "lager": {"serving_g": 568, "carbs_per_100g": 3.6, "fat_per_100g": 0, "sugars_per_100g": 0.3, "protein_per_100g": 0.3, "kcal_per_100g": 43},
    "salad": {"serving_g": 200, "carbs_per_100g": 3.3, "fat_per_100g": 0.2, "sugars_per_100g": 2, "protein_per_100g": 1.3, "kcal_per_100g": 17},
    "cereal": {"serving_g": 40, "carbs_per_100g": 84, "fat_per_100g": 1.9, "sugars_per_100g": 37, "protein_per_100g": 7, "kcal_per_100g": 379},
    "steak": {"serving_g": 190, "carbs_per_100g": 0, "fat_per_100g": 15, "sugars_per_100g": 0, "protein_per_100g": 26, "kcal_per_100g": 271},
    "bacon": {"serving_g": 50, "carbs_per_100g": 1.4, "fat_per_100g": 42, "sugars_per_100g": 1, "protein_per_100g": 37, "kcal_per_100g": 541},
    "eggs": {"serving_g": 60, "carbs_per_100g": 1.1, "fat_per_100g": 10, "sugars_per_100g": 1.1, "protein_per_100g": 13, "kcal_per_100g": 155},
    "coffee": {"serving_g": 240, "carbs_per_100g": 0.2, "fat_per_100g": 0, "sugars_per_100g": 0, "protein_per_100g": 0.1, "kcal_per_100g": 2},
    "tea": {"serving_g": 240, "carbs_per_100g": 0.2, "fat_per_100g": 0, "sugars_per_100g": 0, "protein_per_100g": 0, "kcal_per_100g": 1},
    "milk": {"serving_g": 250, "carbs_per_100g": 4.8, "fat_per_100g": 3.3, "sugars_per_100g": 4.8, "protein_per_100g": 3.2, "kcal_per_100g": 65},
    "banana": {"serving_g": 120, "carbs_per_100g": 23, "fat_per_100g": 0.3, "sugars_per_100g": 12, "protein_per_100g": 1.1, "kcal_per_100g": 89},
    "apple": {"serving_g": 180, "carbs_per_100g": 14, "fat_per_100g": 0.2, "sugars_per_100g": 10, "protein_per_100g": 0.3, "kcal_per_100g": 52},
    "cake": {"serving_g": 80, "carbs_per_100g": 53, "fat_per_100g": 16, "sugars_per_100g": 36, "protein_per_100g": 4.5, "kcal_per_100g": 371},
    "chocolate": {"serving_g": 40, "carbs_per_100g": 57, "fat_per_100g": 31, "sugars_per_100g": 52, "protein_per_100g": 4.9, "kcal_per_100g": 546},
    "cheese": {"serving_g": 40, "carbs_per_100g": 1.3, "fat_per_100g": 33, "sugars_per_100g": 0.3, "protein_per_100g": 25, "kcal_per_100g": 402},
    "yogurt": {"serving_g": 150, "carbs_per_100g": 7, "fat_per_100g": 3.3, "sugars_per_100g": 7, "protein_per_100g": 3.5, "kcal_per_100g": 61},
    "soup": {"serving_g": 300, "carbs_per_100g": 5, "fat_per_100g": 2, "sugars_per_100g": 2, "protein_per_100g": 3, "kcal_per_100g": 46},
    "curry": {"serving_g": 300, "carbs_per_100g": 8, "fat_per_100g": 8, "sugars_per_100g": 3, "protein_per_100g": 7, "kcal_per_100g": 120},
    "sushi": {"serving_g": 200, "carbs_per_100g": 18, "fat_per_100g": 0.5, "sugars_per_100g": 1.5, "protein_per_100g": 7, "kcal_per_100g": 143},
    "coleslaw": {"serving_g": 100, "carbs_per_100g": 9, "fat_per_100g": 9, "sugars_per_100g": 7, "protein_per_100g": 1, "kcal_per_100g": 116},
    "sausage": {"serving_g": 60, "carbs_per_100g": 3, "fat_per_100g": 25, "sugars_per_100g": 1.5, "protein_per_100g": 14, "kcal_per_100g": 301},
    "fish": {"serving_g": 150, "carbs_per_100g": 0, "fat_per_100g": 5, "sugars_per_100g": 0, "protein_per_100g": 20, "kcal_per_100g": 206},
    "vegetables": {"serving_g": 150, "carbs_per_100g": 5, "fat_per_100g": 0.2, "sugars_per_100g": 2.5, "protein_per_100g": 1.5, "kcal_per_100g": 25},
    "potato": {"serving_g": 200, "carbs_per_100g": 17, "fat_per_100g": 0.1, "sugars_per_100g": 0.8, "protein_per_100g": 2, "kcal_per_100g": 77},
    "crisps": {"serving_g": 35, "carbs_per_100g": 53, "fat_per_100g": 35, "sugars_per_100g": 0.3, "protein_per_100g": 6, "kcal_per_100g": 536},
    "biscuit": {"serving_g": 15, "carbs_per_100g": 68, "fat_per_100g": 20, "sugars_per_100g": 30, "protein_per_100g": 7, "kcal_per_100g": 460},
    "wine": {"serving_g": 175, "carbs_per_100g": 2.6, "fat_per_100g": 0, "sugars_per_100g": 0.6, "protein_per_100g": 0.1, "kcal_per_100g": 83},
    "butter": {"serving_g": 10, "carbs_per_100g": 0.1, "fat_per_100g": 81, "sugars_per_100g": 0.1, "protein_per_100g": 0.9, "kcal_per_100g": 717},
    "fruit": {"serving_g": 150, "carbs_per_100g": 12, "fat_per_100g": 0.3, "sugars_per_100g": 9, "protein_per_100g": 0.8, "kcal_per_100g": 52},
}


class ArchetypeFoodRepository(FoodRepository):
    """Deterministic built-in food archetypes.

    Provides fallback nutrition data when Postgres is unavailable.
    All values are approximate and for educational simulation only.
    """

    async def search_food_candidates(
        self,
        item_name: str,
        search_terms: list[str] | None = None,
        limit: int = 8,
    ) -> list[dict[str, Any]]:
        item_lower = item_name.lower()

        # Direct match
        if item_lower in _FOOD_ARCHETYPES:
            return [self._to_candidate(item_name, _FOOD_ARCHETYPES[item_lower])]

        # Search term match
        for term in (search_terms or []):
            term_lower = term.lower()
            if term_lower in _FOOD_ARCHETYPES:
                return [self._to_candidate(term, _FOOD_ARCHETYPES[term_lower])]

        # Partial match
        for archetype_name, data in _FOOD_ARCHETYPES.items():
            if archetype_name in item_lower or item_lower in archetype_name:
                return [self._to_candidate(archetype_name, data)]

        return []

    def _to_candidate(self, name: str, data: dict[str, float]) -> dict[str, Any]:
        return {
            "name": name,
            "serving_g": data["serving_g"],
            "carbs_per_100g": data["carbs_per_100g"],
            "fat_per_100g": data["fat_per_100g"],
            "sugars_per_100g": data["sugars_per_100g"],
            "protein_per_100g": data["protein_per_100g"],
            "kcal_per_100g": data["kcal_per_100g"],
            "aliases": (),
            "barcode": "archetype",
            "brand": None,
            "serving_size": None,
            "match_score": 0.75,
            "estimated_serving_g": data["serving_g"],
        }
