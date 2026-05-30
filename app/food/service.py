"""Standalone food lookup and nutrition evidence service.

This module intentionally avoids external services for the v2 companion demo. It
provides deterministic, auditable nutrition estimates for common meal archetypes
used by the forecast and golden-test docs.
"""

from __future__ import annotations

from dataclasses import dataclass, field, asdict
from difflib import SequenceMatcher
from typing import Any

from sqlalchemy import text as sql_text


@dataclass
class ParsedFood:
    item: str
    quantity: float = 1.0
    unit: str | None = None
    search_terms: list[str] | None = None


@dataclass(frozen=True)
class FoodCandidate:
    name: str
    serving_g: float
    carbs_per_100g: float
    fat_per_100g: float = 0.0
    sugars_per_100g: float = 0.0
    protein_per_100g: float = 0.0
    kcal_per_100g: float = 0.0
    aliases: tuple[str, ...] = ()
    source: str = "built_in"


@dataclass
class FoodEvidence:
    parsed: dict[str, Any]
    selected_match: dict[str, Any] | None
    computed: dict[str, float] | None
    confidence: str
    warnings: list[str] = field(default_factory=list)
    carb_range_g: tuple[float, float] = (0.0, 0.0)


_BUILTIN_FOODS: tuple[FoodCandidate, ...] = (
    FoodCandidate("pizza", 100, 33, 10, 4, 12, 266, ("slice of pizza", "pepperoni pizza")),
    FoodCandidate("cereal", 40, 75, 3, 28, 8, 380, ("breakfast cereal", "corn flakes", "frosties")),
    FoodCandidate("donut", 70, 45, 20, 18, 5, 420, ("doughnut", "glazed doughnut")),
    FoodCandidate("pasta", 300, 25, 2, 1, 5, 150, ("spaghetti", "noodles")),
    FoodCandidate("rice", 180, 28, 0.3, 0.1, 2.7, 130, ("white rice", "sushi rice")),
    FoodCandidate("sushi", 150, 28, 3, 5, 8, 180, ("sushi roll", "maki")),
    FoodCandidate("fruit", 150, 14, 0.3, 10, 0.5, 60, ("apple", "banana", "berries")),
    FoodCandidate("ice cream", 65, 24, 11, 21, 3.5, 207, ("vanilla ice cream", "scoop ice cream")),
    FoodCandidate("fries", 150, 41, 15, 0.3, 3.4, 312, ("chips", "french fries", "large fries")),
    FoodCandidate("big mac", 219, 20, 12, 4, 12, 257, ("mcdonalds big mac", "burger")),
    FoodCandidate("chicken wings", 50, 6, 16, 0, 23, 290, ("breaded chicken wings", "buffalo wings")),
    FoodCandidate("coleslaw", 200, 13, 9, 10, 1, 152, ("slaw",)),
    FoodCandidate("steak", 190, 0, 12, 0, 26, 217, ("fillet steak", "beef steak")),
    FoodCandidate("lager", 568, 3.6, 0, 0.1, 0.5, 43, ("beer", "ale", "pint lager")),
    FoodCandidate("soft drink", 330, 10.6, 0, 10.6, 0, 42, ("coke", "cola", "soda")),
    FoodCandidate("soup", 300, 7, 2, 2, 3, 55, ("stew",)),
    FoodCandidate("curry", 300, 12, 8, 4, 8, 150, ("stew curry",)),
)


_PORTION_BY_UNIT_G = {
    "wing": 50,
    "wings": 50,
    "slice": 100,
    "slices": 100,
    "scoop": 65,
    "scoops": 65,
    "pint": 568,
    "can": 330,
    "glass": 175,
    "plate": 300,
    "bowl": 300,
    "pot": 200,
    "portion": 150,
    "large": 150,
    "burger": 219,
}


def _clean(text: str | None) -> str:
    return " ".join((text or "").lower().replace("'", "").replace("-", " ").split())


def _score_candidate(food: ParsedFood, candidate: FoodCandidate) -> float:
    item = _clean(food.item)
    terms = [_clean(t) for t in (food.search_terms or [])]
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


def estimate_serving_grams(food: ParsedFood, candidate: FoodCandidate | None = None) -> float:
    """Estimate total grams from parsed quantity/unit and candidate defaults."""
    quantity = float(food.quantity or 1.0)
    unit = _clean(food.unit)
    item = _clean(food.item)

    if unit in {"g", "gram", "grams"}:
        return quantity
    if unit in {"ml", "millilitre", "milliliter", "millilitres", "milliliters"}:
        return quantity
    if unit in _PORTION_BY_UNIT_G:
        return quantity * _PORTION_BY_UNIT_G[unit]

    # Item-based fallbacks matching prompts/normalise_portions.txt.
    if "wing" in item:
        return quantity * 50
    if "coleslaw" in item or "salad" in item or "vegetable" in item:
        return quantity * 200
    if "lager" in item or "beer" in item or "ale" in item:
        return quantity * 568
    if "pizza" in item:
        return quantity * 100
    if "pasta" in item or "rice" in item or "noodle" in item:
        return quantity * 300
    if "ice cream" in item:
        return quantity * 65
    if "steak" in item:
        return quantity * 190
    if "fries" in item or "chips" in item:
        return quantity * 150
    if "soup" in item or "curry" in item or "stew" in item:
        return quantity * 300

    return quantity * (candidate.serving_g if candidate else 100)


class FoodService:
    """Food lookup service with Postgres OpenFoodFacts + deterministic fallback.

    If `session` is an async SQLAlchemy session connected to a database with the
    `openfoodfacts_products` table, candidates come from that 2.5M+ product DB.
    If the DB is unavailable or returns no candidates, built-in deterministic
    archetypes are used so the demo remains fully offline-capable.
    """

    def __init__(self, session=None):
        self.session = session

    async def _search_postgres_openfoodfacts(self, food: ParsedFood, limit: int = 8) -> list[dict[str, Any]]:
        """Search local Postgres OpenFoodFacts projection when available."""
        if self.session is None or not hasattr(self.session, "execute"):
            return []
        terms = [food.item, *((food.search_terms or [])[:3])]
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
                query_text = _clean(" ".join([food.item, *(food.search_terms or [])]))
                product_text = _clean(product_name)
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
                    source="openfoodfacts_postgres",
                )
                score = _score_candidate(food, candidate)
                rows.append({
                    **asdict(candidate),
                    "barcode": code,
                    "brand": row.get("brands"),
                    "serving_size": row.get("serving_size"),
                    "match_score": round(max(score, 0.5), 3),
                    "estimated_serving_g": round(estimate_serving_grams(food, candidate), 1),
                })
        rows.sort(key=lambda c: c.get("match_score", 0), reverse=True)
        return rows[:limit]

    def _search_builtin_candidates(self, food: ParsedFood, limit: int = 5) -> list[dict[str, Any]]:
        ranked = [(_score_candidate(food, candidate), candidate) for candidate in _BUILTIN_FOODS]
        ranked = [(score, candidate) for score, candidate in ranked if score >= 0.45]
        ranked.sort(key=lambda pair: pair[0], reverse=True)
        return [
            {
                **asdict(candidate),
                "match_score": round(score, 3),
                "estimated_serving_g": round(estimate_serving_grams(food, candidate), 1),
            }
            for score, candidate in ranked[:limit]
        ]

    async def search_food_candidates(self, food: ParsedFood) -> list[dict[str, Any]]:
        """Return ranked nutrition candidates for a parsed food item."""
        db_candidates = await self._search_postgres_openfoodfacts(food)
        if db_candidates:
            return db_candidates
        return self._search_builtin_candidates(food)


def _confidence_from_score(score: float) -> str:
    if score >= 0.85:
        return "high"
    if score >= 0.6:
        return "medium"
    return "low"


def _candidate_from_dict(data: dict[str, Any]) -> FoodCandidate:
    fields = {name: data.get(name) for name in FoodCandidate.__dataclass_fields__}
    aliases = fields.get("aliases") or ()
    if isinstance(aliases, list):
        aliases = tuple(aliases)
    fields["aliases"] = aliases
    return FoodCandidate(**fields)


def calculate_food_evidence(food: ParsedFood, candidates) -> FoodEvidence:
    """Select best candidate and compute nutrition evidence.

    Returns confidence, selected match, macro totals, and a carb uncertainty band
    for downstream forecast uncertainty.
    """
    if not candidates:
        grams = estimate_serving_grams(food)
        return FoodEvidence(
            parsed={"item": food.item, "quantity": food.quantity, "unit": food.unit, "estimated_serving_g": round(grams, 1)},
            selected_match=None,
            computed=None,
            confidence="low",
            warnings=["No local nutrition match found"],
        )

    selected = dict(candidates[0])
    candidate = _candidate_from_dict(selected)
    score = float(selected.get("match_score", 0.0) or 0.0)
    grams = float(selected.get("estimated_serving_g") or estimate_serving_grams(food, candidate))
    multiplier = grams / 100.0

    computed = {
        "serving_g": round(grams, 1),
        "carbs_g": round(candidate.carbs_per_100g * multiplier, 1),
        "fat_g": round(candidate.fat_per_100g * multiplier, 1),
        "sugars_g": round(candidate.sugars_per_100g * multiplier, 1),
        "protein_g": round(candidate.protein_per_100g * multiplier, 1),
        "kcal": round(candidate.kcal_per_100g * multiplier),
    }

    confidence = _confidence_from_score(score)
    warnings: list[str] = []
    if confidence == "low":
        warnings.append("Food match is uncertain")
    if "wing" in _clean(food.item) and "bread" not in candidate.name and "bread" not in " ".join(candidate.aliases):
        warnings.append("Breaded/fried coating may add carbs")
    if computed["fat_g"] >= 15:
        warnings.append("High fat may delay glucose rise")

    uncertainty = 0.10 if confidence == "high" else 0.25 if confidence == "medium" else 0.45
    carbs = computed["carbs_g"]
    carb_range = (round(max(0.0, carbs * (1 - uncertainty)), 1), round(carbs * (1 + uncertainty), 1))

    return FoodEvidence(
        parsed={"item": food.item, "quantity": food.quantity, "unit": food.unit, "estimated_serving_g": round(grams, 1)},
        selected_match=selected,
        computed=computed,
        confidence=confidence,
        warnings=warnings,
        carb_range_g=carb_range,
    )


def combine_food_evidence(evidence_items: list[FoodEvidence]) -> dict[str, Any]:
    """Aggregate item-level evidence into meal totals."""
    totals = {"carbs_g": 0.0, "fat_g": 0.0, "sugars_g": 0.0, "protein_g": 0.0, "kcal": 0.0}
    carb_low = 0.0
    carb_high = 0.0
    warnings: list[str] = []
    confidences: list[str] = []

    for evidence in evidence_items:
        confidences.append(evidence.confidence)
        warnings.extend(evidence.warnings)
        if evidence.computed:
            for key in totals:
                totals[key] += float(evidence.computed.get(key, 0.0) or 0.0)
        carb_low += evidence.carb_range_g[0]
        carb_high += evidence.carb_range_g[1]

    confidence_rank = {"low": 0, "medium": 1, "high": 2}
    overall = min(confidences, key=lambda c: confidence_rank.get(c, 0)) if confidences else "low"
    return {
        "totals": {key: round(value, 1) for key, value in totals.items()},
        "total_carbs_g_range": (round(carb_low, 1), round(carb_high, 1)),
        "confidence_overall": overall,
        "warnings": list(dict.fromkeys(warnings)),
        "evidence_items": [asdict(item) for item in evidence_items],
    }
