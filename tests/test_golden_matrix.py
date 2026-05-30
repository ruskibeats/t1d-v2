"""Golden tests recovered from V1 golden_test_matrix.md."""

from __future__ import annotations

import asyncio

from app.ai.safety import SafetyScaffold
from app.food.service import FoodService, ParsedFood, calculate_food_evidence
from app.simulator import AnchorType, generate_patient_config
from src.forecast_engine import ForecastStage, MealTotals
from src.runner import parse_meal_text, run_companion_scenario


def test_all_12_profiles_forecast():
    totals = MealTotals(carbs_g=50, sugars_g=15, fat_g=8, protein_g=10)
    for anchor in AnchorType:
        config = generate_patient_config(anchor)
        result = ForecastStage.from_profile(config).forecast(totals)
        assert result.baseline_mg_dl >= 40
        assert result.peak_mg_dl >= result.baseline_mg_dl - 20
        assert result.peak_time_minutes > 0


def test_meal_archetype_behaviors():
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
    foods = parse_meal_text("2 donuts and 3 cokes")
    assert [(f.item, f.quantity, f.unit) for f in foods] == [("donut", 2.0, None), ("coke", 3.0, "can")]

    foods = parse_meal_text("pizza and large fries")
    assert [f.item for f in foods].count("fries") == 1
    assert [f.item for f in foods].count("pizza") == 1


def test_food_service_has_archetypes():
    async def run():
        service = FoodService()
        for item in ["pizza", "cereal", "pasta", "sushi", "fruit"]:
            food = ParsedFood(item=item, search_terms=[item])
            candidates = await service.search_food_candidates(food)
            evidence = calculate_food_evidence(food, candidates)
            assert evidence.computed is not None
            assert evidence.computed["carbs_g"] > 0
    asyncio.run(run())


def test_runner_end_to_end_safe():
    result = asyncio.run(run_companion_scenario("pizza and large fries", anchor="high_fat_delayed"))
    assert result["safety"]["is_safe"]
    assert result["forecast"]["peak_mg_dl"] > result["forecast"]["baseline_mg_dl"]
    assert "Educational simulation only" in result["response"]
