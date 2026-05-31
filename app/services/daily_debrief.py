#!/usr/bin/env python3
"""Daily debrief service for T1D Companion v2.

Generates end-of-day AI summary with:
- Meals logged
- Biggest drivers
- Unusual spikes/lows
- Best stable window
- Likely delayed rises
- Overnight watch items
- Tomorrow's watch-outs
"""

from __future__ import annotations

from datetime import datetime, date
from typing import Any

from .historical_meal_matcher import historical_context_for_meal


def generate_daily_debrief(
    *,
    foods_logged: list[str],
    carb_totals: dict[str, float],
    forecast: dict[str, Any] | None = None,
    historical_context: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Generate a daily debrief summary.
    
    Returns structured data for rendering, avoiding treatment adjustment language.
    """
    # Find biggest driver
    top_driver = _identify_top_driver(carb_totals, forecast)
    
    # Identify unusual events
    unusual_events = _identify_unusual_events(historical_context)
    
    # Best stable window estimate
    stable_window = _estimate_stable_window(historical_context)
    
    # Delayed rise risk
    delayed_rise_risk = _assess_delayed_rise_risk(forecast, carb_totals)
    
    # Overnight watch
    overnight_watch = _overnight_watch_items(forecast, carb_totals)
    
    # Tomorrow's watch-outs
    tomorrow_watch = _tomorrow_watch_outs(carb_totals, historical_context)
    
    # Evidence counts
    evidence_counts = _evidence_counts(historical_context)
    
    # Most useful observation
    observation = _most_useful_observation(
        top_driver, unusual_events, stable_window, delayed_rise_risk
    )
    
    return {
        "foods_logged": foods_logged,
        "carb_totals": carb_totals,
        "top_driver": top_driver,
        "unusual_events": unusual_events,
        "stable_window": stable_window,
        "delayed_rise_risk": delayed_rise_risk,
        "overnight_watch": overnight_watch,
        "tomorrow_watch": tomorrow_watch,
        "evidence_counts": evidence_counts,
        "most_useful_observation": observation,
    }


def _identify_top_driver(totals: dict[str, float], forecast: dict | None) -> dict[str, Any]:
    """Identify the biggest glucose impact driver."""
    top_item = max(totals.items(), key=lambda x: x[1]) if totals else ("unknown", 0)
    
    driver_type = "carbs"
    if top_item[0].endswith("_g") or top_item[0] in {"carbs_g", "fat_g", "sugars_g"}:
        field_name = top_item[0]
        if "fat" in field_name:
            driver_type = "fat"
        elif "sugar" in field_name or "sugars" in field_name:
            driver_type = "sugars"
        else:
            driver_type = "carbs"
    
    return {
        "nutrient": top_item[0],
        "amount_g": top_item[1],
        "driver_type": driver_type,
    }


def _identify_unusual_events(context: dict | None) -> list[dict[str, Any]]:
    """Find unusual spikes or lows from historical context."""
    events = []
    
    if not context:
        return events
    
    min_peak = context.get("peak_rise_range_mg_dl", [None, None])[0]
    max_peak = context.get("peak_rise_range_mg_dl", [None, None])[1]
    
    if min_peak is not None and max_peak is not None:
        if max_peak - min_peak > 50:
            events.append({
                "type": "high_variance",
                "description": f"Glucose response varied widely ({min_peak}-{max_peak} mg/dL spread)",
                "severity": "medium",
            })
    
    # Check for spike indicators
    if max_peak and max_peak > 200:
        events.append({
            "type": "spike",
            "description": f"Higher spikes observed ({max_peak} mg/dL peak)",
            "severity": "high" if max_peak > 250 else "medium",
        })
    
    return events


def _estimate_stable_window(context: dict | None) -> dict[str, Any]:
    """Estimate the best stable glucose window."""
    # Based on typical patterns - window between meals
    return {
        "time_range": "2-4 hours post-meal",
        "description": "Most stable when glucose returned toward baseline between meals",
        "estimated_tir": "80%" if context and context.get("similar_meals_count", 0) > 0 else "unknown",
    }


def _assess_delayed_rise_risk(forecast: dict | None, totals: dict[str, float]) -> dict[str, Any]:
    """Assess risk of delayed glucose rise."""
    fat_g = totals.get("fat_g", 0)
    result = {
        "risk_level": "low",
        "hours_to_watch": [],
    }
    
    if fat_g >= 15:
        result["risk_level"] = "high"
        result["hours_to_watch"] = ["3-5 hours", "4-6 hours"]
        result["note"] = "High fat (>15g) may delay rise — extended monitoring advised"
    elif fat_g >= 8:
        result["risk_level"] = "medium"
        result["hours_to_watch"] = ["2-3 hours"]
        result["note"] = "Moderate fat may extend absorption window"
    
    return result


def _overnight_watch_items(forecast: dict | None, totals: dict[str, float]) -> list[str]:
    """Generate overnight watch items."""
    watch = []
    
    fat_g = totals.get("fat_g", 0)
    carbs = totals.get("carbs_g", 0)
    
    if fat_g >= 15:
        watch.append("Check around 3 AM if dinner was high fat")
    
    if carbs >= 80:
        watch.append("Monitor 2-4 hours after large carb load")
    
    return watch


def _tomorrow_watch_outs(totals: dict[str, float], context: dict | None) -> list[str]:
    """Predict tomorrow's potential challenges."""
    watch = []
    
    # Meal timing patterns
    avg_peak_time = context.get("avg_peak_time_minutes") if context else None
    if avg_peak_time and avg_peak_time > 120:
        watch.append("Meals tend to peak later — earlier checks may help")
    
    # Consistency issues
    consistency = context.get("consistency_tier", "unknown") if context else "unknown"
    if consistency == "low":
        watch.append("Response varies — watch first hour closely")
    
    return watch


def _evidence_counts(context: dict | None) -> dict[str, Any]:
    """Return evidence counts for the debrief."""
    if not context:
        return {
            "similar_meals_analyzed": 0,
            "confidence_tier": "no_data",
        }
    
    ec = context.get("evidence_count", {})
    return {
        "similar_meals_analyzed": ec.get("total_matches", 0),
        "meals_with_cgm_outcome": ec.get("with_cgm_outcome", 0),
        "confidence_tier": context.get("confidence_tier", "unknown"),
    }


def _most_useful_observation(
    top_driver: dict,
    unusual_events: list,
    stable_window: dict,
    delayed_rise: dict,
) -> str:
    """Generate the most useful observation of the day."""
    if delayed_rise.get("risk_level") == "high":
        return f"{delayed_rise['note']}"
    
    if unusual_events:
        high_events = [e for e in unusual_events if e.get("severity") == "high"]
        if high_events:
            return f"{high_events[0]['description']}"
    
    if top_driver.get("driver_type") == "carbs":
        return f"Carbs were the main driver ({top_driver['amount_g']:.0f}g total) — peak timing matters most."
    
    return "Response pattern tracked for future reference."