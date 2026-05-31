"""Tests for CalibrationRegistry."""

from __future__ import annotations

import json

import pytest

from src.calibration_constants import (
    CalibrationRegistry,
    CalibrationEntry,
    RISE_PER_CARB_MAP,
    BALANCE_MAP,
    ANCHOR_DESCRIPTIONS,
    get_calibration_for_anchor,
)


class TestCalibrationEntry:
    """Test the CalibrationEntry dataclass."""

    def test_immutable(self):
        entry = CalibrationEntry(1.5, 1.2, "desc")
        with pytest.raises(AttributeError):
            entry.rise_per_g = 2.0


class TestCalibrationRegistry:
    """Test the CalibrationRegistry."""

    def test_all_12_anchors_present(self):
        registry = CalibrationRegistry()
        entries = registry.all_entries()
        assert len(entries) == 12

    def test_get_well_controlled(self):
        registry = CalibrationRegistry()
        entry = registry.get("well_controlled")
        assert entry.rise_per_g == 1.5
        assert entry.balance_factor == 1.2

    def test_get_post_meal_spike(self):
        registry = CalibrationRegistry()
        entry = registry.get("post_meal_spike")
        assert entry.rise_per_g == 3.0
        assert entry.balance_factor == 2.0

    def test_accessor_methods(self):
        registry = CalibrationRegistry()
        assert registry.rise_per_g("well_controlled") == 1.5
        assert registry.balance_factor("well_controlled") == 1.2
        assert "Standard" in registry.description("well_controlled")

    def test_unknown_anchor_raises(self):
        registry = CalibrationRegistry()
        with pytest.raises(KeyError, match="Unknown anchor"):
            registry.get("nonexistent")

    def test_missing_anchor_raises_on_init(self):
        """Registry with missing anchors should raise ValueError."""
        incomplete = {
            "well_controlled": CalibrationEntry(1.5, 1.2, "test"),
        }
        with pytest.raises(ValueError, match="Missing calibration entries"):
            CalibrationRegistry(incomplete)

    def test_repr(self):
        registry = CalibrationRegistry()
        assert "CalibrationRegistry" in repr(registry)
        assert "12" in repr(registry)


class TestJsonOverride:
    """Test loading overrides from JSON."""

    def test_load_from_json(self, tmp_path):
        config_path = tmp_path / "calibration.json"
        config_path.write_text(json.dumps({
            "well_controlled": {"rise_per_g": 1.6, "balance_factor": 1.3},
        }))

        registry = CalibrationRegistry.from_json(config_path)
        assert registry.rise_per_g("well_controlled") == 1.6
        assert registry.balance_factor("well_controlled") == 1.3
        # Other anchors unchanged
        assert registry.rise_per_g("post_meal_spike") == 3.0

    def test_load_partial_override(self, tmp_path):
        config_path = tmp_path / "calibration.json"
        config_path.write_text(json.dumps({
            "post_meal_spike": {"rise_per_g": 3.5},
        }))

        registry = CalibrationRegistry.from_json(config_path)
        assert registry.rise_per_g("post_meal_spike") == 3.5
        # Unspecified fields keep defaults
        assert registry.balance_factor("post_meal_spike") == 2.0

    def test_missing_file_uses_defaults(self, tmp_path):
        registry = CalibrationRegistry.from_json(tmp_path / "nonexistent.json")
        assert registry.rise_per_g("well_controlled") == 1.5

    def test_description_override(self, tmp_path):
        config_path = tmp_path / "calibration.json"
        config_path.write_text(json.dumps({
            "well_controlled": {"description": "Custom description"},
        }))

        registry = CalibrationRegistry.from_json(config_path)
        assert registry.description("well_controlled") == "Custom description"


class TestBackwardCompatibleConstants:
    """Test that module-level constant dicts still work."""

    def test_rise_per_carb_map(self):
        assert "well_controlled" in RISE_PER_CARB_MAP
        assert RISE_PER_CARB_MAP["well_controlled"] == 1.5

    def test_balance_map(self):
        assert "post_meal_spike" in BALANCE_MAP
        assert BALANCE_MAP["post_meal_spike"] == 2.0

    def test_anchor_descriptions(self):
        assert "well_controlled" in ANCHOR_DESCRIPTIONS
        assert "Standard" in ANCHOR_DESCRIPTIONS["well_controlled"]

    def test_get_calibration_for_anchor(self):
        cal = get_calibration_for_anchor("well_controlled")
        assert cal["rise_per_g"] == 1.5
        assert cal["balance_factor"] == 1.2
        assert "Standard" in cal["description"]

    def test_all_12_in_rise_map(self):
        from app.simulator.schemas import AnchorType
        for anchor in AnchorType:
            assert anchor.value in RISE_PER_CARB_MAP, f"Missing {anchor.value}"
