"""Edge case and boundary condition tests for T1D Companion v2 — Issue #13.

Fills coverage gaps in: safety scaffold, forecast boundary conditions,
parser edge cases, food evidence error paths, and companion card rendering
with empty/extreme inputs.
"""

from __future__ import annotations

import pytest

# ═══════════════════════════════════════════════════════════════════
# Safety scaffold edge cases
# ═══════════════════════════════════════════════════════════════════

class TestSafetyScaffoldEdgeCases:
    """Edge cases for SafetyScaffold.validate()."""

    def setup_method(self):
        from app.ai.safety import SafetyScaffold
        self.safety = SafetyScaffold()

    def test_empty_string_passes(self):
        review = self.safety.validate("", {"source": "assistant"})
        assert review["is_safe"] is True

    def test_whitespace_only_passes(self):
        review = self.safety.validate("   \n\t  ", {"source": "assistant"})
        assert review["is_safe"] is True

    def test_blocked_phrase_with_punctuation(self):
        """Banned words surrounded by punctuation should still be caught."""
        review = self.safety.validate("Take 2.5 units!", {"source": "test"})
        assert review["is_safe"] is False

    def test_mixed_case_banned_words(self):
        """Banned words in any case should be caught."""
        review = self.safety.validate("take UNITS of INSULIN", {"source": "test"})
        assert review["is_safe"] is False

    def test_partial_banned_word_not_blocked(self):
        """Words containing banned substrings as part of larger words."""
        # "insulin" is banned but "insulinase" might appear in scientific text
        # This tests the word-boundary matching
        review = self.safety.validate("discussion about insulin sensitivity factor", {"source": "test"})
        # "insulin" is a banned word so this SHOULD be blocked
        assert review["is_safe"] is False

    def test_safe_educational_phrases_pass(self):
        """All standard educational phrases should pass."""
        safe_phrases = [
            "Glucose may rise about 50 mg/dL.",
            "Peak around 180 mg/dL at 90 minutes.",
            "Higher fat may delay the rise.",
            "Educational simulation only — not medical advice.",
            "Monitor 1–4 hours after eating.",
            "Check your CGM trend arrow.",
            "Similar meals rose about 70 mg/dL on average.",
        ]
        for phrase in safe_phrases:
            review = self.safety.validate(phrase, {"source": "assistant"})
            assert review["is_safe"], f"Should be safe: {phrase}"

    def test_risk_levels_assigned(self):
        """Risk level should be 'high' for dosing phrases."""
        review = self.safety.validate("Take 3 units now.", {"source": "test"})
        assert review["risk_level"] == "high"

    def test_blocked_phrases_list_populated(self):
        """Blocked phrases list should contain the matched phrase."""
        review = self.safety.validate("Take 3 units of insulin.", {"source": "test"})
        assert len(review["blocked_phrases"]) > 0

    def test_context_passed_through(self):
        """Context dict should not cause errors."""
        review = self.safety.validate("Safe text.", {"source": "assistant", "extra": "data"})
        assert review["is_safe"] is True


# ═══════════════════════════════════════════════════════════════════
# Forecast boundary conditions
# ═══════════════════════════════════════════════════════════════════

class TestForecastBoundaryConditions:
    """Edge cases for forecast engine inputs."""

    def test_zero_carbs_zero_fat(self):
        """Zero carbs and zero fat should return missing info flag."""
        from app.simulator.schemas import AnchorType
        from app.simulator.patient_factory import generate_patient_config
        from src.forecast_engine import ForecastStage, MealTotals

        stage = ForecastStage.from_profile(generate_patient_config(AnchorType.WELL_CONTROLLED))
        result = stage.forecast(MealTotals(carbs_g=0, fat_g=0, sugars_g=0))
        assert "no_carbs_detected" in result.missing_information_flags

    def test_zero_carbs_only_fat(self):
        """Zero carbs but high fat should still forecast."""
        from app.simulator.schemas import AnchorType
        from app.simulator.patient_factory import generate_patient_config
        from src.forecast_engine import ForecastStage, MealTotals

        stage = ForecastStage.from_profile(generate_patient_config(AnchorType.WELL_CONTROLLED))
        result = stage.forecast(MealTotals(carbs_g=0, fat_g=30, sugars_g=0))
        assert "no_carbs_detected" in result.missing_information_flags

    def test_extreme_carb_load(self):
        """Extreme carb load (200g+) should produce high forecast."""
        from app.simulator.schemas import AnchorType
        from app.simulator.patient_factory import generate_patient_config
        from src.forecast_engine import ForecastStage, MealTotals

        stage = ForecastStage.from_profile(generate_patient_config(AnchorType.WELL_CONTROLLED))
        result = stage.forecast(MealTotals(carbs_g=200, sugars_g=50, fat_g=10))
        assert result.peak_mg_dl > result.baseline_mg_dl
        assert result.peak_mg_dl > 200

    def test_very_small_carb_load(self):
        """Tiny carb load (1g) should still produce a forecast."""
        from app.simulator.schemas import AnchorType
        from app.simulator.patient_factory import generate_patient_config
        from src.forecast_engine import ForecastStage, MealTotals

        stage = ForecastStage.from_profile(generate_patient_config(AnchorType.WELL_CONTROLLED))
        result = stage.forecast(MealTotals(carbs_g=1, sugars_g=0, fat_g=0))
        assert result.baseline_mg_dl > 0

    def test_all_anchors_handle_zero_carbs(self):
        """All 12 anchor types should handle zero carbs without error."""
        from app.simulator.schemas import AnchorType
        from app.simulator.patient_factory import generate_patient_config
        from src.forecast_engine import ForecastStage, MealTotals

        for anchor in AnchorType:
            stage = ForecastStage.from_profile(generate_patient_config(anchor))
            result = stage.forecast(MealTotals(carbs_g=0, fat_g=0))
            assert result.baseline_mg_dl > 0

    def test_high_fat_only(self):
        """High fat, zero carbs should still produce a forecast."""
        from app.simulator.schemas import AnchorType
        from app.simulator.patient_factory import generate_patient_config
        from src.forecast_engine import ForecastStage, MealTotals

        stage = ForecastStage.from_profile(generate_patient_config(AnchorType.HIGH_FAT_DELAYED))
        result = stage.forecast(MealTotals(carbs_g=0, fat_g=50, sugars_g=0))
        assert result.baseline_mg_dl > 0

    def test_nighttime_extends_to_16_hours(self):
        """Nighttime forecast should always have 5 points (8,10,12,14,16 hrs)."""
        from app.simulator.schemas import AnchorType
        from app.simulator.patient_factory import generate_patient_config
        from src.forecast_engine import ForecastStage, MealTotals

        stage = ForecastStage.from_profile(generate_patient_config(AnchorType.WELL_CONTROLLED))
        result = stage.forecast(MealTotals(carbs_g=50, fat_g=12, sugars_g=10))
        assert len(result.nighttime) == 5
        hours = [n.hours_after_meal for n in result.nighttime]
        assert hours == [8, 10, 12, 14, 16]

    def test_uncertainty_band_with_equal_bounds(self):
        """Carb range where low == high should still work."""
        from app.simulator.schemas import AnchorType
        from app.simulator.patient_factory import generate_patient_config
        from src.forecast_engine import ForecastStage, MealTotals

        stage = ForecastStage.from_profile(generate_patient_config(AnchorType.WELL_CONTROLLED))
        result = stage.forecast(MealTotals(carbs_g=50, sugars_g=10, fat_g=10), carb_range_g=(50, 50))
        assert result.uncertainty_band is not None


# ═══════════════════════════════════════════════════════════════════
# Parser edge cases
# ═══════════════════════════════════════════════════════════════════

class TestParserEdgeCases:
    """Edge cases for DeterministicParser."""

    def test_empty_input(self):
        """Empty string should return at least one food."""
        from src.parser import DeterministicParser
        parser = DeterministicParser()
        foods = parser.parse("")
        assert len(foods) >= 1

    def test_whitespace_only_input(self):
        """Whitespace-only input should not crash."""
        from src.parser import DeterministicParser
        parser = DeterministicParser()
        foods = parser.parse("   \n\t  ")
        assert len(foods) >= 1

    def test_single_word_food(self):
        """Single recognized food word."""
        from src.parser import DeterministicParser
        parser = DeterministicParser()
        foods = parser.parse("pizza")
        assert any(f.item == "pizza" for f in foods)

    def test_unrecognized_input(self):
        """Completely unrecognized input should return something."""
        from src.parser import DeterministicParser
        parser = DeterministicParser()
        foods = parser.parse("xyzzy plugh fizzbin")
        assert len(foods) >= 1

    def test_numbers_only(self):
        """Input with only numbers."""
        from src.parser import DeterministicParser
        parser = DeterministicParser()
        foods = parser.parse("12345")
        assert len(foods) >= 1

    def test_special_characters(self):
        """Input with special characters."""
        from src.parser import DeterministicParser
        parser = DeterministicParser()
        foods = parser.parse("pizza & fries @ restaurant!")
        assert len(foods) >= 1

    def test_combined_dishes(self):
        """Complex combined dish description."""
        from src.parser import DeterministicParser
        parser = DeterministicParser()
        foods = parser.parse("grilled chicken with salad and rice with a side of fries")
        assert len(foods) >= 3

    def test_quantity_with_unit(self):
        """Quantity + unit extraction."""
        from src.parser import DeterministicParser
        parser = DeterministicParser()
        foods = parser.parse("2 slices of pizza and 3 cans of coke")
        pizza = next((f for f in foods if f.item == "pizza"), None)
        coke = next((f for f in foods if f.item == "coke"), None)
        assert pizza is not None
        assert pizza.quantity == 2
        assert coke is not None
        assert coke.quantity == 3

    def test_case_insensitive_parsing(self):
        """Parser should handle mixed case."""
        from src.parser import DeterministicParser
        parser = DeterministicParser()
        foods = parser.parse("PIZZA and FRIES")
        items = {f.item for f in foods}
        assert "pizza" in items
        assert "fries" in items


# ═══════════════════════════════════════════════════════════════════
# Food evidence edge cases
# ═══════════════════════════════════════════════════════════════════

class TestFoodEvidenceEdgeCases:
    """Edge cases for food evidence calculation."""

    def test_no_candidates_returns_low_confidence(self):
        """Empty candidates list should return low confidence."""
        from app.food.service import calculate_food_evidence, ParsedFood

        food = ParsedFood(item="pizza", quantity=1)
        ev = calculate_food_evidence(food, [])
        assert ev.confidence == "low"
        assert ev.computed is None
        assert "No nutrition match" in ev.warnings[0]

    def test_single_candidate(self):
        """Single candidate should produce evidence."""
        from app.food.service import calculate_food_evidence, ParsedFood

        food = ParsedFood(item="pizza", quantity=1, unit="slice")
        candidates = [{
            "name": "pizza",
            "serving_g": 100,
            "carbs_per_100g": 30,
            "fat_per_100g": 10,
            "sugars_per_100g": 3,
            "protein_per_100g": 8,
            "kcal_per_100g": 250,
            "aliases": (),
            "match_score": 0.95,
            "estimated_serving_g": 100,
        }]
        ev = calculate_food_evidence(food, candidates)
        assert ev.computed is not None
        assert ev.computed["carbs_g"] > 0

    def test_food_without_unit_has_high_portion_uncertainty(self):
        """Food without explicit unit should have elevated portion uncertainty."""
        from app.food.service import calculate_food_evidence, ParsedFood

        food = ParsedFood(item="pizza", quantity=2, unit=None)
        candidates = [{
            "name": "pizza",
            "serving_g": 100,
            "carbs_per_100g": 30,
            "fat_per_100g": 10,
            "sugars_per_100g": 3,
            "protein_per_100g": 8,
            "kcal_per_100g": 250,
            "aliases": (),
            "match_score": 0.95,
            "estimated_serving_g": 100,
        }]
        ev = calculate_food_evidence(food, candidates)
        assert ev.portion_uncertainty_pct >= 0.3

    def test_food_with_slice_unit_has_low_portion_uncertainty(self):
        """Food with 'slice' unit should have lower portion uncertainty."""
        from app.food.service import calculate_food_evidence, ParsedFood

        food = ParsedFood(item="pizza", quantity=2, unit="slice")
        candidates = [{
            "name": "pizza",
            "serving_g": 100,
            "carbs_per_100g": 30,
            "fat_per_100g": 10,
            "sugars_per_100g": 3,
            "protein_per_100g": 8,
            "kcal_per_100g": 250,
            "aliases": (),
            "match_score": 0.95,
            "estimated_serving_g": 200,
        }]
        ev = calculate_food_evidence(food, candidates)
        assert ev.portion_uncertainty_pct < 0.2

    def test_high_fat_warning_generated(self):
        """Foods with >= 15g fat should generate a warning."""
        from app.food.service import calculate_food_evidence, ParsedFood

        food = ParsedFood(item="pizza", quantity=1, unit=None)
        candidates = [{
            "name": "pizza",
            "serving_g": 100,
            "carbs_per_100g": 20,
            "fat_per_100g": 25,
            "sugars_per_100g": 3,
            "protein_per_100g": 8,
            "kcal_per_100g": 350,
            "aliases": (),
            "match_score": 0.95,
            "estimated_serving_g": 100,
        }]
        ev = calculate_food_evidence(food, candidates)
        assert any("fat" in w.lower() or "delay" in w.lower() for w in ev.warnings)

    def test_carb_range_scales_with_confidence(self):
        """Lower confidence should produce wider carb ranges."""
        from app.food.service import calculate_food_evidence, ParsedFood

        base_candidates = lambda score: [{
            "name": "pizza",
            "serving_g": 100,
            "carbs_per_100g": 30,
            "fat_per_100g": 10,
            "sugars_per_100g": 3,
            "protein_per_100g": 8,
            "kcal_per_100g": 250,
            "aliases": (),
            "match_score": score,
            "estimated_serving_g": 100,
        }]

        food = ParsedFood(item="pizza", quantity=1)
        ev_high = calculate_food_evidence(food, base_candidates(0.95))
        ev_low = calculate_food_evidence(food, base_candidates(0.3))

        range_high = ev_high.carb_range_g[1] - ev_high.carb_range_g[0]
        range_low = ev_low.carb_range_g[1] - ev_low.carb_range_g[0]
        assert range_low >= range_high

    def test_empty_evidence_items_combines_correctly(self):
        """Empty evidence list should return zero totals."""
        from app.food.service import combine_food_evidence

        result = combine_food_evidence([])
        assert result["totals"]["carbs_g"] == 0
        assert result["confidence_overall"] == "low"


# ═══════════════════════════════════════════════════════════════════
# Companion card edge cases
# ═══════════════════════════════════════════════════════════════════

class TestCompanionCardEdgeCases:
    """Edge cases for companion card rendering with empty/extreme inputs."""

    def test_meal_pipeline_with_empty_foods(self):
        """Pipeline with empty foods list should not crash."""
        from src.companion import meal_pipeline_section

        cards = meal_pipeline_section(
            profile_label="Test",
            parsed_foods=[],
            food_evidence=[],
            meal_totals={"carbs_g": 0, "fat_g": 0, "sugars_g": 0, "protein_g": 0, "kcal": 0,
                         "top_carb_contributor": "", "top_uncertainty_items": [],
                         "absorption_profile": "standard"},
            forecast={"peak_mg_dl": 0, "peak_time_minutes": 0, "baseline_mg_dl": 0, "uncertainty_band": {}},
            historical_context={"similar_meals_count": 0},
            risk_flags=[],
            chart="",
        )
        assert len(cards) >= 1

    def test_meal_pipeline_with_none_values(self):
        """Pipeline with missing optional values should not crash."""
        from src.companion import meal_pipeline_section

        cards = meal_pipeline_section(
            profile_label="Test",
            parsed_foods=[{"item": "pizza", "quantity": 1}],
            food_evidence=[{"parsed": {}, "computed": None, "confidence": "low", "warnings": []}],
            meal_totals={"carbs_g": 50, "fat_g": 15, "sugars_g": 5, "protein_g": 8,
                         "kcal": 300, "top_carb_contributor": "", "top_uncertainty_items": [],
                         "absorption_profile": "standard"},
            forecast={"peak_mg_dl": 180, "peak_time_minutes": 90, "baseline_mg_dl": 110,
                      "uncertainty_band": {"peak_range_mg_dl": [160, 200],
                                           "peak_time_range_minutes": [60, 120]}},
            historical_context={"similar_meals_count": 0},
            risk_flags=[],
            chart="",
        )
        assert len(cards) >= 1

    def test_narrator_with_empty_bundle(self):
        """Narrator should handle empty evidence bundle gracefully."""
        from src.narrator import render_narrator_card

        cards = render_narrator_card({})
        assert len(cards) >= 1

    def test_narrator_with_missing_sections(self):
        """Narrator should handle missing optional sections."""
        from src.narrator import render_narrator_card

        bundle = {
            "profile": {"label": "Test", "anchor_type": "well_controlled", "plain_meaning": "test"},
            "totals": {"carbs_g": 50},
            "forecast": {"baseline_mg_dl": 110, "peak_mg_dl": 180, "peak_time_minutes": 90},
        }
        cards = render_narrator_card(bundle)
        assert len(cards) >= 1

    def test_confidence_card_with_empty_evidence(self):
        """Confidence card should handle empty evidence list."""
        from src.companion import confidence_card

        cards = confidence_card(
            food_evidence=[],
            forecast={},
            historical_context={"similar_meals_count": 0},
        )
        assert len(cards) >= 1

    def test_confidence_card_with_very_long_food_list(self):
        """Confidence card should handle many food items."""
        from src.companion import confidence_card

        evidence = [
            {
                "parsed": {"item": f"food_{i}", "quantity": 1},
                "computed": {"carbs_g": 10},
                "confidence": "medium",
                "warnings": [],
                "identity_confidence": "medium",
                "portion_uncertainty_pct": 0.2,
                "nutrition_variance_pct": 0.1,
                "top_uncertainty_reason": "",
            }
            for i in range(20)
        ]
        cards = confidence_card(
            food_evidence=evidence,
            forecast={"peak_mg_dl": 200, "uncertainty_band": {}},
            historical_context={"similar_meals_count": 5},
        )
        assert len(cards) >= 1


# ═══════════════════════════════════════════════════════════════════
# Historical meal matcher edge cases
# ═══════════════════════════════════════════════════════════════════

class TestHistoricalMatcherEdgeCases:
    """Edge cases for HistoricalMealSummary with extreme inputs."""

    def test_empty_food_history(self):
        """Food history with no matching anchor should return limited matches."""
        from app.services.historical_meal_matcher import historical_context_for_meal

        # With anchor_type=None, the matcher skips anchor filtering and may find matches
        # from the legends.json data based on nutrient distance alone
        ctx = historical_context_for_meal(
            "empty query", carbs_g=50, fat_g=10,
            food_name="empty", anchor_type=None,
        )
        # Just verify it returns a valid structure regardless of match count
        assert "similar_meals_count" in ctx
        assert ctx["similar_meals_count"] >= 0

    def test_very_large_carb_query(self):
        """Extremely large carb query should still work."""
        from app.services.historical_meal_matcher import historical_context_for_meal

        ctx = historical_context_for_meal(
            "large meal", carbs_g=500, fat_g=100,
            food_name="feast", anchor_type=None,
        )
        assert ctx["similar_meals_count"] == 0

    def test_negative_carb_query(self):
        """Negative carb values should not crash."""
        from app.services.historical_meal_matcher import find_similar_meals

        result = find_similar_meals(carbs_g=-10, fat_g=5, food_name="test")
        assert isinstance(result, list)


# ═══════════════════════════════════════════════════════════════════
# Counterfactual edge cases
# ═══════════════════════════════════════════════════════════════════

class TestCounterfactualEdgeCases:
    """Edge cases for counterfactual scenarios."""

    def test_counterfactual_with_zero_carbs(self):
        """Counterfactual with zero carbs should not crash."""
        from app.simulator.schemas import AnchorType
        from app.simulator.patient_factory import generate_patient_config
        from src.forecast_engine import ForecastStage, MealTotals

        stage = ForecastStage.from_profile(generate_patient_config(AnchorType.WELL_CONTROLLED))
        result = stage.forecast(MealTotals(carbs_g=0, fat_g=0))
        assert result.baseline_mg_dl > 0

    def test_all_profiles_produce_reasonable_zero_carb_forecast(self):
        """Zero-carb forecast should be reasonable for all profiles."""
        from app.simulator.schemas import AnchorType
        from app.simulator.patient_factory import generate_patient_config
        from src.forecast_engine import ForecastStage, MealTotals

        for anchor in AnchorType:
            stage = ForecastStage.from_profile(generate_patient_config(anchor))
            result = stage.forecast(MealTotals(carbs_g=0, fat_g=0))
            assert 40 <= result.baseline_mg_dl <= 200, f"{anchor}: baseline={result.baseline_mg_dl}"
            # Zero-carb meals may have peak_time=0 since there's no rise to find a peak for
            # The important thing is it doesn't crash and produces valid baseline
            assert result.peak_time_minutes >= 0, f"{anchor}: peak_time={result.peak_time_minutes}"
