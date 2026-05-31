#!/usr/bin/env python3
"""Forecast computational kernels — pure functions for glucose projection."""

from __future__ import annotations

import math
from functools import lru_cache

from .model import ForecastPoint, ForecastResult, ForecastScenario, ForecastUncertaintyBand, MealTotals, NighttimePoint

# ── Simulation constants ──

MEAL_WINDOW_STEPS = 36       # 3 hours × 12 five-minute steps
INSULIN_WINDOW_STEPS = 72    # 6 hours × 12 five-minute steps
SLOW_MEAL_PEAK_STEP = 18     # 90 minutes
FAST_SUGAR_PEAK_STEP = 5     # 25 minutes
FAST_SUGAR_WINDOW_STEPS = 18 # 90 minutes
INSULIN_PEAK_STEP = 18       # 90 minutes, aligned with simulator
DRIFT_RATE_PER_STEP = 0.015  # OU mean reversion per 5-minute step


# ── Raw kernels (independently testable) ──


def soft_glucose_cap(v: float) -> float:
    """Soft physiological boundary, matching the main simulator."""
    if v > 400.0:
        return 400.0 + 15.0 * (1.0 - math.exp(-(v - 400.0) / 15.0))
    if v < 40.0:
        return 40.0 - 15.0 * (1.0 - math.exp(-(40.0 - v) / 15.0))
    return v


@lru_cache(maxsize=None)
def normalized_gamma_impulse(step: int, peak: int, total: int) -> float:
    """Discrete gamma impulse normalised so sum over the window is 1.0."""
    if step <= 0 or step > total:
        return 0.0
    denom = sum(s * math.exp(-s / peak) for s in range(1, total + 1))
    if denom <= 0:
        return 0.0
    return step * math.exp(-step / peak) / denom


def project_fast_rise(sugars_g: float, rise_per_g: float) -> float:
    """Total fast-sugar rise distributed by a normalised impulse."""
    return sugars_g * rise_per_g * 1.2


def project_slow_rise(
    carbs_g: float, sugars_g: float, fat_g: float,
    rise_per_g: float, fat_delay_hours: float,
) -> tuple[float, bool, int]:
    """Total starch rise and delayed-tail metadata."""
    slow_carbs = max(carbs_g - sugars_g, 0)
    slow_rise = slow_carbs * rise_per_g
    ext_tail = fat_g >= 15
    tail_start_step = MEAL_WINDOW_STEPS + max(
        0, int(round(fat_delay_hours * 12)) - MEAL_WINDOW_STEPS
    )
    return (slow_rise, ext_tail, tail_start_step)


def project_insulin_effect(
    carbs_g: float, carb_ratio: float, insulin_sensitivity: float,
    balance_factor: float,
) -> float:
    """Total insulin glucose-lowering effect distributed over 6 hours."""
    insulin_units = carbs_g / carb_ratio if carb_ratio else 0
    return insulin_units * insulin_sensitivity * 0.25 / balance_factor


def compute_exercise_heat_modifier(exercise_drop_factor: float) -> float:
    """Compute modifier from profile's exercise drop factor."""
    if exercise_drop_factor <= 1:
        return 1.0
    return 1.0 - (1.0 - 1.0 / exercise_drop_factor) * 0.5


def scale_totals_to_carbs(totals: MealTotals, target_carbs_g: float) -> MealTotals:
    """Scale carb-linked macros to a low/high carb scenario."""
    current = max(totals.carbs_g, 0.0)
    target = max(target_carbs_g, 0.0)
    if current <= 0:
        return MealTotals(
            carbs_g=target,
            fat_g=totals.fat_g,
            sugars_g=min(totals.sugars_g, target),
            protein_g=totals.protein_g,
            kcal=totals.kcal,
        )
    scale = target / current
    return MealTotals(
        carbs_g=target,
        fat_g=totals.fat_g,
        sugars_g=min(round(totals.sugars_g * scale, 1), target),
        protein_g=totals.protein_g,
        kcal=totals.kcal,
    )


def scenario_from_result(label: str, carbs_g: float, result: ForecastResult) -> ForecastScenario:
    return ForecastScenario(
        label=label,
        carbs_g=round(carbs_g, 1),
        peak_mg_dl=result.peak_mg_dl,
        peak_time_minutes=result.peak_time_minutes,
        forecast_points=result.forecast_points,
    )


def compute_nighttime(
    trace: dict[int, float], basal: float,
    meal_hour: int, dt: int = 5,
) -> list[NighttimePoint]:
    """Compute nighttime forecast points from a trace simulated to 16 hours."""
    points = []
    for offset in [8, 10, 12, 14, 16]:
        t_min = offset * 60
        nearest = round(t_min / dt) * dt
        if nearest not in trace:
            raise ValueError("nighttime forecast requires trace coverage to 16 hours")
        g = soft_glucose_cap(trace[nearest])
        prev = trace.get(max(0, nearest - 60), g)
        hr = (meal_hour + offset) % 24
        note = "Falling" if g < prev - 10 else ("Rising" if g > prev + 10 else "Stable")
        points.append(NighttimePoint(
            time=f"{hr:02d}:00",
            hours_after_meal=offset,
            glucose_mg_dl=round(g),
            note=note,
        ))
    return points
