#!/usr/bin/env python3
"""Postgres-backed food repository — searches OpenFoodFacts table."""

from __future__ import annotations

import logging
from dataclasses import asdict
from difflib import SequenceMatcher
from typing import Any

from sqlalchemy import text as sql_text

from .foods import FoodCandidate
from .repository import FoodRepository

logger = logging.getLogger(__name__)


def _clean(text: str | None) -> str:
    return " ".join((text or "").lower().replace("'", "").replace("-", " ").split())


def _score_candidate(item_name: str, search_terms: list[str] | None, candidate: FoodCandidate) -> float:
    """Score a candidate against the parsed food item. Returns 0.0–1.0."""
    item = _clean(item_name)
    terms = [_clean(t) for t in (search_terms or [])]
    names = [_clean(candidate.name), *[_clean(a) for a in candidate.aliases]]
    haystack = [item, *terms]

    score = 0.0
    for query in haystack:
        for name in names:
            if not query or not name:
                continue
            if query == name:
                score = max(score, 1.0)
            elif query in name or name in query:
                score = max(score, 0.88)
            else:
                score = max(score, SequenceMatcher(None, query, name).ratio())
    return score


def _estimate_serving_grams(
    quantity: float,
    unit: str | None,
    item_name: str,
    candidate: FoodCandidate | None = None,
) -> float:
    """Estimate total grams from parsed quantity/unit and candidate defaults."""
    _PORTION_BY_UNIT_G: dict[str, float] = {
        "wing": 50, "wings": 50, "slice": 100, "slices": 100,
        "scoop": 65, "scoops": 65, "pint": 568, "can": 330,
        "glass": 175, "plate": 300, "bowl": 300, "pot": 200,
        "portion": 150, "large": 150, "burger": 219, "pizza": 100,
        "packet": 25, "bags": 25, "bag": 25, "pieces": 100,
        "piece": 100, "rolls": 60, "roll": 60,
    }

    unit_clean = _clean(unit)
    if unit_clean in {"g", "gram", "grams"}:
        return quantity
    if unit_clean in {"ml", "millilitre", "milliliter"}:
        return quantity
    if unit_clean in _PORTION_BY_UNIT_G:
        return quantity * _PORTION_BY_UNIT_G[unit_clean]

    return quantity * (candidate.serving_g if candidate else 100)


class PostgresFoodRepository(FoodRepository):
    """Postgres/OpenFoodFacts food lookup.

    Requires a live async SQLAlchemy session with an `openfoodfacts_products`
    table. Returns empty list when the DB is unavailable.
    """

    def __init__(self, session=None):
        self.session = session

    async def search_food_candidates(
        self,
        item_name: str,
        search_terms: list[str] | None = None,
        limit: int = 8,
    ) -> list[dict[str, Any]]:
        if self.session is None or not hasattr(self.session, "execute"):
            return []

        terms = [item_name, *((search_terms or [])[:3])]
        rows: list[dict[str, Any]] = []
        seen: set[str] = set()

        for term in terms:
            words = [w for w in _clean(term).replace("-", " ").split() if len(w) >= 3]
            if not words:
                continue

            where = " AND ".join(f"product_name ILIKE :w{i}" for i in range(len(words)))
            params = {f"w{i}": f"%{word}%" for i, word in enumerate(words)}
            params["limit"] = limit * 3

            query = sql_text(f"""
                SELECT
                    code,
                    product_name,
                    brands,
                    serving_size,
                    serving_quantity,
                    carbs_100g,
                    sugars_100g,
                    fat_100g,
                    proteins_100g,
                    energy_kcal_100g
                FROM openfoodfacts_products
                WHERE {where}
                  AND product_name IS NOT NULL
                  AND carbs_100g IS NOT NULL
                LIMIT :limit
            """)
            try:
                result = await self.session.execute(query, params)
            except Exception:
                return []

            for row in result.mappings():
                code = str(row.get("code") or row.get("product_name") or "")
                if not code or code in seen:
                    continue
                seen.add(code)

                product_name = str(row.get("product_name") or "unknown")
                sugars = float(row.get("sugars_100g") or 0)
                carbs = float(row.get("carbs_100g") or 0)
                query_text = _clean(" ".join([item_name, *(search_terms or [])]))
                product_text = _clean(product_name)

                # Diet/regular cola disambiguation
                is_diet_product = any(token in product_text for token in ("diet", "zero", "sugar free", "no sugar"))
                wants_regular_cola = any(token in query_text for token in ("coke", "cola", "soft drink")) and "diet" not in query_text and "zero" not in query_text
                if wants_regular_cola and (is_diet_product or sugars < 5 or carbs < 5):
                    continue

                candidate = FoodCandidate(
                    name=product_name,
                    serving_g=float(row.get("serving_quantity") or 100),
                    carbs_per_100g=carbs,
                    fat_per_100g=float(row.get("fat_100g") or 0),
                    sugars_per_100g=sugars,
                    protein_per_100g=float(row.get("proteins_100g") or 0),
                    kcal_per_100g=float(row.get("energy_kcal_100g") or 0),
                    aliases=(str(row.get("brands") or ""),),
                )
                score = _score_candidate(item_name, search_terms, candidate)
                grams = _estimate_serving_grams(1.0, None, item_name, candidate)

                rows.append({
                    **asdict(candidate),
                    "barcode": code,
                    "brand": row.get("brands"),
                    "serving_size": row.get("serving_size"),
                    "match_score": round(max(score, 0.5), 3),
                    "estimated_serving_g": round(grams, 1),
                })

        rows.sort(key=lambda c: c.get("match_score", 0), reverse=True)
        return rows[:limit]
