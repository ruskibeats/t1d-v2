"""Food lookup service — Postgres/OpenFoodFacts only.

No built-in fallback. If Postgres is unavailable, the service returns no match.
The caller is responsible for handling empty results.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from difflib import SequenceMatcher
from typing import Any

from sqlalchemy import text as sql_text

from .foods import (
    CATEGORY_CARB_THRESHOLDS,
    FoodCandidate,
)


@dataclass
class ParsedFood:
    item: str
    quantity: float = 1.0
    unit: str | None = None
    search_terms: list[str] | None = None


@dataclass
class FoodEvidence:
    parsed: dict[str, Any]
    selected_match: dict[str, Any] | None
    computed: dict[str, float] | None
    confidence: str
    warnings: list[str] = field(default_factory=list)
    carb_range_g: tuple[float, float] = (0.0, 0.0)


_PORTION_BY_UNIT_G: dict[str, float] = {
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
    "pizza": 100,
    "packet": 25,
    "bags": 25,
    "bag": 25,
    "pieces": 100,
    "piece": 100,
    "rolls": 60,
    "roll": 60,
}

_DIET_HINT_WORDS = frozenset({"diet", "zero", "sugar free", "no sugar", "sugar-free"})


def _clean(text: str | None) -> str:
    return " ".join((text or "").lower().replace("'", "").replace("-", " ").split())


def _score_candidate(food: ParsedFood, candidate: FoodCandidate) -> float:
    """Score a candidate against the parsed food item. Returns 0.0–1.0."""
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

    return quantity * (candidate.serving_g if candidate else 100)


class FoodService:
    """Postgres/OpenFoodFacts food lookup.

    Requires a live async SQLAlchemy session with an `openfoodfacts_products`
    table. Returns empty list when the DB is unavailable.
    """

    def __init__(self, session=None):
        self.session = session

    async def search_food_candidates(self, food: ParsedFood, limit: int = 8) -> list[dict[str, Any]]:
        """Search Postgres OpenFoodFacts projection for matching products."""
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


def _candidate_from_dict(data: dict[str, Any]) -> FoodCandidate:
    fields = {name: data.get(name) for name in FoodCandidate.__dataclass_fields__}
    aliases = fields.get("aliases") or ()
    if isinstance(aliases, list):
        aliases = tuple(aliases)
    fields["aliases"] = aliases
    return FoodCandidate(**fields)


def calculate_food_evidence(food: ParsedFood, candidates: list[dict[str, Any]]) -> FoodEvidence:
    """Compute nutrition evidence from the top-ranked match."""
    if not candidates:
        grams = estimate_serving_grams(food)
        return FoodEvidence(
            parsed={"item": food.item, "quantity": food.quantity, "unit": food.unit, "estimated_serving_g": round(grams, 1)},
            selected_match=None,
            computed=None,
            confidence="low",
            warnings=["No nutrition match found in database"],
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

    confidence = "high" if score >= 0.85 else "medium" if score >= 0.6 else "low"
    warnings: list[str] = []
    if confidence == "low":
        warnings.append("Food match is uncertain")
    if computed["fat_g"] >= 15:
        warnings.append("High fat may delay glucose rise")

    # Diet/regular drink signal
    item_clean = _clean(food.item)
    if any(w in item_clean for w in ("diet",)):
        warnings.append("Sugars may be lower if diet/sugar-free — check label")

    # Coating detection
    if any(w in item_clean for w in ("bread", "fried", "battered")):
        warnings.append("Breaded/fried coating adds unknown extra carbs")

    if not food.unit or _clean(food.unit) in {"", "serving", "portion"}:
        warnings.append("Portion size estimated — check actual serving")

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
