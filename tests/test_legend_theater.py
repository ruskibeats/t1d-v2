"""Tests for Legend Theater / Synthetic Cohort Explorer."""

from __future__ import annotations

import asyncio
import json
from pathlib import Path
from unittest.mock import patch, MagicMock

import pytest

from src.cli import _run_legend_theater, _load_legends, _apply_demo_preset, _situation_category, run_showcase
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


class TestMealMemoryFromLegends:
    """Verify historical_context_for_meal returns proper data from legends (Issue #22)."""

    def test_historical_context_returns_all_required_fields(self):
        """historical_context_for_meal returns all Issue #22 fields from legends data."""
        from app.services.historical_meal_matcher import historical_context_for_meal

        ctx = historical_context_for_meal(
            "pizza and fries", carbs_g=85, fat_g=35,
            food_name="pizza fries", anchor_type="well_controlled",
        )
        # Core fields
        assert "similar_meals_count" in ctx
        assert "avg_peak_rise_mg_dl" in ctx
        assert "peak_rise_range_mg_dl" in ctx
        assert "avg_peak_time_minutes" in ctx
        assert "similarity_reason" in ctx
        assert "what_changed_note" in ctx
        assert "best_past_outcome" in ctx
        # Issue #22 new fields
        assert "worst_past_outcome" in ctx
        assert "evidence_count" in ctx
        assert "data_source" in ctx
        assert "top_meals" in ctx
        assert "consistency_tier" in ctx
        assert "consistency_score" in ctx
        assert "case_based_observations" in ctx

    def test_historical_context_finds_matches_in_legends(self):
        """Legends data has 6014 entries across 12 profiles — matches should be found."""
        from app.services.historical_meal_matcher import historical_context_for_meal

        ctx = historical_context_for_meal(
            "pizza and fries", carbs_g=85, fat_g=35,
            food_name="pizza fries", anchor_type="well_controlled",
        )
        assert ctx["similar_meals_count"] > 0
        assert ctx["data_source"] == "synthetic_legends_demo"

    def test_historical_context_top_meals_structure(self):
        """top_meals returns at most 3 entries with required sub-fields."""
        from app.services.historical_meal_matcher import historical_context_for_meal

        ctx = historical_context_for_meal(
            "pizza and fries", carbs_g=85, fat_g=35,
            food_name="pizza fries", anchor_type="well_controlled",
        )
        top = ctx["top_meals"]
        assert len(top) <= 3
        if top:
            meal = top[0]
            assert "food" in meal
            assert "carbs_g" in meal
            assert "peak_rise_mg_dl" in meal
            assert "similarity" in meal
            assert "has_outcome" in meal

    def test_historical_context_evidence_count_structure(self):
        """evidence_count has total_matches, with_cgm_outcome, food_only."""
        from app.services.historical_meal_matcher import historical_context_for_meal

        ctx = historical_context_for_meal(
            "pizza and fries", carbs_g=85, fat_g=35,
            food_name="pizza fries", anchor_type="well_controlled",
        )
        ec = ctx["evidence_count"]
        assert "total_matches" in ec
        assert "with_cgm_outcome" in ec
        assert "food_only" in ec
        assert ec["total_matches"] == ec["with_cgm_outcome"] + ec["food_only"]

    def test_historical_context_synthetic_label(self):
        """When matches exist from legends, data_source is synthetic_legends_demo."""
        from app.services.historical_meal_matcher import historical_context_for_meal

        ctx = historical_context_for_meal(
            "pizza and fries", carbs_g=85, fat_g=35,
            food_name="pizza fries", anchor_type="well_controlled",
        )
        if ctx["similar_meals_count"] > 0:
            assert ctx["data_source"] == "synthetic_legends_demo"

    def test_historical_context_no_history_label(self):
        """When no matches, data_source is no_history."""
        from app.services.historical_meal_matcher import historical_context_for_meal

        ctx = historical_context_for_meal(
            "xyzzy-not-a-real-food-12345", carbs_g=999, fat_g=999,
            food_name="xyzzy-not-a-real-food-12345", anchor_type="well_controlled",
        )
        assert ctx["similar_meals_count"] == 0
        assert ctx["data_source"] == "no_history"
        assert ctx["top_meals"] == []

    def test_historical_context_worst_outcome_present(self):
        """worst_past_outcome is populated when CGM data exists."""
        from app.services.historical_meal_matcher import historical_context_for_meal

        ctx = historical_context_for_meal(
            "pizza and fries", carbs_g=85, fat_g=35,
            food_name="pizza fries", anchor_type="well_controlled",
        )
        if ctx["similar_meals_count"] > 0 and ctx["evidence_count"]["with_cgm_outcome"] > 0:
            assert ctx["worst_past_outcome"] != ""
            assert "Worst past result" in ctx["worst_past_outcome"]

    def test_historical_context_all_12_profiles_have_history(self):
        """All 12 legend profiles have food history that can be matched."""
        from app.services.historical_meal_matcher import historical_context_for_meal

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
            assert ctx["similar_meals_count"] > 0, f"No matches for {anchor}"
            assert len(ctx["top_meals"]) > 0, f"No top meals for {anchor}"

    def test_meal_pipeline_section_step4_renders_top_meals(self):
        """Step 4 card renders top 3 meals from historical context."""
        from app.services.historical_meal_matcher import historical_context_for_meal
        from src.companion import meal_pipeline_section

        ctx = historical_context_for_meal(
            "pizza and fries", carbs_g=85, fat_g=35,
            food_name="pizza fries", anchor_type="well_controlled",
        )
        cards = meal_pipeline_section(
            profile_label="Well Controlled",
            parsed_foods=[{"item": "pizza", "quantity": 2, "unit": "slice"}],
            food_evidence=[],
            meal_totals={"carbs_g": 85, "fat_g": 35, "sugars_g": 5, "protein_g": 12,
                         "kcal": 550, "top_carb_contributor": "", "top_uncertainty_items": [],
                         "absorption_profile": "delayed"},
            forecast={"peak_mg_dl": 204, "peak_time_minutes": 110, "baseline_mg_dl": 112,
                      "uncertainty_band": {"peak_range_mg_dl": [180, 230], "peak_time_range_minutes": [90, 150]}},
            historical_context=ctx,
            risk_flags=["fat_may_extend_or_delay_rise"],
            chart="",
        )
        step4 = [c for c in cards if "Step 4" in c][0]
        assert "Meal Memory" in step4
        assert "Top matches:" in step4
        assert "synthetic legends demo" in step4
        assert "Worst past result" in step4
        assert "Best past result" in step4
        assert "Evidence:" in step4


class TestLegendTheaterCLI:
    """Test the CLI integration for --compare-legends and the showcase preset."""

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
        """--compare-legends and --demo flags exist in CLI help."""
        import subprocess
        result = subprocess.run(
            ["python3", "-m", "src.cli", "--help"],
            capture_output=True, text=True
        )
        assert "--compare-legends" in result.stdout
        assert "--demo" in result.stdout

    def test_demo_preset_overrides_showcase_flags(self):
        """Product demo pins a deterministic legend and keeps LLM parsing enabled."""
        from argparse import Namespace

        args = Namespace(
            text="pizza",
            legend=None,
            all_questions=True,
            all_cards=False,
            no_interactive=False,
            no_llm=True,
            demo="product",
        )
        _apply_demo_preset(args)

        assert args.text == ""
        assert args.legend == "well_controlled"
        assert args.all_questions is False
        assert args.all_cards is True
        assert args.no_interactive is True
        assert args.no_llm is False

    def test_situation_routing_categories(self):
        """Situation question text routes to the expected subcategory."""
        assert _situation_category("I went for a run and now I am low") == "exercise"
        assert _situation_category("I had a beer with dinner") == "alcohol"
        assert _situation_category("I'm sick with the flu") == "illness"
        assert _situation_category("It's hot outside today") == "heat"

    @pytest.mark.asyncio
    async def test_product_demo_prints_checklist(self, monkeypatch, capsys):
        """The product demo prints a coverage checklist and capability summary."""
        from src import cli

        async def fake_legend_question_card(*args, **kwargs):
            return ["mock card"]

        monkeypatch.setattr(cli, "_legend_question_card", fake_legend_question_card)

        await run_showcase(
            legend_selector="well_controlled",
            all_card_types=True,
            interactive=False,
            use_llm_parse=False,
            demo_name="Product demo",
        )

        output = capsys.readouterr().out
        assert "Product demo Coverage Checklist" in output
        assert "Meal pipeline" in output
        assert "Situation routing" in output
        assert "Capabilities shown:" in output

    def test_demo_ctrl_c_exits_cleanly(self, monkeypatch, capsys):
        """Ctrl-C during the demo should not emit an asyncio traceback."""
        from src import cli

        monkeypatch.setattr(cli.sys, "argv", ["src.cli", "--demo", "product"])

        def raise_keyboard_interrupt(coro):
            coro.close()
            raise KeyboardInterrupt()

        monkeypatch.setattr(cli.asyncio, "run", raise_keyboard_interrupt)

        cli.main()

        output = capsys.readouterr()
        assert "Exiting showcase." in output.out
        assert "Traceback" not in output.err
