#!/usr/bin/env python3
"""Typed health event views over the health_metrics backbone.

Provides six typed SQL views and corresponding Python domain models that map
health_metrics rows by metric_type into PRD-compatible event types.

Design principles:
- Views are non-destructive — the underlying health_metrics table is unchanged.
- Views serve as the query surface for the pattern engine, LLM prompts, and
  synthetic legends — all work transparently through the same views.
- Python domain models deserialise metadata_json into typed fields.
- Both Nightscout (source = 'nightscout') and simulator/graph_engine data are
  queryable through the same views.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

# ────────────────────────────────────────────────────────────
# SQL DDL — run via ensure_health_event_views()
# ────────────────────────────────────────────────────────────

HEALTH_EVENT_VIEWS_DDL = """
-- 1. Meal events (metric_type = carbs)
CREATE OR REPLACE VIEW view_events_meal AS
SELECT
    id,
    user_id       AS person_id,
    measured_at   AS "timestamp",
    source,
    value         AS carbs_g,
    unit,
    metadata->>'fat_g'      AS fat_g,
    metadata->>'protein_g'  AS protein_g,
    metadata->>'fiber_g'    AS fiber_g,
    metadata->>'meal_type'  AS meal_type,
    metadata->>'food_name'  AS food_name,
    metadata,
    created_at
FROM health_metrics
WHERE "type" = 'carbs'::metric_type;

-- 2. Insulin events (metric_type in insulin family)
CREATE OR REPLACE VIEW view_events_insulin AS
SELECT
    id,
    user_id       AS person_id,
    measured_at   AS "timestamp",
    source,
    "type"::text  AS insulin_type,   -- 'insulin', 'insulin_basal', 'insulin_bolus', 'insulin_correction'
    value         AS insulin_units,
    unit,
    metadata->>'injection_site' AS injection_site,
    metadata->>'device'         AS device,
    metadata->>'brand'          AS brand,
    metadata,
    created_at
FROM health_metrics
WHERE "type" IN (
    'insulin'::metric_type,
    'insulin_basal'::metric_type,
    'insulin_bolus'::metric_type,
    'insulin_correction'::metric_type
);

-- 3. Glucose readings (metric_type = blood_glucose)
CREATE OR REPLACE VIEW view_events_glucose AS
SELECT
    id,
    user_id       AS person_id,
    measured_at   AS "timestamp",
    source,
    value         AS glucose_mg_dl,
    unit,
    metadata->>'trend_arrow' AS trend_arrow,
    metadata->>'device'      AS device,
    metadata->>'nightscout_id' AS nightscout_id,
    metadata,
    created_at
FROM health_metrics
WHERE "type" = 'blood_glucose'::metric_type;

-- 4. Activity events (metric_type in exercise/activity family)
CREATE OR REPLACE VIEW view_events_activity AS
SELECT
    id,
    user_id       AS person_id,
    measured_at   AS "timestamp",
    source,
    "type"::text  AS activity_type,  -- 'exercise_minutes', 'steps', 'distance_km', etc.
    value,
    unit,
    metadata->>'activity_name' AS activity_name,
    metadata->>'intensity'     AS intensity,
    metadata,
    created_at
FROM health_metrics
WHERE "type" IN (
    'exercise_minutes'::metric_type,
    'exercise_calories'::metric_type,
    'steps'::metric_type,
    'distance_km'::metric_type,
    'floors_climbed'::metric_type,
    'heart_rate'::metric_type,
    'resting_heart_rate'::metric_type,
    'heart_rate_variability'::metric_type,
    'spo2'::metric_type,
    'respiratory_rate'::metric_type,
    'blood_pressure_systolic'::metric_type,
    'blood_pressure_diastolic'::metric_type
);

-- 5. Sleep events (metric_type in sleep family)
CREATE OR REPLACE VIEW view_events_sleep AS
SELECT
    id,
    user_id       AS person_id,
    measured_at   AS "timestamp",
    source,
    "type"::text  AS sleep_metric,   -- 'sleep_hours', 'sleep_deep', etc.
    value,
    unit,
    metadata->>'sleep_score'      AS sleep_score,
    metadata->>'body_battery'     AS body_battery,
    metadata,
    created_at
FROM health_metrics
WHERE "type" IN (
    'sleep_hours'::metric_type,
    'sleep_deep'::metric_type,
    'sleep_rem'::metric_type,
    'sleep_light'::metric_type,
    'sleep_awake'::metric_type,
    'sleep_score'::metric_type,
    'sleep_latency'::metric_type
);

-- 6. Note / custom events (metric_type = custom or free-text)
CREATE OR REPLACE VIEW view_events_note AS
SELECT
    id,
    user_id       AS person_id,
    measured_at   AS "timestamp",
    source,
    value         AS note_value,
    unit,
    metadata->>'note_text' AS note_text,
    metadata->>'tags'      AS tags,
    metadata,
    created_at
FROM health_metrics
WHERE "type" = 'custom'::metric_type;
"""


# ────────────────────────────────────────────────────────────
# Python domain models
# ────────────────────────────────────────────────────────────

@dataclass
class HealthEventBase:
    """Common provenance fields for all health event types."""
    id: int
    person_id: int
    timestamp: datetime
    source: str
    value: float
    unit: str
    metadata: dict[str, Any] = field(default_factory=dict)
    created_at: datetime | None = None


@dataclass
class MealEvent(HealthEventBase):
    """A meal event — carbs intake with optional macro breakdown.

    Maps to view_events_meal where metric_type = 'carbs'.
    """
    carbs_g: float = 0.0
    fat_g: float | None = None
    protein_g: float | None = None
    fiber_g: float | None = None
    meal_type: str | None = None
    food_name: str | None = None

    @classmethod
    def from_health_metric(cls, row: dict[str, Any]) -> MealEvent:
        meta = row.get("metadata") or {}
        return cls(
            id=row["id"],
            person_id=row.get("user_id", row.get("person_id", 0)),
            timestamp=row.get("measured_at", row.get("timestamp", datetime.min)),
            source=row.get("source", ""),
            value=float(row.get("value", row.get("carbs_g", 0))),
            unit=row.get("unit", "g"),
            metadata=meta,
            created_at=row.get("created_at"),
            carbs_g=float(row.get("value", row.get("carbs_g", 0))),
            fat_g=_safe_float(meta, "fat_g"),
            protein_g=_safe_float(meta, "protein_g"),
            fiber_g=_safe_float(meta, "fiber_g"),
            meal_type=_safe_str(meta, "meal_type") or _safe_str(row, "meal_type"),
            food_name=_safe_str(meta, "food_name") or _safe_str(row, "food_name"),
        )


@dataclass
class InsulinEvent(HealthEventBase):
    """An insulin administration event.

    Maps to view_events_insulin where metric_type is in the insulin family.
    """
    insulin_type: str = "insulin"
    insulin_units: float = 0.0
    injection_site: str | None = None
    device: str | None = None
    brand: str | None = None

    @classmethod
    def from_health_metric(cls, row: dict[str, Any]) -> InsulinEvent:
        meta = row.get("metadata") or {}
        # Accept both view column ("insulin_type") and raw column ("type")
        insulin_type = (
            _safe_str(row, "insulin_type")
            or _safe_str(row, "type")
            or "insulin"
        )
        return cls(
            id=row["id"],
            person_id=row.get("user_id", row.get("person_id", 0)),
            timestamp=row.get("measured_at", row.get("timestamp", datetime.min)),
            source=row.get("source", ""),
            value=float(row.get("value", row.get("insulin_units", 0))),
            unit=row.get("unit", "U"),
            metadata=meta,
            created_at=row.get("created_at"),
            insulin_type=insulin_type,
            insulin_units=float(row.get("value", row.get("insulin_units", 0))),
            injection_site=_safe_str(meta, "injection_site"),
            device=_safe_str(meta, "device"),
            brand=_safe_str(meta, "brand"),
        )


@dataclass
class GlucoseReading(HealthEventBase):
    """A blood glucose reading.

    Maps to view_events_glucose where metric_type = 'blood_glucose'.
    """
    glucose_mg_dl: float = 0.0
    trend_arrow: str | None = None
    device: str | None = None
    nightscout_id: str | None = None

    @classmethod
    def from_health_metric(cls, row: dict[str, Any]) -> GlucoseReading:
        meta = row.get("metadata") or {}
        return cls(
            id=row["id"],
            person_id=row.get("user_id", row.get("person_id", 0)),
            timestamp=row.get("measured_at", row.get("timestamp", datetime.min)),
            source=row.get("source", ""),
            value=float(row.get("value", row.get("glucose_mg_dl", 0))),
            unit=row.get("unit", "mg/dL"),
            metadata=meta,
            created_at=row.get("created_at"),
            glucose_mg_dl=float(row.get("value", row.get("glucose_mg_dl", 0))),
            trend_arrow=_safe_str(meta, "trend_arrow") or _safe_str(row, "trend_arrow"),
            device=_safe_str(meta, "device") or _safe_str(row, "device"),
            nightscout_id=_safe_str(meta, "nightscout_id") or _safe_str(row, "nightscout_id"),
        )


@dataclass
class ActivityEvent(HealthEventBase):
    """An exercise or physical activity event.

    Maps to view_events_activity where metric_type is in the activity family.
    """
    activity_type: str = "exercise_minutes"
    activity_name: str | None = None
    intensity: str | None = None

    @classmethod
    def from_health_metric(cls, row: dict[str, Any]) -> ActivityEvent:
        meta = row.get("metadata") or {}
        return cls(
            id=row["id"],
            person_id=row.get("user_id", row.get("person_id", 0)),
            timestamp=row.get("measured_at", row.get("timestamp", datetime.min)),
            source=row.get("source", ""),
            value=float(row.get("value", 0)),
            unit=row.get("unit", ""),
            metadata=meta,
            created_at=row.get("created_at"),
            activity_type=_safe_str(row, "activity_type") or "exercise_minutes",
            activity_name=_safe_str(meta, "activity_name"),
            intensity=_safe_str(meta, "intensity"),
        )


@dataclass
class SleepEvent(HealthEventBase):
    """A sleep event.

    Maps to view_events_sleep where metric_type is in the sleep family.
    """
    sleep_metric: str = "sleep_hours"
    sleep_score: float | None = None
    body_battery: float | None = None

    @classmethod
    def from_health_metric(cls, row: dict[str, Any]) -> SleepEvent:
        meta = row.get("metadata") or {}
        return cls(
            id=row["id"],
            person_id=row.get("user_id", row.get("person_id", 0)),
            timestamp=row.get("measured_at", row.get("timestamp", datetime.min)),
            source=row.get("source", ""),
            value=float(row.get("value", 0)),
            unit=row.get("unit", ""),
            metadata=meta,
            created_at=row.get("created_at"),
            sleep_metric=_safe_str(row, "sleep_metric") or "sleep_hours",
            sleep_score=_safe_float(meta, "sleep_score"),
            body_battery=_safe_float(meta, "body_battery"),
        )


@dataclass
class NoteEvent(HealthEventBase):
    """A free-form custom note event.

    Maps to view_events_note where metric_type = 'custom'.
    """
    note_text: str | None = None
    tags: str | None = None

    @classmethod
    def from_health_metric(cls, row: dict[str, Any]) -> NoteEvent:
        meta = row.get("metadata") or {}
        return cls(
            id=row["id"],
            person_id=row.get("user_id", row.get("person_id", 0)),
            timestamp=row.get("measured_at", row.get("timestamp", datetime.min)),
            source=row.get("source", ""),
            value=float(row.get("value", 0)),
            unit=row.get("unit", ""),
            metadata=meta,
            created_at=row.get("created_at"),
            note_text=_safe_str(meta, "note_text") or _safe_str(row, "note_text"),
            tags=_safe_str(meta, "tags") or _safe_str(row, "tags"),
        )


# ────────────────────────────────────────────────────────────
# View-based query helpers
# ────────────────────────────────────────────────────────────

VIEW_NAME_BY_EVENT = {
    "meal": "view_events_meal",
    "insulin": "view_events_insulin",
    "glucose": "view_events_glucose",
    "activity": "view_events_activity",
    "sleep": "view_events_sleep",
    "note": "view_events_note",
}

MODEL_BY_EVENT = {
    "meal": MealEvent,
    "insulin": InsulinEvent,
    "glucose": GlucoseReading,
    "activity": ActivityEvent,
    "sleep": SleepEvent,
    "note": NoteEvent,
}


async def query_typed_events(
    session,
    event_type: str,
    *,
    person_id: int | None = None,
    start: datetime | None = None,
    end: datetime | None = None,
    source: str | None = None,
    limit: int = 100,
    order: str = "DESC",
) -> list[dict[str, Any]]:
    """Query a typed event view and return raw rows.

    Args:
        session: SQLAlchemy async session.
        event_type: One of 'meal', 'insulin', 'glucose', 'activity', 'sleep', 'note'.
        person_id: Filter by user id.
        start: Earliest timestamp (inclusive).
        end: Latest timestamp (inclusive).
        source: Filter by source string (e.g. 'nightscout', 'graph_engine').
        limit: Max rows to return.
        order: 'ASC' or 'DESC'.

    Returns:
        List of dicts matching the view columns.
    """
    from sqlalchemy import text as sql

    view = VIEW_NAME_BY_EVENT.get(event_type)
    if view is None:
        raise ValueError(f"Unknown event type: {event_type}. Valid: {list(VIEW_NAME_BY_EVENT)}")

    conditions: list[str] = []
    params: dict[str, Any] = {"limit": limit}

    if person_id is not None:
        conditions.append("person_id = :pid")
        params["pid"] = person_id
    if start is not None:
        conditions.append('"timestamp" >= :start')
        params["start"] = start
    if end is not None:
        conditions.append('"timestamp" <= :end')
        params["end"] = end
    if source is not None:
        conditions.append("source = :src")
        params["src"] = source

    where_clause = ""
    if conditions:
        where_clause = "WHERE " + " AND ".join(conditions)

    direction = "ASC" if order.upper() == "ASC" else "DESC"

    query = sql(f"""
        SELECT *
        FROM {view}
        {where_clause}
        ORDER BY "timestamp" {direction}
        LIMIT :limit
    """)

    result = await session.execute(query, params)
    return [dict(r._mapping) for r in result.fetchall()]


async def query_typed_events_as_models(
    session,
    event_type: str,
    **kwargs: Any,
) -> list[Any]:
    """Query a typed event view and deserialise into domain models.

    Accepts the same filters as query_typed_events().
    Returns a list of MealEvent, InsulinEvent, GlucoseReading, etc.
    """
    rows = await query_typed_events(session, event_type, **kwargs)
    model_cls = MODEL_BY_EVENT.get(event_type)
    if model_cls is None:
        raise ValueError(f"No model registered for event type: {event_type}")
    return [model_cls.from_health_metric(r) for r in rows]


async def get_typed_event_by_id(
    session,
    event_type: str,
    event_id: int,
) -> dict[str, Any] | None:
    """Get a single typed event by its health_metrics id."""
    from sqlalchemy import text as sql

    view = VIEW_NAME_BY_EVENT.get(event_type)
    if view is None:
        raise ValueError(f"Unknown event type: {event_type}")

    result = await session.execute(
        sql(f"SELECT * FROM {view} WHERE id = :eid"),
        {"eid": event_id},
    )
    row = result.fetchone()
    return dict(row._mapping) if row else None


async def ensure_health_event_views(session) -> None:
    """Create or replace all 6 typed health event views.

    Idempotent — safe to call on every startup.
    """
    from sqlalchemy import text as sql

    for stmt in HEALTH_EVENT_VIEWS_DDL.split(";"):
        stripped = stmt.strip()
        if stripped:
            await session.execute(sql(stripped + ";"))
    await session.commit()


# ────────────────────────────────────────────────────────────
# Internal helpers
# ────────────────────────────────────────────────────────────

def _safe_float(d: dict[str, Any], key: str) -> float | None:
    val = d.get(key)
    if val is None:
        return None
    try:
        return float(val)
    except (ValueError, TypeError):
        return None


def _safe_str(d: dict[str, Any], key: str) -> str | None:
    val = d.get(key)
    if val is None:
        return None
    if isinstance(val, str):
        return val
    return str(val)
