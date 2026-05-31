#!/usr/bin/env python3
"""Versioned T1D LLM context block for companion prompts.

This is the single source of truth for diabetes context injection.
Version 1.0 - Initial release.
"""

from __future__ import annotations

from app.ai.safety_policy import get_banned_words

from .calibration_constants import (
    RISE_PER_CARB_MAP,
    BALANCE_MAP,
    ANCHOR_DESCRIPTIONS,
    get_calibration_for_anchor,
)

# Build anchor_types dynamically from the single source of truth
def _build_anchor_types() -> dict:
    return {
        anchor: {
            "rise_per_g": rise_per_g,
            "balance_factor": BALANCE_MAP.get(anchor, 1.2),
            "description": ANCHOR_DESCRIPTIONS.get(anchor, ""),
        }
        for anchor, rise_per_g in RISE_PER_CARB_MAP.items()
    }

T1D_LLM_CONTEXT_v1 = {
    "version": "1.0",
    "description": "Companion-only diabetes context, not for dosing decisions",
    
    # State variables for LLM awareness
    "state_variables": [
        "current_glucose",   # Most recent CGM (mg/dL)
        "trend",             # Rate of change (-2 to +2 arrows)
        "iob",               # Insulin on board (units)
        "cob",               # Carbs on board (grams)
        "activity",          # Insulin activity (0-1)
    ],
    
    # BANNED - controller language, loaded from shared safety policy
    "banned_words": get_banned_words(),
    
    # APPROVED - companion patterns
    "approved_patterns": [
        "glucose may rise",
        "peak around {value} mg/dL at {time}",
        "range {low}-{high} mg/dL",
        "similar meals showed...",
        "monitor closely",
    ],
    
    # Profile traits - built from single source of truth
    "anchor_types": _build_anchor_types(),
    
    # Safety triggers
    "safety_triggers": {
        "large_meal": "carbs_g >= 80",
        "high_fat": "fat_g >= 15",
        "high_peak": "predicted_peak > 250",
        "low_drop": "predicted_min < 70",
    },
    
    # Evidence requirements
    "required_evidence_fields": [
        "top_drivers",
        "historical_similarity_score",
        "profile_assumptions",
        "missing_information_flags",
    ],
}


def get_context(version: str = "1.0") -> dict:
    """Get the LLM context block for a specific version."""
    if version == "1.0":
        return T1D_LLM_CONTEXT_v1
    raise ValueError(f"Unknown version: {version}")


def check_safety(forecast_result, totals_dict: dict = None) -> list[str]:
    """Check safety constraints against forecast result.
    
    Args:
        forecast_result: ForecastResult from forecast_engine
        totals_dict: Optional carbs/fat dict (from CompanionState.totals)
    
    Returns list of warning messages for large/high-risk meals.
    """
    warnings = []
    
    # Get totals from either argument or forecast meal_drivers
    carbs = (totals_dict or {}).get("carbs_g", 0)
    fat = (totals_dict or {}).get("fat_g", 0)
    
    if carbs >= 80:
        warnings.append("large meal, consider splitting over time")
    if fat >= 15:
        warnings.append("fat may extend or delay the rise")
    if forecast_result.peak_mg_dl > 250:
        warnings.append("monitor closely, glucose may go high")
    
    return warnings
# Export for backwards compatibility. This is intentionally derived from
# app.ai.safety_policy so prompt context and runtime safety share one source.
BANNED_WORDS = get_banned_words()

def check_banned_words(text: str) -> list[str]:
    """Check if text contains shared banned words."""
    text_lower = text.lower()
    return [w for w in BANNED_WORDS if w.lower() in text_lower]

def is_safe_response(text: str) -> bool:
    """Return True if response contains no shared banned words."""
    return len(check_banned_words(text)) == 0

