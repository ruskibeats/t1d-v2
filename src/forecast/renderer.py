#!/usr/bin/env python3
"""Forecast rendering — multi-format output for glucose forecasts."""

from __future__ import annotations

import json
from typing import Any


def render_forecast(forecast: Any, format: str = "text", historical_timeline: list[dict] | None = None) -> str:
    """Render a glucose forecast in the specified format.

    Args:
        forecast: ForecastResult object
        format: Output format — "text" (ASCII), "json", "markdown"
        historical_timeline: Optional historical comparison data

    Returns:
        Rendered string in the requested format
    """
    if format == "json":
        return _render_json(forecast)
    if format == "markdown":
        return _render_markdown(forecast, historical_timeline)
    return _render_text(forecast, historical_timeline)


def _render_text(forecast: Any, historical_timeline: list[dict] | None = None) -> str:
    """Render an ASCII graph of forecast glucose over time."""
    lines = []
    lines.append("\n📈 Glucose Forecast (1-4 hours post-meal)")
    lines.append("─" * 50)

    if not forecast or not forecast.forecast_points:
        lines.append("  (No forecast data available)")
        return "\n".join(lines)

    baseline = forecast.baseline_mg_dl
    peak = forecast.peak_mg_dl

    points = [p for p in forecast.forecast_points if 1 <= p.hour <= 4]
    if not points:
        lines.append("  (No forecast points for 1-4 hour window)")
        return "\n".join(lines)

    chart_width = 30
    max_val = max(peak, baseline + 50)
    min_val = max(50, baseline - 20)
    range_val = max_val - min_val

    for pt in points:
        hr = pt.hour
        g = pt.glucose_mg_dl

        hist_rise = None
        if historical_timeline:
            for ht in historical_timeline:
                if ht["hours_after_meal"] == hr:
                    hist_rise = ht["avg_glucose_rise_mgdl"]
                    break

        pos = int((g - min_val) / range_val * chart_width) if range_val > 0 else chart_width // 2
        pos = max(0, min(chart_width, pos))

        bar = "█" * pos + "▌" + "─" * (chart_width - pos)
        hist_str = f" | hist curve +{int(hist_rise)} mg/dL" if hist_rise else ""
        lines.append(f"  {hr}hr: {g:3.0f} mg/dL |{bar}|{hist_str}")

    lines.append(f"  {'baseline':7} |{baseline} mg/dL")
    lines.append(f"  {'predicted peak':7} |{peak} mg/dL @ {forecast.peak_time_minutes} min")
    if getattr(forecast, "uncertainty_band", None):
        band = forecast.uncertainty_band
        lines.append(
            f"  {'forecast range':7} |{band.peak_range_mg_dl[0]}–{band.peak_range_mg_dl[1]} mg/dL "
            f"@ {band.peak_time_range_minutes[0]}–{band.peak_time_range_minutes[1]} min"
        )

    lines.append("─" * 50)
    lines.append("  (Educational simulation only — actual results vary)")

    return "\n".join(lines)


def _render_json(forecast: Any) -> str:
    """Render forecast as compact JSON."""
    data = {
        "baseline_mg_dl": forecast.baseline_mg_dl,
        "peak_mg_dl": forecast.peak_mg_dl,
        "peak_time_minutes": forecast.peak_time_minutes,
        "forecast_points": [
            {"hour": p.hour, "glucose_mg_dl": p.glucose_mg_dl}
            for p in (forecast.forecast_points or [])
        ],
    }
    if getattr(forecast, "uncertainty_band", None):
        band = forecast.uncertainty_band
        data["uncertainty_band"] = {
            "peak_range_mg_dl": list(band.peak_range_mg_dl),
            "peak_time_range_minutes": list(band.peak_time_range_minutes),
        }
    return json.dumps(data, indent=2)


def _render_markdown(forecast: Any, historical_timeline: list[dict] | None = None) -> str:
    """Render forecast as Markdown table."""
    lines = []
    lines.append("## Glucose Forecast 📈\n")

    if not forecast or not forecast.forecast_points:
        lines.append("*No forecast data available.*")
        return "\n".join(lines)

    lines.append("| Hour | Glucose (mg/dL) | Change |")
    lines.append("|------|-----------------|--------|")

    baseline = forecast.baseline_mg_dl
    for pt in forecast.forecast_points:
        if 1 <= pt.hour <= 4:
            delta = pt.glucose_mg_dl - baseline
            delta_str = f"+{delta}" if delta >= 0 else f"{delta}"
            hist_note = ""
            if historical_timeline:
                for ht in historical_timeline:
                    if ht["hours_after_meal"] == pt.hour:
                        hist_note = f" (hist: +{int(ht['avg_glucose_rise_mgdl'])} mg/dL)"
                        break
            lines.append(f"| {pt.hour}hr | {pt.glucose_mg_dl} | {delta_str} mg/dL{hist_note} |")

    lines.append(f"\n**Peak:** {forecast.peak_mg_dl} mg/dL at {forecast.peak_time_minutes} minutes")
    if getattr(forecast, "uncertainty_band", None):
        band = forecast.uncertainty_band
        lines.append(
            f"**Range:** {band.peak_range_mg_dl[0]}–{band.peak_range_mg_dl[1]} mg/dL "
            f"@ {band.peak_time_range_minutes[0]}–{band.peak_time_range_minutes[1]} min"
        )

    lines.append("\n> ⚠️ Educational simulation only — actual results vary")
    return "\n".join(lines)


# Backward-compatible re-export
def build_historical_timeline(summary: Any) -> list[dict[str, Any]]:
    """Build time-relative glucose points from historical meal matches."""
    if not summary or not getattr(summary, "matches_found", None) or not getattr(summary, "avg_peak_delta_mgdl", None):
        return []

    peak_min = summary.avg_peak_time_minutes or 90
    peak_hr = peak_min / 60

    timeline = []
    for hour_offset in [1, 2, 3, 4]:
        if hour_offset >= peak_hr:
            ratio = max(0, 1 - (hour_offset - peak_hr) / (peak_hr + 2))
        else:
            ratio = max(0, hour_offset / (peak_hr + 1))

        rise = summary.avg_peak_delta_mgdl * ratio
        timeline.append({
            "hours_after_meal": hour_offset,
            "avg_glucose_rise_mgdl": round(rise, 1),
        })

    return timeline
