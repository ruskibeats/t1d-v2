#!/usr/bin/env python3
"""Populate the knowledge graph from legend data.

Creates metric nodes and edges for legend users:
- meal → glucose spike edges from food history
- high-fat → delayed peak edges
- sleep → next-day glucose edges (simulated)

Usage:
    python3 src/build_graph.py
"""

from __future__ import annotations

import asyncio
import json
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.database import db_manager, get_settings
from src.graph_engine import (
    find_or_create_metric,
    create_edge,
    link_meal_to_glucose,
    link_sleep_to_next_day_glucose,
    link_high_fat_to_delayed_peak,
    link_meal_to_next_sleep,
)


async def build_legend_graph(legend: dict[str, Any], user_id: int) -> int:
    """Build all graph edges for a single legend user."""
    from sqlalchemy import text as sql
    settings = get_settings()
    db_manager.init_db(settings.database_url)
    edge_count = 0

    async with db_manager.get_session() as session:
        uid = user_id

        # Find the legend's tbl_user id from their email
        result = await session.execute(
            sql("SELECT id FROM tbl_users WHERE email LIKE :pat"),
            {"pat": f"legend.{legend['anchor_type']}.%"},
        )
        row = result.fetchone()
        if not row:
            print(f"  No tbl_user found for {legend['name']}")
            return 0
        uid = row[0]

        # Create sleep metric nodes first (meal→sleep edges need them to exist)
        base = datetime(2025, 1, 1, tzinfo=timezone.utc)
        sleep_metrics = []
        for day in range(90):
            sleep_ts = base + timedelta(days=day, hours=23)
            sleep_node = await find_or_create_metric(
                session, uid, "exercise_minutes", sleep_ts, 0,
                unit="min", source="graph_engine.sleep",
            )
            sleep_metrics.append((sleep_ts, sleep_node))
        
        # Process food history → meal → glucose edges
        entries = legend.get("food_history", [])
        processed = 0
        for entry in entries:
            ts_str = entry["timestamp"]
            try:
                meal_ts = datetime.fromisoformat(ts_str)
            except (ValueError, TypeError):
                continue
            if meal_ts.tzinfo is None:
                meal_ts = meal_ts.replace(tzinfo=timezone.utc)

            carbs = entry.get("carb_estimate_g", 0)
            fat = entry.get("fat_g", 0)
            if carbs <= 0:
                continue

            # Simulate a glucose peak from the carbs (rough: ~1.5 rise per g carb)
            peak = round(110 + carbs * 1.5 + (carbs * 0.1 if fat >= 15 else 0))
            peak_time = 90 if fat < 15 else 120

            edge_result = await link_meal_to_glucose(
                session, uid, meal_ts, carbs, peak, peak_time, fat_g=fat,
            )
            if edge_result and edge_result[1] is not None:
                processed += 1
                meal_node_id = edge_result[1]
                # Link dinner/snack meals to next sleep (needs sleep nodes to exist)
                mt = entry.get("meal_type", "")
                if mt in ("dinner", "evening_snack"):
                    await link_meal_to_next_sleep(session, uid, meal_node_id, meal_ts, meal_slot=mt)

            # High-fat → delayed edges
            if fat >= 15:
                await link_high_fat_to_delayed_peak(
                    session, uid, meal_ts, fat, peak_time,
                )

        edge_count += processed
        print(f"  {processed} meal→glucose edges")

        # Create simulated sleep→morning edges (one per 90-day day)
        sleep_count = 0
        for day in range(90):
            sleep_ts = base + timedelta(days=day, hours=23)
            morning_ts = base + timedelta(days=day + 1, hours=7)
            from random import Random
            rng = Random(legend["anchor_type"] + str(day))
            overnight_low = 70 + rng.gauss(0, 10)
            morning_g = 110 + rng.gauss(0, 15)
            edge_id2 = await link_sleep_to_next_day_glucose(
                session, uid, sleep_ts,
                round(max(40, overnight_low), 1),
                round(morning_g + 20, 1),
                round(morning_g),
            )
            if edge_id2 and edge_id2 > 0:
                sleep_count += 1
        edge_count += sleep_count
        print(f"  {sleep_count} sleep→morning edges")

        await session.commit()
        print(f"  Total: {edge_count} edges")
        return edge_count


async def main() -> None:
    legends_path = Path("data/legends.json")
    if not legends_path.exists():
        print("No data/legends.json found. Run src/build_legends.py first.")
        return

    legends = json.loads(legends_path.read_text())
    print(f"Building graph for {len(legends)} legends...")
    total = 0

    # Find user IDs for each legend
    settings = get_settings()
    db_manager.init_db(settings.database_url)
    async with db_manager.get_session() as session:
        from sqlalchemy import text as sql
        users = await session.execute(
            sql("SELECT id, full_name, email FROM tbl_users WHERE email LIKE 'legend.%' ORDER BY id")
        )
        user_map = {}
        for u in users.fetchall():
            email = u._mapping["email"]
            for legend in legends:
                safe_name = legend["name"].lower().replace(" ", ".").replace("'", "")
                if safe_name in email or legend["anchor_type"] in email:
                    user_map[legend["anchor_type"]] = u._mapping["id"]
                    break

    for legend in legends:
        at = legend["anchor_type"]
        uid = user_map.get(at)
        if uid is None:
            print(f"\n{legend['name']} ({at}): no user id found, skipping")
            continue
        print(f"\n{legend['name']} ({at}) — user_id={uid}")
        count = await build_legend_graph(legend, uid)
        total += count

    print(f"\nDone. {total} total edges created.")


if __name__ == "__main__":
    asyncio.run(main())
