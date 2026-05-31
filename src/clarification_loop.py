#!/usr/bin/env python3
"""Clarifying question loop detection for ambiguous meal inputs.

When food or portion uncertainty is high, ask one targeted follow-up question
before producing a forecast.
"""

from __future__ import annotations

import re
from typing import Any

# Ambiguity detection patterns
_AMBIGUITY_PATTERNS = [
    # Pizza portion ambiguity
    {
        "patterns": [r"\bpizza\b"],
        "question": "Pizza portion: what size and crust type? (small/medium/large, thin/pan/stuffed)",
        "field": "pizza_portion",
    },
    # Diet/regular drink ambiguity  
    {
        "patterns": [r"\b(coke|cola|pepsi|sprite|mountain dew)\b"],
        "question": "Is this a diet or regular drink?",
        "field": "drink_type",
    },
    # Fries size ambiguity
    {
        "patterns": [r"\b(fries|french fries|chips|chips|fry)\b"],
        "question": "Fries size: small, medium, or large?",
        "field": "fries_size",
    },
    # Cereal bowl size ambiguity
    {
        "patterns": [r"\b(cereal|oatmeal|porridge)\b"],
        "question": "Estimated bowl size? (small/medium/large)",
        "field": "bowl_size",
    },
    # Dessert portion ambiguity
    {
        "patterns": [r"\b(cake|ice cream|icecream|dessert|cookie|cookies|cookie)\b"],
        "question": "Dessert portion estimate? (small/medium/large or grams if known)",
        "field": "dessert_portion",
    },
]


def detect_ambiguity(food_item: str, unit: str | None = None) -> str | None:
    """Detect if a food item has ambiguous portion or type.
    
    Returns the clarification question if ambiguous, None otherwise.
    """
    item_lower = food_item.lower()
    
    for rule in _AMBIGUITY_PATTERNS:
        for pattern in rule["patterns"]:
            if re.search(pattern, item_lower):
                # Check if portion is already specified
                if unit and _is_specific_unit(unit):
                    return None
                return rule["question"]
    
    return None


def _is_specific_unit(unit: str) -> bool:
    """Check if unit indicates a specific portion (not generic)."""
    unit_lower = unit.lower().strip()
    # Generic units that still need clarification
    generic_units = {"", "serving", "portion", "piece", "pieces"}
    return unit_lower not in generic_units and unit_lower is not None


def clarification_card(question: str, food_item: str) -> str:
    """Render a clarification card asking for more details."""
    return (
        f"\n━━━ Clarification Needed ━━━\n"
        f"💬 {food_item}\n\n"
        f"{question}\n\n"
        f"Respond with your best estimate so I can give you a more accurate forecast.\n"
        f"(Educational simulation only — not medical advice.)\n"
    )


def apply_clarification(food_item: str, clarification: str, original_parsed: dict) -> dict:
    """Apply a clarification answer to refine the food estimate.
    
    Returns updated parsed food dict with refined quantity/unit.
    """
    result = dict(original_parsed)
    answer_lower = clarification.lower().strip()
    
    # Pizza portion multipliers
    if original_parsed.get("item", "").lower() == "pizza":
        base_grams = 100  # Default slice
        if "large" in answer_lower:
            result["adjustment_factor"] = 1.5
        elif "small" in answer_lower:
            result["adjustment_factor"] = 0.7
        else:
            result["adjustment_factor"] = 1.0
    
    # Drink type: diet typically has ~10g carbs per serving vs ~35g for regular
    if re.search(r"\b(coke|cola|pepsi|sprite|mountain dew)\b", original_parsed.get("item", "").lower()):
        result["is_diet"] = "diet" in answer_lower or "zero" in answer_lower or "sugar free" in answer_lower
        result["carb_multiplier"] = 0.3 if result["is_diet"] else 1.0
    
    # Fries size multipliers
    if re.search(r"\b(fries|chips|chip)\b", original_parsed.get("item", "").lower()):
        if "large" in answer_lower:
            result["adjustment_factor"] = 1.5
        elif "small" in answer_lower:
            result["adjustment_factor"] = 0.7
        else:
            result["adjustment_factor"] = 1.0
    
    # Bowl size multipliers
    if re.search(r"\b(cereal|oatmeal|porridge)\b", original_parsed.get("item", "").lower()):
        if "large" in answer_lower:
            result["adjustment_factor"] = 1.3
        elif "small" in answer_lower:
            result["adjustment_factor"] = 0.7
        else:
            result["adjustment_factor"] = 1.0
    
    return result