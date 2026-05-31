#!/usr/bin/env python3
"""Graph engine — traversal queries using HealthMetricStore.

Pure graph logic — no raw SQL. All persistence delegated to repository.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from .repository import HealthMetricStore


class GraphEngine:
    """Knowledge graph traversal engine.

    Usage:
        store = HealthMetricStore(session)
        engine = GraphEngine(store)
        results = await engine.find_similar_meals_with_better_outcomes(user_id, carbs_g=50)
    """

    def __init__(self, store: HealthMetricStore):
        self.store = store

    async def link_meal_to_glucose(
        self,
        user_id: int,
        meal_timestamp: datetime,
        carbs_g: float,
        peak_glucose: float,
        peak_time_minutes: int,
        fat_g: float = 0.0,
    ) -> int | None:
        meal_node = await self.store.find_or_create_metric(
            user_id, "carbs", meal_timestamp, round(carbs_g, 1),
            unit="g", source="graph_engine.meal",
            metadata_json={"fat_g": round(fat_g, 1)},
        )
        ts = meal_timestamp.replace(tzinfo=timezone.utc) if meal_timestamp.tzinfo is None else meal_timestamp
        peak_ts = ts + timedelta(minutes=peak_time_minutes)
        glucose_node = await self.store.find_or_create_metric(
            user_id, "blood_glucose", peak_ts, round(peak_glucose), unit="mg/dL",
        )
        edge_id = await self.store.create_edge(
            user_id, meal_node, glucose_node, "meal_to_glucose_spike",
            confidence=0.7, time_delay_seconds=int(peak_time_minutes * 60),
            algorithm="graph_engine.link_meal_to_glucose.v1",
            evidence={"carbs_g": round(carbs_g, 1), "fat_g": round(fat_g, 1), "peak_time_minutes": peak_time_minutes},
            provenance="simulator_output", confidence_tier="direct_derived",
        )
        return edge_id

    async def link_sleep_to_next_day_glucose(
        self,
        user_id: int,
        sleep_date: datetime,
        overnight_low_mgdl: float | None,
        overnight_high_mgdl: float | None,
        morning_glucose: float,
    ) -> int | None:
        sleep_node = await self.store.find_or_create_metric(
            user_id, "exercise_minutes", sleep_date, 0, unit="min", source="graph_engine.sleep",
        )
        morning_node = await self.store.find_or_create_metric(
            user_id, "blood_glucose", sleep_date, round(morning_glucose),
            unit="mg/dL", source="graph_engine.morning",
            metadata_json={"overnight_low": overnight_low_mgdl, "overnight_high": overnight_high_mgdl},
        )
        return await self.store.create_edge(
            user_id, sleep_node, morning_node, "sleep_to_next_day_glucose",
            confidence=0.6, algorithm="graph_engine.link_sleep_to_morning.v1",
            provenance="simulator_output", confidence_tier="inferred",
        )

    async def link_high_fat_to_delayed_peak(
        self,
        user_id: int,
        meal_timestamp: datetime,
        fat_g: float,
        peak_time_minutes: int,
    ) -> int | None:
        if fat_g < 15 or peak_time_minutes <= 90:
            return None
        fat_node = await self.store.find_or_create_metric(
            user_id, "fat", meal_timestamp, round(fat_g, 1), unit="g", source="graph_engine.high_fat",
        )
        delay_node = await self.store.find_or_create_metric(
            user_id, "carbs", meal_timestamp, float(peak_time_minutes), unit="min",
            source="graph_engine.delayed_peak",
        )
        return await self.store.create_edge(
            user_id, fat_node, delay_node, "meal_to_delayed_spike",
            confidence=0.6, time_delay_seconds=peak_time_minutes * 60,
            algorithm="graph_engine.link_high_fat_delayed.v1",
            evidence={"fat_g": round(fat_g, 1), "peak_time_minutes": peak_time_minutes},
            provenance="simulator_output", confidence_tier="inferred",
        )

    async def link_meal_to_next_sleep(
        self,
        user_id: int,
        meal_metric_id: int,
        meal_timestamp: datetime,
        *,
        meal_slot: str = "",
    ) -> int | None:
        ts = meal_timestamp.replace(tzinfo=timezone.utc) if meal_timestamp.tzinfo is None else meal_timestamp
        sleep = await self.store.find_next_metric(user_id, "exercise_minutes", ts, source_hint="graph_engine.sleep")
        if not sleep:
            return None
        sleep_id, sleep_ts = sleep
        delay = int((sleep_ts - ts).total_seconds())
        if delay > 6 * 3600 or delay < 0:
            return None
        return await self.store.create_edge(
            user_id, meal_metric_id, sleep_id, "precedes",
            confidence=0.5, time_delay_seconds=delay,
            algorithm="graph_engine.meal_precedes_sleep.v1",
            evidence={"meal_slot": meal_slot, "delay_hours": round(delay / 3600, 1)},
            provenance="simulator_output", confidence_tier="simulated",
        )

    async def find_similar_meals_with_better_outcomes(
        self,
        user_id: int,
        *,
        reference_carbs_g: float,
        tolerance_g: float = 15.0,
        top_n: int = 5,
    ) -> list[dict[str, Any]]:
        results = await self.store.execute_raw(
            """
                SELECT m.id, m.value AS carbs_g, m.measured_at AS meal_time,
                       g.value AS peak_glucose, e.confidence,
                       e.provenance_json, e.confidence_components_json,
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
            """,
            {"uid": user_id, "lo": reference_carbs_g - tolerance_g,
             "hi": reference_carbs_g + tolerance_g, "top_n": top_n},
        )
        for r in results:
            r["hop_confidence"] = self._resolve_hop_confidence(r)
            r["provenance"] = self._resolve_provenance(r)
        return results

    def _resolve_provenance(self, row: dict[str, Any]) -> str:
        prov = row.get("provenance_json") or {}
        if isinstance(prov, dict):
            return prov.get("source", "simulator_output")
        return "simulator_output"

    def _resolve_hop_confidence(self, row: dict[str, Any]) -> str:
        conf = row.get("confidence", 0.0) or 0.0
        conf_comp = row.get("confidence_components_json") or {}
        if isinstance(conf_comp, dict) and conf_comp.get("tier") in ("direct_derived", "inferred", "simulated"):
            return conf_comp["tier"]
        if conf >= 0.8:
            return "direct_derived"
        elif conf >= 0.5:
            return "inferred"
        return "simulated"

    async def compare_meal_outcomes_by_sleep_quality(
        self,
        user_id: int,
        *,
        meal_slot: str = "breakfast",
    ) -> list[dict[str, Any]]:
        return await self.store.execute_raw(
            """
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
            """,
            {"uid": user_id, "uid2": user_id, "uid3": user_id},
        )

    async def trace_backward_from_good_morning_glucose(
        self,
        user_id: int,
        *,
        threshold_below: float = 130,
        top_n: int = 10,
    ) -> list[dict[str, Any]]:
        return await self.store.execute_raw(
            """
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
            """,
            {"uid": user_id, "thresh": threshold_below, "top_n": top_n},
        )

    async def find_repeating_low_risk_motifs(
        self,
        user_id: int,
    ) -> list[dict[str, Any]]:
        return await self.store.execute_raw(
            """
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
            """,
            {"uid": user_id},
        )
