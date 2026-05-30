"""Data types and category thresholds for food evidence.

No built-in food database. Nutrition data comes from Postgres/OpenFoodFacts.
This module provides only the data structures used to represent DB results.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class FoodCandidate:
    """A single food match from any source (Postgres, test fixture, etc.)."""
    name: str
    serving_g: float
    carbs_per_100g: float
    fat_per_100g: float = 0.0
    sugars_per_100g: float = 0.0
    protein_per_100g: float = 0.0
    kcal_per_100g: float = 0.0
    aliases: tuple[str, ...] = ()
    category: str = "mixed"


# Per-category carb sanity thresholds for Postgres results.
# If a product matches semantically but its carbs/100g exceed the expected
# range for its category, the evidence layer flags a warning.
CATEGORY_CARB_THRESHOLDS: dict[str, float] = {
    "protein": 10.0,   # >10g/100g carbs on meat/fish suggests wrong match
    "fat": 5.0,
    "drink": 15.0,
    "fruit": 30.0,
    "vegetable": 15.0,
}
