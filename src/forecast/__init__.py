#!/usr/bin/env python3
"""Forecast package — glucose forecasting for T1D Companion v2."""

from __future__ import annotations

# Model dataclasses
from .model import (
    ForecastPoint,
    ForecastResult,
    ForecastScenario,
    ForecastUncertaintyBand,
    MealTotals,
    NighttimePoint,
)

# Core forecast function
from .glucose import forecast_glucose

# Stage (calibration + orchestration)
from .stage import ForecastStage, make_forecaster
from .calibration_harness import (
    SYNTHETIC_ONLY_NOTICE,
    SYNTHETIC_TRACE_FIXTURES,
    SyntheticMealTrace,
    CalibrationComparison,
    compare_forecast_to_trace,
    run_calibration_suite,
    render_calibration_suite_markdown,
)

# Evidence helpers
from .evidence import populate_evidence_fields

# Kernels (for advanced use / testing)
from .kernels import (
    soft_glucose_cap,
    normalized_gamma_impulse,
    project_fast_rise,
    project_slow_rise,
    project_insulin_effect,
    compute_exercise_heat_modifier,
    scale_totals_to_carbs,
    scenario_from_result,
    compute_nighttime,
    MEAL_WINDOW_STEPS,
    INSULIN_WINDOW_STEPS,
    SLOW_MEAL_PEAK_STEP,
    FAST_SUGAR_PEAK_STEP,
    FAST_SUGAR_WINDOW_STEPS,
    INSULIN_PEAK_STEP,
    DRIFT_RATE_PER_STEP,
)

__all__ = [
    # Model
    "ForecastPoint",
    "ForecastResult",
    "ForecastScenario",
    "ForecastUncertaintyBand",
    "MealTotals",
    "NighttimePoint",
    # Core
    "forecast_glucose",
    "ForecastStage",
    "make_forecaster",
    "SYNTHETIC_ONLY_NOTICE",
    "SYNTHETIC_TRACE_FIXTURES",
    "SyntheticMealTrace",
    "CalibrationComparison",
    "compare_forecast_to_trace",
    "run_calibration_suite",
    "render_calibration_suite_markdown",
    "populate_evidence_fields",
    # Kernels
    "soft_glucose_cap",
    "normalized_gamma_impulse",
    "project_fast_rise",
    "project_slow_rise",
    "project_insulin_effect",
    "compute_exercise_heat_modifier",
    "scale_totals_to_carbs",
    "scenario_from_result",
    "compute_nighttime",
    "MEAL_WINDOW_STEPS",
    "INSULIN_WINDOW_STEPS",
    "SLOW_MEAL_PEAK_STEP",
    "FAST_SUGAR_PEAK_STEP",
    "FAST_SUGAR_WINDOW_STEPS",
    "INSULIN_PEAK_STEP",
    "DRIFT_RATE_PER_STEP",
]
