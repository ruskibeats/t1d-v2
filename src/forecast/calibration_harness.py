#!/usr/bin/env python3
"""Synthetic forecast calibration harness.

Compares forecast outputs against synthetic meal traces for regression coverage.
This module is not clinical validation and does not produce treatment guidance.
"""

from __future__ import annotations

from dataclasses import dataclass, asdict
from statistics import mean
from typing import Any, Callable

from .model import ForecastResult, MealTotals


SYNTHETIC_ONLY_NOTICE = (
    "Synthetic forecast regression harness only — not clinical validation, "
    "not medical advice, and not treatment guidance."
)


@dataclass(frozen=True)
class SyntheticMealTrace:
    """Synthetic expected meal response used for forecast regression coverage."""

    trace_id: str
    description: str
    totals: MealTotals
    expected_peak_mg_dl: int
    expected_peak_time_minutes: int
    anchor_type: str = "well_controlled"
    source: str = "synthetic_fixture"


@dataclass(frozen=True)
class CalibrationComparison:
    """Forecast-vs-trace comparison metrics for one synthetic meal trace."""

    trace_id: str
    description: str
    predicted_peak_mg_dl: int
    expected_peak_mg_dl: int
    peak_error_mg_dl: int
    predicted_peak_time_minutes: int
    expected_peak_time_minutes: int
    time_error_minutes: int
    status: str
    source: str
    safety_notice: str = SYNTHETIC_ONLY_NOTICE

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


SYNTHETIC_TRACE_FIXTURES: list[SyntheticMealTrace] = [
    SyntheticMealTrace(
        trace_id="standard_lunch",
        description="Moderate synthetic lunch",
        totals=MealTotals(carbs_g=50, fat_g=12, sugars_g=10, protein_g=16),
        expected_peak_mg_dl=178,
        expected_peak_time_minutes=105,
    ),
    SyntheticMealTrace(
        trace_id="high_fat_dinner",
        description="Higher-fat synthetic dinner",
        totals=MealTotals(carbs_g=70, fat_g=30, sugars_g=14, protein_g=24),
        expected_peak_mg_dl=215,
        expected_peak_time_minutes=160,
        anchor_type="high_fat_delayed",
    ),
    SyntheticMealTrace(
        trace_id="fast_carb_breakfast",
        description="Fast-carb synthetic breakfast",
        totals=MealTotals(carbs_g=40, fat_g=3, sugars_g=28, protein_g=6),
        expected_peak_mg_dl=205,
        expected_peak_time_minutes=70,
        anchor_type="post_meal_spike",
    ),
]


def _status(peak_error: int, time_error: int) -> str:
    if peak_error <= 30 and time_error <= 60:
        return "within_fixture_tolerance"
    if peak_error <= 60 and time_error <= 120:
        return "watch_fixture_drift"
    return "outside_fixture_tolerance"


def compare_forecast_to_trace(
    forecast: ForecastResult,
    trace: SyntheticMealTrace,
) -> CalibrationComparison:
    """Compare a forecast result with one synthetic expected trace."""
    peak_error = abs(forecast.peak_mg_dl - trace.expected_peak_mg_dl)
    time_error = abs(forecast.peak_time_minutes - trace.expected_peak_time_minutes)
    return CalibrationComparison(
        trace_id=trace.trace_id,
        description=trace.description,
        predicted_peak_mg_dl=forecast.peak_mg_dl,
        expected_peak_mg_dl=trace.expected_peak_mg_dl,
        peak_error_mg_dl=peak_error,
        predicted_peak_time_minutes=forecast.peak_time_minutes,
        expected_peak_time_minutes=trace.expected_peak_time_minutes,
        time_error_minutes=time_error,
        status=_status(peak_error, time_error),
        source=trace.source,
    )


def run_calibration_suite(
    forecast_func: Callable[[MealTotals], ForecastResult],
    traces: list[SyntheticMealTrace] | None = None,
) -> dict[str, Any]:
    """Run synthetic calibration comparisons and aggregate coverage metrics."""
    selected = traces or SYNTHETIC_TRACE_FIXTURES
    comparisons = [compare_forecast_to_trace(forecast_func(trace.totals), trace) for trace in selected]
    peak_errors = [c.peak_error_mg_dl for c in comparisons]
    time_errors = [c.time_error_minutes for c in comparisons]

    return {
        "source": "synthetic_fixture",
        "safety_notice": SYNTHETIC_ONLY_NOTICE,
        "trace_count": len(comparisons),
        "mean_absolute_peak_error_mg_dl": round(mean(peak_errors), 2) if peak_errors else 0,
        "mean_absolute_time_error_minutes": round(mean(time_errors), 2) if time_errors else 0,
        "max_peak_error_mg_dl": max(peak_errors) if peak_errors else 0,
        "max_time_error_minutes": max(time_errors) if time_errors else 0,
        "within_tolerance_count": sum(c.status == "within_fixture_tolerance" for c in comparisons),
        "comparisons": [c.to_dict() for c in comparisons],
    }


def render_calibration_suite_markdown(suite: dict[str, Any]) -> str:
    """Render suite results as synthetic-only Markdown for logs/artifacts."""
    lines = [
        "# Synthetic Forecast Calibration Harness",
        "",
        suite.get("safety_notice", SYNTHETIC_ONLY_NOTICE),
        "",
        "## Aggregate Metrics",
        "",
        f"- Trace fixtures: {suite.get('trace_count', 0)}",
        f"- Peak MAE: {suite.get('mean_absolute_peak_error_mg_dl', 0)} mg/dL",
        f"- Time-to-peak MAE: {suite.get('mean_absolute_time_error_minutes', 0)} minutes",
        f"- Max peak error: {suite.get('max_peak_error_mg_dl', 0)} mg/dL",
        f"- Max time error: {suite.get('max_time_error_minutes', 0)} minutes",
        "",
        "## Fixture Comparisons",
        "",
        "| Trace | Pred peak | Expected peak | Peak error | Pred time | Expected time | Time error | Status |",
        "|---|---:|---:|---:|---:|---:|---:|---|",
    ]
    for comparison in suite.get("comparisons", []):
        lines.append(
            f"| {comparison['trace_id']} | {comparison['predicted_peak_mg_dl']} | "
            f"{comparison['expected_peak_mg_dl']} | {comparison['peak_error_mg_dl']} | "
            f"{comparison['predicted_peak_time_minutes']} | {comparison['expected_peak_time_minutes']} | "
            f"{comparison['time_error_minutes']} | {comparison['status']} |"
        )
    lines += [
        "",
        "This report is for simulator regression coverage only and must not be interpreted as clinical validation.",
    ]
    return "\n".join(lines)
