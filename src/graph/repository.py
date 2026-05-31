#!/usr/bin/env python3
"""Graph repository — encapsulates SQL for health metrics and edges."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import text as sql


class HealthMetricStore:
    """SQL store for health metrics and edges. Hides all raw SQL."""

    def __init__(self, session):
        self.session = session

    async def find_or_create_metric(
        self,
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
        result = await self.session.execute(
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
        result = await self.session.execute(
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
        self,
        user_id: int,
        source_metric_id: int,
        target_metric_id: int,
        edge_type: str,
        *,
        confidence: float = 0.5,
        time_delay_seconds: int | None = None,
        algorithm: str = "graph_engine.v2",
        evidence: dict[str, Any] | None = None,
        provenance: str | None = None,
        confidence_tier: str | None = None,
    ) -> int:
        prov = provenance or "simulator_output"
        conf_components = {} if confidence_tier is None else {"tier": confidence_tier, "base_score": confidence}
        result = await self.session.execute(
            sql("""
                INSERT INTO health_metric_edges
                    (user_id, source_metric_id, target_metric_id, edge_type,
                     confidence, time_delay_seconds, algorithm, evidence,
                     provenance_json, confidence_components_json)
                VALUES
                    (:uid, :src, :tgt, CAST(:et AS graph_edge_type),
                     :conf, :delay, :algo, CAST(:ev AS jsonb),
                     CAST(:prov AS jsonb), CAST(:cc AS jsonb))
                ON CONFLICT DO NOTHING
                RETURNING id
            """),
            {"uid": user_id, "src": source_metric_id, "tgt": target_metric_id,
             "et": edge_type, "conf": confidence, "delay": time_delay_seconds,
             "algo": algorithm, "ev": json.dumps(evidence or {}),
             "prov": json.dumps({"source": prov}),
             "cc": json.dumps(conf_components)},
        )
        row = result.fetchone()
        return row[0] if row else -1

    async def get_neighbors(
        self,
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
        outgoing = await self.session.execute(
            sql(f"""SELECT id, target_metric_id, edge_type, confidence, time_delay_seconds, algorithm, evidence
                FROM health_metric_edges WHERE user_id = :uid AND source_metric_id = :mid{type_filter}
                ORDER BY confidence DESC"""),
            params,
        )
        incoming = await self.session.execute(
            sql(f"""SELECT id, source_metric_id, edge_type, confidence, time_delay_seconds, algorithm, evidence
                FROM health_metric_edges WHERE user_id = :uid AND target_metric_id = :mid{type_filter}
                ORDER BY confidence DESC"""),
            params,
        )
        return {
            "outgoing": [dict(r._mapping) for r in outgoing.fetchall()],
            "incoming": [dict(r._mapping) for r in incoming.fetchall()],
        }

    async def find_next_metric(
        self,
        user_id: int,
        metric_type: str,
        after: datetime,
        source_hint: str = "",
    ) -> tuple[int, datetime] | None:
        """Find the next metric of a given type after a timestamp."""
        query = sql("""SELECT id, measured_at FROM health_metrics
            WHERE user_id = :uid AND "type" = CAST(:mt AS metric_type)
              AND measured_at > :after
              ORDER BY measured_at ASC LIMIT 1""")
        params = {"uid": user_id, "mt": metric_type, "after": after}
        if source_hint:
            query = sql("""SELECT id, measured_at FROM health_metrics
                WHERE user_id = :uid AND "type" = CAST(:mt AS metric_type)
                  AND source = :src AND measured_at > :after
                ORDER BY measured_at ASC LIMIT 1""")
            params = {"uid": user_id, "mt": metric_type, "after": after, "src": source_hint}
        row = await self.session.execute(query, params)
        result = row.fetchone()
        if result:
            return result[0], result[1]
        return None

    async def execute_raw(self, query_str: str, params: dict[str, Any]) -> list[dict[str, Any]]:
        """Execute a raw query and return results."""
        result = await self.session.execute(sql(query_str), params)
        return [dict(r._mapping) for r in result.fetchall()]
