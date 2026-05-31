"""Tests for the Counterfactual Meal Coach."""

from __future__ import annotations

import pytest

from src.counterfactual_coach import (
    CounterfactualBundle,
    CounterfactualComparison,
    CounterfactualScenario,
    generate_counterfactuals,
    render_counterfactual_bundle,
    _describe_improvement,
    _estimate_fat_from_totals,
    _make_comparison,
)
from src.forecast.model import ForecastResult, ForecastPoint, ForecastUncertaintyBand, ForecastScenario, MealTotals
from src.forecast.stage import ForecastStage
from src.calibration_constants import RISE_PER_CARB_MAP, BALANCE_MAP


# ── Fixtures ──


@pytest.fixture
def well_controlled_stage() -> ForecastStage:
    """Standard well_controlled profile stage"""
    return ForecastStage(
        anchor_type="well_controlled",
        basal_mg_dl=108,
        carb_ratio=15,
        insulin_sensitivity=40,
        fat_delay_hours=2.0,
        exercise_drop_factor=1.0,
    )


@pytest.fixture
def high_fat_delayed_stage() -> ForecastStage:
    """High-fat delayed profile stage"""
    return ForecastStage(
        anchor_type="high_fat_delayed",
        basal_mg_dl=120,
        carb_ratio=12,
        insulin_sensitivity=35,
        fat_delay_hours=3.5,
        exercise_drop_factor=1.0,
    )


@pytest.fixture
def standard_meal_totals() -> MealTotals:
    """A typical medium-sized meal: ~60g carbs, ~15g fat"""
    return MealTotals(
        carbs_g=60.0,
        fat_g=15.0,
        sugars_g=15.0,
        protein_g=20.0,
        kcal=450.0,
    )


@pytest.fixture
def large_high_fat_meal_totals() -> MealTotals:
    """A large high-fat meal: ~80g carbs, ~30g fat"""
    return MealTotals(
        carbs_g=80.0,
        fat_g=30.0,
        sugars_g=12.0,
        protein_g=35.0,
        kcal=700.0,
    )


@pytest.fixture
def small_meal_totals() -> MealTotals:
    """A small meal: ~20g carbs, ~5g fat"""
    return MealTotals(
        carbs_g=20.0,
        fat_g=5.0,
        sugars_g=8.0,
        protein_g=5.0,
        kcal=150.0,
    )


# ── Tests for generate_counterfactuals ──


class TestGenerateCounterfactuals:
    """Tests for the main generate_counterfactuals() function."""

    def test_smaller_portion_generated(self, well_controlled_stage, standard_meal_totals):
        """Smaller portion scenario is generated for eligible meals."""
        bundle = generate_counterfactuals(
            standard_meal_totals,
            well_controlled_stage,
            hour=19,
        )
        types = {s.type for s in bundle.scenarios}
        assert "smaller_portion" in types
        smaller = next(s for s in bundle.scenarios if s.type == "smaller_portion")
        assert smaller.totals["carbs_g"] < standard_meal_totals.carbs_g
        assert smaller.comparison.peak_delta_mg_dl >= 0  # smaller portion = lower peak

    def test_lower_fat_generated_for_high_fat_meal(self, high_fat_delayed_stage, large_high_fat_meal_totals):
        """Lower-fat scenario is generated for high-fat meals."""
        bundle = generate_counterfactuals(
            large_high_fat_meal_totals,
            high_fat_delayed_stage,
            hour=19,
        )
        types = {s.type for s in bundle.scenarios}
        assert "lower_fat" in types

    def test_lower_fat_skipped_for_low_fat_meal(self, well_controlled_stage, small_meal_totals):
        """Lower-fat scenario is skipped for meals with <15g fat."""
        bundle = generate_counterfactuals(
            small_meal_totals,
            well_controlled_stage,
            hour=19,
        )
        types = {s.type for s in bundle.scenarios}
        assert "lower_fat" not in types

    def test_different_timing_generated(self, well_controlled_stage, standard_meal_totals):
        """Different timing scenario is always generated."""
        bundle = generate_counterfactuals(
            standard_meal_totals,
            well_controlled_stage,
            hour=19,
        )
        types = {s.type for s in bundle.scenarios}
        assert "different_timing" in types

    def test_separate_snack_generated_for_large_meal(self, well_controlled_stage, standard_meal_totals):
        """Separate snack scenario is generated for meals >= 30g carbs."""
        bundle = generate_counterfactuals(
            standard_meal_totals,
            well_controlled_stage,
            hour=19,
        )
        types = {s.type for s in bundle.scenarios}
        assert "separate_snack" in types

    def test_separate_snack_skipped_for_small_meal(self, well_controlled_stage, small_meal_totals):
        """Separate snack is skipped for meals < 30g carbs."""
        bundle = generate_counterfactuals(
            small_meal_totals,
            well_controlled_stage,
            hour=19,
        )
        types = {s.type for s in bundle.scenarios}
        assert "separate_snack" not in types

    def test_at_least_two_scenarios(self, well_controlled_stage, standard_meal_totals):
        """At least 2 alternative scenarios are produced for eligible meals."""
        bundle = generate_counterfactuals(
            standard_meal_totals,
            well_controlled_stage,
            hour=19,
        )
        assert len(bundle.scenarios) >= 2

    def test_no_dosing_language(self, well_controlled_stage, standard_meal_totals):
        """Output must not contain dosing/bolus/treatment language."""
        bundle = generate_counterfactuals(
            standard_meal_totals,
            well_controlled_stage,
            hour=19,
        )
        text = render_counterfactual_bundle(bundle)
        forbidden = ["dose", "bolus", "insulin", "treatment", "inject", "units of"]
        for word in forbidden:
            assert word not in text.lower(), f"Found forbidden word: {word}"

    def test_disclaimer_present(self, well_controlled_stage, standard_meal_totals):
        """Safety disclaimer must be in the bundle."""
        bundle = generate_counterfactuals(
            standard_meal_totals,
            well_controlled_stage,
            hour=19,
        )
        text = render_counterfactual_bundle(bundle, food_text="pizza")
        assert "not medical advice" in text.lower()

    def test_rendered_text_has_what_if_section(self, well_controlled_stage, standard_meal_totals):
        """Rendered text should have the 'What-If Scenarios' section header."""
        bundle = generate_counterfactuals(
            standard_meal_totals,
            well_controlled_stage,
            hour=19,
        )
        text = render_counterfactual_bundle(bundle, food_text="pizza")
        assert "What-If Scenarios" in text

    def test_comparison_metrics_present(self, well_controlled_stage, standard_meal_totals):
        """Each scenario should have comparison metrics (peak delta)."""
        bundle = generate_counterfactuals(
            standard_meal_totals,
            well_controlled_stage,
            hour=19,
        )
        for s in bundle.scenarios:
            assert s.comparison.peak_delta_mg_dl is not None

    def test_forecast_values_reasonable(self, well_controlled_stage, standard_meal_totals):
        """Forecast values should be in a physiologically reasonable range."""
        bundle = generate_counterfactuals(
            standard_meal_totals,
            well_controlled_stage,
            hour=19,
        )
        for s in bundle.scenarios:
            fc = s.forecast
            assert fc["peak_mg_dl"] >= 80  # Not too low
            assert fc["peak_mg_dl"] <= 400  # Soft cap
            assert fc["peak_time_minutes"] >= 15

    def test_current_meal_included(self, well_controlled_stage, standard_meal_totals):
        """The bundle includes the reference meal data."""
        bundle = generate_counterfactuals(
            standard_meal_totals,
            well_controlled_stage,
            hour=19,
        )
        assert bundle.current_meal is not None
        assert "peak_mg_dl" in bundle.current_meal
        assert "totals" in bundle.current_meal
        assert bundle.current_meal["totals"]["carbs_g"] == standard_meal_totals.carbs_g

    def test_evening_timing_shifts_to_midday(self, well_controlled_stage, standard_meal_totals):
        """A meal at hour 19 should suggest a midday alternative."""
        bundle = generate_counterfactuals(
            standard_meal_totals,
            well_controlled_stage,
            hour=19,
        )
        timing = next(s for s in bundle.scenarios if s.type == "different_timing")
        assert "midday" in timing.description.lower()

    def test_midday_timing_shifts_to_evening(self, well_controlled_stage, standard_meal_totals):
        """A meal at hour 12 should suggest an evening alternative."""
        bundle = generate_counterfactuals(
            standard_meal_totals,
            well_controlled_stage,
            hour=12,
        )
        timing = next(s for s in bundle.scenarios if s.type == "different_timing")
        assert "evening" in timing.description.lower()

    def test_high_fat_profile_delays_peak(self, high_fat_delayed_stage, large_high_fat_meal_totals):
        """On a high-fat profile, the forecast should reflect fat delay dynamics."""
        bundle = generate_counterfactuals(
            large_high_fat_meal_totals,
            high_fat_delayed_stage,
            hour=19,
        )
        lower_fat = next((s for s in bundle.scenarios if s.type == "lower_fat"), None)
        if lower_fat:
            # Lower fat should have a different (likely earlier) peak time
            assert lower_fat.forecast["peak_time_minutes"] >= 15


class TestExplicitSkipping:
    """Tests that individual scenarios can be excluded."""

    def test_skip_smaller_portion(self, well_controlled_stage, standard_meal_totals):
        bundle = generate_counterfactuals(
            standard_meal_totals,
            well_controlled_stage,
            include_smaller_portion=False,
        )
        assert "smaller_portion" not in {s.type for s in bundle.scenarios}

    def test_skip_lower_fat(self, well_controlled_stage, large_high_fat_meal_totals):
        bundle = generate_counterfactuals(
            large_high_fat_meal_totals,
            well_controlled_stage,
            include_lower_fat=False,
        )
        assert "lower_fat" not in {s.type for s in bundle.scenarios}

    def test_skip_different_timing(self, well_controlled_stage, standard_meal_totals):
        bundle = generate_counterfactuals(
            standard_meal_totals,
            well_controlled_stage,
            include_different_timing=False,
        )
        assert "different_timing" not in {s.type for s in bundle.scenarios}

    def test_skip_separate_snack(self, well_controlled_stage, standard_meal_totals):
        bundle = generate_counterfactuals(
            standard_meal_totals,
            well_controlled_stage,
            include_separate_snack=False,
        )
        assert "separate_snack" not in {s.type for s in bundle.scenarios}


class TestDataclassStructure:
    """Tests for the dataclass structure."""

    def test_counterfactual_bundle_creation(self):
        """CounterfactualBundle can be created with default values."""
        bundle = CounterfactualBundle(current_meal={"peak_mg_dl": 180, "peak_time_minutes": 90})
        assert bundle.current_meal["peak_mg_dl"] == 180
        assert bundle.scenarios == []
        assert bundle.disclaimer

    def test_counterfactual_scenario_creation(self):
        """CounterfactualScenario can be created with minimal values."""
        comparison = CounterfactualComparison(peak_delta_mg_dl=20, peak_delta_percent=11.1, timing_delta_minutes=0)
        scenario = CounterfactualScenario(
            type="smaller_portion",
            label="Smaller Portion",
            description="Description",
            totals={"carbs_g": 42.0},
            forecast={"peak_mg_dl": 160},
            comparison=comparison,
        )
        assert scenario.type == "smaller_portion"
        assert scenario.comparison.peak_delta_mg_dl == 20

    def test_empty_bundle_renders_empty(self):
        """An empty bundle renders to empty string."""
        bundle = CounterfactualBundle(current_meal={})
        assert render_counterfactual_bundle(bundle) == ""


class TestIntegration:
    """Integration-style tests that run the full pipeline."""

    def test_full_pipeline_with_real_stage(self, well_controlled_stage, standard_meal_totals):
        """Full pipeline: generate + render produces meaningful text."""
        bundle = generate_counterfactuals(
            standard_meal_totals,
            well_controlled_stage,
            hour=19,
        )
        text = render_counterfactual_bundle(bundle, food_text="pizza and salad")
        assert len(text) > 100
        assert "Scenario" in text
        assert "Smaller Portion" in text or "lower" in text.lower()
        assert "mg/dL" in text

    def test_json_output_format(self, well_controlled_stage, standard_meal_totals):
        """JSON rendering produces valid JSON."""
        bundle = generate_counterfactuals(
            standard_meal_totals,
            well_controlled_stage,
            hour=19,
        )
        json_text = render_counterfactual_bundle(bundle, format="json")
        import json
        parsed = json.loads(json_text)
        assert "scenarios" in parsed
        assert "current_meal" in parsed
        assert "disclaimer" in parsed

    def test_historical_context_applied(self, well_controlled_stage, standard_meal_totals):
        """Historical context, when provided, is attached to scenarios."""
        historical = {
            "similar_meals_count": 5,
            "avg_peak_rise_mg_dl": 55,
            "peak_rise_range_mg_dl": [40, 70],
            "avg_peak_time_minutes": 90,
            "confidence_tier": "medium",
        }
        bundle = generate_counterfactuals(
            standard_meal_totals,
            well_controlled_stage,
            hour=19,
            historical_context=historical,
        )
        has_historical = any(s.historical_note for s in bundle.scenarios)
        assert has_historical, "At least one scenario should have historical context"

    def test_no_historical_when_not_provided(self, well_controlled_stage, standard_meal_totals):
        """When no historical context is passed, historical_note should be empty."""
        bundle = generate_counterfactuals(
            standard_meal_totals,
            well_controlled_stage,
            hour=19,
        )
        for s in bundle.scenarios:
            assert s.historical_note == ""

    def test_all_four_scenarios_for_large_high_fat(self, high_fat_delayed_stage, large_high_fat_meal_totals):
        """A large high-fat meal at evening should produce all 4 scenario types."""
        bundle = generate_counterfactuals(
            large_high_fat_meal_totals,
            high_fat_delayed_stage,
            hour=19,
        )
        types = {s.type for s in bundle.scenarios}
        expected = {"smaller_portion", "lower_fat", "different_timing", "separate_snack"}
        assert types == expected, f"Expected {expected}, got {types}"


class TestRenderCounterfactualBundle:
    """Tests for the render_counterfactual_bundle() function."""

    def test_empty_bundle_returns_empty_string(self):
        """Empty bundle renders to empty string regardless of food_text."""
        bundle = CounterfactualBundle(current_meal={})
        assert render_counterfactual_bundle(bundle, food_text="pizza") == ""
        assert render_counterfactual_bundle(bundle, format="json") == ""

    def test_fallback_description_when_no_food_text(self, well_controlled_stage, standard_meal_totals):
        """Without food_text, uses peak/timing fallback description."""
        bundle = generate_counterfactuals(standard_meal_totals, well_controlled_stage, hour=19)
        text = render_counterfactual_bundle(bundle)
        assert "Reference meal" in text

    def test_render_with_historical_context_shown(self, well_controlled_stage, standard_meal_totals):
        """Historical note appears in rendered text when provided."""
        historical = {"similar_meals_count": 3, "avg_peak_rise_mg_dl": 55}
        bundle = generate_counterfactuals(
            standard_meal_totals, well_controlled_stage, hour=19, historical_context=historical,
        )
        text = render_counterfactual_bundle(bundle, food_text="pizza")
        assert "Historical context" in text
        assert "similar meals" in text

    def test_render_all_scenario_mentions(self, well_controlled_stage, large_high_fat_meal_totals):
        """All scenario types mentioned in rendered output."""
        bundle = generate_counterfactuals(
            large_high_fat_meal_totals, well_controlled_stage, hour=19,
        )
        text = render_counterfactual_bundle(bundle, food_text="pizza")
        assert "Scenario 1:" in text
        assert "Scenario 2:" in text
        assert "Scenario 3:" in text
        assert "Scenario 4:" in text


class TestSafetyLanguage:
    """Comprehensive safety language checks."""

    _FORBIDDEN_TERMS = [
        "dose", "bolus", "insulin", "treatment", "inject", "units of",
        "recommend", "should take", "prescribe", "medication",
    ]

    def test_module_safety_disclaimer(self):
        """Module docstring contains safety boundary."""
        from src import counterfactual_coach
        assert counterfactual_coach.__doc__ is not None
        assert "educational" in counterfactual_coach.__doc__.lower()

    def test_forbidden_terms_in_text(self, well_controlled_stage, standard_meal_totals):
        """None of the forbidden terms appear in rendered output."""
        bundle = generate_counterfactuals(standard_meal_totals, well_controlled_stage, hour=19)
        text = render_counterfactual_bundle(bundle, food_text="pizza")
        for word in self._FORBIDDEN_TERMS:
            assert word not in text.lower(), f"Found forbidden term: '{word}'"

    def test_forbidden_terms_in_json(self, well_controlled_stage, standard_meal_totals):
        """None of the forbidden terms appear in JSON output."""
        import json
        bundle = generate_counterfactuals(standard_meal_totals, well_controlled_stage, hour=19)
        parsed = json.loads(render_counterfactual_bundle(bundle, format="json"))
        text = json.dumps(parsed).lower()
        for word in self._FORBIDDEN_TERMS:
            assert word not in text, f"Found forbidden term in JSON: '{word}'"


class TestInternalHelpers:
    """Tests for internal helper functions."""

    def test_describe_improvement_peak_reduced(self):
        """Describes peak reduction correctly."""
        comp = CounterfactualComparison(peak_delta_mg_dl=15, peak_delta_percent=10.0, timing_delta_minutes=0)
        result = _describe_improvement(comp, "smaller_portion")
        assert "Peak reduced" in result
        assert "15" in result

    def test_describe_improvement_peak_increased(self):
        """Describes peak increase correctly."""
        comp = CounterfactualComparison(peak_delta_mg_dl=-10, peak_delta_percent=-6.7, timing_delta_minutes=0)
        result = _describe_improvement(comp, "lower_fat")
        assert "Peak increased" in result
        assert "10" in result

    def test_describe_improvement_similar_peak(self):
        """Describes similar peak when delta is zero."""
        comp = CounterfactualComparison(peak_delta_mg_dl=0, peak_delta_percent=0.0, timing_delta_minutes=0)
        result = _describe_improvement(comp, "different_timing")
        assert "Similar peak glucose" in result

    def test_describe_improvement_timing(self):
        """Describes timing delay and early correctly."""
        comp = CounterfactualComparison(peak_delta_mg_dl=5, peak_delta_percent=3.0, timing_delta_minutes=20)
        result = _describe_improvement(comp, "smaller_portion")
        assert "peak delayed" in result
        comp2 = CounterfactualComparison(peak_delta_mg_dl=5, peak_delta_percent=3.0, timing_delta_minutes=-15)
        result2 = _describe_improvement(comp2, "different_timing")
        assert "peak earlier" in result2

    def test_describe_improvement_uncertainty(self):
        """Describes uncertainty range change."""
        comp = CounterfactualComparison(
            peak_delta_mg_dl=10, peak_delta_percent=5.0, timing_delta_minutes=0,
            peak_low_delta_mg_dl=5, peak_high_delta_mg_dl=10,
        )
        result = _describe_improvement(comp, "separate_snack")
        assert "wider" in result or "narrower" in result

    def test_estimate_fat_from_totals(self):
        """Fat estimation works for high-sugar, mixed, and zero-carb meals."""
        assert _estimate_fat_from_totals(carbs_g=30.0, sugars_g=25.0) == 2.0
        fat = _estimate_fat_from_totals(carbs_g=50.0, sugars_g=10.0)
        assert abs(fat - 15.0) < 0.1
        assert _estimate_fat_from_totals(carbs_g=0, sugars_g=0) == 0.0

    def test_make_comparison_zero_peak(self):
        """Comparison handles zero peak safely (no division by zero)."""
        current = ForecastResult(baseline_mg_dl=100, peak_mg_dl=0, peak_time_minutes=60)
        cf = ForecastResult(baseline_mg_dl=100, peak_mg_dl=0, peak_time_minutes=60)
        comp = _make_comparison(current, MealTotals(carbs_g=0), cf)
        assert isinstance(comp.peak_delta_mg_dl, int)


class TestCompanionCardIntegration:
    """Tests for companion card wrapping in companion.py."""

    def test_counterfactual_scenarios_card_returns_card(self):
        """counterfactual_scenarios_card returns a card when text is present."""
        from src.companion import counterfactual_scenarios_card
        cards = counterfactual_scenarios_card("\n━━━ What-If Scenarios ━━━\n  scenario output")
        assert len(cards) == 1
        assert "What-If Scenarios" in cards[0]

    def test_counterfactual_scenarios_card_empty(self):
        """counterfactual_scenarios_card returns [] when text is empty."""
        from src.companion import counterfactual_scenarios_card
        assert counterfactual_scenarios_card("") == []
        assert counterfactual_scenarios_card(None) == []  # type: ignore[arg-type]

    def test_counterfactual_scenarios_card_adds_step_label(self):
        """counterfactual_scenarios_card prepends a Step 5 label."""
        from src.companion import counterfactual_scenarios_card
        cards = counterfactual_scenarios_card("\n━━━ What-If Scenarios ━━━\n  test data")
        assert "Step 5" in cards[0]

    def test_meal_pipeline_section_includes_counterfactual(self):
        """meal_pipeline_section with counterfactual_text shows Step 5 card."""
        from src.companion import meal_pipeline_section
        cards = meal_pipeline_section(
            profile_label="Test",
            parsed_foods=[{"item": "pizza", "quantity": 1}],
            food_evidence=[],
            meal_totals={"carbs_g": 50, "fat_g": 15, "sugars_g": 5, "protein_g": 8,
                         "kcal": 300, "top_carb_contributor": "", "top_uncertainty_items": [],
                         "absorption_profile": "standard"},
            forecast={"peak_mg_dl": 180, "peak_time_minutes": 90, "baseline_mg_dl": 110,
                      "uncertainty_band": {"peak_range_mg_dl": [160, 200], "peak_time_range_minutes": [60, 120]}},
            historical_context={"similar_meals_count": 0},
            risk_flags=[],
            chart="",
            counterfactual_text="\n━━━ What-If Scenarios ━━━\n  Scenario 1: Smaller Portion",
        )
        step5 = [c for c in cards if "Step 5" in c]
        assert len(step5) == 1
        assert "Smaller Portion" in step5[0]

    def test_meal_pipeline_section_no_counterfactual(self):
        """meal_pipeline_section without counterfactual_text has no Step 5."""
        from src.companion import meal_pipeline_section
        cards = meal_pipeline_section(
            profile_label="Test",
            parsed_foods=[{"item": "pizza", "quantity": 1}],
            food_evidence=[],
            meal_totals={"carbs_g": 50, "fat_g": 15, "sugars_g": 5, "protein_g": 8,
                         "kcal": 300, "top_carb_contributor": "", "top_uncertainty_items": [],
                         "absorption_profile": "standard"},
            forecast={"peak_mg_dl": 180, "peak_time_minutes": 90, "baseline_mg_dl": 110,
                      "uncertainty_band": {"peak_range_mg_dl": [160, 200], "peak_time_range_minutes": [60, 120]}},
            historical_context={"similar_meals_count": 0},
            risk_flags=[],
            chart="",
        )
        step5 = [c for c in cards if "Step 5" in c]
        assert len(step5) == 0


class TestEdgeCaseScenarios:
    """Edge case tests for scenario generation."""

    def test_midnight_meal_shifts_to_evening(self, well_controlled_stage, standard_meal_totals):
        """A meal at hour 0 (midnight) suggests an evening alternative."""
        bundle = generate_counterfactuals(standard_meal_totals, well_controlled_stage, hour=0)
        timing = next(s for s in bundle.scenarios if s.type == "different_timing")
        assert "evening" in timing.description.lower()

    def test_meal_at_hour_23_shifts_to_midday(self, well_controlled_stage, standard_meal_totals):
        """A meal at hour 23 suggests a midday alternative."""
        bundle = generate_counterfactuals(standard_meal_totals, well_controlled_stage, hour=23)
        timing = next(s for s in bundle.scenarios if s.type == "different_timing")
        assert "midday" in timing.description.lower()

    def test_lunch_hour_shifts_to_evening(self, well_controlled_stage, standard_meal_totals):
        """A meal at hour 13 suggests an evening alternative."""
        bundle = generate_counterfactuals(standard_meal_totals, well_controlled_stage, hour=13)
        timing = next(s for s in bundle.scenarios if s.type == "different_timing")
        assert "evening" in timing.description.lower()

    def test_boundary_hour_14_shifts_to_midday(self, well_controlled_stage, standard_meal_totals):
        """Hour 14 is >= 14, shifts to midday."""
        bundle = generate_counterfactuals(standard_meal_totals, well_controlled_stage, hour=14)
        timing = next(s for s in bundle.scenarios if s.type == "different_timing")
        assert "midday" in timing.description.lower()

    def test_boundary_hour_13_shifts_to_evening(self, well_controlled_stage, standard_meal_totals):
        """Hour 13 is < 14, shifts to evening."""
        bundle = generate_counterfactuals(standard_meal_totals, well_controlled_stage, hour=13)
        timing = next(s for s in bundle.scenarios if s.type == "different_timing")
        assert "evening" in timing.description.lower()

    def test_portion_boundary_15g(self, well_controlled_stage):
        """15g carbs qualifies for smaller portion; 14g does not."""
        totals = MealTotals(carbs_g=15.0, fat_g=5.0, sugars_g=3.0)
        assert "smaller_portion" in {s.type for s in generate_counterfactuals(totals, well_controlled_stage, hour=19).scenarios}
        totals2 = MealTotals(carbs_g=14.0, fat_g=5.0, sugars_g=3.0)
        assert "smaller_portion" not in {s.type for s in generate_counterfactuals(totals2, well_controlled_stage, hour=19).scenarios}

    def test_snack_threshold_30g(self, well_controlled_stage):
        """30g carbs qualifies for separate snack; 29g does not."""
        totals29 = MealTotals(carbs_g=29.0, fat_g=8.0, sugars_g=10.0)
        assert "separate_snack" not in {s.type for s in generate_counterfactuals(totals29, well_controlled_stage, hour=19).scenarios}
        totals30 = MealTotals(carbs_g=30.0, fat_g=8.0, sugars_g=10.0)
        assert "separate_snack" in {s.type for s in generate_counterfactuals(totals30, well_controlled_stage, hour=19).scenarios}

    def test_zero_sugars_meal(self, well_controlled_stage):
        """A meal with zero sugars still generates valid scenarios."""
        bundle = generate_counterfactuals(
            MealTotals(carbs_g=45.0, fat_g=10.0, sugars_g=0.0), well_controlled_stage, hour=19,
        )
        assert len(bundle.scenarios) >= 2

    def test_zero_carbs_meal(self, well_controlled_stage):
        """Zero carbs generates only different_timing."""
        bundle = generate_counterfactuals(
            MealTotals(carbs_g=0.0, fat_g=20.0, sugars_g=0.0), well_controlled_stage, hour=19,
        )
        types = {s.type for s in bundle.scenarios}
        assert "smaller_portion" not in types
        assert "separate_snack" not in types


class TestPipelineIntegration:
    """Tests that counterfactual data flows through the full pipeline."""

    def test_evidence_bundle_accepts_counterfactual_context(self):
        """make_evidence_bundle accepts counterfactual_context parameter."""
        from src.adapter.evidence import make_evidence_bundle
        forecast = ForecastResult(baseline_mg_dl=100, peak_mg_dl=180, peak_time_minutes=90)
        totals = MealTotals(carbs_g=50.0)
        cf_context = {
            "available_scenarios": [
                {"type": "smaller_portion", "label": "Smaller Portion",
                 "comparison_delta_mg_dl": 15, "comparison_timing_delta_min": 15}
            ],
            "disclaimer": "Educational simulation only.",
        }
        bundle = make_evidence_bundle(
            forecast=forecast, totals=totals,
            confidence_overall="medium",
            counterfactual_context=cf_context,
        )
        assert "counterfactuals" in bundle
        assert bundle["counterfactuals"]["available_scenarios"][0]["type"] == "smaller_portion"

    def test_pipeline_cf_helper_converts_correctly(self):
        """_cf_bundle_to_dict converts to expected shape."""
        from src.pipeline.companion_pipeline import _cf_bundle_to_dict
        scenario = CounterfactualScenario(
            type="smaller_portion", label="Smaller Portion",
            description="Test", totals={"carbs_g": 35.0},
            forecast={"peak_mg_dl": 150},
            comparison=CounterfactualComparison(
                peak_delta_mg_dl=20, peak_delta_percent=11.1, timing_delta_minutes=15,
            ),
        )
        bundle = CounterfactualBundle(
            current_meal={"peak_mg_dl": 180, "totals": {"carbs_g": 50}},
            scenarios=[scenario],
        )
        result = _cf_bundle_to_dict(bundle)
        assert "available_scenarios" in result
        assert len(result["available_scenarios"]) == 1
        assert result["available_scenarios"][0]["type"] == "smaller_portion"

    def test_early_return_no_counterfactuals(self):
        """Early return has no counterfactuals key."""
        from src.pipeline.companion_pipeline import _build_early_return
        result = _build_early_return("pizza", [], {"totals": {}, "evidence_items": [], "confidence_overall": "low"})
        assert "counterfactuals" not in result

    def test_empty_bundle_to_dict(self):
        """Empty bundle returns empty dict from helper."""
        from src.pipeline.companion_pipeline import _cf_bundle_to_dict
        assert _cf_bundle_to_dict(CounterfactualBundle(current_meal={})) == {}
        assert _cf_bundle_to_dict(CounterfactualBundle(current_meal={}, scenarios=[])) == {}
