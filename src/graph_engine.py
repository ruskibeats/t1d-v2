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
        {"uid": user_id, "mt": metric_type, "val": value, "unit": unit, "ma": measured_at,
         "src": source, "meta": json.dumps(metadata_json or {})},
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
        {"uid": user_id, "src": source_metric_id, "tgt": target_metric_id,
         "et": edge_type, "conf": confidence, "delay": time_delay_seconds,
         "algo": algorithm, "ev": json.dumps(evidence or {})},
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
    meal_node = await find_or_create_metric(
        session, user_id, "carbs", meal_timestamp, round(carbs_g, 1),
        unit="g", metadata_json={"fat_g": round(fat_g, 1)},
    )
    ts = meal_timestamp.replace(tzinfo=timezone.utc) if meal_timestamp.tzinfo is None else meal_timestamp
    peak_ts = ts + __import__("datetime").timedelta(minutes=peak_time_minutes)
    glucose_node = await find_or_create_metric(
        session, user_id, "blood_glucose", peak_ts, round(peak_glucose), unit="mg/dL",
    )
    edge_id = await create_edge(
        session, user_id, meal_node, glucose_node, "meal_to_glucose_spike",
        confidence=0.7, time_delay_seconds=int(peak_time_minutes * 60),
        algorithm="graph_engine.link_meal_to_glucose.v1",
        evidence={"carbs_g": round(carbs_g, 1), "fat_g": round(fat_g, 1), "peak_time_minutes": peak_time_minutes},
    )
    return edge_id, meal_node


async def link_sleep_to_next_day_glucose(
    session,
    user_id: int,
    sleep_date: datetime,
    overnight_low_mgdl: float | None,
    overnight_high_mgdl: float | None,
    morning_glucose: float,
) -> int | None:
    sleep_node = await find_or_create_metric(
        session, user_id, "exercise_minutes", sleep_date, 0, unit="min", source="graph_engine.sleep",
    )
    morning_node = await find_or_create_metric(
        session, user_id, "blood_glucose", sleep_date, round(morning_glucose),
        unit="mg/dL", source="graph_engine.morning",
        metadata_json={"overnight_low": overnight_low_mgdl, "overnight_high": overnight_high_mgdl},
    )
    return await create_edge(
        session, user_id, sleep_node, morning_node, "sleep_to_next_day_glucose",
        confidence=0.6, algorithm="graph_engine.link_sleep_to_morning.v1",
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
    fat_node = await find_or_create_metric(
        session, user_id, "fat", meal_timestamp, round(fat_g, 1), unit="g", source="graph_engine.high_fat",
    )
    delay_node = await find_or_create_metric(
        session, user_id, "carbs", meal_timestamp, float(peak_time_minutes), unit="min",
        source="graph_engine.delayed_peak",
    )
    return await create_edge(
        session, user_id, fat_node, delay_node, "meal_to_delayed_spike",
        confidence=0.6, time_delay_seconds=peak_time_minutes * 60,
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
        sql(f"""SELECT id, target_metric_id, edge_type, confidence, time_delay_seconds, algorithm, evidence
            FROM health_metric_edges WHERE user_id = :uid AND source_metric_id = :mid{type_filter}
            ORDER BY confidence DESC"""),
        params,
    )
    incoming = await session.execute(
        sql(f"""SELECT id, source_metric_id, edge_type, confidence, time_delay_seconds, algorithm, evidence
            FROM health_metric_edges WHERE user_id = :uid AND target_metric_id = :mid{type_filter}
            ORDER BY confidence DESC"""),
        params,
    )
    return {
        "outgoing": [dict(r._mapping) for r in outgoing.fetchall()],
        "incoming": [dict(r._mapping) for r in incoming.fetchall()],
    }


# ── Query 1: Compare meal outcomes by prior sleep quality (temporal SQL join) ──

async def compare_meal_outcomes_by_sleep_quality(
    session,
    user_id: int,
    *,
    meal_slot: str = "breakfast",
) -> list[dict[str, Any]]:
    """Find breakfasts after poor vs good sleep using temporal SQL join."""
    query = await session.execute(
        sql("""
            WITH sleep_mornings AS (
                SELECT DISTINCT ON (e.user_id, g.measured_at::date)
                    e.user_id,
                    s.measured_at AS sleep_time,
                    g.measured_at AS morning_time,
                    g.value AS morning_glucose,
                    g.metadata->>'overnight_low' AS overnight_low
                FROM health_metric_edges e
                JOIN health_metrics s ON s.id = e.source_metric_id
                JOIN health_metrics g ON g.id = e.target_metric_id
                WHERE e.user_id = :uid
                  AND e.edge_type = 'sleep_to_next_day_glucose'
                ORDER BY e.user_id, g.measured_at::date, s.measured_at DESC
            ),
            breakfast_carbs AS (
                SELECT id, value AS carbs_g, measured_at
                FROM health_metrics
                WHERE user_id = :uid2 AND "type" = 'carbs'
                  AND EXTRACT(HOUR FROM measured_at) BETWEEN 6 AND 11
            )
            SELECT
                b.id AS meal_id, b.carbs_g,
                (SELECT g2.value FROM health_metric_edges e2
                 JOIN health_metrics g2 ON g2.id = e2.target_metric_id
                 WHERE e2.user_id = :uid3 AND e2.source_metric_id = b.id
                   AND e2.edge_type = 'meal_to_glucose_spike'
                 LIMIT 1) AS peak_glucose,
                COALESCE(s.overnight_low, 'unknown') AS overnight_low,
                CASE
                    WHEN s.overnight_low IS NOT NULL
                         AND CAST(s.overnight_low AS float) < 70 THEN 'poor'
                    WHEN s.overnight_low IS NOT NULL
                         AND CAST(s.overnight_low AS float) >= 70 THEN 'good'
                    ELSE 'unknown'
                END AS sleep_quality
            FROM breakfast_carbs b
            LEFT JOIN sleep_mornings s
                ON s.morning_time::date = b.measured_at::date
            ORDER BY b.measured_at
            LIMIT 50
        """),
        {"uid": user_id, "uid2": user_id, "uid3": user_id},
    )
    return [dict(r._mapping) for r in query.fetchall()]


# ── Query 2: Find similar meals with better outcomes (architecture proof) ──

async def find_similar_meals_with_better_outcomes(
    session,
    user_id: int,
    *,
    reference_carbs_g: float,
    reference_fat_g: float = 0.0,
    tolerance_g: float = 15.0,
    top_n: int = 5,
) -> list[dict[str, Any]]:
    """Find meals similar in composition that had lower peak glucose."""
    query = await session.execute(
        sql("""
            SELECT m.id, m.value AS carbs_g, m.measured_at AS meal_time,
                   g.value AS peak_glucose, e.confidence,
                   'synthetic_outcome_only' AS outcome_source
            FROM health_metrics m
            JOIN health_metric_edges e ON e.source_metric_id = m.id
                AND e.edge_type = 'meal_to_glucose_spike'
            JOIN health_metrics g ON g.id = e.target_metric_id
            WHERE m.user_id = :uid AND m."type" = 'carbs'
              AND m.value BETWEEN :lo AND :hi
              AND g.value IS NOT NULL
            ORDER BY g.value ASC
            LIMIT :top_n
        """),
        {"uid": user_id, "lo": reference_carbs_g - tolerance_g,
         "hi": reference_carbs_g + tolerance_g, "top_n": top_n},
    )
    return [dict(r._mapping) for r in query.fetchall()]


# ── Query 3: Link meal to next sleep ──

async def link_meal_to_next_sleep(
    session,
    user_id: int,
    meal_metric_id: int,
    meal_timestamp: datetime,
    *,
    meal_slot: str = "",
) -> int | None:
    """Create a meal_precedes_sleep edge: meal → next sleep session."""
    ts = meal_timestamp.replace(tzinfo=timezone.utc) if meal_timestamp.tzinfo is None else meal_timestamp
    row = await session.execute(
        sql("""SELECT id, measured_at FROM health_metrics
            WHERE user_id = :uid AND "type" = 'exercise_minutes'
              AND source = 'graph_engine.sleep' AND measured_at > :mt
            ORDER BY measured_at ASC LIMIT 1"""),
        {"uid": user_id, "mt": ts},
    )
    sleep_row = row.fetchone()
    if not sleep_row:
        return None
    delay = int((sleep_row[1] - ts).total_seconds())
    if delay > 6 * 3600 or delay < 0:
        return None
    return await create_edge(
        session, user_id, meal_metric_id, sleep_row[0], "precedes",
        confidence=0.5, time_delay_seconds=delay,
        algorithm="graph_engine.meal_precedes_sleep.v1",
        evidence={"meal_slot": meal_slot, "delay_hours": round(delay / 3600, 1)},
    )


# ── Query 4: Trace backward from good morning glucose ──

async def trace_backward_from_good_morning_glucose(
    session,
    user_id: int,
    *,
    threshold_below: float = 130,
    top_n: int = 10,
) -> list[dict[str, Any]]:
    """Good morning ← sleep ← prior evening meal (via precedes edge)."""
    query = await session.execute(
        sql("""
            SELECT g.id AS morning_id, g.value AS morning_glucose,
                   g.measured_at AS morning_time,
                   s.id AS sleep_id, s.measured_at AS sleep_time,
                   p.id AS prior_meal_id, p.value AS prior_carbs_g,
                   p.metadata->>'fat_g' AS prior_fat_g
            FROM health_metrics g
            JOIN health_metric_edges se ON se.target_metric_id = g.id
                AND se.edge_type = 'sleep_to_next_day_glucose'
            JOIN health_metrics s ON s.id = se.source_metric_id
            LEFT JOIN health_metric_edges pe ON pe.target_metric_id = s.id
                AND pe.edge_type = 'precedes'
            LEFT JOIN health_metrics p ON p.id = pe.source_metric_id
            WHERE g.user_id = :uid AND g."type" = 'blood_glucose'
              AND g.value <= :thresh AND g.source = 'graph_engine.morning'
            ORDER BY g.value ASC LIMIT :top_n
        """),
        {"uid": user_id, "thresh": threshold_below, "top_n": top_n},
    )
    return [dict(r._mapping) for r in query.fetchall()]


# ── Query 5: Find repeating low-risk motifs (needs low/correction nodes) ──

async def find_repeating_low_risk_motifs(
    session,
    user_id: int,
) -> list[dict[str, Any]]:
    """Multi-hop: high-fat meal → delayed spike → low."""
    query = await session.execute(
        sql("""
            SELECT m.id AS meal_id, m.value AS fat_g,
                   m.measured_at AS meal_time,
                   g_peak.value AS peak_glucose,
                   g_low.value AS low_glucose, g_low.measured_at AS low_time
            FROM health_metrics m
            JOIN health_metric_edges me ON me.source_metric_id = m.id
                AND me.edge_type = 'meal_to_delayed_spike'
            JOIN health_metrics g_peak ON g_peak.id = me.target_metric_id
            LEFT JOIN health_metric_edges low_e ON low_e.source_metric_id = g_peak.id
                AND low_e.edge_type = 'precedes'
                AND low_e.time_delay_seconds BETWEEN 3600 AND 28800
            LEFT JOIN health_metrics g_low ON g_low.id = low_e.target_metric_id
                AND g_low."type" = 'blood_glucose' AND g_low.value < 70
            WHERE m.user_id = :uid AND m."type" = 'fat' AND m.value >= 15
            LIMIT 20
        """),
        {"uid": user_id},
    )
    return [dict(r._mapping) for r in query.fetchall()]
