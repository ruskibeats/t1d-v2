"""Golden tests — food matching, parser, forecast, safety."""

from __future__ import annotations

import asyncio
import re

from app.ai.safety import SafetyScaffold
from app.simulator import AnchorType, generate_patient_config
from src.forecast_engine import ForecastStage, MealTotals
from src.runner import _parse_deterministic as parse_meal_text


def test_all_12_profiles_forecast():
    """Every profile can run a forecast without error."""
    totals = MealTotals(carbs_g=50, sugars_g=15, fat_g=8, protein_g=10)
    for anchor in AnchorType:
        config = generate_patient_config(anchor)
        result = ForecastStage.from_profile(config).forecast(totals)
        assert result.baseline_mg_dl >= 40
        assert result.peak_mg_dl >= result.baseline_mg_dl - 20
        assert result.peak_time_minutes > 0


def test_meal_archetype_behaviors():
    """Meal archetypes trigger expected physiological signals."""
    well = ForecastStage.from_profile(generate_patient_config(AnchorType.WELL_CONTROLLED))
    high_fat = ForecastStage.from_profile(generate_patient_config(AnchorType.HIGH_FAT_DELAYED))
    spike = ForecastStage.from_profile(generate_patient_config(AnchorType.POST_MEAL_SPIKE))
    exercise = ForecastStage.from_profile(generate_patient_config(AnchorType.EXERCISE_SENSITIVE))

    pizza = high_fat.forecast(MealTotals(carbs_g=70, sugars_g=20, fat_g=30, protein_g=25))
    cereal = spike.forecast(MealTotals(carbs_g=40, sugars_g=30, fat_g=3, protein_g=8))
    pasta = well.forecast(MealTotals(carbs_g=60, sugars_g=8, fat_g=10, protein_g=12))
    fruit = well.forecast(MealTotals(carbs_g=30, sugars_g=25, fat_g=1, protein_g=1))
    exercise_meal = exercise.forecast(MealTotals(carbs_g=40, sugars_g=10, fat_g=5, protein_g=10))

    assert pizza.meal_drivers["fat_triggers_delay"] is True
    assert cereal.peak_time_minutes <= pizza.peak_time_minutes
    assert pasta.peak_mg_dl > pasta.baseline_mg_dl
    assert fruit.top_drivers[0].startswith("fast_carbs")
    assert exercise_meal.exercise_heat_modifier < 1.0


def test_safety_phrase_blocking():
    """Safety scaffold blocks dosing/treatment language."""
    safety = SafetyScaffold()
    blocked = [
        "Take 3 units now.",
        "Inject 2 units of insulin.",
        "Use an extended bolus.",
        "Increase your basal rate.",
    ]
    for text in blocked:
        review = safety.validate(text, {"source": "assistant"})
        assert not review["is_safe"], text
        assert review["risk_level"] == "high"

    allowed = safety.validate("Educational estimate: glucose may rise 50 mg/dL and peak in about 90 minutes. Not medical advice.")
    assert allowed["is_safe"]


def test_parser_handles_common_v1_examples():
    """Text parsing correctly extracts foods from natural language."""
    foods = parse_meal_text("2 donuts and 3 cokes")
    assert any(f.item == "donut" for f in foods)
    assert any(f.item == "coke" for f in foods)
    assert [f.quantity for f in foods if f.item == "coke"][0] == 3.0
    assert [f.unit for f in foods if f.item == "coke"][0] == "can"

    foods = parse_meal_text("grilled chicken with salad and rice")
    assert any(f.item in ("chicken", "rice") for f in foods)
    assert any("salad" in f.item for f in foods)

    foods = parse_meal_text("pizza and large fries")
    counts = {}
    for f in foods:
        counts[f.item] = counts.get(f.item, 0) + 1
    assert counts.get("fries", 0) == 1
    assert counts.get("pizza", 0) == 1

    # No double-matching
    assert max(counts.values()) == 1, f"duplicates: {counts}"


def test_forecast_rejects_zero_carbs():
    """Forecast with no carbs returns missing-information flag."""
    stage = ForecastStage.from_profile(generate_patient_config(AnchorType.WELL_CONTROLLED))
    result = stage.forecast(MealTotals(carbs_g=0, fat_g=0))
    assert "no_carbs_detected" in result.missing_information_flags


def test_uncertainty_band_bounds():
    """Carb uncertainty produces a proper forecast range."""
    stage = ForecastStage.from_profile(generate_patient_config(AnchorType.HIGH_FAT_DELAYED))
    result = stage.forecast(MealTotals(carbs_g=50, sugars_g=10, fat_g=25), carb_range_g=(40, 60))
    assert result.uncertainty_band is not None
    low, point, high = result.uncertainty_band.low, result.uncertainty_band.point, result.uncertainty_band.high
    assert low.carbs_g <= point.carbs_g <= high.carbs_g
    assert low.peak_mg_dl <= high.peak_mg_dl


def test_nighttime_points():
    """Nighttime forecast extends to 16 hours."""
    stage = ForecastStage.from_profile(generate_patient_config(AnchorType.WELL_CONTROLLED))
    result = stage.forecast(MealTotals(carbs_g=50, fat_g=12, sugars_g=10))
    assert len(result.nighttime) == 5  # 8, 10, 12, 14, 16 hours
    assert all(n.hours_after_meal >= 8 for n in result.nighttime)


def test_safety_does_not_block_educational_phrases():
    """Educational language without dosing terms passes safety."""
    safety = SafetyScaffold()
    safe_phrases = [
        "Glucose may rise about 50 mg/dL and peak in 1-2 hours.",
        "Similar meals averaged around 180 mg/dL at 90 minutes.",
        "Higher fat may delay the rise, so watch the later window.",
        "Educational simulation only — not medical advice.",
    ]
    for text in safe_phrases:
        review = safety.validate(text, {"source": "assistant"})
        assert review["is_safe"], f"blocked: {text}"


def test_llm_parse_mock_path():
    """LLM parse path extracts foods from structured JSON response."""
    from src.runner import _extract_json, _normalise_food_dict, ParsedFood

    raw = """{
        "foods": [
            {"item": "pizza", "quantity": 2, "unit": "slice"},
            {"item": "coke", "quantity": 1, "unit": "can"}
        ]
    }"""
    data = _extract_json(raw)
    assert isinstance(data, dict)
    foods = [_normalise_food_dict(item) for item in data.get("foods", []) if isinstance(item, dict)]
    assert len(foods) == 2
    assert foods[0].item == "pizza"
    assert foods[0].quantity == 2
    assert foods[1].item == "coke"


def test_llm_parse_chatty_response():
    """LLM JSON extraction works even with chatty model output."""
    from src.runner import _extract_json

    chatty = """Sure! Here's the parsed meal:

{
    "foods": [
        {"name": "chicken", "qty": 1, "unit": "portion"},
        {"name": "rice", "qty": 1}
    ]
}

This is my best guess for your meal."""
    data = _extract_json(chatty)
    assert isinstance(data, dict)
    assert len(data.get("foods", [])) == 2


def test_llm_parse_no_foods_fallback():
    """When no foods extracted, returns current foods list (fallback)."""
    from src.runner import _extract_json, _normalise_food_dict

    raw = """{"foo": "bar"}"""
    data = _extract_json(raw)
    assert data == {"foo": "bar"}
    foods = [_normalise_food_dict(item) for item in data.get("foods", []) if isinstance(item, dict)]
    assert len(foods) == 0
