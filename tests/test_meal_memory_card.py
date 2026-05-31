"""Tests for Issue #22: Meal Memory card.

Focuses on the enhanced historical_context_for_meal() and the
companion pipeline Step 4 card rendering.
"""

from __future__ import annotations

from unittest.mock import MagicMock

from app.services.historical_meal_matcher import (
    HistoricalMealMatch,
    historical_context_for_meal,
    _build_worst_outcome,
    _compute_evidence_count,
    _top_meals_card,
)


class TestMealMemoryCardFields:
    """Verify the new fields added for Issue #22."""

    def test_worst_outcome(self):
        """Worst outcome picks the highest peak_delta."""
        matches = [
            HistoricalMealMatch(food_name="Pizza", timestamp="", carb_estimate_g=50, fat_g=10,
                                peak_delta_mgdl=40, peak_time_minutes=60, anchor_type="wc"),
            HistoricalMealMatch(food_name="Burger", timestamp="", carb_estimate_g=50, fat_g=10,
                                peak_delta_mgdl=80, peak_time_minutes=90, anchor_type="wc"),
            HistoricalMealMatch(food_name="Salad", timestamp="", carb_estimate_g=50, fat_g=10,
                                peak_delta_mgdl=30, peak_time_minutes=45, anchor_type="wc"),
        ]
        result = _build_worst_outcome(matches, 50)
        assert "Worst past result: 80 mg/dL rise (Burger)." == result

    def test_worst_outcome_no_data(self):
        """No matches with CGM data returns empty string."""
        matches = [
            HistoricalMealMatch(food_name="Pizza", timestamp="", carb_estimate_g=50, fat_g=10,
                                peak_delta_mgdl=None, peak_time_minutes=None, anchor_type="wc"),
        ]
        assert _build_worst_outcome(matches, 50) == ""

    def test_worst_outcome_empty_list(self):
        """Empty match list returns empty string."""
        assert _build_worst_outcome([], 50) == ""

    def test_evidence_count_all_with_outcome(self):
        """All matches have CGM outcome data."""
        matches = [
            HistoricalMealMatch(food_name="A", timestamp="", carb_estimate_g=50, fat_g=10,
                                peak_delta_mgdl=40, peak_time_minutes=60, anchor_type="wc"),
            HistoricalMealMatch(food_name="B", timestamp="", carb_estimate_g=50, fat_g=10,
                                peak_delta_mgdl=50, peak_time_minutes=70, anchor_type="wc"),
        ]
        ec = _compute_evidence_count(matches)
        assert ec["total_matches"] == 2
        assert ec["with_cgm_outcome"] == 2
        assert ec["food_only"] == 0

    def test_evidence_count_mixed(self):
        """Some matches lack CGM outcome data."""
        matches = [
            HistoricalMealMatch(food_name="A", timestamp="", carb_estimate_g=50, fat_g=10,
                                peak_delta_mgdl=40, peak_time_minutes=60, anchor_type="wc"),
            HistoricalMealMatch(food_name="B", timestamp="", carb_estimate_g=50, fat_g=10,
                                peak_delta_mgdl=None, peak_time_minutes=None, anchor_type="wc"),
        ]
        ec = _compute_evidence_count(matches)
        assert ec["total_matches"] == 2
        assert ec["with_cgm_outcome"] == 1
        assert ec["food_only"] == 1

    def test_top_meals_card_returns_3(self):
        """Top meals card returns at most 3 entries."""
        matches = [
            HistoricalMealMatch(food_name=f"Meal{i}", timestamp="", carb_estimate_g=50, fat_g=10,
                                peak_delta_mgdl=40 + i, peak_time_minutes=60, anchor_type="wc")
            for i in range(5)
        ]
        cards = _top_meals_card(matches, limit=3)
        assert len(cards) == 3

    def test_top_meals_card_format(self):
        """Each meal card has the expected fields."""
        matches = [
            HistoricalMealMatch(food_name="Pizza", timestamp="", carb_estimate_g=50, fat_g=10,
                                peak_delta_mgdl=45, peak_time_minutes=90, anchor_type="wc",
                                similarity_score=0.85),
        ]
        cards = _top_meals_card(matches)
        assert len(cards) == 1
        c = cards[0]
        assert c["food"] == "Pizza"
        assert c["carbs_g"] == 50.0
        assert c["fat_g"] == 10.0
        assert c["peak_rise_mg_dl"] == 45
        assert c["peak_time_min"] == 90
        assert c["similarity"] == 0.85
        assert c["has_outcome"] is True

    def test_top_meals_card_no_outcome(self):
        """Meals without CGM outcome are correctly flagged."""
        matches = [
            HistoricalMealMatch(food_name="Unknown", timestamp="", carb_estimate_g=50, fat_g=10,
                                peak_delta_mgdl=None, peak_time_minutes=None, anchor_type="wc",
                                similarity_score=0.5),
        ]
        cards = _top_meals_card(matches)
        assert cards[0]["has_outcome"] is False
        assert cards[0]["peak_rise_mg_dl"] is None
        assert cards[0]["peak_time_min"] is None


class TestHistoricalContextExtended:
    """Verify the enhanced historical_context_for_meal."""

    def test_has_all_new_fields(self):
        """historical_context_for_meal returns all Issue #22 fields."""
        ctx = historical_context_for_meal(
            "test meal", carbs_g=50, fat_g=15,
            food_name="test", anchor_type="well_controlled",
        )
        assert "worst_past_outcome" in ctx
        assert "evidence_count" in ctx
        assert "data_source" in ctx
        assert "top_meals" in ctx
        assert "best_past_outcome" in ctx

    def test_data_source_synthetic_when_matches(self):
        """When matches exist, data_source is synthetic_legends_demo."""
        ctx = historical_context_for_meal(
            "pizza", carbs_g=50, fat_g=15,
            food_name="pizza", anchor_type="well_controlled",
        )
        if ctx["similar_meals_count"] > 0:
            assert ctx["data_source"] == "synthetic_legends_demo"

    def test_data_source_no_history_no_matches(self):
        """When no matches, data_source is no_history."""
        ctx = historical_context_for_meal(
            "xyzzy-super-rare-food", carbs_g=500, fat_g=99,
            food_name="xyzzy-super-rare-food", anchor_type="well_controlled",
        )
        assert ctx["data_source"] == "no_history"

    def test_evidence_count_structure(self):
        """evidence_count dict has expected keys."""
        ctx = historical_context_for_meal(
            "pizza", carbs_g=50, fat_g=15,
            food_name="pizza", anchor_type="well_controlled",
        )
        assert "total_matches" in ctx["evidence_count"]
        assert "with_cgm_outcome" in ctx["evidence_count"]
        assert "food_only" in ctx["evidence_count"]

    def test_top_meals_max_3(self):
        """top_meals returns at most 3 entries."""
        ctx = historical_context_for_meal(
            "pizza", carbs_g=50, fat_g=15,
            food_name="pizza", anchor_type="well_controlled",
        )
        assert len(ctx["top_meals"]) <= 3


class TestMealMemoryCardRendering:
    """Verify the companion pipeline Step 4 card rendering."""

    def test_separator_included(self):
        """The Step 4 separator is in the card."""
        from src.companion import meal_pipeline_section

        cards = meal_pipeline_section(
            profile_label="Well Controlled",
            parsed_foods=[{"item": "pizza", "quantity": 1, "unit": "slice"}],
            food_evidence=[{"parsed": {"item": "pizza", "quantity": 1}, "computed": {"carbs_g": 50, "fat_g": 15, "sugars_g": 5}, "confidence": "medium", "warnings": []}],
            meal_totals={"carbs_g": 50, "fat_g": 15, "sugars_g": 5, "protein_g": 8, "kcal": 300, "top_carb_contributor": "", "top_uncertainty_items": [], "absorption_profile": "standard"},
            forecast={"peak_mg_dl": 180, "peak_time_minutes": 90, "baseline_mg_dl": 110, "uncertainty_band": {"peak_range_mg_dl": [160, 200], "peak_time_range_minutes": [60, 120]}},
            historical_context={"similar_meals_count": 3, "avg_peak_rise_mg_dl": 65, "peak_rise_range_mg_dl": [45, 85],
                                "avg_peak_time_minutes": 90, "similarity_reason": "Matched on pizza", "what_changed_note": "Carbs are 10g higher",
                                "best_past_outcome": "Best past result: 45 mg/dL", "worst_past_outcome": "Worst past result: 85 mg/dL",
                                "consistency_tier": "medium", "consistency_score": 0.65, "case_based_observations": [],
                                "evidence_count": {"total_matches": 3, "with_cgm_outcome": 3, "food_only": 0},
                                "data_source": "synthetic_legends_demo",
                                "top_meals": [{"food": "Pizza", "carbs_g": 50, "fat_g": 15, "peak_rise_mg_dl": 65, "peak_time_min": 90, "similarity": 0.85, "has_outcome": True}]},
            risk_flags=[],
            chart="  chart placeholder",
        )

        # Find the Step 4 card (index 3)
        step4 = [c for c in cards if "Step 4" in c][0]
        assert "Meal Memory" in step4
        assert "3 meals matched" in step4
        assert "Matched on pizza" in step4
        assert "Top matches:" in step4
        assert "Pizza" in step4
        assert "Worst past result" in step4
        assert "Best past result" in step4
        assert "synthetic legends demo" in step4
        assert "CGM outcome" in step4

    def test_no_history_state(self):
        """When no similar meals, card shows clear state."""
        from src.companion import meal_pipeline_section

        cards = meal_pipeline_section(
            profile_label="Well Controlled",
            parsed_foods=[{"item": "xyzzy", "quantity": 1, "unit": ""}],
            food_evidence=[{"parsed": {"item": "xyzzy", "quantity": 1}, "computed": {"carbs_g": 10, "fat_g": 0, "sugars_g": 2}, "confidence": "low", "warnings": []}],
            meal_totals={"carbs_g": 10, "fat_g": 0, "sugars_g": 2, "protein_g": 0, "kcal": 40, "top_carb_contributor": "", "top_uncertainty_items": [], "absorption_profile": "standard"},
            forecast={"peak_mg_dl": 120, "peak_time_minutes": 60, "baseline_mg_dl": 110, "uncertainty_band": {}},
            historical_context={"similar_meals_count": 0},
            risk_flags=[],
            chart="  chart placeholder",
        )

        step4 = [c for c in cards if "Step 4" in c][0]
        assert "No similar meals found" in step4

    def test_what_changed_shown_when_present(self):
        """What changed note is rendered when available."""
        from src.companion import meal_pipeline_section

        cards = meal_pipeline_section(
            profile_label="Well Controlled",
            parsed_foods=[{"item": "pizza", "quantity": 1, "unit": ""}],
            food_evidence=[{"parsed": {"item": "pizza", "quantity": 1}, "computed": {"carbs_g": 50, "fat_g": 15, "sugars_g": 5}, "confidence": "medium", "warnings": []}],
            meal_totals={"carbs_g": 50, "fat_g": 15, "sugars_g": 5, "protein_g": 8, "kcal": 300, "top_carb_contributor": "", "top_uncertainty_items": [], "absorption_profile": "standard"},
            forecast={"peak_mg_dl": 180, "peak_time_minutes": 90, "baseline_mg_dl": 110, "uncertainty_band": {}},
            historical_context={"similar_meals_count": 2, "avg_peak_rise_mg_dl": 60, "peak_rise_range_mg_dl": [50, 70],
                                "avg_peak_time_minutes": 85, "similarity_reason": "Matched on pizza",
                                "what_changed_note": "This time, fat is 8g higher than usual.",
                                "best_past_outcome": "Best past result: 50 mg/dL",
                                "worst_past_outcome": "Worst past result: 70 mg/dL",
                                "consistency_tier": "high", "consistency_score": 0.85, "case_based_observations": [],
                                "evidence_count": {"total_matches": 2, "with_cgm_outcome": 2, "food_only": 0},
                                "data_source": "synthetic_legends_demo",
                                "top_meals": []},
            risk_flags=[],
            chart="",
        )

        step4 = [c for c in cards if "Step 4" in c][0]
        assert "fat is 8g higher" in step4
        assert "What changed" in step4


class TestMealMemoryBackwardCompat:
    """Verify existing callers still work with enhanced fields."""

    def test_historical_context_for_meal_in_runner(self):
        """The runner's call pattern still works."""
        ctx = historical_context_for_meal(
            "test meal", carbs_g=50, fat_g=15,
            food_name="test", anchor_type="well_controlled",
        )
        # Old required fields
        assert "similar_meals_count" in ctx
        assert "avg_peak_rise_mg_dl" in ctx or ctx["similar_meals_count"] == 0
        assert "case_based_observations" in ctx
        # New fields added (backward-compatible)
        assert "worst_past_outcome" in ctx
        assert "evidence_count" in ctx
        assert "data_source" in ctx
        assert "top_meals" in ctx
