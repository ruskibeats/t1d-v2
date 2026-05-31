"""Tests for Legend Theater / Synthetic Cohort Explorer."""

from __future__ import annotations

import asyncio
import json
from pathlib import Path
from unittest.mock import patch, MagicMock

import pytest

from src.cli import _run_legend_theater, _load_legends
from src.forecast.model import MealTotals
from src.forecast.stage import ForecastStage


class TestLegendTheaterCore:
    """Test the forecast comparison logic used by Legend Theater."""

    def test_forecast_stage_from_legend_profile(self):
        """ForecastStage can be created from a legend profile_config."""
        legends = _load_legends()
        legend = legends[0]
        pc = legend.get("profile_config", {})
        anchor = legend["anchor_type"]

        stage = ForecastStage(
            anchor_type=anchor,
            basal_mg_dl=pc.get("basal_glucose_mean", 110),
            carb_ratio=pc.get("carb_ratio", 15),
            insulin_sensitivity=pc.get("insulin_sensitivity", 40),
            fat_delay_hours=pc.get("fat_delay_hours", 3.0),
            exercise_drop_factor=pc.get("exercise_drop_factor", 1.0),
        )

        totals = MealTotals(carbs_g=50, fat_g=15, sugars_g=5)
        forecast = stage.forecast(totals)

        assert forecast.peak_mg_dl > forecast.baseline_mg_dl
        assert forecast.peak_time_minutes > 0

    def test_all_12_profiles_produce_different_peaks(self):
        """Different anchor types should produce different forecast peaks."""
        legends = _load_legends()
        assert len(legends) == 12

        totals = MealTotals(carbs_g=60, fat_g=20, sugars_g=8)
        peaks = {}

        for legend in legends:
            pc = legend.get("profile_config", {})
            anchor = legend["anchor_type"]
            stage = ForecastStage(
                anchor_type=anchor,
                basal_mg_dl=pc.get("basal_glucose_mean", 110),
                carb_ratio=pc.get("carb_ratio", 15),
                insulin_sensitivity=pc.get("insulin_sensitivity", 40),
                fat_delay_hours=pc.get("fat_delay_hours", 3.0),
                exercise_drop_factor=pc.get("exercise_drop_factor", 1.0),
            )
            forecast = stage.forecast(totals)
            peaks[anchor] = forecast.peak_mg_dl

        # At least 3 distinct peak values across 12 profiles
        unique_peaks = set(peaks.values())
        assert len(unique_peaks) >= 3, f"Expected diversity, got: {peaks}"

        # Insulin resistant should peak higher than well controlled
        assert peaks["insulin_resistant"] > peaks["well_controlled"]

    def test_meal_totals_from_legend_theater_totals(self):
        """MealTotals can be constructed from a totals dict."""
        totals = MealTotals.from_dict({
            "carbs_g": 37.0, "fat_g": 13.0, "sugars_g": 4.0,
            "protein_g": 8.0, "kcal": 300.0,
        })
        assert totals.carbs_g == 37.0
        assert totals.fat_g == 13.0

    def test_risk_flags_from_totals(self):
        """Risk flags are derived from meal totals."""
        from src.runner import _risk_flags
        from app.food.service import ParsedFood

        high_carb = {"carbs_g": 85, "sugars_g": 30, "fat_g": 10}
        flags = _risk_flags(high_carb, [ParsedFood("pizza")])
        assert "large_carb_load" in flags

        high_fat = {"carbs_g": 40, "sugars_g": 5, "fat_g": 20}
        flags = _risk_flags(high_fat, [ParsedFood("pizza")])
        assert "fat_may_extend_or_delay_rise" in flags

        high_sugar = {"carbs_g": 40, "sugars_g": 55, "fat_g": 5}
        flags = _risk_flags(high_sugar, [ParsedFood("candy")])
        assert "rapid_sugar_spike" in flags


class TestLegendTheaterCLI:
    """Test the CLI integration for --compare-legends."""

    @pytest.mark.asyncio
    async def test_compare_legends_deterministic(self):
        """Legend Theater uses deterministic parsing by default, no LLM needed."""
        import io
        import sys
        old_stdout = sys.stdout
        sys.stdout = buf = io.StringIO()
        try:
            await _run_legend_theater("pizza and salad", use_llm=False)
        finally:
            sys.stdout = old_stdout

        output = buf.getvalue()
        assert "Legend Theater" in output
        assert "pizza" in output.lower()
        assert "Peak spread" in output
        assert "Synthetic/demo" in output

    def test_cli_compare_legends_flag(self):
        """--compare-legends flag exists in CLI help."""
        import subprocess
        result = subprocess.run(
            ["python3", "-m", "src.cli", "--help"],
            capture_output=True, text=True
        )
        assert "--compare-legends" in result.stdout
