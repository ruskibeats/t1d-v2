#!/usr/bin/env python3
"""Counterfactual Meal Coach — generate educational what-if meal simulations.

Generates non-dosing counterfactual scenarios for a given meal forecast:
  - Smaller portion: proportionally reduce all macros
  - Lower-fat alternative: reduce fat while keeping carbs/sugars similar
  - Different timing: simulate eating at a different hour
  - Separate snack: split the meal into smaller sequential events

Each scenario compares predicted peak, timing, and uncertainty band against the
current (reference) meal. Results are educational only — no dosing, bolus, or
treatment recommendations.

Safety boundary: this module does NOT calculate or recommend insulin dosing,
and explicitly flags that counterfactuals are educational simulations.
"""

from __future__ import annotations

import copy
import logging
from dataclasses import dataclass, field
from typing import Any

from src.forecast.model import ForecastResult, MealTotals
from src.forecast.stage import ForecastStage

logger = logging.getLogger(__name__)

# Safety disclaimer appended to all counterfactual output
_SAFETY_DISCLAIMER = "Counterfactual simulation only — not medical advice."


@dataclass
class CounterfactualComparison:
    """Comparison metrics between a counterfactual scenario and the reference meal."""

    peak_delta_mg_dl: int  # positive = counterfactual peak is lower (improvement)
    peak_delta_percent: float
    timing_delta_minutes: int  # positive = counterfactual peaks later
    peak_low_delta_mg_dl: int | None = None  # uncertainty band low
    peak_high_delta_mg_dl: int | None = None  # uncertainty band high
    carbs_delta_g: float = 0.0
    fat_delta_g: float = 0.0


@dataclass
class CounterfactualScenario:
    """One counterfactual scenario with full comparison data."""

    type: str  # "smaller_portion", "lower_fat", "different_timing", "separate_snack"
    label: str  # Human-readable label for display
    description: str  # What was changed and why
    totals: dict[str, float]  # Modified meal totals
    forecast: dict[str, Any]  # Forecast result (peak, timing, uncertainty)
    comparison: CounterfactualComparison  # Metrics vs reference meal
    historical_note: str = ""  # Optional historical context


@dataclass
class CounterfactualBundle:
    """All counterfactual scenarios for a meal, plus the reference comparison."""

    current_meal: dict[str, Any]
    scenarios: list[CounterfactualScenario] = field(default_factory=list)
    disclaimer: str = _SAFETY_DISCLAIMER


# ── Helpers ──


def _forecast_to_plain_dict(result: ForecastResult) -> dict[str, Any]:
    """Convert a ForecastResult into a plain dict for serialization."""
    band = result.uncertainty_band
    return {
        "baseline_mg_dl": result.baseline_mg_dl,
        "peak_mg_dl": result.peak_mg_dl,
        "peak_time_minutes": result.peak_time_minutes,
        "peak_range_mg_dl": list(band.peak_range_mg_dl) if band else [result.peak_mg_dl, result.peak_mg_dl],
        "peak_time_range_minutes": list(band.peak_time_range_minutes) if band else [result.peak_time_minutes, result.peak_time_minutes],
    }


def _make_comparison(
    current: ForecastResult,
    cf_totals: MealTotals,
    cf_forecast: ForecastResult,
) -> CounterfactualComparison:
    """Build comparison metrics between current (reference) and counterfactual."""
    peak_delta = current.peak_mg_dl - cf_forecast.peak_mg_dl
    peak_pct = (peak_delta / max(current.peak_mg_dl, 1)) * 100.0

    timing_delta = cf_forecast.peak_time_minutes - current.peak_time_minutes

    # Uncertainty band deltas
    cur_band = current.uncertainty_band
    cf_band = cf_forecast.uncertainty_band
    low_delta = (
        cur_band.peak_range_mg_dl[0] - cf_band.peak_range_mg_dl[0]
        if cur_band and cf_band else None
    )
    high_delta = (
        cur_band.peak_range_mg_dl[1] - cf_band.peak_range_mg_dl[1]
        if cur_band and cf_band else None
    )

    return CounterfactualComparison(
        peak_delta_mg_dl=round(peak_delta),
        peak_delta_percent=round(peak_pct, 1),
        timing_delta_minutes=timing_delta,
        peak_low_delta_mg_dl=round(low_delta) if low_delta is not None else None,
        peak_high_delta_mg_dl=round(high_delta) if high_delta is not None else None,
        carbs_delta_g=current.meal_drivers.get("fast_carbs_g", 0) - cf_totals.carbs_g,
        fat_delta_g=0.0,
    )


def _estimate_fat_from_totals(carbs_g: float, sugars_g: float) -> float:
    """Estimate fat content from carb composition when fat is not directly available.
    
    Used when MealTotals doesn't carry fat_g directly in the forecast pipeline.
    """
    if carbs_g <= 0:
        return 0.0
    sugar_ratio = sugars_g / carbs_g
    if sugar_ratio > 0.7:
        return 2.0  # High-sugar foods typically low fat
    return carbs_g * 0.3  # Mixed meal: assume ~30% of carb mass as fat


def _describe_improvement(comparison: CounterfactualComparison, scenario_type: str) -> str:
    """Generate a plain-language description of the counterfactual improvement."""
    parts = []
    if comparison.peak_delta_mg_dl > 0:
        parts.append(f"Peak reduced by {comparison.peak_delta_mg_dl} mg/dL")
    elif comparison.peak_delta_mg_dl < 0:
        parts.append(f"Peak increased by {abs(comparison.peak_delta_mg_dl)} mg/dL")
    else:
        parts.append("Similar peak glucose")

    if comparison.timing_delta_minutes > 5:
        parts.append(f"peak delayed by {comparison.timing_delta_minutes} min")
    elif comparison.timing_delta_minutes < -5:
        parts.append(f"peak earlier by {abs(comparison.timing_delta_minutes)} min")

    if comparison.peak_low_delta_mg_dl is not None and comparison.peak_high_delta_mg_dl is not None:
        low_improve = "narrower" if (comparison.peak_high_delta_mg_dl - comparison.peak_low_delta_mg_dl) > 0 else "wider"
        parts.append(f"Uncertainty range {low_improve}")

    return ". ".join(parts)


# ── Scenario generators ──


def _smaller_portion_scenario(
    current: ForecastResult,
    totals: MealTotals,
    stage: ForecastStage,
    hour: int,
    *,
    reduction_factor: float = 0.7,
) -> CounterfactualScenario:
    """Generate a smaller-portion scenario by scaling all macros."""
    smaller_totals = MealTotals(
        carbs_g=round(totals.carbs_g * reduction_factor, 1),
        fat_g=round(totals.fat_g * reduction_factor, 1),
        sugars_g=round(totals.sugars_g * reduction_factor, 1),
        protein_g=round(totals.protein_g * reduction_factor, 1),
        kcal=round(totals.kcal * reduction_factor, 1),
    )
    cf_forecast = stage.forecast(smaller_totals, hour=hour)
    comparison = _make_comparison(current, smaller_totals, cf_forecast)

    original_carbs = totals.carbs_g
    reduced_carbs = smaller_totals.carbs_g
    description = (
        f"If the portion were reduced to ~{reduction_factor*100:.0f}% "
        f"({original_carbs:.0f}g → {reduced_carbs:.0f}g carbs)"
    )

    return CounterfactualScenario(
        type="smaller_portion",
        label="Smaller Portion",
        description=description,
        totals={
            "carbs_g": smaller_totals.carbs_g,
            "fat_g": smaller_totals.fat_g,
            "sugars_g": smaller_totals.sugars_g,
        },
        forecast=_forecast_to_plain_dict(cf_forecast),
        comparison=comparison,
    )


def _lower_fat_scenario(
    current: ForecastResult,
    totals: MealTotals,
    stage: ForecastStage,
    hour: int,
) -> CounterfactualScenario | None:
    """Generate a lower-fat alternative if the meal is high-fat."""
    if totals.fat_g < 15:
        return None  # Not applicable for low-fat meals

    # Reduce fat to ~8g (low-fat) while keeping carbs and sugars similar
    lower_fat_totals = MealTotals(
        carbs_g=totals.carbs_g,
        fat_g=8.0,  # Low-fat threshold
        sugars_g=totals.sugars_g,
        protein_g=totals.protein_g,
        kcal=totals.kcal,
    )
    cf_forecast = stage.forecast(lower_fat_totals, hour=hour)
    comparison = _make_comparison(current, lower_fat_totals, cf_forecast)

    description = (
        f"If a lower-fat version were chosen "
        f"({totals.fat_g:.0f}g → 8g fat) — fat can delay glucose rise"
    )

    return CounterfactualScenario(
        type="lower_fat",
        label="Lower-Fat Alternative",
        description=description,
        totals={
            "carbs_g": lower_fat_totals.carbs_g,
            "fat_g": lower_fat_totals.fat_g,
            "sugars_g": lower_fat_totals.sugars_g,
        },
        forecast=_forecast_to_plain_dict(cf_forecast),
        comparison=comparison,
    )


def _different_timing_scenario(
    current: ForecastResult,
    totals: MealTotals,
    stage: ForecastStage,
    hour: int,
) -> CounterfactualScenario:
    """Generate a different-timing scenario (eat earlier or later)."""
    # Try eating earlier (morning/lunch) vs current hour
    if hour < 14:
        alt_hour = 19  # Move to evening
        timing_label = "evening"
    else:
        alt_hour = 12  # Move to midday
        timing_label = "midday"

    cf_forecast = stage.forecast(totals, hour=alt_hour)
    comparison = _make_comparison(current, totals, cf_forecast)

    description = (
        f"If this meal were eaten in the {timing_label} instead "
        f"(hour {hour} → {alt_hour}:00) — glucose response varies by time of day"
    )

    return CounterfactualScenario(
        type="different_timing",
        label="Different Timing",
        description=description,
        totals={
            "carbs_g": totals.carbs_g,
            "fat_g": totals.fat_g,
            "sugars_g": totals.sugars_g,
        },
        forecast=_forecast_to_plain_dict(cf_forecast),
        comparison=comparison,
    )


def _separate_snack_scenario(
    current: ForecastResult,
    totals: MealTotals,
    stage: ForecastStage,
    hour: int,
) -> CounterfactualScenario | None:
    """Generate a split-meal scenario (eat half now, half later).

    Simulates splitting the meal into two smaller events separated by ~90 min.
    The combined peak is taken as the higher of the two sub-meal peaks.
    """
    if totals.carbs_g < 30:
        return None  # Not applicable for small meals

    # Split ratio: 60% now, 40% after 90 minutes
    first_totals = MealTotals(
        carbs_g=round(totals.carbs_g * 0.6, 1),
        fat_g=round(totals.fat_g * 0.6, 1),
        sugars_g=round(totals.sugars_g * 0.6, 1),
        protein_g=round(totals.protein_g * 0.6, 1),
        kcal=round(totals.kcal * 0.6, 1),
    )
    second_totals = MealTotals(
        carbs_g=round(totals.carbs_g * 0.4, 1),
        fat_g=round(totals.fat_g * 0.4, 1),
        sugars_g=round(totals.sugars_g * 0.4, 1),
        protein_g=round(totals.protein_g * 0.4, 1),
        kcal=round(totals.kcal * 0.4, 1),
    )

    first_forecast = stage.forecast(first_totals, hour=hour)
    second_forecast = stage.forecast(second_totals, hour=hour + 1)  # ~90 min later with offset rounding

    # Combined peak = max of the two peaks (they don't fully overlap)
    combined_peak = max(first_forecast.peak_mg_dl, second_forecast.peak_mg_dl)
    combined_time = (
        first_forecast.peak_time_minutes
        if first_forecast.peak_mg_dl >= second_forecast.peak_mg_dl
        else 60 + second_forecast.peak_time_minutes
    )

    # Build a synthetic combined result for comparison
    combined_result = copy.deepcopy(current)
    combined_result.peak_mg_dl = combined_peak
    combined_result.peak_time_minutes = combined_time

    comparison = _make_comparison(current, totals, combined_result)
    comparison.carbs_delta_g = 0.0  # Same total carbs

    description = (
        f"If the meal were split: ~60% now ({first_totals.carbs_g:.0f}g carbs) "
        f"and ~40% ({second_totals.carbs_g:.0f}g carbs) about 90 min later"
    )

    return CounterfactualScenario(
        type="separate_snack",
        label="Separate Snack (Split Meal)",
        description=description,
        totals={
            "carbs_g": totals.carbs_g,
            "fat_g": totals.fat_g,
            "sugars_g": totals.sugars_g,
            "first_portion_carbs_g": first_totals.carbs_g,
            "second_portion_carbs_g": second_totals.carbs_g,
        },
        forecast={
            "baseline_mg_dl": combined_result.baseline_mg_dl,
            "peak_mg_dl": combined_result.peak_mg_dl,
            "peak_time_minutes": combined_result.peak_time_minutes,
            "peak_range_mg_dl": [
                min(first_forecast.peak_mg_dl, second_forecast.peak_mg_dl),
                combined_peak,
            ],
            "peak_time_range_minutes": [
                first_forecast.peak_time_minutes,
                60 + second_forecast.peak_time_minutes,
            ],
        },
        comparison=comparison,
    )


def _scenario_historical_note(
    scenario: CounterfactualScenario,
    historical_context: dict[str, Any] | None,
) -> str:
    """Add historical context to a scenario when available."""
    if not historical_context:
        return ""
    hist_count = historical_context.get("similar_meals_count", 0)
    if hist_count == 0:
        return ""
    avg_rise = historical_context.get("avg_peak_rise_mg_dl")
    if avg_rise is not None:
        return (
            f"Historical context: {hist_count} similar meals had an average "
            f"rise of {avg_rise} mg/dL."
        )
    return ""


# ── Public API ──


def generate_counterfactuals(
    totals: MealTotals,
    stage: ForecastStage,
    hour: int = 19,
    historical_context: dict[str, Any] | None = None,
    *,
    current_forecast: ForecastResult | None = None,
    include_smaller_portion: bool = True,
    include_lower_fat: bool = True,
    include_different_timing: bool = True,
    include_separate_snack: bool = True,
) -> CounterfactualBundle:
    """Generate counterfactual scenarios for a given meal forecast.

    Args:
        totals: Original meal totals (reference meal).
        stage: ForecastStage to run simulations with.
        hour: Hour of the original meal (0–23).
        historical_context: Optional historical meal context from
            historical_meal_matcher.historical_context_for_meal().
        current_forecast: Pre-computed forecast for the reference meal.
            If None, one is computed.
        include_smaller_portion: Generate smaller-portion scenario.
        include_lower_fat: Generate lower-fat scenario.
        include_different_timing: Generate different-timing scenario.
        include_separate_snack: Generate separate-snack scenario.

    Returns:
        CounterfactualBundle with scenarios and reference meal data.
    """
    logger.info(
        "Generating counterfactuals: carbs=%.1f fat=%.1f hour=%d",
        totals.carbs_g, totals.fat_g, hour,
    )

    # Compute reference forecast if not provided
    if current_forecast is None:
        current_forecast = stage.forecast(totals, hour=hour, carb_range_g=None)

    current_meal = _forecast_to_plain_dict(current_forecast)
    current_meal["totals"] = {
        "carbs_g": totals.carbs_g,
        "fat_g": totals.fat_g,
        "sugars_g": totals.sugars_g,
    }

    scenarios: list[CounterfactualScenario] = []

    # 1. Smaller portion
    if include_smaller_portion and totals.carbs_g >= 15:
        scenario = _smaller_portion_scenario(
            current_forecast, totals, stage, hour,
        )
        scenario.historical_note = _scenario_historical_note(scenario, historical_context)
        scenarios.append(scenario)

    # 2. Lower-fat alternative
    if include_lower_fat and totals.fat_g >= 15:
        scenario = _lower_fat_scenario(current_forecast, totals, stage, hour)
        if scenario is not None:
            scenario.historical_note = _scenario_historical_note(scenario, historical_context)
            scenarios.append(scenario)

    # 3. Different timing
    if include_different_timing:
        scenario = _different_timing_scenario(current_forecast, totals, stage, hour)
        scenario.historical_note = _scenario_historical_note(scenario, historical_context)
        scenarios.append(scenario)

    # 4. Separate snack
    if include_separate_snack and totals.carbs_g >= 30:
        scenario = _separate_snack_scenario(current_forecast, totals, stage, hour)
        if scenario is not None:
            scenario.historical_note = _scenario_historical_note(scenario, historical_context)
            scenarios.append(scenario)

    return CounterfactualBundle(
        current_meal=current_meal,
        scenarios=scenarios,
    )


# ── Rendering ──


def render_counterfactual_bundle(
    bundle: CounterfactualBundle,
    food_text: str = "",
    *,
    format: str = "text",
) -> str:
    """Render the counterfactual bundle into human-readable text.

    Args:
        bundle: CounterfactualBundle from generate_counterfactuals().
        food_text: Original meal description for context.
        format: 'text' for terminal-friendly or 'json' for machine output.

    Returns:
        Formatted string with all scenarios.
    """
    if not bundle.scenarios:
        return ""

    if format == "json":
        import json
        return json.dumps({
            "current_meal": bundle.current_meal,
            "scenarios": [
                {
                    "type": s.type,
                    "label": s.label,
                    "description": s.description,
                    "forecast": s.forecast,
                    "comparison": {
                        "peak_delta_mg_dl": s.comparison.peak_delta_mg_dl,
                        "peak_delta_percent": s.comparison.peak_delta_percent,
                        "timing_delta_minutes": s.comparison.timing_delta_minutes,
                        "peak_low_delta_mg_dl": s.comparison.peak_low_delta_mg_dl,
                        "peak_high_delta_mg_dl": s.comparison.peak_high_delta_mg_dl,
                    },
                    "historical_note": s.historical_note,
                }
                for s in bundle.scenarios
            ],
            "disclaimer": bundle.disclaimer,
        }, indent=2)

    # Text format
    current = bundle.current_meal
    curr_totals = current.get("totals", {})
    lines = [
        "\n━━━ What-If Scenarios ━━━",
        f"Reference: {curr_totals.get('carbs_g', 0):.0f}g carbs, "
        f"{curr_totals.get('fat_g', 0):.0f}g fat"
        if food_text else
        f"Reference meal — peak ~{current.get('peak_mg_dl', '?')} mg/dL "
        f"at ~{current.get('peak_time_minutes', '?')} min",
        "",
    ]

    for i, s in enumerate(bundle.scenarios, start=1):
        comp = s.comparison
        cf_fc = s.forecast
        lines.append(f"── Scenario {i}: {s.label} ──")
        lines.append(f"  {s.description}")
        lines.append(
            f"  → Peak: ~{cf_fc.get('peak_mg_dl', '?')} mg/dL "
            f"at ~{cf_fc.get('peak_time_minutes', '?')} min"
        )
        cf_range = cf_fc.get("peak_range_mg_dl", [])
        if len(cf_range) == 2:
            lines.append(f"  → Range: {cf_range[0]}–{cf_range[1]} mg/dL")

        # Comparison
        improvements = []
        improvement_note = _describe_improvement(comp, s.type)
        if improvement_note:
            improvements.append(improvement_note)

        if improvements:
            lines.append(f"  ├ Compared to reference: {improvements[0]}")

        # Historical note
        if s.historical_note:
            lines.append(f"  └ Historical note: {s.historical_note}")
        elif not improvements:
            lines.append(f"  └ Similar profile to reference meal")

        lines.append("")

    lines.append(f"⚠ {bundle.disclaimer}")

    return "\n".join(lines)
