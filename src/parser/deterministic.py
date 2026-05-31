#!/usr/bin/env python3
"""Deterministic meal parser — regex-based fallback for known food patterns."""

from __future__ import annotations

import re
from typing import Any

from app.food.service import ParsedFood
from .base import MealParser


# Food aliases for search term resolution
_ALIASES: dict[str, list[str]] = {
    "coke": ["coca cola", "coke", "cola"],
    "cola": ["coca cola", "cola", "coke"],
    "diet coke": ["diet coke", "coca cola zero", "diet cola"],
    "donut": ["donut", "doughnut"],
    "doughnut": ["doughnut", "donut"],
    "pizza": ["pizza", "pepperoni pizza"],
    "cereal": ["cereal", "breakfast cereal", "corn flakes"],
    "pasta": ["pasta", "spaghetti", "noodles"],
    "rice": ["rice", "white rice"],
    "sushi": ["sushi", "sushi roll"],
    "fries": ["fries", "french fries", "chips"],
    "chips": ["fries", "french fries"],
    "lager": ["lager", "beer", "pilsner"],
    "beer": ["beer", "lager"],
    "ice cream": ["ice cream", "vanilla ice cream"],
    "chicken wings": ["chicken wings", "buffalo wings"],
    "chicken": ["chicken", "grilled chicken", "chicken breast"],
    "steak": ["steak", "fillet steak"],
    "bread": ["bread", "toast", "sliced bread"],
    "bacon": ["bacon", "rashers"],
    "burger": ["burger", "beef burger", "cheeseburger"],
    "sausage": ["sausage", "pork sausage"],
    "eggs": ["eggs", "scrambled eggs", "fried eggs"],
    "fish": ["fish", "cod", "salmon", "haddock"],
    "salad": ["salad", "green salad", "side salad"],
    "vegetables": ["vegetables", "mixed vegetables"],
    "banana": ["banana"],
    "apple": ["apple"],
    "cake": ["cake", "sponge cake"],
    "biscuit": ["biscuit", "cookies"],
    "chocolate": ["chocolate", "milk chocolate"],
    "crisps": ["crisps", "potato crisps"],
    "cheese": ["cheese", "cheddar"],
    "potato": ["potato", "potatoes"],
    "milk": ["milk", "semi skimmed milk", "whole milk"],
    "coffee": ["coffee", "latte", "cappuccino"],
    "tea": ["tea", "black tea"],
    "wine": ["wine", "red wine", "white wine"],
    "yogurt": ["yogurt", "greek yogurt"],
    "coleslaw": ["coleslaw", "slaw"],
    "soup": ["soup", "stew"],
    "curry": ["curry", "tikka masala"],
    "fruit": ["fruit", "mixed fruit"],
    "butter": ["butter", "spread"],
}


# Regex patterns for quantity + food extraction
# Each tuple: (regex_pattern, forced_unit_or_None)
_QUANTITY_PATTERNS: list[tuple[str, str | None]] = [
    (r"(\d+(?:\.\d+)?)\s+(?:cans?\s+of\s+)?(diet\s+coke|coke|cola|coca[- ]?cola|soft drink)s?\b", "can"),
    (r"(\d+(?:\.\d+)?)\s+(donuts?|doughnuts?)\b", None),
    (r"(\d+(?:\.\d+)?)\s+(slices?)\s+of\s+(pizza|pepperoni pizza|toast|bread)\b", "slice"),
    (r"(\d+(?:\.\d+)?)\s+(pints?)\s+of\s+(lager|beer|ale)\b", "pint"),
    (r"(\d+(?:\.\d+)?)\s+(wings?)\b", "wings"),
    (r"(\d+(?:\.\d+)?)\s+(scoops?)\s+of\s+(ice cream)\b", "scoop"),
    (r"(\d+(?:\.\d+)?)\s+(burgers?)\b", "burger"),
    (r"(\d+(?:\.\d+)?)\s+(sausages?)\b", None),
    (r"(\d+(?:\.\d+)?)\s+(eggs?)\b", None),
]

# Known foods that appear without quantities (default to 1)
_KNOWN_FOODS: list[str] = [
    "big mac", "large fries", "fries", "pizza", "cereal", "pasta", "rice",
    "bread", "potato", "sushi", "fruit", "chicken", "steak", "bacon",
    "burger", "sausage", "eggs", "fish", "salad", "vegetables", "banana",
    "apple", "cake", "biscuit", "chocolate", "crisps", "cheese", "lager",
    "wine", "milk", "coffee", "tea", "yogurt", "butter", "soup", "curry",
    "donut", "ice cream", "coleslaw",
]


def _canonical_item(value: str) -> str:
    """Normalise a food name to canonical form."""
    item = " ".join(value.lower().strip().split())
    item = item.strip(".,?!;:")
    if item in {"coca cola", "coca-cola", "cola"}:
        return "coke"
    if item in {"doughnut", "doughnuts", "donuts"}:
        return "donut"
    if item in {"french fries", "large fries", "chip", "chips", "fries"}:
        return "fries"
    if item in {"beer", "ale", "pilsner"}:
        return "lager"
    if item in {"potatoes", "mashed potato", "jacket potato"}:
        return "potato"
    if item in {"crisps", "potato crisps"}:
        return "crisps"
    if item in {"cookies", "cookie"}:
        return "biscuit"
    if item.endswith("s") and item not in {"fries", "chips", "crisps", "eggs", "wings"}:
        item = item[:-1]
    return item


def _search_terms(item: str) -> list[str]:
    """Get search terms for a canonical food item."""
    return _ALIASES.get(item, [item])


class DeterministicParser(MealParser):
    """Regex-based deterministic meal parser.

    Extracts foods from natural language using known patterns.
    No external dependencies — works offline.
    """

    def parse(self, text: str) -> list[ParsedFood]:
        """Parse meal text into foods."""
        foods, _ = self.parse_with_raw(text)
        return foods

    def parse_with_raw(self, text: str) -> tuple[list[ParsedFood], dict[str, Any]]:
        """Parse and return foods plus debug metadata."""
        lower = text.lower()
        foods: list[ParsedFood] = []

        # Phase 1: Extract quantity + food patterns
        for pattern, forced_unit in _QUANTITY_PATTERNS:
            for match in re.finditer(pattern, lower):
                qty = float(match.group(1))
                item = match.group(match.lastindex or 2)
                # Handle multi-group patterns (e.g. "slices of pizza")
                if item in {"slice", "slices", "pint", "pints", "wing", "wings", "scoop", "scoops"}:
                    if (match.lastindex or 0) >= 3:
                        item = match.group(3)
                item = _canonical_item(item)
                foods.append(ParsedFood(
                    item=item,
                    quantity=qty,
                    unit=forced_unit,
                    search_terms=_search_terms(item),
                ))

        # Phase 2: Extract known foods without explicit quantities
        seen = {f.item for f in foods}
        for name in _KNOWN_FOODS:
            item = _canonical_item(name)
            if re.search(rf"\b{re.escape(name)}\b", lower) and item not in seen:
                unit = "large" if name == "large fries" else None
                foods.append(ParsedFood(
                    item=item,
                    quantity=1,
                    unit=unit,
                    search_terms=_search_terms(item),
                ))
                seen.add(item)

        if foods:
            # Sort by position in original text for stable ordering
            foods.sort(key=lambda f: lower.find(f.item) if lower.find(f.item) >= 0 else len(lower))
            return foods, {"method": "regex_patterns", "count": len(foods)}

        # Phase 3: Fallback — split by conjunctions and try each part
        cleaned = re.sub(r"[^a-zA-Z0-9 .,]+", " ", lower)
        for part in re.split(r"\s+(?:and|with|plus)\s+|,", cleaned):
            part = part.strip(" .")
            if not part:
                continue
            qty = 1.0
            m = re.match(r"(\d+(?:\.\d+)?)\s+(.+)", part)
            if m:
                qty = float(m.group(1))
                part = m.group(2)
            item = _canonical_item(part)
            foods.append(ParsedFood(
                item=item,
                quantity=qty,
                search_terms=_search_terms(item),
            ))

        if not foods:
            foods = [ParsedFood(item=text, quantity=1, search_terms=[text])]

        return foods, {"method": "fallback_split", "count": len(foods)}


# Backward-compatible standalone function
_parse_deterministic = DeterministicParser().parse
