#!/usr/bin/env python3
"""Forecast evidence helpers — populate provenance fields on ForecastResults."""

from __future__ import annotations

from .model import ForecastResult


def populate_evidence_fields(
    result: ForecastResult,
    evidence_items: list[dict] | None = None,
    historical_similarity_score: float | None = None,
    missing_info: list[str] | None = None,
    calibration: dict | None = None,
    overwrite_drivers: bool = False,
) -> ForecastResult:
    """Populate evidence/provenance fields on a ForecastResult.

    Args:
        result: The ForecastResult to annotate
        evidence_items: Nutrition source evidence
        historical_similarity_score: Match quality 0-1
        missing_info: Flags for missing context
        calibration: Calibration constants used (from ForecastStage.calibration)
        overwrite_drivers: If True, set top_drivers; if False, leave as-is
    """
    # Determine top drivers (only if not already set or overwrite requested)
    if overwrite_drivers or not result.top_drivers:
        drivers = []
        if result.meal_drivers.get("fast_carbs_g", 0) > 0:
            drivers.append(f"fast carbs ({result.meal_drivers['fast_carbs_g']}g)")
        if result.meal_drivers.get("slow_carbs_g", 0) > 0:
            drivers.append(f"slow carbs ({result.meal_drivers['slow_carbs_g']}g)")
        if result.meal_drivers.get("fat_triggers_delay"):
            drivers.append("fat/protein extended absorption")
        result.top_drivers = drivers

    result.historical_similarity_score = historical_similarity_score
    result.profile_assumptions = calibration or {}
    result.missing_information_flags = missing_info or []
    result.evidence_items = evidence_items or []

    return result
