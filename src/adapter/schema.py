#!/usr/bin/env python3
"""Schema adapters — convert forecast outputs to canonical prediction schemas."""

from __future__ import annotations

from typing import Any

from app.schemas.prediction import Assumption, FoodBreakdown, GlycemicPrediction

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
) -> GlycemicPrediction:
    """Convert ForecastResult into the canonical GlycemicPrediction contract."""
    carbs = totals.get("carbs_g", 0) if isinstance(totals, dict) else totals.carbs_g
    carb_range = None
    if forecast.uncertainty_band is not None:
        carb_range = (
            int(round(forecast.uncertainty_band.low.carbs_g)),
            int(round(forecast.uncertainty_band.high.carbs_g)),
        )
    return GlycemicPrediction(
        predicted_glucose_mg_dl=forecast.peak_mg_dl,
        time_to_peak_minutes=forecast.peak_time_minutes,
        baseline_glucose_mg_dl=forecast.baseline_mg_dl,
        confidence_tier=confidence_tier,  # type: ignore[arg-type]
        carb_estimate_total_g=float(carbs or 0),
        ascii_chart=ascii_chart,
        explanation_text=explanation_text,
        carb_estimate_range_g=carb_range,
        food_breakdown=food_breakdown,
        assumptions=assumptions,
    )
