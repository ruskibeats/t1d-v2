#!/usr/bin/env python3
"""Calibration constants for T1D Companion physiology model.

Single source of truth for all anchor type calibration values.
Used by forecast_engine, t1d_llm_context, and future calibration tools.
"""

from __future__ import annotations

# Rise per gram (mg/dL) before insulin/action compartments
RISE_PER_CARB_MAP: dict[str, float] = {
    "well_controlled": 1.5,
    "high_fat_delayed": 3.0,
    "post_meal_spike": 3.0,
    "brittle": 2.8,
    "dawn_phenomenon": 1.7,
    "overnight_hypo": 1.4,
    "exercise_sensitive": 1.5,
    "exercise_regimen": 1.4,
    "insulin_sensitive": 1.3,
    "insulin_resistant": 2.5,
    "high_variability": 2.6,
    "newly_diagnosed": 2.8,
}

# Balance factor: controls excursion size by reducing effective meal insulin
# Higher = more aggressive rise (less insulin effect assumed)
BALANCE_MAP: dict[str, float] = {
    "well_controlled": 1.2,
    "high_fat_delayed": 1.35,
    "post_meal_spike": 2.0,
    "brittle": 1.8,
    "dawn_phenomenon": 1.0,
    "overnight_hypo": 1.0,
    "exercise_sensitive": 1.1,
    "exercise_regimen": 1.0,
    "insulin_sensitive": 1.0,
    "insulin_resistant": 1.6,
    "high_variability": 1.5,
    "newly_diagnosed": 1.7,
}

# Human-readable descriptions for LLM context (from t1d_llm_context)
ANCHOR_DESCRIPTIONS: dict[str, str] = {
    "well_controlled": "Standard meal response, reliable patterns",
    "high_fat_delayed": "High fat/protein extends absorption 3-6 hours",
    "post_meal_spike": "Spikes high quickly, use caution",
    "brittle": "Unpredictable, monitor closely",
    "dawn_phenomenon": "Overnight baseline rise",
    "overnight_hypo": "Nightly low tendency",
    "exercise_sensitive": "Exercise lowers post-meal rise",
    "exercise_regimen": "Timing-sensitive to activity",
    "insulin_sensitive": "Higher rise per carb",
    "insulin_resistant": "Lower rise per carb",
    "high_variability": "Wide response variance",
    "newly_diagnosed": "Higher variability, honeymoon effect",
}

def get_calibration_for_anchor(anchor_type: str) -> dict:
    """Get all calibration values for an anchor type."""
    return {
        "rise_per_g": RISE_PER_CARB_MAP.get(anchor_type, 0.6),
        "balance_factor": BALANCE_MAP.get(anchor_type, 1.2),
        "description": ANCHOR_DESCRIPTIONS.get(anchor_type, ""),
    }