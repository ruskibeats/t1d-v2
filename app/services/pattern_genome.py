"""Pattern Genome analyzer for T1D Companion v2 — Issue #21, #43.

Generates a user-specific pattern profile from 30/60/90-day food history.
Analyzes 6 trait dimensions:

  1. Breakfast spike tendency
  2. High-fat delayed rise tendency
  3. Exercise sensitivity
  4. Overnight risk
  5. Variability (consistency score)
  6. Repeat trigger foods

Each trait produces: evidence count, confidence tier, plain-language explanation,
and data_source label.

Detectors use CGM-linked glucose outcomes as the primary signal, falling back to
food-composition proxies only when no glucose data exists (Issue #43).
"""

from __future__ import annotations

import logging
from collections import Counter
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from statistics import mean, stdev
from typing import Any

logger = logging.getLogger(__name__)

# ── Data source labels (Issue #43) ──

DATA_SOURCE_REAL_CGM = "real_cgm"
DATA_SOURCE_FOOD_PROXY = "food_proxy"
DATA_SOURCE_SYNTHETIC_LEGEND = "synthetic_legend"


# ── Data shapes ──

@dataclass
class TraitInsight:
    """Single pattern trait with evidence and explanation."""
    trait_id: str
    label: str
    description: str          # plain-language explanation
    evidence_count: int       # number of data points supporting this trait
    confidence: str           # "high" | "medium" | "low"
    confidence_score: float   # 0.0–1.0
    detail: str               # specific numbers / supporting detail
    icon: str = "\U0001f9ec"
    data_source: str = ""    # "real_cgm" | "food_proxy" | "synthetic_legend"

    # Provenance fields (Issue #46)
    evidence_basis: str | None = None  # Plain text evidence description
    confidence_components: dict[str, float] | None = None  # {identity, portion, nutrition, timing}


@dataclass
class PatternGenome:
    """Full pattern genome profile for a user."""
    profile_name: str
    data_source: str                           # "synthetic_legends_demo" or "real_history"
    total_meals_analyzed: int
    analysis_window_days: int
    traits: list[TraitInsight] = field(default_factory=list)
    top_trigger_foods: list[dict[str, Any]] = field(default_factory=list)
    summary_narrative: str = ""
    disclaimer: str = "Pattern analysis from simulated history (synthetic_legends_demo). Not medical advice."


# ── Per-meal-type helpers ──

_MEAL_TYPE_ALIASES = {
    "breakfast": ["breakfast", "morning"],
    "morning_snack": ["morning_snack", "morning snack"],
    "lunch": ["lunch", "midday"],
    "afternoon_snack": ["afternoon_snack", "afternoon snack"],
    "dinner": ["dinner", "evening"],
    "evening_snack": ["evening_snack", "evening snack", "night"],
}


def _filter_by_meal_type(rows: list[dict[str, Any]], meal_type: str) -> list[dict[str, Any]]:
    """Filter food history rows by meal type (handles aliases)."""
    aliases = _MEAL_TYPE_ALIASES.get(meal_type, [meal_type])
    return [r for r in rows if r.get("meal_type", "").lower().replace(" ", "_") in aliases]


def _safe_stdev(values: list[float]) -> float:
    """Safe standard deviation (0.0 for < 2 values)."""
    return stdev(values) if len(values) > 1 else 0.0


def _safe_mean(values: list[float]) -> float:
    """Safe mean (0.0 for empty list)."""
    return mean(values) if values else 0.0


def _confidence_tier(score: float) -> str:
    if score >= 0.8:
        return "high"
    if score >= 0.5:
        return "medium"
    return "low"


def _parse_timestamp(ts: Any) -> datetime | None:
    """Parse an ISO timestamp string to datetime (UTC)."""
    if isinstance(ts, datetime):
        return ts.replace(tzinfo=timezone.utc) if ts.tzinfo is None else ts
    if not isinstance(ts, str):
        return None
    try:
        dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
        return dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else dt
    except (ValueError, TypeError):
        return None


def _readings_in_window(
    readings: list[dict[str, Any]],
    start: datetime,
    end: datetime,
) -> list[dict[str, Any]]:
    """Return glucose readings whose timestamp falls in [start, end)."""
    result = []
    for r in readings:
        ts = _parse_timestamp(r.get("timestamp") or r.get("measured_at"))
        if ts and start <= ts < end:
            result.append(r)
    return result


def _peak_glucose(readings: list[dict[str, Any]]) -> float:
    """Peak glucose value from a list of readings (mg/dL)."""
    vals = [r.get("value", 0) for r in readings if r.get("value") is not None]
    return max(vals) if vals else 0.0


def _mean_glucose(readings: list[dict[str, Any]]) -> float:
    """Mean glucose value from a list of readings."""
    vals = [r.get("value", 0) for r in readings if r.get("value") is not None]
    return _safe_mean(vals)


def _has_glucose_data(readings: list[dict[str, Any]], min_readings: int = 3) -> bool:
    """Check if there are enough glucose readings for analysis."""
    return len([r for r in readings if r.get("value") is not None]) >= min_readings


def _assign_data_source(anchor_type: str, has_glucose: bool) -> str:
    """Determine the data_source label for a TraitInsight.

    For synthetic legend anchors -> "synthetic_legend".
    For real data with glucose -> "real_cgm".
    For real data without glucose -> "food_proxy".
    """
    if anchor_type:
        return DATA_SOURCE_SYNTHETIC_LEGEND
    if has_glucose:
        return DATA_SOURCE_REAL_CGM
    return DATA_SOURCE_FOOD_PROXY


# ── Trait analyzers (Issue #43: glucose-first, food-fallback) ──

def _analyze_breakfast_spike(
    rows: list[dict[str, Any]],
    anchor_type: str,
    glucose_readings: list[dict[str, Any]] | None = None,
) -> TraitInsight:
    """Analyze breakfast spike tendency — glucose-first, food-fallback (Issue #43).

    Primary: use post-breakfast CGM peaks to detect spike magnitude and timing.
    Fallback: use breakfast sugar content as proxy when no CGM data exists.
    """
    breakfast = _filter_by_meal_type(rows, "breakfast")
    if not breakfast:
        return TraitInsight(
            trait_id="breakfast_spike",
            label="Breakfast Spike",
            description="Insufficient breakfast history to determine pattern.",
            evidence_count=0, confidence="low", confidence_score=0.0,
            detail="No breakfast meals found in history.", icon="\U0001f373",
            data_source=_assign_data_source(anchor_type, False),
        )

    cgm = glucose_readings or []
    has_glucose = _has_glucose_data(cgm)
    data_source = _assign_data_source(anchor_type, has_glucose)

    # -- Glucose-primary path: post-breakfast CGM peaks --
    if has_glucose:
        peaks: list[float] = []
        time_to_peaks: list[float] = []

        for meal in breakfast:
            meal_ts = _parse_timestamp(meal.get("timestamp"))
            if not meal_ts:
                continue
            window = _readings_in_window(cgm, meal_ts, meal_ts + timedelta(hours=3))
            if not window:
                continue
            peak_val = _peak_glucose(window)
            peaks.append(peak_val)
            peak_reading = max(window, key=lambda r: r.get("value", 0) or 0)
            peak_ts = _parse_timestamp(peak_reading.get("timestamp") or peak_reading.get("measured_at"))
            if peak_ts:
                time_to_peaks.append((peak_ts - meal_ts).total_seconds() / 60)

        if peaks:
            avg_peak = _safe_mean(peaks)
            avg_ttp = _safe_mean(time_to_peaks) if time_to_peaks else 0
            evidence = len(peaks)
            high_peak_pct = len([p for p in peaks if p > 180]) / len(peaks)
            is_spike_prone = avg_peak > 160 or high_peak_pct > 0.5 or avg_ttp < 45
            conf_score = min(1.0, (evidence / 20) * 0.4 + (high_peak_pct) * 0.3 +
                             (0.3 if avg_ttp < 45 else 0.1))

            if is_spike_prone:
                desc = (f"Your post-breakfast glucose tends to spike — "
                        f"avg peak {avg_peak:.0f} mg/dL, "
                        f"reaching peak in ~{avg_ttp:.0f} min. "
                        f"Fast morning rises may need earlier monitoring.")
            else:
                desc = (f"Your post-breakfast glucose response is moderate — "
                        f"avg peak {avg_peak:.0f} mg/dL, "
                        f"peak at ~{avg_ttp:.0f} min.")
            detail = (f"{evidence} post-breakfast CGM windows analyzed. "
                      f"Avg peak: {avg_peak:.0f} mg/dL, "
                      f"avg time-to-peak: {avg_ttp:.0f} min. "
                      f"{high_peak_pct:.0%} of windows exceeded 180 mg/dL.")
            return TraitInsight(
                trait_id="breakfast_spike", label="Breakfast Spike Tendency",
                description=desc, evidence_count=evidence,
                confidence=_confidence_tier(conf_score), confidence_score=round(conf_score, 3),
                detail=detail, icon="\U0001f373", data_source=data_source,
            )

    # -- Food-proxy fallback: sugar content --
    sugars = [r["sugars_g"] for r in breakfast if r.get("sugars_g", 0) > 0]
    carbs = [r["carb_estimate_g"] for r in breakfast if r.get("carb_estimate_g", 0) > 0]
    avg_sugar = _safe_mean(sugars)
    avg_carbs = _safe_mean(carbs)
    high_sugar_pct = len([s for s in sugars if s > 15]) / max(len(sugars), 1)

    is_spike_prone = avg_sugar > 12 or high_sugar_pct > 0.5
    sugar_to_carb_ratio = avg_sugar / max(avg_carbs, 1)
    evidence = len(breakfast)
    conf_score = min(1.0, (evidence / 20) * 0.5 + (sugar_to_carb_ratio) * 0.5)

    if is_spike_prone:
        desc = (f"Your breakfasts tend to spike quickly — average {avg_sugar:.0f}g sugars "
                f"({sugar_to_carb_ratio:.0%} of carbs are sugars). "
                f"Fast carbs in the morning may push glucose up faster than other meals.")
        detail = (f"{evidence} breakfast meals analyzed (food proxy). "
                  f"Avg sugar: {avg_sugar:.0f}g, avg carbs: {avg_carbs:.0f}g. "
                  f"{high_sugar_pct:.0%} of breakfasts have >15g sugar.")
    else:
        desc = (f"Your breakfasts show moderate sugar content — average {avg_sugar:.0f}g sugars "
                f"({sugar_to_carb_ratio:.0%} of carbs). "
                f"Morning glucose rise may be more gradual.")
        detail = (f"{evidence} breakfast meals analyzed (food proxy). "
                  f"Avg sugar: {avg_sugar:.0f}g, avg carbs: {avg_carbs:.0f}g.")

    return TraitInsight(
        trait_id="breakfast_spike", label="Breakfast Spike Tendency",
        description=desc, evidence_count=evidence,
        confidence=_confidence_tier(conf_score), confidence_score=round(conf_score, 3),
        detail=detail, icon="\U0001f373", data_source=data_source,
    )


def _analyze_fat_delay_tendency(
    rows: list[dict[str, Any]],
    anchor_type: str,
    glucose_readings: list[dict[str, Any]] | None = None,
) -> TraitInsight:
    """Analyze high-fat delayed rise tendency — glucose-first, food-fallback (Issue #43).

    Primary: use post-dinner glucose curves to detect delayed peaks (>90 min).
    Fallback: use dinner fat content as proxy.
    """
    dinner = _filter_by_meal_type(rows, "dinner")

    if not dinner:
        return TraitInsight(
            trait_id="fat_delay", label="Fat Delay",
            description="Insufficient dinner history to determine fat delay pattern.",
            evidence_count=0, confidence="low", confidence_score=0.0,
            detail="No dinner meals found.", icon="\U0001f9c8",
            data_source=_assign_data_source(anchor_type, False),
        )

    cgm = glucose_readings or []
    has_glucose = _has_glucose_data(cgm)
    data_source = _assign_data_source(anchor_type, has_glucose)

    # -- Glucose-primary path: post-dinner delayed peaks --
    if has_glucose:
        delayed_peaks: list[float] = []
        time_to_peaks: list[float] = []

        for meal in dinner:
            meal_ts = _parse_timestamp(meal.get("timestamp"))
            if not meal_ts:
                continue
            window = _readings_in_window(cgm, meal_ts, meal_ts + timedelta(hours=5))
            if len(window) < 2:
                continue
            peak_reading = max(window, key=lambda r: r.get("value", 0) or 0)
            peak_ts = _parse_timestamp(peak_reading.get("timestamp") or peak_reading.get("measured_at"))
            if not peak_ts:
                continue
            ttp = (peak_ts - meal_ts).total_seconds() / 60
            if ttp > 90:
                delayed_peaks.append(peak_reading.get("value", 0))
                time_to_peaks.append(ttp)

        if delayed_peaks:
            avg_delay_peak = _safe_mean(delayed_peaks)
            avg_ttp = _safe_mean(time_to_peaks)
            evidence = len(delayed_peaks)
            delay_rate = evidence / max(len(dinner), 1)
            is_delay_prone = delay_rate > 0.3 or avg_ttp > 120
            conf_score = min(1.0, (evidence / 15) * 0.4 + (delay_rate) * 0.3 +
                             (min(avg_ttp, 300) / 300) * 0.3)

            if is_delay_prone:
                desc = (f"Your post-dinner glucose shows delayed peaking — "
                        f"avg peak at {avg_ttp:.0f} min, avg peak {avg_delay_peak:.0f} mg/dL. "
                        f"{delay_rate:.0%} of dinners show peaks past 90 min.")
            else:
                desc = (f"Your post-dinner glucose peaks are mostly within the standard window — "
                        f"avg peak at {avg_ttp:.0f} min.")
            detail = (f"{evidence} post-dinner CGM windows with delayed peak. "
                      f"Avg time-to-peak: {avg_ttp:.0f} min, avg peak: {avg_delay_peak:.0f} mg/dL.")
            return TraitInsight(
                trait_id="fat_delay", label="High-Fat Delayed Rise",
                description=desc, evidence_count=evidence,
                confidence=_confidence_tier(conf_score), confidence_score=round(conf_score, 3),
                detail=detail, icon="\U0001f9c8", data_source=data_source,
            )

    # -- Food-proxy fallback: dinner fat content --
    fats = [r["fat_g"] for r in dinner if r.get("fat_g", 0) > 0]
    avg_fat = _safe_mean(fats)
    high_fat_count = len([f for f in fats if f > 20])
    high_fat_pct = high_fat_count / max(len(fats), 1)
    evidence = len(dinner)

    is_delay_prone = avg_fat > 18 or high_fat_pct > 0.4
    conf_score = min(1.0, (evidence / 20) * 0.4 + (high_fat_pct) * 0.3 + (avg_fat / 50) * 0.3)

    if is_delay_prone:
        desc = (f"Your dinners tend to be higher in fat (avg {avg_fat:.0f}g). "
                f"Fat can delay glucose peak by 1–3 hours. "
                f"Watch the 3–5 hour window after dinner, not just the first 2 hours.")
        detail = (f"{evidence} dinner meals (food proxy). Avg fat: {avg_fat:.0f}g. "
                  f"{high_fat_pct:.0%} of dinners have >20g fat.")
    else:
        desc = (f"Your dinners are relatively moderate in fat (avg {avg_fat:.0f}g). "
                f"Delayed rises are less likely — the standard 1–3 hour monitoring window applies.")
        detail = (f"{evidence} dinner meals (food proxy). Avg fat: {avg_fat:.0f}g.")

    return TraitInsight(
        trait_id="fat_delay", label="High-Fat Delayed Rise",
        description=desc, evidence_count=evidence,
        confidence=_confidence_tier(conf_score), confidence_score=round(conf_score, 3),
        detail=detail, icon="\U0001f9c8", data_source=data_source,
    )


def _analyze_exercise_sensitivity(
    rows: list[dict[str, Any]],
    anchor_type: str,
    glucose_readings: list[dict[str, Any]] | None = None,
    activity_events: list[dict[str, Any]] | None = None,
) -> TraitInsight:
    """Analyze exercise sensitivity — glucose-first, food-fallback (Issue #43).

    Primary: compare glucose responses on activity days vs rest days.
    Fallback: use afternoon carb variability as proxy.
    """
    cgm = glucose_readings or []
    activity = activity_events or []
    has_glucose = _has_glucose_data(cgm)
    data_source = _assign_data_source(anchor_type, has_glucose)

    # -- Glucose-primary path: activity-day vs rest-day glucose --
    if has_glucose and activity:
        activity_dates: set[str] = set()
        for evt in activity:
            ts = _parse_timestamp(evt.get("timestamp") or evt.get("measured_at"))
            if ts:
                activity_dates.add(ts.strftime("%Y-%m-%d"))

        if activity_dates:
            afternoon_readings = []
            for r in cgm:
                ts = _parse_timestamp(r.get("timestamp") or r.get("measured_at"))
                if ts and 12 <= ts.hour <= 22 and r.get("value") is not None:
                    afternoon_readings.append((r, ts.strftime("%Y-%m-%d")))

            activity_day_vals = [r["value"] for r, d in afternoon_readings if d in activity_dates]
            rest_day_vals = [r["value"] for r, d in afternoon_readings if d not in activity_dates]

            if activity_day_vals and rest_day_vals:
                avg_activity = _safe_mean(activity_day_vals)
                avg_rest = _safe_mean(rest_day_vals)
                std_activity = _safe_stdev(activity_day_vals)
                evidence = len(activity_day_vals) + len(rest_day_vals)
                cv_activity = std_activity / max(avg_activity, 1)
                diff = avg_rest - avg_activity

                is_variable = abs(diff) > 15 or cv_activity > 0.35
                conf_score = min(1.0, (evidence / 40) * 0.4 + (min(abs(diff), 50) / 50) * 0.3 +
                                 (cv_activity) * 0.3)

                if is_variable:
                    direction = "lower" if diff > 0 else "higher"
                    desc = (f"Your glucose on activity days tends to be {direction} "
                            f"({avg_activity:.0f} vs {avg_rest:.0f} mg/dL on rest days). "
                            f"This may reflect exercise-linked glucose changes.")
                else:
                    desc = (f"Similar glucose patterns on activity and rest days "
                            f"({avg_activity:.0f} vs {avg_rest:.0f} mg/dL). "
                            f"Exercise impact on glucose appears limited in your data.")
                detail = (f"{len(activity_day_vals)} activity-day readings, "
                          f"{len(rest_day_vals)} rest-day readings. "
                          f"Activity-day avg: {avg_activity:.0f} mg/dL, rest-day: {avg_rest:.0f} mg/dL.")
                return TraitInsight(
                    trait_id="exercise_sensitivity", label="Exercise Sensitivity",
                    description=desc, evidence_count=evidence,
                    confidence=_confidence_tier(conf_score), confidence_score=round(conf_score, 3),
                    detail=detail, icon="\U0001f3c3", data_source=data_source,
                )

    # -- Food-proxy fallback: afternoon carb variability --
    afternoon = _filter_by_meal_type(rows, "afternoon_snack")
    dinner = _filter_by_meal_type(rows, "dinner")
    combined = afternoon + dinner

    if not combined:
        return TraitInsight(
            trait_id="exercise_sensitivity", label="Exercise Sensitivity",
            description="Insufficient data to determine exercise-glucose relationship.",
            evidence_count=0, confidence="low", confidence_score=0.0,
            detail="No afternoon meals found.", icon="\U0001f3c3",
            data_source=data_source,
        )

    carbs = [r["carb_estimate_g"] for r in combined if r.get("carb_estimate_g", 0) > 0]
    avg_carbs = _safe_mean(carbs)
    carb_std = _safe_stdev(carbs)
    evidence = len(combined)
    cv = carb_std / max(avg_carbs, 1)
    is_variable = cv > 0.35
    conf_score = min(1.0, (evidence / 15) * 0.5 + (cv) * 0.5)

    if is_variable:
        desc = (f"Your afternoon/dinner carb intake varies significantly (CV: {cv:.0%}). "
                f"This may reflect activity-day eating patterns. "
                f"Consider how exercise timing relates to your meals.")
        detail = (f"{evidence} meals analyzed (food proxy). "
                  f"Avg carbs: {avg_carbs:.0f}g, std dev: {carb_std:.0f}g (CV: {cv:.0%}).")
    else:
        desc = (f"Your afternoon/dinner carb intake is relatively consistent (CV: {cv:.0%}). "
                f"Exercise-related glucose swings may be more predictable.")
        detail = (f"{evidence} meals analyzed (food proxy). "
                  f"Avg carbs: {avg_carbs:.0f}g, CV: {cv:.0%}.")

    return TraitInsight(
        trait_id="exercise_sensitivity", label="Exercise Sensitivity",
        description=desc, evidence_count=evidence,
        confidence=_confidence_tier(conf_score), confidence_score=round(conf_score, 3),
        detail=detail, icon="\U0001f3c3", data_source=data_source,
    )


def _analyze_overnight_risk(
    rows: list[dict[str, Any]],
    anchor_type: str,
    glucose_readings: list[dict[str, Any]] | None = None,
) -> TraitInsight:
    """Analyze overnight risk — glucose-first, food-fallback (Issue #43).

    Primary: analyze overnight glucose patterns (11 PM - 6 AM) post-dinner.
    Fallback: use evening fat+carb content as proxy.
    """
    dinner = _filter_by_meal_type(rows, "dinner")
    evening = _filter_by_meal_type(rows, "evening_snack")
    combined = dinner + evening

    cgm = glucose_readings or []
    has_glucose = _has_glucose_data(cgm)
    data_source = _assign_data_source(anchor_type, has_glucose)

    # -- Glucose-primary path: overnight glucose patterns --
    if has_glucose:
        overnight_lows: list[float] = []
        overnight_highs: list[float] = []
        overnight_nights = 0

        by_date: dict[str, list[dict]] = {}
        for r in cgm:
            ts = _parse_timestamp(r.get("timestamp") or r.get("measured_at"))
            if ts and r.get("value") is not None:
                day_key = (ts - timedelta(hours=6)).strftime("%Y-%m-%d")
                by_date.setdefault(day_key, []).append(r)

        for day_key, day_readings in by_date.items():
            night_readings = []
            for r in day_readings:
                rts = _parse_timestamp(r.get("timestamp") or r.get("measured_at"))
                if rts:
                    h = rts.hour
                    if h >= 23 or h < 6:
                        night_readings.append(r)
            if night_readings:
                overnight_nights += 1
                vals = [r["value"] for r in night_readings]
                low = min(vals)
                high = max(vals)
                if low < 70:
                    overnight_lows.append(low)
                if high > 180:
                    overnight_highs.append(high)

        if overnight_nights > 0:
            low_rate = len(overnight_lows) / overnight_nights
            high_rate = len(overnight_highs) / overnight_nights
            evidence = overnight_nights
            conf_score = min(1.0, (evidence / 20) * 0.5 + (low_rate + high_rate) * 0.25)

            if low_rate > 0.3:
                desc = (f"Overnight lows detected on {low_rate:.0%} of nights analyzed. "
                        f"Keep a snack by the bed and consider setting an overnight alert.")
            elif high_rate > 0.3:
                desc = (f"Overnight highs detected on {high_rate:.0%} of nights. "
                        f"This may indicate delayed dinner absorption — check 3-5 hrs after dinner.")
            else:
                desc = (f"Overnight glucose is mostly stable across {overnight_nights} nights. "
                        f"Standard overnight monitoring is sufficient.")
            detail = (f"{overnight_nights} nights analyzed. "
                      f"Low rate (<70): {low_rate:.0%}, high rate (>180): {high_rate:.0%}.")
            return TraitInsight(
                trait_id="overnight_risk", label="Overnight Risk",
                description=desc, evidence_count=evidence,
                confidence=_confidence_tier(conf_score), confidence_score=round(conf_score, 3),
                detail=detail, icon="\U0001f319", data_source=data_source,
            )

    # -- Food-proxy fallback: evening fat+carb content --
    if not combined:
        return TraitInsight(
            trait_id="overnight_risk", label="Overnight Risk",
            description="Insufficient evening meal data to assess overnight risk.",
            evidence_count=0, confidence="low", confidence_score=0.0,
            detail="No dinner/evening meals found.", icon="\U0001f319",
            data_source=data_source,
        )

    fats = [r["fat_g"] for r in combined if r.get("fat_g", 0) > 0]
    carbs = [r["carb_estimate_g"] for r in combined if r.get("carb_estimate_g", 0) > 0]
    avg_fat = _safe_mean(fats)
    avg_carbs = _safe_mean(carbs)
    evidence = len(combined)

    high_risk_meals = len([r for r in combined
                          if r.get("fat_g", 0) > 20 and r.get("carb_estimate_g", 0) > 50])
    low_risk_meals = len([r for r in combined
                         if r.get("carb_estimate_g", 0) < 30])
    risk_ratio = high_risk_meals / max(evidence, 1)

    conf_score = min(1.0, (evidence / 20) * 0.5 + (risk_ratio) * 0.3 + (avg_fat / 50) * 0.2)

    if risk_ratio > 0.3:
        desc = (f"Your evening meals are often high in both fat and carbs. "
                f"This combination can cause a delayed rise that peaks overnight. "
                f"Consider setting an alert for 3-5 hours after dinner.")
        detail = (f"{evidence} evening meals (food proxy). "
                  f"{high_risk_meals} ({risk_ratio:.0%}) are high-fat+high-carb. "
                  f"Avg fat: {avg_fat:.0f}g, avg carbs: {avg_carbs:.0f}g.")
    elif low_risk_meals > evidence * 0.5:
        desc = (f"Your dinners tend to be lighter (avg {avg_carbs:.0f}g carbs). "
                f"Overnight lows are possible if you take insulin — keep a snack by the bed.")
        detail = (f"{evidence} evening meals (food proxy). "
                  f"{low_risk_meals} ({low_risk_meals / max(evidence, 1):.0%}) have <30g carbs. "
                  f"Avg carbs: {avg_carbs:.0f}g.")
    else:
        desc = (f"Your evening meals are moderate (avg {avg_carbs:.0f}g carbs, {avg_fat:.0f}g fat). "
                f"Standard overnight monitoring (check at 3 AM) is recommended.")
        detail = (f"{evidence} evening meals (food proxy). "
                  f"Avg carbs: {avg_carbs:.0f}g, avg fat: {avg_fat:.0f}g.")

    return TraitInsight(
        trait_id="overnight_risk", label="Overnight Risk",
        description=desc, evidence_count=evidence,
        confidence=_confidence_tier(conf_score), confidence_score=round(conf_score, 3),
        detail=detail, icon="\U0001f319", data_source=data_source,
    )


def _analyze_variability(
    rows: list[dict[str, Any]],
    anchor_type: str,
    glucose_readings: list[dict[str, Any]] | None = None,
) -> TraitInsight:
    """Analyze glucose variability — glucose-first, food-fallback (Issue #43).

    Primary: compute glucose outcome variability (CGM readings).
    Fallback: use carb intake variability as proxy.
    """
    cgm = glucose_readings or []
    has_glucose = _has_glucose_data(cgm)
    data_source = _assign_data_source(anchor_type, has_glucose)

    # -- Glucose-primary path: glucose outcome variability --
    if has_glucose:
        vals = [r["value"] for r in cgm if r.get("value") is not None]
        if len(vals) >= 5:
            g_mean = mean(vals)
            g_std = _safe_stdev(vals)
            g_cv = g_std / max(g_mean, 1)
            evidence = len(vals)
            conf_score = min(1.0, (evidence / 100) * 0.4 + min(g_cv, 1.0) * 0.6)

            if g_cv > 0.4:
                desc = (f"Your glucose readings show high variability (CV: {g_cv:.0%}). "
                        f"Outcomes are hard to predict — consider more consistent routines.")
            elif g_cv > 0.25:
                desc = (f"Your glucose readings show moderate variability (CV: {g_cv:.0%}). "
                        f"Some predictability, but consistency could be improved.")
            else:
                desc = (f"Your glucose readings are fairly consistent (CV: {g_cv:.0%}). "
                        f"This makes outcomes more predictable.")
            detail = (f"{evidence} glucose readings. Mean: {g_mean:.0f} mg/dL, "
                      f"std dev: {g_std:.0f} mg/dL (CV: {g_cv:.0%}).")
            return TraitInsight(
                trait_id="variability", label="Glucose Variability",
                description=desc, evidence_count=evidence,
                confidence=_confidence_tier(conf_score), confidence_score=round(conf_score, 3),
                detail=detail, icon="\U0001f4ca", data_source=data_source,
            )

    # -- Food-proxy fallback: carb intake variability --
    if len(rows) < 10:
        return TraitInsight(
            trait_id="variability", label="Variability",
            description="Insufficient meal history to assess variability.",
            evidence_count=len(rows), confidence="low", confidence_score=0.0,
            detail=f"Only {len(rows)} meals in history.", icon="\U0001f4ca",
            data_source=data_source,
        )

    carbs = [r["carb_estimate_g"] for r in rows if r.get("carb_estimate_g", 0) > 0]
    if len(carbs) < 5:
        return TraitInsight(
            trait_id="variability", label="Variability",
            description="Insufficient carb data to assess variability.",
            evidence_count=len(carbs), confidence="low", confidence_score=0.0,
            detail=f"Only {len(carbs)} meals with carb data.", icon="\U0001f4ca",
            data_source=data_source,
        )

    avg = mean(carbs)
    std = _safe_stdev(carbs)
    cv = std / max(avg, 1)
    evidence = len(carbs)

    conf_score = min(1.0, (evidence / 50) * 0.4 + min(cv, 1.0) * 0.6)

    if cv > 0.4:
        desc = (f"Your carb intake is highly variable (CV: {cv:.0%}). "
                f"This makes glucose outcomes harder to predict. "
                f"Consider more consistent meal sizes or tracking patterns by day of week.")
        detail = (f"{evidence} meals (food proxy). Mean carbs: {avg:.0f}g, "
                  f"std dev: {std:.0f}g (CV: {cv:.0%}).")
    elif cv > 0.25:
        desc = (f"Your carb intake shows moderate variability (CV: {cv:.0%}). "
                f"Some predictability, but portion consistency could improve forecasts.")
        detail = (f"{evidence} meals (food proxy). Mean carbs: {avg:.0f}g, "
                  f"std dev: {std:.0f}g (CV: {cv:.0%}).")
    else:
        desc = (f"Your carb intake is fairly consistent (CV: {cv:.0%}). "
                f"This makes glucose outcomes more predictable.")
        detail = (f"{evidence} meals (food proxy). Mean carbs: {avg:.0f}g, "
                  f"std dev: {std:.0f}g (CV: {cv:.0%}).")

    return TraitInsight(
        trait_id="variability", label="Meal-to-Meal Variability",
        description=desc, evidence_count=evidence,
        confidence=_confidence_tier(conf_score), confidence_score=round(conf_score, 3),
        detail=detail, icon="\U0001f4ca", data_source=data_source,
    )


def _analyze_trigger_foods(
    rows: list[dict[str, Any]],
    anchor_type: str,
    glucose_readings: list[dict[str, Any]] | None = None,
) -> TraitInsight:
    """Identify trigger foods — glucose-outcome-first, frequency-fallback (Issue #43).

    Primary: identify foods consistently associated with out-of-range glucose outcomes.
    Fallback: use eating frequency when no CGM data exists.
    """
    foods = [r.get("food", "") for r in rows if r.get("food")]
    if not foods:
        return TraitInsight(
            trait_id="trigger_foods", label="Repeat Trigger Foods",
            description="No food names found in history.",
            evidence_count=0, confidence="low", confidence_score=0.0,
            detail="No food names in data.", icon="\U0001f37d\ufe0f",
            data_source=_assign_data_source(anchor_type, False),
        )

    counter = Counter(foods)
    most_common = counter.most_common(5)
    total_unique = len(counter)
    evidence = len(foods)

    cgm = glucose_readings or []
    has_glucose = _has_glucose_data(cgm)
    data_source = _assign_data_source(anchor_type, has_glucose)

    # -- Glucose-primary path: associate foods with out-of-range glucose --
    if has_glucose:
        food_scores: dict[str, dict] = {}
        OOR_HIGH = 180
        OOR_LOW = 70

        for meal in rows:
            food_name = meal.get("food", "")
            if not food_name:
                continue
            meal_ts = _parse_timestamp(meal.get("timestamp"))
            if not meal_ts:
                continue
            window = _readings_in_window(cgm, meal_ts, meal_ts + timedelta(hours=3))
            if not window:
                continue

            if food_name not in food_scores:
                food_scores[food_name] = {"count": 0, "oor_high": 0, "oor_low": 0}
            food_scores[food_name]["count"] += 1
            peak = _peak_glucose(window)
            if peak > OOR_HIGH:
                food_scores[food_name]["oor_high"] += 1
            vals_in_window = [r.get("value", 999) for r in window]
            low = min(v for v in vals_in_window if v is not None) if any(v is not None for v in vals_in_window) else 999
            if low < OOR_LOW:
                food_scores[food_name]["oor_low"] += 1

        if food_scores:
            trigger_list = []
            for fname, scores in food_scores.items():
                if scores["count"] < 2:
                    continue
                oor_rate = (scores["oor_high"] + scores["oor_low"]) / scores["count"]
                if oor_rate > 0.3:
                    trigger_list.append((fname, scores["count"], oor_rate))

            trigger_list.sort(key=lambda x: x[2], reverse=True)
            evidence = sum(s["count"] for s in food_scores.values())
            conf_score = min(1.0, (evidence / 50) * 0.3 + (len(trigger_list) / 5) * 0.3 +
                             (0.4 if trigger_list else 0.1))

            if trigger_list:
                trigger_str = ", ".join(
                    f"{name} ({count}x, {rate:.0%} OOR)" for name, count, rate in trigger_list[:3])
                desc = (f"Foods associated with out-of-range glucose: {trigger_str}. "
                        f"These consistently link to glucose outside target range.")
            else:
                desc = ("No single food is consistently associated with out-of-range glucose "
                        "outcomes. Your glucose response to repeated foods appears stable.")
            detail = (f"{evidence} meal-glucose windows analyzed across {len(food_scores)} "
                      f"unique foods. {len(trigger_list)} foods with >30% out-of-range association.")
            return TraitInsight(
                trait_id="trigger_foods", label="Trigger Foods",
                description=desc, evidence_count=evidence,
                confidence=_confidence_tier(conf_score), confidence_score=round(conf_score, 3),
                detail=detail, icon="\U0001f37d\ufe0f", data_source=data_source,
            )

    # -- Food-proxy fallback: frequency analysis --
    avg_freq = evidence / max(total_unique, 1)
    triggers = [(name, count) for name, count in most_common if count > avg_freq * 2]

    conf_score = min(1.0, (evidence / 100) * 0.3 + (len(triggers) / 5) * 0.3 + 0.4)

    if triggers:
        trigger_str = ", ".join(f"{name} ({count}x)" for name, count in triggers[:3])
        desc = (f"Your most repeated meals: {trigger_str}. "
                f"These form your 'usual' patterns — deviations from these may "
                f"lead to less predictable glucose outcomes.")
    else:
        desc = (f"You have {total_unique} unique meals in your history — high variety. "
                f"No single food dominates, which makes patterns harder to spot.")

    top_detail = "; ".join(f"{name}: {count}x" for name, count in most_common[:5])
    detail = (f"{evidence} meals, {total_unique} unique foods (food proxy). "
              f"Top 5: {top_detail}. Avg frequency: {avg_freq:.1f}x.")

    return TraitInsight(
        trait_id="trigger_foods", label="Repeat Trigger Foods",
        description=desc, evidence_count=evidence,
        confidence=_confidence_tier(conf_score), confidence_score=round(conf_score, 3),
        detail=detail, icon="\U0001f37d\ufe0f", data_source=data_source,
    )


# ── Main analysis function ──

def analyze_pattern_genome(
    food_history: list[dict[str, Any]],
    profile_name: str = "User",
    anchor_type: str = "",
    *,
    data_source: str = "synthetic_legends_demo",
    window_days: int = 90,
    glucose_readings: list[dict[str, Any]] | None = None,
    activity_events: list[dict[str, Any]] | None = None,
) -> PatternGenome:
    """Generate a Pattern Genome profile from food history.

    Args:
        food_history: List of meal records from food_history (legends.json format).
        profile_name: Name/label for this profile.
        anchor_type: The T1D anchor type for calibration context.
        data_source: "synthetic_legends_demo" or "real_history".
        window_days: Analysis window (30, 60, or 90).
        glucose_readings: Optional CGM glucose readings (value, timestamp/measured_at).
        activity_events: Optional activity event records (timestamp/measured_at).

    Returns:
        PatternGenome with 6 trait analyses.
    """
    if not food_history:
        return PatternGenome(
            profile_name=profile_name, data_source=data_source,
            total_meals_analyzed=0, analysis_window_days=window_days,
            summary_narrative="No meal history available for pattern analysis.",
        )

    traits: list[TraitInsight] = [
        _analyze_breakfast_spike(food_history, anchor_type, glucose_readings),
        _analyze_fat_delay_tendency(food_history, anchor_type, glucose_readings),
        _analyze_exercise_sensitivity(food_history, anchor_type, glucose_readings, activity_events),
        _analyze_overnight_risk(food_history, anchor_type, glucose_readings),
        _analyze_variability(food_history, anchor_type, glucose_readings),
        _analyze_trigger_foods(food_history, anchor_type, glucose_readings),
    ]

    # Compute top trigger foods for separate display
    foods = [r.get("food", "") for r in food_history if r.get("food")]
    counter = Counter(foods)
    top_triggers = [
        {"food": name, "count": count, "frequency_pct": round(count / max(len(foods), 1) * 100, 1)}
        for name, count in counter.most_common(5)
    ]

    # Build summary narrative
    high_conf_traits = [t for t in traits if t.confidence == "high"]
    med_conf_traits = [t for t in traits if t.confidence == "medium"]
    overall_conf = round(mean([t.confidence_score for t in traits]), 3) if traits else 0.0

    parts = [f"Pattern genome from {len(food_history)} meals over {window_days} days."]
    if high_conf_traits:
        parts.append(f"Strong patterns found: {', '.join(t.label for t in high_conf_traits)}.")
    if med_conf_traits:
        parts.append(f"Moderate patterns: {', '.join(t.label for t in med_conf_traits)}.")
    parts.append(f"Overall confidence: {_confidence_tier(overall_conf)} ({overall_conf:.0%}).")

    return PatternGenome(
        profile_name=profile_name,
        data_source=data_source,
        total_meals_analyzed=len(food_history),
        analysis_window_days=window_days,
        traits=traits,
        top_trigger_foods=top_triggers,
        summary_narrative=" ".join(parts),
    )


def _data_source_tag(data_source: str) -> str:
    """Return a short label suffix for a data_source value."""
    tags = {
        DATA_SOURCE_REAL_CGM: " [CGM]",
        DATA_SOURCE_FOOD_PROXY: " [food proxy]",
        DATA_SOURCE_SYNTHETIC_LEGEND: " [synthetic legend]",
    }
    return tags.get(data_source, "")


def render_pattern_genome_card(genome: PatternGenome) -> list[str]:
    """Render the Pattern Genome as a terminal card.

    Returns a list of card strings for the meal pipeline.
    """
    lines: list[str] = []

    source_label = "synthetic legends demo data" if genome.data_source == "synthetic_legends_demo" else "real user history"
    lines.append(f"  Analyzed {genome.total_meals_analyzed} meals over {genome.analysis_window_days} days ({source_label}).")
    lines.append("")

    # Render each trait
    for trait in genome.traits:
        icon = trait.icon
        conf_icon = "\U0001f7e2" if trait.confidence == "high" else "\U0001f7e1" if trait.confidence == "medium" else "\U0001f534"
        ds_tag = _data_source_tag(trait.data_source)
        lines.append(f"  {icon} {trait.label}  {conf_icon} {trait.confidence} ({trait.evidence_count} data points){ds_tag}")
        lines.append(f"     {trait.description}")
        if trait.detail:
            lines.append(f"     \U0001f4cb {trait.detail}")
        lines.append("")

    # Top trigger foods
    if genome.top_trigger_foods:
        lines.append("  \U0001f37d\ufe0f Most frequent meals:")
        for tf in genome.top_trigger_foods[:5]:
            lines.append(f"     \u2022 {tf['food']} \u2014 {tf['count']} times ({tf['frequency_pct']:.0f}% of meals)")
        lines.append("")

    lines.append(f"  \u26a0\ufe0f {genome.disclaimer}")

    return [
        "\n\u2501\u2501\u2501 Pattern Genome \u2501\u2501\u2501",
        "",
        f"  Profile: {genome.profile_name}",
        "",
    ] + lines


# ── Convenience: analyze from legends.json ──

def genome_from_legends(anchor_type: str, profile_name: str = "") -> PatternGenome:
    """Load a legend by anchor_type and generate its pattern genome."""
    from src.cli import _load_legends

    legends = _load_legends()
    legend = next((l for l in legends if l["anchor_type"] == anchor_type), None)
    if legend is None:
        return PatternGenome(
            profile_name=profile_name or anchor_type,
            data_source="synthetic_legends_demo",
            total_meals_analyzed=0, analysis_window_days=90,
            summary_narrative=f"No legend found for anchor: {anchor_type}",
        )

    name = profile_name or legend.get("anchor_label", anchor_type)
    return analyze_pattern_genome(
        food_history=legend["food_history"],
        profile_name=name,
        anchor_type=anchor_type,
        data_source="synthetic_legends_demo",
        window_days=90,
    )
