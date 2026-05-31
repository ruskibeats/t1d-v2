"""Tests for Issue #32: Foot2Floor real legend metadata and build flag."""

from __future__ import annotations

import json
import subprocess
import pytest


class TestFoot2FloorAnchorType:
    """Verify Foot2Floor is a first-class AnchorType."""

    def test_foot2floor_in_enum(self):
        from app.simulator.schemas import AnchorType
        assert hasattr(AnchorType, "FOOT2FLOOR")
        assert AnchorType.FOOT2FLOOR.value == "foot_to_floor"

    def test_foot2floor_in_all_anchors(self):
        from app.simulator.schemas import AnchorType
        values = [a.value for a in AnchorType]
        assert "foot_to_floor" in values

    def test_total_anchor_count_is_13(self):
        from app.simulator.schemas import AnchorType
        assert len(list(AnchorType)) == 13


class TestBuildLegendsDefault:
    """Default build_legends() should produce 12 synthetic legends (no Foot2Floor)."""

    def test_default_excludes_foot2floor(self):
        from src.build_legends import build_legends
        legends = build_legends()
        assert len(legends) == 12
        types = [l["anchor_type"] for l in legends]
        assert "foot_to_floor" not in types

    def test_default_all_synthetic(self):
        from src.build_legends import build_legends
        legends = build_legends()
        for legend in legends:
            assert legend["anchor_type"] != "foot_to_floor"


class TestBuildLegendsIncludeReal:
    """--include-real should add Tom as 13th legend."""

    def test_include_real_adds_13th(self):
        from src.build_legends import build_legends
        legends = build_legends(include_real=True)
        assert len(legends) == 13

    def test_tom_legend_present(self):
        from src.build_legends import build_legends
        legends = build_legends(include_real=True)
        tom = next((l for l in legends if l["anchor_type"] == "foot_to_floor"), None)
        assert tom is not None

    def test_tom_name(self):
        from src.build_legends import build_legends
        legends = build_legends(include_real=True)
        tom = next(l for l in legends if l["anchor_type"] == "foot_to_floor")
        assert tom["name"] == "Tom Batchelor"

    def test_tom_age(self):
        from src.build_legends import build_legends
        legends = build_legends(include_real=True)
        tom = next(l for l in legends if l["anchor_type"] == "foot_to_floor")
        assert tom["age"] == 27

    def test_tom_diagnosis_years(self):
        from src.build_legends import build_legends
        legends = build_legends(include_real=True)
        tom = next(l for l in legends if l["anchor_type"] == "foot_to_floor")
        assert tom["diagnosis_years"] == 4.0

    def test_tom_anchor_label(self):
        from src.build_legends import build_legends
        legends = build_legends(include_real=True)
        tom = next(l for l in legends if l["anchor_type"] == "foot_to_floor")
        assert tom["anchor_label"] == "Foot2Floor"

    def test_tom_carb_ratio(self):
        from src.build_legends import build_legends
        legends = build_legends(include_real=True)
        tom = next(l for l in legends if l["anchor_type"] == "foot_to_floor")
        cr = tom["profile_config"]["known_settings"]["carb_ratio"]
        assert cr["insulin_units"] == 2
        assert cr["carbs_g"] == 10
        assert cr["display"] == "2 units per 10g carbs"
        assert cr["units_per_10g"] == 2.0
        assert cr["grams_per_unit"] == 5.0
        assert cr["use_for_dosing"] is False

    def test_tom_wake_window(self):
        from src.build_legends import build_legends
        legends = build_legends(include_real=True)
        tom = next(l for l in legends if l["anchor_type"] == "foot_to_floor")
        pp = tom["profile_config"]["pattern_profile"]
        assert pp["wake_window_local"] == "06:30-07:00"
        assert pp["observation_window_minutes"] == 90

    def test_tom_cgm_has_mmol(self):
        from src.build_legends import build_legends
        legends = build_legends(include_real=True)
        tom = next(l for l in legends if l["anchor_type"] == "foot_to_floor")
        cgm = tom["current_cgm"]
        assert "mmol_l" in cgm
        assert cgm["units"] == "mmol/L"

    def test_tom_questions_include_spike_phrasing(self):
        from src.build_legends import build_legends
        legends = build_legends(include_real=True)
        tom = next(l for l in legends if l["anchor_type"] == "foot_to_floor")
        questions = [q for _, q in tom["questions"]]
        # Must contain "spike" phrasing
        assert any("spike" in q.lower() for q in questions), f"No spike phrasing in: {questions}"

    def test_tom_questions_count(self):
        from src.build_legends import build_legends
        legends = build_legends(include_real=True)
        tom = next(l for l in legends if l["anchor_type"] == "foot_to_floor")
        assert len(tom["questions"]) == 6

    def test_tom_question_deck_content(self):
        from src.build_legends import build_legends
        legends = build_legends(include_real=True)
        tom = next(l for l in legends if l["anchor_type"] == "foot_to_floor")
        q_dict = dict(tom["questions"])
        assert "morning" in q_dict
        assert "patterns" in q_dict
        assert "meal" in q_dict
        assert "troubleshoot_high" in q_dict
        assert "what_if" in q_dict
        assert "insights" in q_dict

    def test_tom_food_history_generated(self):
        from src.build_legends import build_legends
        legends = build_legends(include_real=True)
        tom = next(l for l in legends if l["anchor_type"] == "foot_to_floor")
        assert len(tom["food_history"]) > 0


class TestCLIFlags:
    """Test CLI flag parsing for --include-real and --sync-cgm."""

    def test_default_build_writes_12_legends(self, tmp_path):
        """Default build should write 12 legends."""
        result = subprocess.run(
            ["python3", "-m", "src.build_legends"],
            capture_output=True, text=True, cwd="/root/tld-v2"
        )
        assert result.returncode == 0
        assert "12 legends" in result.stdout

    def test_include_real_writes_13_legends(self, tmp_path):
        """--include-real should write 13 legends."""
        result = subprocess.run(
            ["python3", "-m", "src.build_legends", "--include-real"],
            capture_output=True, text=True, cwd="/root/tld-v2"
        )
        assert result.returncode == 0
        assert "13 legends" in result.stdout

    def test_sync_cgm_without_include_real_errors(self):
        """--sync-cgm without --include-real should error clearly."""
        result = subprocess.run(
            ["python3", "-m", "src.build_legends", "--sync-cgm"],
            capture_output=True, text=True, cwd="/root/tld-v2"
        )
        assert result.returncode != 0
        assert "--include-real" in result.stderr

    def test_sync_cgm_with_include_real_passes(self):
        """--sync-cgm with --include-real should not error on flag parsing."""
        result = subprocess.run(
            ["python3", "-m", "src.build_legends", "--include-real", "--sync-cgm"],
            capture_output=True, text=True, cwd="/root/tld-v2"
        )
        # Should pass flag parsing (may fail on DB connection, but that's OK)
        assert "--include-real" not in result.stderr


class TestFoot2FloorMealProfile:
    """Verify Foot2Floor has a meal profile for food history generation."""

    def test_foot2floor_has_meal_profile(self):
        from src.build_legends import ANCHOR_MEAL_PROFILES
        assert "foot_to_floor" in ANCHOR_MEAL_PROFILES

    def test_foot2floor_profile_has_all_meal_types(self):
        from src.build_legends import ANCHOR_MEAL_PROFILES, MEAL_TYPES
        profile = ANCHOR_MEAL_PROFILES["foot_to_floor"]
        for mt in MEAL_TYPES:
            assert mt in profile, f"Missing meal type {mt} in foot_to_floor profile"

    def test_foot2floor_food_history_generation(self):
        from src.build_legends import _generate_food_history
        import random
        rng = random.Random(42)
        history = _generate_food_history("foot_to_floor", rng)
        assert len(history) > 0
        for entry in history:
            assert "timestamp" in entry
            assert "meal_type" in entry
            assert "food" in entry
            assert "carb_estimate_g" in entry
            assert entry["anchor_type"] == "foot_to_floor"


class TestExistingLegendsUnchanged:
    """Verify existing 12 legends are not affected by Foot2Floor addition."""

    def test_well_controlled_still_first(self):
        from src.build_legends import build_legends
        legends = build_legends()
        assert legends[0]["anchor_type"] == "well_controlled"

    def test_all_12_synthetic_names_present(self):
        from src.build_legends import build_legends, _NAMES
        legends = build_legends()
        names = [l["name"] for l in legends]
        for expected_name in _NAMES:
            assert expected_name in names, f"Missing {expected_name}"

    def test_synthetic_legends_have_no_mmol(self):
        """Synthetic legends should not have mmol/L in CGM."""
        from src.build_legends import build_legends
        legends = build_legends()
        for legend in legends:
            cgm = legend.get("current_cgm", {})
            assert "mmol_l" not in cgm, f"{legend['name']} should not have mmol_l"

    def test_include_real_preserves_synthetic(self):
        from src.build_legends import build_legends
        synthetic = build_legends()
        with_tom = build_legends(include_real=True)
        # All synthetic legends should be identical
        synthetic_types = [l["anchor_type"] for l in synthetic]
        with_tom_types = [l["anchor_type"] for l in with_tom if l["anchor_type"] != "foot_to_floor"]
        assert synthetic_types == with_tom_types
