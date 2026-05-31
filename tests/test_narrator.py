"""Tests for Issue #29: Safety-Aware AI Narrator.

Verifies the deterministic narration layer that takes evidence bundles
and generates warm, educational companion language validated through
SafetyScaffold.validate().
"""

from __future__ import annotations

import pytest

from app.ai.safety import SafetyScaffold
from src.narrator import (
    render_narrator_card,
    render_narrator_from_result,
    _render_profile_section,
    _render_meal_details_section,
    _render_timing_insights_section,
    _render_historical_context_section,
    _render_monitoring_section,
    _format_range,
)


# ── Fixtures ──

def _make_bundle(**overrides) -> dict[str, Any]:  # type: ignore[name-defined]
    """Build a realistic evidence bundle with sensible defaults."""
    from typing import Any
    base: dict[str, Any] = {
        "profile": {
            "label": "Well Controlled",
            "anchor_type": "well_controlled",
            "plain_meaning": "Stable glucose with good time-in-range, minimal extremes.",
        },
        "totals": {"carbs_g": 60, "fat_g": 15, "sugars_g": 8, "protein_g": 12},
        "total_carbs_g_range": [50, 70],
        "confidence_overall": "medium",
        "confidence_why": "portion size of the fries is estimated",
        "current_cgm": {"mg_dl": 110, "trend": "stable"},
        "forecast": {
            "baseline_mg_dl": 110,
            "peak_mg_dl": 180,
            "peak_time_minutes": 90,
            "uncertainty_band": {
                "peak_range_mg_dl": [160, 200],
                "peak_time_range_minutes": [60, 120],
            },
        },
        "historical_context": {
            "similar_meals_count": 5,
            "avg_peak_rise_mgdl": 70,
            "peak_rise_range_mg_dl": [50, 90],
            "avg_peak_time_minutes": 85,
            "case_based_observations": ["Similar meals rose about 70 mg/dL on average."],
            "similarity_reason": "Matched on pizza + fries",
            "confidence_tier": "medium",
        },
        "risk_flags": ["fat_may_extend_or_delay_rise"],
        "evidence": {
            "top_drivers": ["fast_carbs:8g", "slow_carbs:52g"],
            "profile_assumptions": {"anchor_type": "well_controlled", "carb_ratio": 15},
            "missing_information_flags": [],
            "evidence_items": [],
        },
    }
    base.update(overrides)
    return base


class TestProfileSection:
    def test_basic_profile(self):
        text = _render_profile_section(_make_bundle())
        assert "Well Controlled" in text
        assert "Stable glucose" in text

    def test_profile_without_meaning(self):
        bundle = _make_bundle(profile={"label": "Test", "anchor_type": "test"})
        text = _render_profile_section(bundle)
        assert "Test" in text


class TestMealDetailsSection:
    def test_with_carb_range(self):
        text = _render_meal_details_section(_make_bundle())
        assert "60" in text
        assert "50–70" in text or "50" in text
        assert "medium" in text.lower()

    def test_fat_and_sugar(self):
        text = _render_meal_details_section(_make_bundle())
        assert "15" in text  # fat
        assert "8" in text   # sugars

    def test_confidence_why_shown_for_non_high(self):
        text = _render_meal_details_section(_make_bundle(confidence_overall="medium"))
        assert "uncertainty" in text.lower() or "portion" in text.lower()

    def test_high_confidence_no_why(self):
        text = _render_meal_details_section(_make_bundle(
            confidence_overall="high",
            confidence_why="portion size is estimated",
        ))
        # confidence_why should not appear for high confidence
        lines = text.split("\n")
        why_lines = [l for l in lines if "uncertainty" in l.lower() or "portion" in l.lower()]
        assert len(why_lines) == 0

    def test_no_carbs(self):
        text = _render_meal_details_section(_make_bundle(totals={"carbs_g": 0, "fat_g": 0, "sugars_g": 0, "protein_g": 0}))
        assert "No carb estimate" in text or "no carb" in text.lower()


class TestTimingInsightsSection:
    def test_basic_timing(self):
        text = _render_timing_insights_section(_make_bundle())
        assert "180" in text  # peak
        assert "90" in text   # peak time

    def test_uncertainty_band(self):
        text = _render_timing_insights_section(_make_bundle())
        assert "160" in text
        assert "200" in text

    def test_profile_timing_advice(self):
        for anchor, expected_kw in [
            ("high_fat_delayed", "3–4 hour"),
            ("post_meal_spike", "quickly"),
            ("overnight_hypo", "overnight"),
            ("exercise_sensitive", "active"),
        ]:
            bundle = _make_bundle(profile={"label": anchor, "anchor_type": anchor, "plain_meaning": "test"})
            text = _render_timing_insights_section(bundle)
            assert expected_kw in text.lower() or expected_kw in text, \
                f"Expected '{expected_kw}' in output for {anchor}: {text}"

    def test_no_forecast(self):
        bundle = _make_bundle(forecast={})
        text = _render_timing_insights_section(bundle)
        assert "not available" in text.lower()


class TestHistoricalContextSection:
    def test_with_history(self):
        text = _render_historical_context_section(_make_bundle())
        assert "5" in text  # count
        assert "Matched on pizza + fries" in text
        assert "70 mg/dL" in text

    def test_no_history(self):
        text = _render_historical_context_section(_make_bundle(historical_context={}))
        assert text == ""

    def test_no_similar_meals(self):
        text = _render_historical_context_section(_make_bundle(
            historical_context={"similar_meals_count": 0}
        ))
        assert text == ""


class TestMonitoringSection:
    def test_risk_flags(self):
        text = _render_monitoring_section(_make_bundle())
        assert "fat" in text.lower() or "delay" in text.lower()

    def test_no_flags(self):
        text = _render_monitoring_section(_make_bundle(risk_flags=[]))
        assert "peak window" in text.lower() or "monitor" in text.lower()

    def test_profile_specific_advice(self):
        bundle = _make_bundle(
            risk_flags=[],
            profile={"label": "High Fat Delayed", "anchor_type": "high_fat_delayed"},
        )
        text = _render_monitoring_section(bundle)
        assert "3–5 hours" in text or "delayed" in text.lower()


class TestFormatRange:
    def test_different_values(self):
        assert _format_range(160, 200) == "160–200 mg/dL"

    def test_same_values(self):
        assert _format_range(180, 180) == "180 mg/dL"

    def test_custom_unit(self):
        assert _format_range(60, 120, "min") == "60–120 min"


class TestRenderNarratorCard:
    def test_full_rendering(self):
        """Full narrator card renders all sections."""
        bundle = _make_bundle()
        cards = render_narrator_card(bundle)
        assert len(cards) >= 1
        full_text = "\n".join(cards)

        assert "Profile Overview" in full_text
        assert "Meal Details" in full_text
        assert "Timing Insights" in full_text
        assert "Historical Context" in full_text
        assert "Monitoring Suggestions" in full_text
        assert "not medical advice" in full_text.lower()

    def test_safety_validation_passes(self):
        """Normal educational output passes safety."""
        bundle = _make_bundle()
        safety = SafetyScaffold()
        cards = render_narrator_card(bundle, safety=safety)
        full_text = "\n".join(cards)
        # Should not contain fallback text
        assert "adjusted for safety" not in full_text.lower()

    def test_safety_validation_blocks_dosing(self):
        """If bundle contained dosing language, safety blocks it."""
        bundle = _make_bundle()
        # Inject unsafe content via a fake evidence field
        # (the narrator doesn't use evidence fields directly, so this
        # validates the safety net works)
        safety = SafetyScaffold()
        # Directly validate that the scaffold blocks dosing phrases
        review = safety.validate("Take 3 units of insulin now.", {"source": "test"})
        assert not review["is_safe"]

    def test_no_history_omits_section(self):
        """When no history, Historical Context section is omitted."""
        bundle = _make_bundle(historical_context={"similar_meals_count": 0})
        cards = render_narrator_card(bundle)
        full_text = "\n".join(cards)
        assert "Historical Context" not in full_text

    def test_card_has_separator(self):
        """Card starts with separator."""
        bundle = _make_bundle()
        cards = render_narrator_card(bundle)
        assert "Meal Summary" in cards[0] or "━━━" in cards[0]

    def test_without_carb_range(self):
        """Renders correctly when no carb range is provided."""
        bundle = _make_bundle(total_carbs_g_range=None)
        cards = render_narrator_card(bundle)
        full_text = "\n".join(cards)
        assert "Meal Details" in full_text
        assert "60" in full_text or "About" in full_text


class TestRenderNarratorFromResult:
    def test_from_pipeline_result(self):
        """render_narrator_from_result works with pipeline result dict."""
        result = {
            "evidence_bundle": _make_bundle(),
            "safety": {"is_safe": True, "risk_level": "none"},
        }
        cards = render_narrator_from_result(result)
        assert len(cards) >= 1
        full_text = "\n".join(cards)
        assert "Profile Overview" in full_text

    def test_unsafe_result_bypasses_validation(self):
        """When safety already flagged, render without re-validating."""
        result = {
            "evidence_bundle": _make_bundle(),
            "safety": {"is_safe": False, "risk_level": "high", "blocked_phrases": ["test"]},
        }
        # Should still render (doesn't crash) — the narrator trusts
        # the already-run safety check
        cards = render_narrator_from_result(result)
        assert len(cards) >= 1

    def test_empty_bundle(self):
        """Empty bundle doesn't crash."""
        result = {"evidence_bundle": {}, "safety": {"is_safe": True}}
        cards = render_narrator_from_result(result)
        assert len(cards) >= 1
