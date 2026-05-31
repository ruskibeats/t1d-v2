#!/usr/bin/env python3
"""Evidence bundle bridge for T1D Companion narration.

Transforms deterministic forecast outputs into the JSON-shaped evidence bundle
expected by prompts/companion_system.txt. This keeps the LLM prompt contract
separate from physiology/model internals.
"""

from __future__ import annotations

from dataclasses import asdict, is_dataclass
from typing import Any

from ..calibration_constants import ANCHOR_DESCRIPTIONS
from ..forecast_engine import ForecastResult, MealTotals


def _to_plain_dict(value: Any) -> dict[str, Any]:
    """Best-effort conversion of dataclass/dict/object into a plain dict."""
    if value is None:
        return {}
    if isinstance(value, dict):
        return dict(value)
    if is_dataclass(value):
        return asdict(value)
    return {
        name: getattr(value, name)
        for name in dir(value)
        if not name.startswith("_") and not callable(getattr(value, name))
    }


def _anchor_value(anchor_type: Any) -> str:
    """Return enum .value when present, otherwise string value."""
    if anchor_type is None:
        return "well_controlled"
    return getattr(anchor_type, "value", str(anchor_type))


def _profile_bundle(profile: Any, anchor_type: str | None = None) -> dict[str, Any]:
    """Build the prompt-facing profile section."""
    profile_dict = _to_plain_dict(profile)
    resolved_anchor = anchor_type or _anchor_value(profile_dict.get("anchor_type"))
    label = profile_dict.get("label") or profile_dict.get("anchor_label") or resolved_anchor.replace("_", " ").title()
    return {
        "label": label,
        "anchor_type": resolved_anchor,
        "plain_meaning": ANCHOR_DESCRIPTIONS.get(resolved_anchor, "Simulated T1D response profile"),
    }


def _totals_bundle(totals: MealTotals | dict[str, Any]) -> dict[str, float]:
    """Build the prompt-facing totals section."""
    totals_dict = _to_plain_dict(totals)
    return {
        "carbs_g": float(totals_dict.get("carbs_g", 0) or 0),
        "fat_g": float(totals_dict.get("fat_g", 0) or 0),
        "sugars_g": float(totals_dict.get("sugars_g", 0) or 0),
        "protein_g": float(totals_dict.get("protein_g", 0) or 0),
    }


def _forecast_bundle(forecast: ForecastResult) -> dict[str, Any]:
    """Build the prompt-facing forecast section."""
    bundle: dict[str, Any] = {
        "baseline_mg_dl": forecast.baseline_mg_dl,
        "peak_mg_dl": forecast.peak_mg_dl,
        "peak_time_minutes": forecast.peak_time_minutes,
    }
    if forecast.uncertainty_band is not None:
        band = forecast.uncertainty_band
        bundle["uncertainty_band"] = {
            "peak_range_mg_dl": list(band.peak_range_mg_dl),
            "peak_time_range_minutes": list(band.peak_time_range_minutes),
        }
    return bundle


def _default_historical_context(forecast: ForecastResult) -> dict[str, Any]:
    """Create a minimal historical context from evidence fields."""
    score = forecast.historical_similarity_score
    return {
        "similar_meals_count": 0,
        "avg_peak_rise_mg_dl": None,
        "peak_rise_range_mg_dl": None,
        "avg_peak_time_minutes": None,
        "similarity_score": score,
        "case_based_observations": [],
    }


def make_evidence_bundle(
    *,
    forecast: ForecastResult,
    totals: MealTotals | dict[str, Any],
    profile: Any | None = None,
    anchor_type: str | None = None,
    current_cgm: dict[str, Any] | None = None,
    total_carbs_g_range: tuple[float, float] | list[float] | None = None,
    confidence_overall: str = "medium",
    confidence_why: str = "Nutrition estimate and forecast are simulation-derived.",
    historical_context: dict[str, Any] | None = None,
    clarification_answer: str | None = None,
) -> dict[str, Any]:
    """Transform model outputs into the LLM evidence bundle contract.

    The returned dict mirrors prompts/companion_system.txt and should be the
    only structure handed to the narrator LLM.
    """
    totals_dict = _totals_bundle(totals)
    if total_carbs_g_range is None:
        total_carbs_g_range = [totals_dict["carbs_g"], totals_dict["carbs_g"]]

    cgm = current_cgm or {"mg_dl": forecast.baseline_mg_dl, "trend": "unknown"}

    bundle = {
        "profile": _profile_bundle(profile, anchor_type),
        "totals": totals_dict,
        "total_carbs_g_range": [float(total_carbs_g_range[0]), float(total_carbs_g_range[1])],
        "confidence_overall": confidence_overall,
        "confidence_why": confidence_why,
        "current_cgm": {
            "mg_dl": cgm.get("mg_dl", forecast.baseline_mg_dl),
            "trend": cgm.get("trend", "unknown"),
        },
        "forecast": _forecast_bundle(forecast),
        "historical_context": historical_context or _default_historical_context(forecast),
        "clarification_answer": clarification_answer,
        "evidence": {
            "top_drivers": forecast.top_drivers,
            "profile_assumptions": forecast.profile_assumptions,
            "missing_information_flags": forecast.missing_information_flags,
            "evidence_items": forecast.evidence_items,
        },
    }
    return bundle
