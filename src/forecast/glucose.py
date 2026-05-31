#!/usr/bin/env python3
"""Forecast glucose orchestration — compose kernels into a full forecast."""

from __future__ import annotations

from .model import ForecastResult, ForecastPoint, ForecastUncertaintyBand, ForecastScenario, MealTotals, NighttimePoint
from .kernels import (
    soft_glucose_cap,
    project_fast_rise,
    project_slow_rise,
    compute_exercise_heat_modifier,
    compute_nighttime,
    scale_totals_to_carbs,
    scenario_from_result,
    DRIFT_RATE_PER_STEP,
)
from ..physiology_model import PhysiologyForecastModel, PhysiologyParameters
from ..calibration_constants import RISE_PER_CARB_MAP, BALANCE_MAP


def forecast_glucose(
    totals: MealTotals,
    basal_mg_dl: float,
    carb_ratio: float,
    insulin_sensitivity: float,
    fat_delay_hours: float,
    exercise_drop_factor: float,
    anchor_type: str = "well_controlled",
    *,
    hour: int = 19,
    dt: int = 5,
    carb_range_g: tuple[float, float] | None = None,
    include_uncertainty: bool = True,
) -> ForecastResult:
    """Compose kernels into a full glucose forecast.

    Pure function — no I/O, no async, no DB.
    All parameters are deterministic profile/meal values.
    """
    # Resolve calibration constants
    rise_per_g = RISE_PER_CARB_MAP.get(anchor_type, 0.6)
    balance_factor = BALANCE_MAP.get(anchor_type, 1.2)

    heat_mod = compute_exercise_heat_modifier(exercise_drop_factor)
    ext_tail = totals.fat_g >= 15.0
    fast_total = project_fast_rise(totals.sugars_g, rise_per_g) * heat_mod
    slow_total, _, _ = project_slow_rise(
        totals.carbs_g, totals.sugars_g, totals.fat_g, rise_per_g, fat_delay_hours,
    )
    slow_total *= heat_mod

    # Simulate with physiology model
    timepoints = [1, 2, 3, 4, 6, 8, 10]
    basal = basal_mg_dl
    model = PhysiologyForecastModel(PhysiologyParameters(
        basal_mg_dl=basal_mg_dl,
        rise_per_g=rise_per_g,
        carb_ratio=carb_ratio,
        insulin_sensitivity=insulin_sensitivity,
        balance_factor=balance_factor,
        exercise_heat_modifier=heat_mod,
        fat_delay_hours=fat_delay_hours,
        basal_reversion_per_min=DRIFT_RATE_PER_STEP / dt,
    ))
    physiology_trace = model.simulate(
        carbs_g=totals.carbs_g,
        sugars_g=totals.sugars_g,
        fat_g=totals.fat_g,
        horizon_minutes=16 * 60,
        dt_minutes=dt,
    )
    trace: dict[int, float] = {
        point.minute: point.glucose_mg_dl for point in physiology_trace.points
    }

    # Sample at requested timepoints
    points = [
        ForecastPoint(hour=hr, glucose_mg_dl=round(trace.get(hr * 60, basal)))
        for hr in timepoints
    ]

    # Find peak
    peak_point = physiology_trace.peak
    peak_t = peak_point.minute

    # Nighttime
    nighttime = compute_nighttime(trace, basal, hour, dt)

    # Build top drivers for explainability
    drivers = []
    if totals.sugars_g > 5:
        drivers.append(f"fast_carbs:{totals.sugars_g:.0f}g")
    if totals.carbs_g - totals.sugars_g > 10:
        drivers.append(f"slow_carbs:{totals.carbs_g - totals.sugars_g:.0f}g")
    if totals.fat_g >= 15:
        drivers.append(f"fat_delays:{totals.fat_g:.0f}g")
    if heat_mod < 1.0:
        drivers.append(f"exercise_mod:{heat_mod:.2f}x")

    result = ForecastResult(
        baseline_mg_dl=round(basal),
        peak_mg_dl=round(trace[peak_t]),
        peak_time_minutes=peak_t,
        forecast_points=points,
        nighttime=nighttime,
        exercise_heat_modifier=round(heat_mod, 3),
        meal_drivers={
            "fast_carbs_g": round(totals.sugars_g, 1),
            "slow_carbs_g": round(max(totals.carbs_g - totals.sugars_g, 0), 1),
            "fat_triggers_delay": ext_tail,
            "estimated_peak_rise_mg_dl": round(fast_total + slow_total),
            "balance_factor": balance_factor,
        },
        top_drivers=drivers,
    )

    # Profile assumptions for transparency
    result.profile_assumptions = {
        "anchor_type": anchor_type,
        "carb_ratio": carb_ratio,
        "insulin_sensitivity": insulin_sensitivity,
        "fat_delay_hours": fat_delay_hours,
    }

    # Missing information flags
    if totals.carbs_g == 0:
        result.missing_information_flags.append("no_carbs_detected")

    # Uncertainty band
    if include_uncertainty and carb_range_g is not None:
        low_carb, high_carb = carb_range_g
        low_totals = scale_totals_to_carbs(totals, low_carb)
        high_totals = scale_totals_to_carbs(totals, high_carb)
        low = forecast_glucose(
            low_totals, basal_mg_dl, carb_ratio, insulin_sensitivity,
            fat_delay_hours, exercise_drop_factor, anchor_type,
            hour=hour, dt=dt, include_uncertainty=False,
        )
        high = forecast_glucose(
            high_totals, basal_mg_dl, carb_ratio, insulin_sensitivity,
            fat_delay_hours, exercise_drop_factor, anchor_type,
            hour=hour, dt=dt, include_uncertainty=False,
        )
        scenarios = [low, result, high]
        result.uncertainty_band = ForecastUncertaintyBand(
            low=scenario_from_result("low", low_carb, low),
            point=scenario_from_result("point", totals.carbs_g, result),
            high=scenario_from_result("high", high_carb, high),
            peak_range_mg_dl=(min(s.peak_mg_dl for s in scenarios), max(s.peak_mg_dl for s in scenarios)),
            peak_time_range_minutes=(
                min(s.peak_time_minutes for s in scenarios),
                max(s.peak_time_minutes for s in scenarios),
            ),
        )

    return result
