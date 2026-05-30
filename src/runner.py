#!/usr/bin/env python3
"""V2 T1D Companion runner.

Recovered from the V1 `companion_pipeline_v2.py` orchestration shape, but wired to
V2's cleaner modules:

1. Parse meal text into foods
2. Lookup deterministic food evidence
3. Select simulator profile
4. Forecast glucose
5. Add historical context
6. Build prompt evidence bundle
7. Render safe educational response
"""

from __future__ import annotations

import argparse
import asyncio
import json
import re
import sys
from dataclasses import asdict
from pathlib import Path
from typing import Any

# Script-mode compatibility: `python3 src/runner.py ...` from repo root.
ROOT = Path(__file__).resolve().parents[1]
if __package__ in {None, ""} and str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))
    sys.path.insert(0, str(ROOT / "src"))

from app.ai.safety import SafetyScaffold
from app.core.database import db_manager, get_settings
from app.food.service import FoodService, ParsedFood, calculate_food_evidence, combine_food_evidence
from app.services.historical_meal_matcher import historical_context_for_meal
from app.simulator.patient_factory import generate_patient_config, generate_profile_json
from app.simulator.schemas import AnchorType

try:
    from .evidence_bundle import make_evidence_bundle
    from .forecast_engine import ForecastStage, MealTotals, populate_evidence_fields
    from .forecast_renderer import render_forecast
    from .prediction_schema_adapter import forecast_to_prediction_schema
except ImportError:  # Script-mode compatibility
    from evidence_bundle import make_evidence_bundle
    from forecast_engine import ForecastStage, MealTotals, populate_evidence_fields
    from forecast_renderer import render_forecast
    from prediction_schema_adapter import forecast_to_prediction_schema


ALIASES = {
    "coke": ["coca cola", "coke", "cola"],
    "cola": ["coca cola", "cola", "coke"],
    "diet coke": ["diet coke", "coca cola zero", "diet cola"],
    "donut": ["donut", "doughnut", "glazed doughnut"],
    "donuts": ["donut", "doughnut", "glazed doughnut"],
    "pizza": ["pizza", "pepperoni pizza"],
    "cereal": ["cereal", "breakfast cereal", "corn flakes"],
    "pasta": ["pasta", "spaghetti", "noodles"],
    "rice": ["rice", "white rice", "sushi rice"],
    "sushi": ["sushi", "sushi roll"],
    "fries": ["fries", "french fries", "chips"],
    "chips": ["fries", "french fries", "chips"],
    "lager": ["lager", "beer", "pilsner"],
    "beer": ["beer", "lager", "pilsner"],
    "ice cream": ["ice cream", "vanilla ice cream"],
    "chicken wings": ["chicken wings", "breaded chicken", "buffalo wings"],
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
    "potato": ["potato", "potatoes", "mashed potato"],
    "sushi": ["sushi", "sushi roll"],
    "milk": ["milk", "semi skimmed milk", "whole milk"],
    "coffee": ["coffee", "latte", "cappuccino"],
    "tea": ["tea", "black tea"],
    "wine": ["wine", "red wine", "white wine"],
    "yogurt": ["yogurt", "greek yogurt"],
}


def _canonical_item(value: str) -> str:
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
    if item.endswith("s") and item not in {"fries", "chips"}:
        item = item[:-1]
    return item


def parse_meal_text(text: str) -> list[ParsedFood]:
    """Small deterministic parser recovered from V1 fallback_parse_scenario."""
    lower = text.lower()
    foods: list[ParsedFood] = []

    patterns: list[tuple[str, str | None]] = [
        (r"(\d+(?:\.\d+)?)\s+(?:cans?\s+of\s+)?(diet\s+coke|coke|cola|coca[- ]?cola|soft drink)s?\b", "can"),
        (r"(\d+(?:\.\d+)?)\s+(donuts?|doughnuts?)\b", None),
        (r"(\d+(?:\.\d+)?)\s+(slices?)\s+of\s+(pizza|pepperoni pizza|toast|bread)\b", "slice"),
        (r"(\d+(?:\.\d+)?)\s+(pints?)\s+of\s+(lager|beer|ale)\b", "pint"),
        (r"(\d+(?:\.\d+)?)\s+(wings?)\b", "wings"),
        (r"(\d+(?:\.\d+)?)\s+(scoops?)\s+of\s+(ice cream)\b", "scoop"),
        (r"a\s+(bowl of|bowl)\s+(.*?)\b", None),
        (r"(\d+(?:\.\d+)?)\s+(burgers?)\b", "burger"),
        (r"(\d+(?:\.\d+)?)\s+(sausages?)\b", None),
        (r"(\d+(?:\.\d+)?)\s+(eggs?)\b", None),
    ]
    for pattern, forced_unit in patterns:
        for match in re.finditer(pattern, lower):
            qty = float(match.group(1))
            item = match.group(match.lastindex or 2)
            if item in {"slice", "slices", "pint", "pints", "wing", "wings", "scoop", "scoops"} and (match.lastindex or 0) >= 3:
                item = match.group(3)
            item = _canonical_item(item)
            foods.append(ParsedFood(item=item, quantity=qty, unit=forced_unit, search_terms=ALIASES.get(item, [item])))

    # Named foods without explicit quantities.
    known = ["big mac", "large fries", "fries", "pizza", "cereal", "pasta", "rice", "bread", "potato", "sushi", "fruit", "chicken", "steak", "bacon", "burger", "sausage", "eggs", "fish", "salad", "vegetables", "banana", "apple", "cake", "biscuit", "chocolate", "crisps", "cheese", "lager", "wine", "milk", "coffee", "tea", "yogurt", "butter", "soup", "curry", "donut", "ice cream", "coleslaw"]
    seen_items = {food.item for food in foods}
    for name in known:
        item = _canonical_item(name)
        if re.search(rf"\b{re.escape(name)}\b", lower) and item not in seen_items:
            unit = "large" if name == "large fries" else None
            foods.append(ParsedFood(item=item, quantity=1, unit=unit, search_terms=ALIASES.get(item, [item])))
            seen_items.add(item)

    if foods:
        foods.sort(key=lambda f: lower.find(f.item) if lower.find(f.item) >= 0 else len(lower))
        return foods

    # Last-resort split on common separators.
    cleaned = re.sub(r"[^a-zA-Z0-9 .,]+", " ", lower)
    parts = re.split(r"\s+(?:and|with|plus)\s+|,", cleaned)
    for part in parts:
        part = part.strip(" .")
        if not part:
            continue
        qty = 1.0
        m = re.match(r"(\d+(?:\.\d+)?)\s+(.+)", part)
        if m:
            qty = float(m.group(1))
            part = m.group(2)
        item = _canonical_item(part)
        foods.append(ParsedFood(item=item, quantity=qty, search_terms=ALIASES.get(item, [item])))
    return foods or [ParsedFood(item=text, quantity=1, search_terms=[text])]


def _risk_flags(totals: dict[str, float], foods: list[ParsedFood]) -> list[str]:
    flags: list[str] = []
    if totals.get("carbs_g", 0) >= 80:
        flags.append("large_carb_load")
    if totals.get("sugars_g", 0) >= 50:
        flags.append("rapid_sugar_spike")
    if totals.get("fat_g", 0) >= 15:
        flags.append("fat_may_extend_or_delay_rise")
    if any(food.item in {"lager", "beer"} for food in foods):
        flags.append("alcohol_can_increase_delayed_hypo_risk")
    return flags


def _make_response(bundle: dict[str, Any], chart: str, risk_flags: list[str]) -> str:
    profile = bundle["profile"]
    totals = bundle["totals"]
    forecast = bundle["forecast"]
    hist = bundle["historical_context"]
    carb_range = bundle["total_carbs_g_range"]
    band = forecast.get("uncertainty_band", {})
    peak_range = band.get("peak_range_mg_dl", [forecast["peak_mg_dl"], forecast["peak_mg_dl"]])
    time_range = band.get("peak_time_range_minutes", [forecast["peak_time_minutes"], forecast["peak_time_minutes"]])

    lines = [
        "## Profile Overview",
        f"Using the {profile['label']} simulated profile: {profile['plain_meaning']}.",
        "",
        "## Meal Details",
        f"About {totals['carbs_g']:.0f}g carbs (likely range {carb_range[0]:.0f}–{carb_range[1]:.0f}g, confidence {bundle['confidence_overall']}).",
        f"Estimated fat is {totals['fat_g']:.0f}g and sugars are {totals['sugars_g']:.0f}g.",
        "",
        "## Timing Insights",
        f"The forecast peaks around {forecast['peak_mg_dl']} mg/dL at about {forecast['peak_time_minutes']} minutes.",
        f"With portion uncertainty, peak could be about {peak_range[0]}–{peak_range[1]} mg/dL, timing {time_range[0]}–{time_range[1]} minutes.",
    ]
    if hist.get("similar_meals_count"):
        lines += [
            "",
            "## Historical Context",
            f"Found {hist['similar_meals_count']} similar historical meals.",
            *(hist.get("case_based_observations") or [])[:2],
        ]
    lines += ["", chart, "", "## Monitoring Suggestions"]
    if "fat_may_extend_or_delay_rise" in risk_flags:
        lines.append("Higher fat may delay or stretch the rise, so the later window matters too.")
    if "large_carb_load" in risk_flags:
        lines.append("This is a larger carb estimate, so the uncertainty range matters.")
    if "alcohol_can_increase_delayed_hypo_risk" in risk_flags:
        lines.append("Alcohol can increase delayed low risk, especially overnight or with activity.")
    if not risk_flags:
        lines.append("Watch the expected peak window and compare it with your actual trend.")
    lines.append("Educational simulation only — not medical advice.")
    return "\n".join(lines)


async def run_companion_scenario(text: str, *, anchor: str = "well_controlled") -> dict[str, Any]:
    """Run the complete deterministic V2 companion pipeline."""
    foods = parse_meal_text(text)
    settings = get_settings()
    db_manager.init_db(settings.database_url)
    item_evidence = []
    async with db_manager.get_session() as session:
        service = FoodService(session)
        for food in foods:
            candidates = await service.search_food_candidates(food)
            item_evidence.append(calculate_food_evidence(food, candidates))
    item_evidence = []
    async with db_manager.get_session() as session:
        service = FoodService(session)
        for food in foods:
            candidates = await service.search_food_candidates(food)
            item_evidence.append(calculate_food_evidence(food, candidates))
    meal = combine_food_evidence(item_evidence)

    if not any(ev.computed for ev in item_evidence):
        return {
            "scenario": text,
            "parsed_foods": [asdict(f) for f in foods],
            "food_evidence": meal["evidence_items"],
            "meal_totals": meal["totals"],
            "profile": {"anchor_type": "disconnected"},
            "forecast": {},
            "historical_context": {"similar_meals_count": 0},
            "prediction": {},
            "evidence_bundle": {},
            "risk_flags": [],
            "safety": {"is_safe": True},
            "response": "Cannot estimate this meal — database connection is not available. Please set DATABASE_URL to start.",
            "database_error": "DATABASE_URL not set or Postgres unreachable. The FoodService is Postgres-only; no fallback database exists.",
        }

    totals_dict = meal["totals"]

    config = generate_patient_config(anchor)
    profile_json = generate_profile_json(config)
    stage = ForecastStage.from_profile(config)
    totals = MealTotals.from_dict(totals_dict)
    carb_range = meal["total_carbs_g_range"]
    forecast = stage.forecast(totals, carb_range_g=carb_range)

    historical = historical_context_for_meal(
        text,
        carbs_g=totals.carbs_g,
        fat_g=totals.fat_g,
        food_name=" ".join(food.item for food in foods),
        anchor_type=config.anchor_type.value,
    )
    forecast = populate_evidence_fields(
        forecast,
        evidence_items=meal["evidence_items"],
        historical_similarity_score=historical.get("similarity_score"),
        missing_info=[] if meal["confidence_overall"] != "low" else ["low_confidence_food_match"],
        calibration=stage.calibration,
    )
    chart = render_forecast(forecast)
    prediction = forecast_to_prediction_schema(
        forecast,
        totals,
        confidence_tier=meal["confidence_overall"],
        ascii_chart=chart,
    )
    bundle = make_evidence_bundle(
        forecast=forecast,
        totals=totals,
        profile={"anchor_type": config.anchor_type.value, "label": profile_json["anchor_label"]},
        total_carbs_g_range=carb_range,
        confidence_overall=meal["confidence_overall"],
        confidence_why="Deterministic food lookup plus historical context where available.",
        historical_context=historical,
    )
    risk_flags = _risk_flags(totals_dict, foods)
    response = _make_response(bundle, chart, risk_flags)
    safety = SafetyScaffold().validate(response, {"source": "assistant"})

    return {
        "scenario": text,
        "parsed_foods": [asdict(food) for food in foods],
        "food_evidence": meal["evidence_items"],
        "meal_totals": totals_dict,
        "profile": profile_json,
        "forecast": bundle["forecast"],
        "historical_context": historical,
        "prediction": prediction.model_dump(),
        "evidence_bundle": bundle,
        "risk_flags": risk_flags,
        "safety": safety,
        "response": response,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Run the V2 T1D companion pipeline.")
    parser.add_argument("scenario", help="Natural-language meal scenario")
    parser.add_argument("--anchor", default="well_controlled", choices=[a.value for a in AnchorType])
    parser.add_argument("--json", action="store_true", help="Print full JSON result")
    args = parser.parse_args()

    result = asyncio.run(run_companion_scenario(args.scenario, anchor=args.anchor))
    if args.json:
        print(json.dumps(result, indent=2))
        return

    print("=" * 72)
    print("T1D COMPANION V2")
    print("=" * 72)
    print(f"Scenario: {result['scenario']}")
    print(f"Profile: {result['profile']['anchor_label']} ({result['profile']['anchor_type']})")
    print("\nFoods:")
    for item in result["food_evidence"]:
        parsed = item["parsed"]
        computed = item["computed"]
        print(f"- {parsed['quantity']} {parsed.get('unit') or ''} {parsed['item']}: confidence={item['confidence']}")
        if computed:
            print(f"  {computed['carbs_g']}g carbs, {computed['fat_g']}g fat, {computed['sugars_g']}g sugars")
        for warning in item.get("warnings") or []:
            print(f"  warning: {warning}")
    totals = result["meal_totals"]
    print(f"\nTotals: {totals['carbs_g']}g carbs, {totals['fat_g']}g fat, {totals['sugars_g']}g sugars")
    print("\nCompanion response:\n")
    print(result["response"])
    if not result["safety"]["is_safe"]:
        print("\nSAFETY WARNING:", result["safety"])


if __name__ == "__main__":
    main()
