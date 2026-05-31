"""Tests for the Data Quality & Confidence card (Step 7)."""

from __future__ import annotations

import pytest
from typing import Any


class TestConfidenceCard:
    """Tests for confidence_card() in companion.py."""

    def test_confidence_card_has_step_7_label(self):
        """Confidence card renders Step 7: Data Quality & Confidence header."""
        from src.companion import confidence_card
        cards = confidence_card(
            food_evidence=[
                {
                    "parsed": {"item": "pizza", "quantity": 2},
                    "computed": {"carbs_g": 50},
                    "confidence": "medium",
                    "warnings": [],
                }
            ],
            forecast={
                "peak_mg_dl": 180,
                "uncertainty_band": {"peak_range_mg_dl": [160, 200], "peak_time_range_minutes": [60, 120]},
            },
            historical_context={"similar_meals_count": 0},
        )
        assert len(cards) == 1
        assert "Step 7" in cards[0]
        assert "Data Quality" in cards[0]
        assert "Confidence" in cards[0]

    def test_confidence_card_low_confidence_marked(self):
        """Low-confidence food items are marked with red icon."""
        from src.companion import confidence_card
        cards = confidence_card(
            food_evidence=[
                {
                    "parsed": {"item": "pizza", "quantity": 1},
                    "computed": {"carbs_g": 50},
                    "confidence": "low",
                    "identity_confidence": "low",
                    "portion_uncertainty_pct": 0.45,
                    "nutrition_variance_pct": 0.30,
                    "top_uncertainty_reason": "portion of pizza unclear",
                    "warnings": ["No nutrition match found in database"],
                }
            ],
            forecast={},
            historical_context={"similar_meals_count": 0},
        )
        assert "low" in cards[0].lower()
        assert "pizza" in cards[0]

    def test_confidence_card_shows_forecast_uncertainty(self):
        """Forecast uncertainty range is shown when available."""
        from src.companion import confidence_card
        cards = confidence_card(
            food_evidence=[],
            forecast={
                "peak_mg_dl": 180,
                "uncertainty_band": {"peak_range_mg_dl": [150, 210], "peak_time_range_minutes": [60, 120]},
            },
            historical_context={"similar_meals_count": 0},
        )
        assert "150" in cards[0]
        assert "210" in cards[0]
        assert "mg/dL" in cards[0]

    def test_confidence_card_shows_single_point_forecast(self):
        """When no uncertainty band, shows single-point notice."""
        from src.companion import confidence_card
        cards = confidence_card(
            food_evidence=[],
            forecast={"peak_mg_dl": 180},
            historical_context={"similar_meals_count": 0},
        )
        assert "single-point" in cards[0]

    def test_confidence_card_shows_safety_status(self):
        """Safety gate status is shown when provided."""
        from src.companion import confidence_card
        cards = confidence_card(
            food_evidence=[],
            forecast={},
            historical_context={"similar_meals_count": 0},
            safety={"is_safe": True, "risk_level": "none"},
        )
        assert "Safety gate" in cards[0]
        assert "Passed" in cards[0]

    def test_confidence_card_shows_safety_failure(self):
        """Safety failures show blocked phrases and risk level."""
        from src.companion import confidence_card
        cards = confidence_card(
            food_evidence=[],
            forecast={},
            historical_context={"similar_meals_count": 0},
            safety={
                "is_safe": False,
                "risk_level": "high",
                "blocked_phrases": ["some phrase"],
                "reason": "Detected banned language",
            },
        )
        assert "Flagged" in cards[0]
        assert "high" in cards[0].lower()
        assert "some phrase" in cards[0]

    def test_confidence_card_no_safety(self):
        """When safety is not provided, shows not checked."""
        from src.companion import confidence_card
        cards = confidence_card(
            food_evidence=[],
            forecast={},
            historical_context={"similar_meals_count": 0},
        )
        assert "not checked" in cards[0]

    def test_confidence_card_shows_historical_consistency(self):
        """Historical consistency tier is shown when available."""
        from src.companion import confidence_card
        cards = confidence_card(
            food_evidence=[],
            forecast={},
            historical_context={
                "similar_meals_count": 10,
                "consistency_tier": "high",
                "consistency_score": 0.85,
            },
        )
        assert "high" in cards[0]
        assert "10" in cards[0]

    def test_confidence_card_no_history(self):
        """When no history, shows 'no data' message."""
        from src.companion import confidence_card
        cards = confidence_card(
            food_evidence=[],
            forecast={},
            historical_context={"similar_meals_count": 0},
        )
        assert "no data" in cards[0]

    def test_confidence_card_detailed_food_breakdown(self):
        """Per-item confidence breakdown includes identity, portion, nutrition."""
        from src.companion import confidence_card
        cards = confidence_card(
            food_evidence=[
                {
                    "parsed": {"item": "fries", "quantity": 1},
                    "computed": {"carbs_g": 40},
                    "confidence": "medium",
                    "identity_confidence": "high",
                    "portion_uncertainty_pct": 0.35,
                    "nutrition_variance_pct": 0.20,
                    "top_uncertainty_reason": "portion of fries unclear",
                    "warnings": ["Portion size estimated"],
                }
            ],
            forecast={},
            historical_context={"similar_meals_count": 5, "consistency_tier": "medium"},
        )
        text = cards[0]
        assert "fries" in text
        assert "medium" in text
        assert "0.35" in text or "35%" in text or "Partially" in text
        assert "portion" in text.lower()

    def test_meal_pipeline_section_includes_confidence(self):
        """meal_pipeline_section with data shows Step 7 card."""
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
            safety={"is_safe": True, "risk_level": "none"},
        )
        step7 = [c for c in cards if "Step 7" in c]
        assert len(step7) >= 1
        assert "Safety gate" in step7[0]

    def test_meal_pipeline_section_no_confidence(self):
        """meal_pipeline_section without safety still works."""
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
        step7 = [c for c in cards if "Step 7" in c]
        assert len(step7) >= 1
        assert "not checked" in step7[0]
