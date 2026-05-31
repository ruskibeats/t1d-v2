from __future__ import annotations

from src.forecast.calibration_harness import (
    SYNTHETIC_ONLY_NOTICE,
    SYNTHETIC_TRACE_FIXTURES,
    SyntheticMealTrace,
    compare_forecast_to_trace,
    render_calibration_suite_markdown,
    run_calibration_suite,
)
from src.forecast.model import ForecastResult, MealTotals
from src.forecast.stage import ForecastStage


def _forecast(peak: int = 180, peak_time: int = 100) -> ForecastResult:
    return ForecastResult(
        baseline_mg_dl=110,
        peak_mg_dl=peak,
        peak_time_minutes=peak_time,
        forecast_points=[],
    )


def test_synthetic_trace_fixtures_cover_at_least_three_cases():
    assert len(SYNTHETIC_TRACE_FIXTURES) >= 3
    assert {trace.trace_id for trace in SYNTHETIC_TRACE_FIXTURES} >= {
        "standard_lunch",
        "high_fat_dinner",
        "fast_carb_breakfast",
    }
    assert all(trace.source == "synthetic_fixture" for trace in SYNTHETIC_TRACE_FIXTURES)


def test_compare_forecast_to_trace_reports_peak_and_time_errors():
    trace = SyntheticMealTrace(
        trace_id="case",
        description="Synthetic case",
        totals=MealTotals(carbs_g=50),
        expected_peak_mg_dl=170,
        expected_peak_time_minutes=90,
    )

    comparison = compare_forecast_to_trace(_forecast(peak=185, peak_time=110), trace)

    assert comparison.peak_error_mg_dl == 15
    assert comparison.time_error_minutes == 20
    assert comparison.status == "within_fixture_tolerance"
    assert comparison.safety_notice == SYNTHETIC_ONLY_NOTICE


def test_run_calibration_suite_reports_mae_and_comparisons():
    traces = [
        SyntheticMealTrace("a", "A", MealTotals(carbs_g=10), 120, 60),
        SyntheticMealTrace("b", "B", MealTotals(carbs_g=20), 140, 80),
        SyntheticMealTrace("c", "C", MealTotals(carbs_g=30), 160, 100),
    ]

    suite = run_calibration_suite(lambda totals: _forecast(peak=150, peak_time=90), traces)

    assert suite["source"] == "synthetic_fixture"
    assert suite["trace_count"] == 3
    assert suite["mean_absolute_peak_error_mg_dl"] == 16.67
    assert suite["mean_absolute_time_error_minutes"] == 16.67
    assert len(suite["comparisons"]) == 3


def test_synthetic_fixtures_run_against_forecast_stage():
    stage = ForecastStage(
        anchor_type="well_controlled",
        basal_mg_dl=110,
        carb_ratio=15,
        insulin_sensitivity=40,
        fat_delay_hours=3.0,
        exercise_drop_factor=1.0,
    )

    suite = run_calibration_suite(stage.forecast)

    assert suite["trace_count"] >= 3
    assert "mean_absolute_peak_error_mg_dl" in suite
    assert "mean_absolute_time_error_minutes" in suite
    assert all("peak_error_mg_dl" in c for c in suite["comparisons"])
    assert all("time_error_minutes" in c for c in suite["comparisons"])


def test_render_calibration_suite_markdown_is_synthetic_and_non_clinical():
    suite = run_calibration_suite(lambda totals: _forecast(peak=150, peak_time=90), SYNTHETIC_TRACE_FIXTURES[:3])
    report = render_calibration_suite_markdown(suite)

    assert "Synthetic Forecast Calibration Harness" in report
    assert "Peak MAE" in report
    assert "Time-to-peak MAE" in report
    assert "not clinical validation" in report

    forbidden = ["dose", "bolus", "insulin", "treatment recommendation", "clinically validated"]
    lower = report.lower()
    for term in forbidden:
        assert term not in lower
