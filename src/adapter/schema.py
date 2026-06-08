#!/usr/bin/env python3
"""Schema adapters — convert forecast outputs to canonical prediction schemas."""

from __future__ import annotations

from typing import Any

from app.schemas.prediction import (
    Assumption,
    ConfidenceComponents,
    EvidenceBasis,
    FoodBreakdown,
    GlycemicPrediction,
)

from ..forecast_engine import ForecastResult, MealTotals


def forecast_to_prediction_schema(
    forecast: ForecastResult,
    totals: MealTotals | dict[str, Any],
    *,
    confidence_tier: str = "medium",
    explanation_text: str | None = None,
    ascii_chart: str | None = None,
    food_breakdown: list[FoodBreakdown] | None = None,
    assumptions: list[Assumption] | None = None,
    evidence_basis: EvidenceBasis | None = None,
    confidence_components: ConfidenceComponents | None = None,
) -> GlycemicPrediction:
    """Convert ForecastResult into the canonical GlycemicPrediction contract.

    Args:
        forecast: ForecastResult from forecast_engine
        totals: MealTotals with carb/fat/protein values
        confidence_tier: Overall confidence (high/medium/low)
        evidence_basis: Provenance info (Issue #46) - data_source, evidence_refs, etc.
        confidence_components: Breakdown of confidence factors (Issue #46)
    """
    carbs = totals.get("carbs_g", 0) if isinstance(totals, dict) else totals.carbs_g
    carb_range = None
    if forecast.uncertainty_band is not None:
        carb_range = (
            int(round(forecast.uncertainty_band.low.carbs_g)),
            int(round(forecast.uncertainty_band.high.carbs_g)),
        )

    # Default evidence_basis if not provided (Issue #46)
    if evidence_basis is None:
        evidence_basis = EvidenceBasis(data_source="synthetic_legend")

    # Default confidence_components if not provided (Issue #46)
    if confidence_components is None:
        confidence_components = ConfidenceComponents(
            identity=0.5,
            portion=0.5,
            nutrition=0.5,
            timing=0.5,
        )

    return GlycemicPrediction(
        predicted_glucose_mg_dl=forecast.peak_mg_dl,
        time_to_peak_minutes=forecast.peak_time_minutes,
        baseline_glucose_mg_dl=forecast.baseline_mg_dl,
        confidence_tier=confidence_tier,
        carb_estimate_total_g=float(carbs or 0),
        evidence_basis=evidence_basis,
        confidence_components=confidence_components,
        ascii_chart=ascii_chart,
        explanation_text=explanation_text,
        carb_estimate_range_g=carb_range,
        food_breakdown=food_breakdown,
        assumptions=assumptions,
    )
