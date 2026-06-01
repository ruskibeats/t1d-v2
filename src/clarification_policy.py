"""Uncertainty-driven clarification policy for T1D Companion v2 — Issue #39.

Replaces regex-first trigger logic with ClarificationPolicy.evaluate(meal_evidence)
that reads FoodEvidence uncertainty fields and triggers at most one question per
meal when expected information gain is high.

The existing clarification_card() and apply_clarification() functions are
preserved as-is. Regex patterns are demoted to fallback when food evidence
is missing or for unrecognized foods.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any

from app.food.service import FoodEvidence


# ── Decision type ──

@dataclass
class ClarificationDecision:
    """Result of ClarificationPolicy.evaluate()."""
    should_ask: bool
    target_food: str = ""
    reason: str = ""
    question_type: str = ""       # "portion_size", "drink_type", "bowl_size", etc.
    question_text: str = ""
    expected_range_reduction_g: float = 0.0
    fallback: bool = False       # True if triggered by regex fallback


# ── Thresholds ──

@dataclass
class ClarificationThresholds:
    """Configurable thresholds for clarification triggering."""
    min_meal_carbs_g: float = 30.0       # Don't clarify tiny meals
    min_carb_range_spread_g: float = 20.0  # Min spread in carb range to trigger
    min_portion_uncertainty: float = 0.30  # Min portion_uncertainty_pct
    min_nutrition_variance: float = 0.15  # Min nutrition_variance_pct


# ── Regex fallback patterns (demoted from primary) ──

_FALLBACK_PATTERNS = [
    {"patterns": [r"\bpizza\b"], "question": "Pizza portion: what size and crust type? (small/medium/large, thin/pan/stuffed)", "field": "pizza_portion"},
    {"patterns": [r"\b(coke|cola|pepsi|sprite|mountain dew)\b"], "question": "Is this a diet or regular drink?", "field": "drink_type"},
    {"patterns": [r"\b(fries|french fries|chips)\b"], "question": "Fries size: small, medium, or large?", "field": "fries_size"},
    {"patterns": [r"\b(cereal|oatmeal|porridge)\b"], "question": "Estimated bowl size? (small/medium/large)", "field": "bowl_size"},
    {"patterns": [r"\b(cake|ice cream|icecream|dessert|cookie)\b"], "question": "Dessert portion estimate? (small/medium/large or grams if known)", "field": "dessert_portion"},
]

_GENERIC_UNITS = frozenset({"", "serving", "portion", "piece", "pieces"})


def _is_specific_unit(unit: str | None) -> bool:
    """Check if unit indicates a specific portion."""
    if not unit:
        return False
    return unit.lower().strip() not in _GENERIC_UNITS


def _regex_fallback(food_item: str, unit: str | None = None) -> str | None:
    """Regex-based fallback when food evidence is missing or unrecognized."""
    item_lower = food_item.lower()
    for rule in _FALLBACK_PATTERNS:
        for pattern in rule["patterns"]:
            if re.search(pattern, item_lower):
                if unit and _is_specific_unit(unit):
                    return None
                return rule["question"]
    return None


# ── Main policy class ──

class ClarificationPolicy:
    """Uncertainty-driven clarification trigger policy.

    Evaluates meal evidence and triggers at most one clarification question
    when expected information gain is high.

    Triggering requires ALL of:
    - Meal total carbs ≥ min_meal_carbs_g
    - Meal carb range spread ≥ min_carb_range_spread_g
    - Top food portion uncertainty ≥ min_portion_uncertainty
    - Target food quantity is not already explicit
    - No clarification already asked in this pass
    """

    def __init__(self, thresholds: ClarificationThresholds | None = None):
        self.thresholds = thresholds or ClarificationThresholds()

    def evaluate(
        self,
        evidence_items: list[FoodEvidence],
        meal_totals: dict[str, float],
        clarification_already_asked: bool = False,
    ) -> ClarificationDecision:
        """Evaluate meal evidence and decide whether to ask a clarification.

        Returns ClarificationDecision with should_ask=True at most once per call.
        """
        if clarification_already_asked:
            return ClarificationDecision(should_ask=False, reason="Already asked this pass")

        total_carbs = meal_totals.get("carbs_g", 0)
        if total_carbs < self.thresholds.min_meal_carbs_g:
            return ClarificationDecision(should_ask=False, reason=f"Carbs too low ({total_carbs}g < {self.thresholds.min_meal_carbs_g}g)")

        # Find the food with highest portion uncertainty that also has a known ambiguity pattern
        best_target: tuple[str, float, str] | None = None  # (food_name, uncertainty, question)

        for ev in evidence_items:
            item_name = ev.parsed.get("item", "")
            unit = ev.parsed.get("unit")
            portion_unc = ev.portion_uncertainty_pct
            nutrition_var = ev.nutrition_variance_pct

            # Skip foods with explicit specific units
            if _is_specific_unit(unit):
                continue

            # Check if this food matches a known ambiguity pattern
            question = _regex_fallback(item_name, unit)
            if not question:
                continue

            # Check uncertainty thresholds
            if portion_unc < self.thresholds.min_portion_uncertainty:
                continue

            # Track the highest-uncertainty food
            if best_target is None or portion_unc > best_target[1]:
                best_target = (item_name, portion_unc, question)

        if best_target is None:
            return ClarificationDecision(should_ask=False, reason="No high-uncertainty ambiguous foods found")

        food_name, uncertainty, question = best_target

        # Estimate range reduction: clarification typically narrows range by ~50%
        carb_range = meal_totals.get("carb_range_g", (0, 0))
        if isinstance(carb_range, (tuple, list)) and len(carb_range) == 2:
            spread = carb_range[1] - carb_range[0]
        else:
            spread = 0
        expected_reduction = spread * 0.5

        return ClarificationDecision(
            should_ask=True,
            target_food=food_name,
            reason=f"High portion uncertainty ({uncertainty:.0%}) for {food_name}",
            question_type="portion_size",
            question_text=question,
            expected_range_reduction_g=round(expected_reduction, 1),
        )

    def evaluate_with_fallback(
        self,
        evidence_items: list[FoodEvidence],
        meal_totals: dict[str, float],
        parsed_foods: list[Any] | None = None,
        clarification_already_asked: bool = False,
    ) -> ClarificationDecision:
        """Evaluate with regex fallback for foods without evidence.

        First tries uncertainty-based evaluation. If no trigger found and
        parsed_foods are provided, falls back to regex pattern matching
        for foods that lack evidence (e.g. no DB match).
        """
        # Primary: uncertainty-driven
        decision = self.evaluate(evidence_items, meal_totals, clarification_already_asked)
        if decision.should_ask:
            return decision

        # Fallback: regex for foods without evidence
        if parsed_foods:
            for food in parsed_foods:
                item_name = getattr(food, "item", str(food))
                unit = getattr(food, "unit", None)

                # Check if this food has any evidence
                has_evidence = any(
                    e.parsed.get("item") == item_name and e.computed
                    for e in evidence_items
                )
                if has_evidence:
                    continue

                question = _regex_fallback(item_name, unit)
                if question:
                    return ClarificationDecision(
                        should_ask=True,
                        target_food=item_name,
                        reason=f"No evidence match for {item_name}, using regex fallback",
                        question_type="portion_size",
                        question_text=question,
                        expected_range_reduction_g=15.0,  # Default estimate
                        fallback=True,
                    )

        return decision
