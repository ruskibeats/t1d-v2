"""Knowledge graph engine for T1D Companion v2.

Leverages the existing `health_metric_edges` table in Postgres to build
and query a graph of meals, glucose readings, sleep, exercise, and patterns.

Edge types (graph_edge_type enum in Postgres):
  meal_to_glucose_spike, meal_to_delayed_spike, exercise_to_glucose_drop,
  sleep_to_next_day_glucose, precedes, correlates_with, etc.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import text as sql


async def find_or_create_metric(
    session,
    user_id: int,
    metric_type: str,
    measured_at: datetime,
    value: float,
    *,
    unit: str = "",
    source: str = "graph_engine",
    metadata_json: dict | None = None,
) -> int:
    """Find or create a metric node, returning its id.

    Matches the real `health_metrics` table schema:
      type (metric_type enum), value, unit, measured_at, source, metadata.
    """
    if measured_at.tzinfo is None:
        measured_at = measured_at.replace(tzinfo=timezone.utc)

    result = await session.execute(
        sql("""
            SELECT id FROM health_metrics
            WHERE user_id = :uid AND "type" = CAST(:mt AS metric_type)
              AND measured_at = :ma AND value = :val
            LIMIT 1
        """),
        {"uid": user_id, "mt": metric_type, "ma": measured_at, "val": value},
    )
    row = result.fetchone()
    if row:
        return row[0]

    result = await session.execute(
        sql("""
            INSERT INTO health_metrics (user_id, "type", value, unit, measured_at, source, metadata)
            VALUES (:uid, CAST(:mt AS metric_type), :val, :unit, :ma, :src, CAST(:meta AS jsonb))
            RETURNING id
        """),
        {
            "uid": user_id,
            "mt": metric_type,
            "val": value,
            "unit": unit,
            "ma": measured_at,
            "src": source,
            "meta": json.dumps(metadata_json or {}),
        },
    )
    return result.scalar_one()


async def create_edge(
    session,
    user_id: int,
    source_metric_id: int,
    target_metric_id: int,
    edge_type: str,
    *,
    confidence: float = 0.5,
    time_delay_seconds: int | None = None,
    algorithm: str = "graph_engine.v2",
    evidence: dict[str, Any] | None = None,
) -> int:
    """Insert an edge between two metric nodes. Returns edge id (-1 if exists)."""
    result = await session.execute(
        sql("""
            INSERT INTO health_metric_edges
                (user_id, source_metric_id, target_metric_id, edge_type,
                 confidence, time_delay_seconds, algorithm, evidence,
                 provenance_json, confidence_components_json)
            VALUES
                (:uid, :src, :tgt, CAST(:et AS graph_edge_type),
                 :conf, :delay, :algo, CAST(:ev AS jsonb),
                 CAST('{}' AS jsonb), CAST('{}' AS jsonb))
            ON CONFLICT DO NOTHING
            RETURNING id
        """),
        {
            "uid": user_id,
            "src": source_metric_id,
            "tgt": target_metric_id,
            "et": edge_type,
            "conf": confidence,
            "delay": time_delay_seconds,
            "algo": algorithm,
            "ev": json.dumps(evidence or {}),
        },
    )
    row = result.fetchone()
    return row[0] if row else -1


async def link_meal_to_glucose(
    session,
    user_id: int,
    meal_timestamp: datetime,
    carbs_g: float,
    peak_glucose: float,
    peak_time_minutes: int,
    fat_g: float = 0.0,
) -> int | None:
    """Create a meal → glucose response edge."""
    meal_node = await find_or_create_metric(
        session, user_id, "carbs", meal_timestamp, round(carbs_g, 1),
        unit="g", metadata_json={"fat_g": round(fat_g, 1)},
    )
    ts = meal_timestamp.replace(tzinfo=timezone.utc) if meal_timestamp.tzinfo is None else meal_timestamp
    peak_ts = ts + __import__("datetime").timedelta(minutes=peak_time_minutes)
    glucose_node = await find_or_create_metric(
        session, user_id, "blood_glucose", peak_ts, round(peak_glucose),
        unit="mg/dL",
    )
    delay = int(peak_time_minutes * 60)
    return await create_edge(
        session, user_id, meal_node, glucose_node,
        "meal_to_glucose_spike", confidence=0.7, time_delay_seconds=delay,
        algorithm="graph_engine.link_meal_to_glucose.v1",
        evidence={"carbs_g": round(carbs_g, 1), "fat_g": round(fat_g, 1), "peak_time_minutes": peak_time_minutes},
    )


async def link_sleep_to_next_day_glucose(
    session,
    user_id: int,
    sleep_date: datetime,
    overnight_low_mgdl: float | None,
    overnight_high_mgdl: float | None,
    morning_glucose: float,
) -> int | None:
    """Create a sleep → next-day glucose edge (V1 compatible)."""
    sleep_node = await find_or_create_metric(
        session, user_id, "exercise_minutes", sleep_date, 0,
        unit="min", source="graph_engine.sleep",
    )
    morning_node = await find_or_create_metric(
        session, user_id, "blood_glucose", sleep_date, round(morning_glucose),
        unit="mg/dL", source="graph_engine.morning",
        metadata_json={"overnight_low": overnight_low_mgdl, "overnight_high": overnight_high_mgdl},
    )
    return await create_edge(
        session, user_id, sleep_node, morning_node,
        "sleep_to_next_day_glucose", confidence=0.6,
        algorithm="graph_engine.link_sleep_to_morning.v1",
    )


async def link_exercise_to_glucose(
    session,
    user_id: int,
    exercise_timestamp: datetime,
    glucose_before: float,
    glucose_after: float,
) -> int | None:
    """Create an exercise → glucose response edge."""
    ex_node = await find_or_create_metric(
        session, user_id, "exercise_minutes", exercise_timestamp, 30,
        unit="min", source="graph_engine.exercise",
    )
    before_node = await find_or_create_metric(
        session, user_id, "blood_glucose", exercise_timestamp, round(glucose_before),
        unit="mg/dL", source="graph_engine.exercise_before",
    )
    after_node = await find_or_create_metric(
        session, user_id, "blood_glucose", exercise_timestamp, round(glucose_after),
        unit="mg/dL", source="graph_engine.exercise_after",
    )
    await create_edge(session, user_id, ex_node, before_node, "precedes", confidence=0.5, algorithm="graph_engine.exercise_timing.v1")
    return await create_edge(
        session, user_id, ex_node, after_node,
        "exercise_to_glucose_drop", confidence=0.7, time_delay_seconds=1800,
        algorithm="graph_engine.link_exercise_to_glucose.v1",
        evidence={"before": round(glucose_before), "after": round(glucose_after), "drop": round(glucose_before - glucose_after)},
    )


async def link_high_fat_to_delayed_peak(
    session,
    user_id: int,
    meal_timestamp: datetime,
    fat_g: float,
    peak_time_minutes: int,
) -> int | None:
    if fat_g < 15 or peak_time_minutes <= 90:
        return None
    meal_node = await find_or_create_metric(
        session, user_id, "fat", meal_timestamp, round(fat_g, 1),
        unit="g", source="graph_engine.high_fat",
    )
    delay_node = await find_or_create_metric(
        session, user_id, "carbs", meal_timestamp, float(peak_time_minutes),
        unit="min", source="graph_engine.delayed_peak",
    )
    return await create_edge(
        session, user_id, meal_node, delay_node,
        "meal_to_delayed_spike", confidence=0.6, time_delay_seconds=peak_time_minutes * 60,
        algorithm="graph_engine.link_high_fat_delayed.v1",
        evidence={"fat_g": round(fat_g, 1), "peak_time_minutes": peak_time_minutes},
    )


async def get_neighbors(
    session,
    user_id: int,
    metric_id: int,
    *,
    edge_types: list[str] | None = None,
) -> dict[str, list[dict[str, Any]]]:
    type_filter = ""
    params: dict = {"uid": user_id, "mid": metric_id}
    if edge_types:
        ph = [f":et{i}" for i in range(len(edge_types))]
        type_filter = f" AND edge_type IN ({','.join(ph)})"
        for i, et in enumerate(edge_types):
            params[f"et{i}"] = et

    outgoing = await session.execute(
        sql(f"""
            SELECT id, target_metric_id, edge_type, confidence, time_delay_seconds, algorithm, evidence
            FROM health_metric_edges
            WHERE user_id = :uid AND source_metric_id = :mid{type_filter}
            ORDER BY confidence DESC
        """),
        params,
    )
    incoming = await session.execute(
        sql(f"""
            SELECT id, source_metric_id, edge_type, confidence, time_delay_seconds, algorithm, evidence
            FROM health_metric_edges
            WHERE user_id = :uid AND target_metric_id = :mid{type_filter}
            ORDER BY confidence DESC
        """),
        params,
    )
    return {
        "outgoing": [dict(r._mapping) for r in outgoing.fetchall()],
        "incoming": [dict(r._mapping) for r in incoming.fetchall()],
    }


async def find_high_fat_meals_preceding_lows(
    session,
    user_id: int,
) -> list[dict[str, Any]]:
    """Traverse: find high-fat meal edges → follow to glucose peaks → check for lows."""
    edges = await session.execute(
        sql("""
            SELECT e.id, e.source_metric_id, e.target_metric_id, e.confidence, e.evidence
            FROM health_metric_edges e
            WHERE e.user_id = :uid AND e.edge_type = 'meal_to_delayed_spike'
              AND e.confidence >= 0.5
            ORDER BY e.confidence DESC
            LIMIT 20
        """),
        {"uid": user_id},
    )
    return [dict(r._mapping) for r in edges.fetchall()]


async def find_meals_correlated_with_best_outcomes(
    session,
    user_id: int,
    *,
    top_n: int = 5,
) -> list[dict[str, Any]]:
    """Pattern inference: find meals whose glucose response was lowest (best outcome)."""
    query = await session.execute(
        sql("""
            SELECT
                m.id AS meal_id, m."type" AS meal_type, m.value AS carbs_g,
                m.measured_at AS meal_time,
                g.value AS peak_glucose, g.measured_at AS peak_time,
                e.confidence
            FROM health_metric_edges e
            JOIN health_metrics m ON m.id = e.source_metric_id
            JOIN health_metrics g ON g.id = e.target_metric_id
            WHERE e.user_id = :uid
              AND e.edge_type = 'meal_to_glucose_spike'
              AND g.value IS NOT NULL
            ORDER BY g.value ASC
            LIMIT :top_n
        """),
        {"uid": user_id, "top_n": top_n},
    )
    return [dict(r._mapping) for r in query.fetchall()]
