#!/usr/bin/env python3
"""Calibration registry — typed, validated, environment-overridable constants."""

from __future__ import annotations

import json
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from app.simulator.schemas import AnchorType


@dataclass(frozen=True)
class CalibrationEntry:
    """Calibration constants for a single anchor type."""
    rise_per_g: float
    balance_factor: float
    description: str


# Default calibration values (12 anchor types)
_DEFAULT_ENTRIES: dict[str, CalibrationEntry] = {
    "well_controlled": CalibrationEntry(1.5, 1.2, "Standard meal response, reliable patterns"),
    "high_fat_delayed": CalibrationEntry(3.0, 1.35, "High fat/protein extends absorption 3-6 hours"),
    "post_meal_spike": CalibrationEntry(3.0, 2.0, "Spikes high quickly, use caution"),
    "brittle": CalibrationEntry(2.8, 1.8, "Unpredictable, monitor closely"),
    "dawn_phenomenon": CalibrationEntry(1.7, 1.0, "Overnight baseline rise"),
    "overnight_hypo": CalibrationEntry(1.4, 1.0, "Nightly low tendency"),
    "exercise_sensitive": CalibrationEntry(1.5, 1.1, "Exercise lowers post-meal rise"),
    "exercise_regimen": CalibrationEntry(1.4, 1.0, "Timing-sensitive to activity"),
    "insulin_sensitive": CalibrationEntry(1.3, 1.0, "Higher rise per carb"),
    "insulin_resistant": CalibrationEntry(2.5, 1.6, "Lower rise per carb"),
    "high_variability": CalibrationEntry(2.6, 1.5, "Wide response variance"),
    "newly_diagnosed": CalibrationEntry(2.8, 1.7, "Higher variability, honeymoon effect"),
    "foot_to_floor": CalibrationEntry(1.8, 1.1, "Morning foot-to-floor rise, moderate carb response"),
}

_ANCHOR_NAMES: set[str] = {a.value for a in AnchorType}


class CalibrationRegistry:
    """Typed calibration registry with validation and override support.

    Usage:
        registry = CalibrationRegistry()
        entry = registry.get("well_controlled")
        print(entry.rise_per_g)  # 1.5
    """

    def __init__(self, entries: dict[str, CalibrationEntry] | None = None):
        self._entries = dict(entries or _DEFAULT_ENTRIES)
        self._validate()

    def _validate(self) -> None:
        """Ensure all 12 anchor types have calibration entries."""
        missing = _ANCHOR_NAMES - set(self._entries.keys())
        if missing:
            raise ValueError(f"Missing calibration entries for anchors: {missing}")
        extra = set(self._entries.keys()) - _ANCHOR_NAMES
        if extra:
            import logging
            logging.getLogger(__name__).warning("Unexpected calibration entries: %s", extra)

    def get(self, anchor_type: str) -> CalibrationEntry:
        """Get calibration entry for an anchor type.

        Raises KeyError if anchor type is unknown.
        """
        if anchor_type not in self._entries:
            raise KeyError(f"Unknown anchor type: {anchor_type}")
        return self._entries[anchor_type]

    def rise_per_g(self, anchor_type: str) -> float:
        """Get rise_per_g for an anchor type."""
        return self.get(anchor_type).rise_per_g

    def balance_factor(self, anchor_type: str) -> float:
        """Get balance_factor for an anchor type."""
        return self.get(anchor_type).balance_factor

    def description(self, anchor_type: str) -> str:
        """Get description for an anchor type."""
        return self.get(anchor_type).description

    def all_entries(self) -> dict[str, CalibrationEntry]:
        """Get all calibration entries."""
        return dict(self._entries)

    @classmethod
    def from_json(cls, path: str | Path) -> "CalibrationRegistry":
        """Load registry from JSON override file.

        JSON format:
            {
                "well_controlled": {"rise_per_g": 1.6, "balance_factor": 1.3},
                "post_meal_spike": {"rise_per_g": 3.2}
            }
        Missing fields keep their default values.
        """
        path = Path(path)
        if not path.exists():
            return cls()

        with open(path) as f:
            overrides = json.load(f)

        entries = dict(_DEFAULT_ENTRIES)
        for anchor, values in overrides.items():
            if anchor not in entries:
                continue
            existing = entries[anchor]
            entries[anchor] = CalibrationEntry(
                rise_per_g=values.get("rise_per_g", existing.rise_per_g),
                balance_factor=values.get("balance_factor", existing.balance_factor),
                description=values.get("description", existing.description),
            )
        return cls(entries)

    def __repr__(self) -> str:
        return f"CalibrationRegistry({len(self._entries)} anchors)"


def _load_registry() -> CalibrationRegistry:
    """Load registry with optional JSON override."""
    override_path = os.getenv("T1D_CALIBRATION_OVERRIDE")
    if override_path and Path(override_path).exists():
        return CalibrationRegistry.from_json(override_path)
    default_path = Path("data/calibration_override.json")
    if default_path.exists():
        return CalibrationRegistry.from_json(default_path)
    return CalibrationRegistry()


# Global registry instance (lazy-loaded on first use)
_REGISTRY: CalibrationRegistry | None = None


def get_registry() -> CalibrationRegistry:
    """Get the global calibration registry."""
    global _REGISTRY
    if _REGISTRY is None:
        _REGISTRY = _load_registry()
    return _REGISTRY


# Backward-compatible module-level constants
# (computed from registry so they remain correct after override)
def _refresh_constants():
    """Refresh module-level constants from the global registry."""
    registry = get_registry()
    return {
        "RISE_PER_CARB_MAP": {a: registry.rise_per_g(a) for a in _ANCHOR_NAMES},
        "BALANCE_MAP": {a: registry.balance_factor(a) for a in _ANCHOR_NAMES},
        "ANCHOR_DESCRIPTIONS": {a: registry.description(a) for a in _ANCHOR_NAMES},
    }


# Initialize constants at import time (no override file = defaults)
_CONSTANTS = _refresh_constants()
RISE_PER_CARB_MAP: dict[str, float] = _CONSTANTS["RISE_PER_CARB_MAP"]
BALANCE_MAP: dict[str, float] = _CONSTANTS["BALANCE_MAP"]
ANCHOR_DESCRIPTIONS: dict[str, str] = _CONSTANTS["ANCHOR_DESCRIPTIONS"]


def get_calibration_for_anchor(anchor_type: str) -> dict:
    """Get all calibration values for an anchor type."""
    registry = get_registry()
    entry = registry.get(anchor_type)
    return {
        "rise_per_g": entry.rise_per_g,
        "balance_factor": entry.balance_factor,
        "description": entry.description,
    }
