"""Integration tests for Issue #22: Meal Memory card.

Verifies the full pipeline: historical_context_for_meal() output →
meal_pipeline_section() Step 4 card rendering.

Tests that ALL fields from the historical context are displayed in the
terminal output, using real legends.json data (6014 entries, 12 profiles).
"""

from __future__ import annotations

import pytest

from app.services.historical_meal_matcher import historical_context_for_meal
from src.companion import meal_pipeline_section


# ── Fixtures ──

def _make_historical_context(**overrides):
    """Build a realistic historical context dict with sensible defaults."""
    base = {
        "similar_meals_count": 5,
        "avg_peak_rise_mg_dl": 72,
        "peak_rise_range_mg_dl": [48, 99],
        "avg_peak_time_minutes": 95,
        "similarity_reason": "Matched on pizza + fries",
        "what_changed_note": "This time, fat is 10g higher than usual.",
        "best_past_outcome": "Best past result: 48 mg/dL rise (Beef Burrito).",
        "worst_past_outcome": "Worst past result: 99 mg/dL rise (Pasta Alfredo).",
        "consistency_tier": "medium",
        "consistency_score": 0.62,
        "confidence_tier": "medium",
        "evidence_count": {"total_matches": 5, "with_cgm_outcome": 4, "food_only": 1},
        "data_source": "synthetic_legends_demo",
        "top_meals": [
            {"food": "Beef Burrito", "carbs_g": 81, "fat_g": 25,
             "peak_rise_mg_dl": 48, "peak_time_min": 90, "similarity": 0.55, "has_outcome": True},
            {"food": "Pasta Alfredo", "carbs_g": 80, "fat_g": 25,
             "peak_rise_mg_dl": 99, "peak_time_min": 168, "similarity": 0.52, "has_outcome": True},
            {"food": "Fish & Chips", "carbs_g": 87, "fat_g": 30,
             "peak_rise_mg_dl": 75, "peak_time_min": 120, "similarity": 0.48, "has_outcome": True},
        ],
        "case_based_observations": [
            "Similar meals rose about 72 mg/dL on average.",
            "Average peak timing was around 95 minutes.",
        ],
    }
    base.update(overrides)
    return base


def _make_card(historical_context):
    """Render meal pipeline cards and return the Step 4 card."""
    cards = meal_pipeline_section(
        profile_label="Well Controlled",
        parsed_foods=[{"item": "pizza", "quantity": 2, "unit": "slice"},
                      {"item": "fries", "quantity": 1, "unit": "large"}],
        food_evidence=[{"parsed": {"item": "pizza", "quantity": 2, "unit": "slice"},
                        "computed": {"carbs_g": 56, "fat_g": 20, "sugars_g": 5},
                        "confidence": "high", "warnings": []},
                       {"parsed": {"item": "fries", "quantity": 1, "unit": "large"},
                        "computed": {"carbs_g": 36, "fat_g": 16, "sugars_g": 1},
                        "confidence": "medium", "warnings": []}],
        meal_totals={"carbs_g": 85, "fat_g": 35, "sugars_g": 5, "protein_g": 12,
                     "kcal": 550, "top_carb_contributor": "pizza (56g)",
                     "top_uncertainty_items": ["portion size"],
                     "absorption_profile": "delayed"},
        forecast={"peak_mg_dl": 204, "peak_time_minutes": 110, "baseline_mg_dl": 112,
                  "uncertainty_band": {"peak_range_mg_dl": [180, 230],
                                       "peak_time_range_minutes": [90, 150]}},
        historical_context=historical_context,
        risk_flags=["fat_may_extend_or_delay_rise", "large_carb_load"],
        chart="  │ 1hr: 193 mg/dL ████████████████████████▌│\n"
              "  │ 2hr: 204 mg/dL █████████████████████████▌│",
    )
    return [c for c in cards if "Step 4" in c][0]


# ── Integration: historical_context_for_meal → Step 4 card ──

class TestHistoricalContextToCardIntegration:
    """Verify every field from historical_context_for_meal appears in Step 4."""

    def test_top_3_meals_rendered(self):
        """Top 3 similar meals are shown with name, carbs, outcome, similarity."""
        ctx = _make_historical_context()
        card = _make_card(ctx)
        assert "Top matches:" in card
        assert "1. Beef Burrito" in card
        assert "2. Pasta Alfredo" in card
        assert "3. Fish & Chips" in card
        assert "81g carbs" in card
        assert "48 mg/dL @ 90 min" in card
        assert "sim: 55%" in card

    def test_similarity_reason_shown(self):
        """Similarity reason is displayed."""
        ctx = _make_historical_context()
        card = _make_card(ctx)
        assert "Matched on pizza + fries" in card

    def test_evidence_count_shown(self):
        """Evidence count (CGM outcome vs food-only) is displayed."""
        ctx = _make_historical_context()
        card = _make_card(ctx)
        assert "4 meals with CGM outcome" in card
        assert "1 food-only records" in card

    def test_best_outcome_shown(self):
        """Best past outcome is displayed."""
        ctx = _make_historical_context()
        card = _make_card(ctx)
        assert "Best past result: 48 mg/dL rise (Beef Burrito)." in card

    def test_worst_outcome_shown(self):
        """Worst past outcome is displayed."""
        ctx = _make_historical_context()
        card = _make_card(ctx)
        assert "Worst past result: 99 mg/dL rise (Pasta Alfredo)." in card

    def test_what_changed_shown(self):
        """What changed note is displayed."""
        ctx = _make_historical_context()
        card = _make_card(ctx)
        assert "fat is 10g higher than usual" in card

    def test_typical_rise_and_range(self):
        """Typical rise with range is displayed."""
        ctx = _make_historical_context()
        card = _make_card(ctx)
        assert "Typical rise: 72 mg/dL (range 48–99 mg/dL)" in card

    def test_peak_timing(self):
        """Average peak timing is displayed."""
        ctx = _make_historical_context()
        card = _make_card(ctx)
        assert "Peak timing: ~95 min" in card

    def test_consistency_tier(self):
        """Consistency tier is displayed."""
        ctx = _make_historical_context()
        card = _make_card(ctx)
        assert "Consistency: medium" in card

    def test_confidence_tier(self):
        """Confidence tier is displayed."""
        ctx = _make_historical_context()
        card = _make_card(ctx)
        assert "Confidence: medium" in card

    def test_case_based_observations(self):
        """Case-based observations are displayed."""
        ctx = _make_historical_context()
        card = _make_card(ctx)
        assert "Similar meals rose about 72 mg/dL on average" in card
        assert "Average peak timing was around 95 minutes" in card

    def test_synthetic_data_label(self):
        """Synthetic/demo data source is labeled."""
        ctx = _make_historical_context()
        card = _make_card(ctx)
        assert "synthetic legends demo data" in card

    def test_meal_count_header(self):
        """Header shows number of matched meals."""
        ctx = _make_historical_context()
        card = _make_card(ctx)
        assert "5 meals matched" in card


class TestNoHistoryState:
    """Verify clear no-history display when no matches found."""

    def test_no_matches_message(self):
        """When 0 matches, card shows clear no-history state."""
        ctx = _make_historical_context(
            similar_meals_count=0,
            data_source="no_history",
            top_meals=[],
            evidence_count={},
        )
        card = _make_card(ctx)
        assert "No similar meals found" in card
        assert "no_history" in card

    def test_no_top_meals_when_empty(self):
        """Top matches section is omitted when no meals."""
        ctx = _make_historical_context(
            similar_meals_count=0,
            data_source="no_history",
            top_meals=[],
            evidence_count={},
        )
        card = _make_card(ctx)
        assert "Top matches:" not in card


class TestRealLegendsData:
    """Verify integration works with actual legends.json data."""

    def test_pizza_fries_well_controlled(self):
        """Real query: pizza and fries against well_controlled profile."""
        ctx = historical_context_for_meal(
            "pizza and large fries", carbs_g=85, fat_g=35,
            food_name="pizza fries", anchor_type="well_controlled",
        )
        card = _make_card(ctx)
        assert "Meal Memory" in card
        assert "meals matched" in card
        assert "Top matches:" in card
        assert "synthetic legends demo" in card
        assert "Worst past result" in card
        assert "Best past result" in card
        assert "Evidence:" in card

    def test_all_profiles_produce_step4(self):
        """All 12 legend profiles produce a valid Step 4 card."""
        anchors = [
            "well_controlled", "high_fat_delayed", "post_meal_spike", "brittle",
            "dawn_phenomenon", "overnight_hypo", "exercise_sensitive",
            "exercise_regimen", "insulin_sensitive", "insulin_resistant",
            "high_variability", "newly_diagnosed",
        ]
        for anchor in anchors:
            ctx = historical_context_for_meal(
                "pizza and fries", carbs_g=85, fat_g=35,
                food_name="pizza fries", anchor_type=anchor,
            )
            card = _make_card(ctx)
            assert "Meal Memory" in card, f"Missing Step 4 for {anchor}"
            assert "meals matched" in card, f"Missing meal count for {anchor}"

    def test_no_history_for_extreme_query(self):
        """Extreme query with no matches shows no-history state."""
        ctx = historical_context_for_meal(
            "xyz-nonexistent-12345", carbs_g=999, fat_g=999,
            food_name="xyz-nonexistent-12345", anchor_type="well_controlled",
        )
        card = _make_card(ctx)
        assert "No similar meals found" in card


class TestFieldCompleteness:
    """Verify no field from historical_context is silently dropped."""

    def test_all_new_fields_rendered(self):
        """Every Issue #22 field appears in the rendered card."""
        ctx = _make_historical_context()
        card = _make_card(ctx)

        # Issue #22 required fields
        required_substrings = [
            "meals matched",        # similar_meals_count
            "Matched on",           # similarity_reason
            "Top matches:",         # top_meals
            "mg/dL @",              # peak_rise_mg_dl + peak_time_min in top meals
            "Typical rise:",        # avg_peak_rise_mg/dL + range
            "Peak timing:",         # avg_peak_time_minutes
            "Consistency:",         # consistency_tier
            "Confidence:",          # confidence_tier
            "What changed:",        # what_changed_note
            "Best past result:",    # best_past_outcome
            "Worst past result:",   # worst_past_outcome
            "CGM outcome",          # evidence_count
            "synthetic legends",    # data_source label
        ]
        for substr in required_substrings:
            assert substr in card, f"Missing '{substr}' in Step 4 card"

    def test_top_meals_without_cgm_outcome(self):
        """Meals without CGM outcome show '(no CGM outcome)'."""
        ctx = _make_historical_context(
            top_meals=[
                {"food": "Unknown Meal", "carbs_g": 50, "fat_g": 10,
                 "peak_rise_mg_dl": None, "peak_time_min": None,
                 "similarity": 0.3, "has_outcome": False},
            ],
        )
        card = _make_card(ctx)
        assert "(no CGM outcome)" in card
