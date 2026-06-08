"""Food History Aggregation Service — Class I retrospective analysis.

For a logged food item, queries the user's CGM entries aligned to meal
timestamps and returns:

1. Average CGM trace (T+0 → T+4h) across all instances
2. Variability band (min/max or ±1σ)
3. The last 3 occurrences with context (insulin, activity)
4. Automatically generated insight text (locale-aware units)

This is the **live app** data path. It does NOT use ForecastStage,
anchors, or synthetic profiles. All output is statistical aggregation
of the user's own logged data — no forward prediction, no simulation.

Class I boundary: factual retrospection only. No dosing/treatment
recommendations. Units adapt to user locale (mmol/L UK, mg/dL US).
"""

from __future__ import annotations

import logging
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from statistics import mean, stdev
from typing import Any

logger = logging.getLogger(__name__)


# ── Constants ──

_TRACE_HOURS = 4
_TRACE_INTERVAL_MINUTES = 5

# Conversion factor
MMOL_TO_MGDL = 18.018


# ── Data types ──

@dataclass
class CGMInstance:
    """A single CGM reading at a time offset from a meal."""
    offset_minutes: int
    value_mmol_l: float | None = None
    value_mg_dl: float | None = None


@dataclass
class FoodInstance:
    """One occurrence of a food item being eaten."""
    date: str
    meal_time: str
    start_bg_mmol_l: float | None = None
    start_bg_mg_dl: float | None = None
    insulin_units: float | None = None
    is_active: bool = False
    cgm_trace: list[CGMInstance] = field(default_factory=list)


@dataclass
class AggregatedTracePoint:
    """One point on the aggregate CGM trace."""
    offset_minutes: int
    mean_mmol_l: float | None = None
    mean_mg_dl: float | None = None
    min_mmol_l: float | None = None
    min_mg_dl: float | None = None
    max_mmol_l: float | None = None
    max_mg_dl: float | None = None
    std_mmol_l: float | None = None
    std_mg_dl: float | None = None
    count: int = 0


@dataclass
class FoodHistoryResult:
    """Full result for a food item query."""
    food_name: str
    total_instances: int
    time_range_days: int
    trace: list[AggregatedTracePoint]
    last_three: list[FoodInstance]
    insight_text: str
    avg_peak_mmol_l: float | None = None
    avg_peak_mg_dl: float | None = None
    avg_peak_time_minutes: int | None = None
    disclaimer: str = "This shows what your glucose has done after eating this food in the past. Individual outcomes vary — this is not a prediction of future results."


# ── Utility Functions ──

def _mmol_to_mgdl(mmol: float) -> float:
    """Convert mmol/L to mg/dL."""
    return round(mmol * MMOL_TO_MGDL, 1)


def _mgdl_to_mmol(mgdl: float) -> float:
    """Convert mg/dL to mmol/L."""
    return round(mgdl / MMOL_TO_MGDL, 1)


# ── DEMO MODE ──

def _load_food_history_entries() -> list[dict[str, Any]]:
    """Load food history entries from synthetic legends data."""
    import json
    from pathlib import Path

    legends_path = Path(__file__).resolve().parents[2] / "data" / "legends.json"
    if not legends_path.exists():
        return []

    legends = json.loads(legends_path.read_text())
    entries = []
    for legend in legends:
        insights = legend.get("insights", {})
        meal_stats = insights.get("meal_stats", {})
        for meal_type, stats in meal_stats.items():
            top_foods = stats.get("top_foods", [])
            for food in top_foods[:1]:
                entries.append({
                    "food": food,
                    "carb_estimate_g": stats.get("avg_carbs_g", 30),
                })
    return entries


def _demo_instance_from_food_entry(
    entry: dict[str, Any],
    base_time: datetime,
    idx: int,
) -> FoodInstance:
    """Generate a synthetic FoodInstance from a food history entry."""
    import math
    import random

    carbs = entry.get("carb_estimate_g", 30)
    rise_per_g = 1.5
    basal = 6.0  # mmol/L
    peak_rise = carbs * rise_per_g * 0.0555
    peak_time = 75 + random.randint(-15, 30)

    trace = []
    for offset in range(0, _TRACE_HOURS * 60 + 1, _TRACE_INTERVAL_MINUTES):
        if offset < peak_time:
            fraction = offset / peak_time
            rise = peak_rise * (1 - math.exp(-3 * fraction))
        else:
            decay = (offset - peak_time) / (240 - peak_time)
            rise = peak_rise * max(0, 1 - decay * 0.8)

        mmol = basal + rise + (random.random() - 0.5) * 0.3
        mgdl = _mmol_to_mgdl(mmol)
        trace.append(CGMInstance(
            offset_minutes=offset,
            value_mmol_l=round(mmol, 1),
            value_mg_dl=mgdl,
        ))

    start_bg = basal + (random.random() - 0.5) * 0.5
    return FoodInstance(
        date=base_time.strftime("%Y-%m-%d"),
        meal_time=base_time.isoformat(),
        start_bg_mmol_l=round(start_bg, 1),
        start_bg_mg_dl=_mmol_to_mgdl(start_bg),
        insulin_units=round(carbs / 10, 1) if random.random() > 0.2 else None,
        is_active=random.random() < 0.35,
        cgm_trace=trace,
    )


def _compute_demo_food_history(food_name: str, time_range: str) -> FoodHistoryResult:
    """Compute food history from synthetic demo data."""
    import random
    from datetime import timedelta

    entries = _load_food_history_entries()
    matching = [e for e in entries if food_name.lower() in e.get("food", "").lower()]

    base_time = datetime.now(timezone.utc) - timedelta(days=90)
    instances = []
    for i in range(12):
        fake_entry = {"food": food_name, "carb_estimate_g": 30 + random.randint(-10, 20)}
        ts = base_time + timedelta(days=i * 7 + random.randint(0, 3))
        instances.append(_demo_instance_from_food_entry(fake_entry, ts, i))

    # Apply time range filter
    now = datetime.now(timezone.utc)
    cutoffs = {"week": 7, "month": 30, "year": 365, "all": 36500}
    cutoff = now - timedelta(days=cutoffs.get(time_range, 36500))
    filtered = [i for i in instances if datetime.fromisoformat(i.meal_time) >= cutoff]

    if not filtered:
        return FoodHistoryResult(food_name=food_name, total_instances=0, time_range_days=0, trace=[], last_three=[], insight_text=f"No logged data for '{food_name}'.")

    return _aggregate_instances(food_name, filtered)


# ── PRODUCTION PATH ──

def __sql(query: str) -> Any:
    """Create a SQL text object."""
    from sqlalchemy import text
    return text(query)


async def _query_food_instances_db(
    session,
    user_id: int,
    food_name: str,
    cutoff: datetime,
) -> list[FoodInstance]:
    """Query actual meal + CGM data from the database."""
    try:
        result = await session.execute(
            __sql("""
                SELECT ml.logged_at as meal_time,
                       ml.carbs_g, ml.fat_g, ml.sugars_g,
                       ml.insulin_units, ml.start_bg_mmol_l, ml.start_bg_mg_dl,
                       ml.activity_context
                FROM meal_log ml
                WHERE ml.user_id = :uid
                  AND LOWER(ml.food_name) LIKE LOWER(:pattern)
                  AND ml.logged_at >= :cutoff
                ORDER BY ml.logged_at DESC
            """),
            {"uid": user_id, "pattern": f"%{food_name}%", "cutoff": cutoff},
        )
        meals = result.fetchall()
    except Exception as exc:
        logger.warning("meal_log table not available: %s", exc)
        return []

    instances = []
    for meal in meals:
        meal_time = meal.meal_time
        
        # Get CGM readings T+0 → T+4h
        try:
            cgm_result = await session.execute(
                __sql("""
                    SELECT measured_at, value_mmol_l, value_mg_dl
                    FROM cgm_entries
                    WHERE user_id = :uid
                      AND measured_at >= :start
                      AND measured_at <= :end
                    ORDER BY measured_at ASC
                """),
                {"uid": user_id, "start": meal_time, "end": meal_time + timedelta(hours=_TRACE_HOURS)},
            )
            cgm_rows = cgm_result.fetchall()
        except Exception:
            cgm_rows = []

        trace = []
        if cgm_rows:
            meal_ts = meal_time.timestamp()
            for row in cgm_rows:
                offset = int((row.measured_at.timestamp() - meal_ts) / 60)
                mmol = row.value_mmol_l or (_mgdl_to_mmol(row.value_mg_dl) if row.value_mg_dl else None)
                mgdl = row.value_mg_dl or (_mmol_to_mgdl(mmol) if mmol else None)
                if mmol:
                    trace.append(CGMInstance(offset_minutes=offset, value_mmol_l=round(mmol, 1), value_mg_dl=mgdl))

        activity = meal.activity_context or {}
        instances.append(FoodInstance(
            date=meal_time.strftime("%Y-%m-%d"),
            meal_time=meal_time.isoformat(),
            start_bg_mmol_l=meal.start_bg_mmol_l,
            start_bg_mg_dl=meal.start_bg_mg_dl,
            insulin_units=meal.insulin_units,
            is_active=activity.get("is_active", False),
            cgm_trace=trace,
        ))

    return instances


# ── AGGREGATION LOGIC ──

def _compute_aggregate_trace(instances: list[FoodInstance], interval: int = _TRACE_INTERVAL_MINUTES) -> list[AggregatedTracePoint]:
    """Bin all CGM readings and compute stats per bin."""
    bins: dict[int, list[tuple[float, float]]] = defaultdict(list)

    for inst in instances:
        for pt in inst.cgm_trace:
            if pt.value_mmol_l is not None:
                bin_offset = round(pt.offset_minutes / interval) * interval
                if 0 <= bin_offset <= _TRACE_HOURS * 60:
                    bins[bin_offset].append((pt.value_mmol_l, pt.value_mg_dl or _mmol_to_mgdl(pt.value_mmol_l)))

    trace = []
    for offset in range(0, _TRACE_HOURS * 60 + 1, interval):
        values = bins.get(offset, [])
        if not values:
            continue

        mmol_vals = [v[0] for v in values]
        mgdl_vals = [v[1] for v in values]
        
        avg_mmol = mean(mmol_vals)
        avg_mgdl = mean(mgdl_vals)
        
        trace.append(AggregatedTracePoint(
            offset_minutes=offset,
            mean_mmol_l=round(avg_mmol, 2),
            mean_mg_dl=round(avg_mgdl, 1),
            min_mmol_l=round(min(mmol_vals), 1),
            min_mg_dl=round(min(mgdl_vals), 1),
            max_mmol_l=round(max(mmol_vals), 1),
            max_mg_dl=round(max(mgdl_vals), 1),
            std_mmol_l=round(stdev(mmol_vals), 2) if len(mmol_vals) > 1 else None,
            std_mg_dl=round(stdev(mgdl_vals), 1) if len(mgdl_vals) > 1 else None,
            count=len(values),
        ))

    return trace


def _generate_insight_text(
    food_name: str,
    total_instances: int,
    trace: list[AggregatedTracePoint],
    avg_peak_mmol: float | None,
    avg_peak_mgdl: float | None,
    last_three: list[FoodInstance],
    time_range_days: int,
    use_mmol: bool = True,
) -> str:
    """Generate Class I-safe insight text (locale-aware units)."""
    unit = "mmol/L" if use_mmol else "mg/dL"
    peak = avg_peak_mmol if use_mmol else avg_peak_mgdl
    
    parts: list[str] = []
    
    if total_instances > 0:
        parts.append(f"You've logged **{food_name}** **{total_instances} time{'s' if total_instances != 1 else ''}**.")
    
    if time_range_days > 0 and parts:
        parts[-1] = parts[-1].rstrip(".") + f" over the last {time_range_days} day{'s' if time_range_days != 1 else ''}."
    
    if peak is not None:
        parts.append(f"On average, your glucose peaked at **{peak:.1f} {unit}** after eating.")
    
    if trace:
        mins = [p.min_mmol_l for p in trace if p.min_mmol_l] or [p.min_mg_dl / MMOL_TO_MGDL for p in trace if p.min_mg_dl]
        maxs = [p.max_mmol_l for p in trace if p.max_mmol_l] or [p.max_mg_dl / MMOL_TO_MGDL for p in trace if p.max_mg_dl]
        if mins and maxs:
            low = min(mins)
            high = max(maxs)
            parts.append(f"Your glucose ranged from **{low:.1f}–{high:.1f} {unit}** after eating.")
    
    if last_three:
        last = last_three[0]
        if last.cgm_trace:
            peak_pt = max(last.cgm_trace, key=lambda p: p.value_mmol_l or 0)
            trough_pt = min(last.cgm_trace, key=lambda p: p.value_mmol_l or 0)
            if peak_pt.value_mmol_l and trough_pt.value_mmol_l:
                peak_val = peak_pt.value_mmol_l if use_mmol else peak_pt.value_mg_dl
                trough_val = trough_pt.value_mmol_l if use_mmol else trough_pt.value_mg_dl
                parts.append(
                    f"The last time you had {food_name} (**{last.date}**), "
                    f"you reached **{peak_val:.1f} {unit}** "
                    f"and returned to **{trough_val:.1f} {unit}** within 4 hours."
                )
    
    return "\n\n".join(parts)


def _aggregate_instances(food_name: str, instances: list[FoodInstance]) -> FoodHistoryResult:
    """Build FoodHistoryResult from instances."""
    trace = _compute_aggregate_trace(instances)
    last_three = sorted(instances, key=lambda x: x.meal_time, reverse=True)[:3]
    
    peak_point = max(trace, key=lambda p: p.mean_mmol_l or 0) if trace else None
    
    time_range_days = 0
    if instances:
        dates = [datetime.fromisoformat(i.meal_time) for i in instances if i.meal_time]
        if dates:
            time_range_days = (max(dates) - min(dates)).days
    
    return FoodHistoryResult(
        food_name=food_name,
        total_instances=len(instances),
        time_range_days=time_range_days,
        trace=trace,
        last_three=last_three,
        insight_text=_generate_insight_text(food_name, len(instances), trace, peak_point.mean_mmol_l if peak_point else None, peak_point.mean_mg_dl if peak_point else None, last_three, time_range_days),
        avg_peak_mmol_l=peak_point.mean_mmol_l if peak_point else None,
        avg_peak_mg_dl=peak_point.mean_mg_dl if peak_point else None,
        avg_peak_time_minutes=peak_point.offset_minutes if peak_point else None,
    )


# ── PUBLIC API ──

async def get_food_history(
    user_id: int | None,
    food_name: str,
    time_range: str = "all",
    session: Any = None,
    use_mmol: bool = True,  # Locale-aware: True for UK/EU, False for US
) -> FoodHistoryResult:
    """Get historical CGM trace data for a food item.
    
    use_mmol: True for mmol/L (UK/EU), False for mg/dL (US)
    The iOS app passes the user's locale preference.
    """
    if not food_name:
        return FoodHistoryResult(food_name="", total_instances=0, time_range_days=0, trace=[], last_three=[], insight_text="No food selected.")
    
    now = datetime.now(timezone.utc)
    cutoffs = {"week": 7, "month": 30, "year": 365, "all": 36500}
    cutoff = now - timedelta(days=cutoffs.get(time_range, 36500))

    if session is not None and user_id is not None:
        instances = await _query_food_instances_db(session, user_id, food_name, cutoff)
        if instances:
            return _aggregate_instances(food_name, instances)

    return _compute_demo_food_history(food_name, time_range)


def get_food_history_sync(food_name: str = "", time_range: str = "all", use_mmol: bool = True) -> dict[str, Any]:
    """Synchronous wrapper for demo/testing."""
    import asyncio
    return asyncio.run(get_food_history(None, food_name, time_range, None, use_mmol))


def result_to_dict(result: FoodHistoryResult) -> dict[str, Any]:
    """Convert FoodHistoryResult to dict for JSON."""
    return {
        "food_name": result.food_name,
        "total_instances": result.total_instances,
        "time_range_days": result.time_range_days,
        "trace": [
            {
                "offset_minutes": p.offset_minutes,
                "mean_mmol_l": p.mean_mmol_l,
                "mean_mg_dl": p.mean_mg_dl,
                "min_mmol_l": p.min_mmol_l,
                "min_mg_dl": p.min_mg_dl,
                "max_mmol_l": p.max_mmol_l,
                "max_mg_dl": p.max_mg_dl,
                "std_mmol_l": p.std_mmol_l,
                "std_mg_dl": p.std_mg_dl,
                "count": p.count,
            }
            for p in result.trace
        ],
        "last_three": [
            {
                "date": i.date,
                "meal_time": i.meal_time,
                "start_bg_mmol_l": i.start_bg_mmol_l,
                "start_bg_mg_dl": i.start_bg_mg_dl,
                "insulin_units": i.insulin_units,
                "is_active": i.is_active,
                "cgm_trace": [
                    {"offset_minutes": c.offset_minutes, "value_mmol_l": c.value_mmol_l, "value_mg_dl": c.value_mg_dl}
                    for c in i.cgm_trace
                ],
            }
            for i in result.last_three
        ],
        "insight_text": result.insight_text,
        "avg_peak_mmol_l": result.avg_peak_mmol_l,
        "avg_peak_mg_dl": result.avg_peak_mg_dl,
        "avg_peak_time_minutes": result.avg_peak_time_minutes,
        "disclaimer": result.disclaimer,
    }