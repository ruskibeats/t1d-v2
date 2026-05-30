#!/usr/bin/env python3
"""Generate 12 T1D companion legends and optionally write them to Postgres.

Usage:
    python3 src/build_legends.py                          # Write legends.json
    python3 src/build_legends.py --write-to-db            # + insert into Postgres
"""

from __future__ import annotations

import argparse
import asyncio
import json
import random
import sys
from collections import Counter
from dataclasses import asdict, dataclass, field
from datetime import datetime, timedelta, timezone
from pathlib import Path
from statistics import mean, median, stdev
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.simulator.schemas import AnchorType
from app.simulator.patient_factory import generate_patient_config, generate_profile_json
from app.core.database import db_manager, get_settings


# ── Legend data ──

_NAMES = ["Alex Chen", "Jordan Patel", "Samira Okafor", "Taylor Brooks",
          "Morgan Rivera", "Casey Kim", "Riley Thompson", "Avery Singh",
          "Quinn Nakamura", "Charlie Diaz", "Skyler Park", "Drew O'Brien"]
_AGES = [24, 28, 31, 35, 38, 42, 45, 29, 33, 37, 41, 26]
_DIAGNOSIS_YEARS = [0.5, 1, 2, 3, 5, 7, 10, 12, 15, 18, 20, 25]
_SEED = 42

MEAL_TYPES = ["breakfast", "morning_snack", "lunch", "afternoon_snack", "dinner", "evening_snack"]
MEAL_WINDOWS = {"breakfast": (7, 9), "morning_snack": (10, 11), "lunch": (12, 14),
                "afternoon_snack": (15, 16), "dinner": (18, 20), "evening_snack": (21, 22)}

ANCHOR_MEAL_PROFILES: dict[str, dict[str, tuple[float, float, float, float]]] = {
    "well_controlled": {"breakfast": (35, 8, 10, 0.2), "morning_snack": (15, 3, 8, 0.3),
        "lunch": (55, 12, 15, 0.2), "afternoon_snack": (20, 5, 10, 0.3),
        "dinner": (60, 15, 12, 0.2), "evening_snack": (10, 2, 5, 0.4)},
    "high_fat_delayed": {"breakfast": (30, 15, 8, 0.3), "morning_snack": (12, 8, 5, 0.4),
        "lunch": (50, 25, 10, 0.3), "afternoon_snack": (15, 10, 5, 0.4),
        "dinner": (65, 35, 12, 0.3), "evening_snack": (10, 5, 3, 0.5)},
    "post_meal_spike": {"breakfast": (40, 5, 25, 0.3), "morning_snack": (20, 2, 15, 0.4),
        "lunch": (60, 8, 30, 0.3), "afternoon_snack": (25, 3, 18, 0.4),
        "dinner": (55, 10, 25, 0.3), "evening_snack": (15, 2, 10, 0.5)},
    "brittle": {"breakfast": (35, 10, 12, 0.5), "morning_snack": (15, 5, 8, 0.5),
        "lunch": (55, 15, 18, 0.4), "afternoon_snack": (20, 5, 10, 0.5),
        "dinner": (60, 18, 15, 0.4), "evening_snack": (12, 4, 6, 0.5)},
    "dawn_phenomenon": {"breakfast": (30, 6, 8, 0.3), "morning_snack": (15, 3, 6, 0.3),
        "lunch": (50, 10, 12, 0.2), "afternoon_snack": (18, 4, 8, 0.3),
        "dinner": (55, 12, 10, 0.2), "evening_snack": (8, 2, 4, 0.4)},
    "overnight_hypo": {"breakfast": (35, 8, 10, 0.3), "morning_snack": (18, 4, 8, 0.3),
        "lunch": (50, 12, 12, 0.2), "afternoon_snack": (20, 5, 8, 0.3),
        "dinner": (55, 14, 10, 0.2), "evening_snack": (15, 3, 6, 0.4)},
    "exercise_sensitive": {"breakfast": (30, 6, 8, 0.3), "morning_snack": (20, 4, 8, 0.3),
        "lunch": (45, 8, 10, 0.2), "afternoon_snack": (25, 5, 10, 0.3),
        "dinner": (50, 10, 8, 0.2), "evening_snack": (12, 2, 4, 0.4)},
    "exercise_regimen": {"breakfast": (35, 7, 10, 0.2), "morning_snack": (22, 5, 10, 0.3),
        "lunch": (50, 10, 12, 0.2), "afternoon_snack": (25, 5, 10, 0.3),
        "dinner": (55, 12, 10, 0.2), "evening_snack": (15, 3, 5, 0.3)},
    "insulin_sensitive": {"breakfast": (30, 6, 8, 0.3), "morning_snack": (15, 3, 6, 0.3),
        "lunch": (45, 8, 10, 0.2), "afternoon_snack": (18, 4, 8, 0.3),
        "dinner": (50, 10, 10, 0.2), "evening_snack": (10, 2, 4, 0.4)},
    "insulin_resistant": {"breakfast": (40, 12, 15, 0.3), "morning_snack": (18, 6, 8, 0.4),
        "lunch": (60, 18, 20, 0.3), "afternoon_snack": (22, 8, 10, 0.4),
        "dinner": (65, 22, 18, 0.3), "evening_snack": (12, 4, 5, 0.5)},
    "high_variability": {"breakfast": (35, 8, 12, 0.5), "morning_snack": (15, 4, 8, 0.5),
        "lunch": (55, 14, 16, 0.4), "afternoon_snack": (20, 5, 10, 0.5),
        "dinner": (60, 16, 14, 0.4), "evening_snack": (12, 3, 6, 0.5)},
    "newly_diagnosed": {"breakfast": (30, 6, 10, 0.4), "morning_snack": (15, 3, 8, 0.4),
        "lunch": (50, 10, 14, 0.3), "afternoon_snack": (18, 4, 8, 0.4),
        "dinner": (55, 12, 12, 0.3), "evening_snack": (10, 2, 5, 0.5)},
}

FOOD_NAMES: dict[str, list[str]] = {
    "breakfast": ["Cereal with milk", "Toast with butter", "Porridge", "Scrambled eggs on toast", "Fruit smoothie", "Bagel with cream cheese", "Pancakes", "Yogurt with granola", "Oatmeal", "Bacon sandwich"],
    "morning_snack": ["Apple", "Banana", "Protein bar", "Handful of almonds", "Rice cakes", "Coffee with milk", "Orange", "Crackers with cheese", "Fruit juice", "Tea with biscuit"],
    "lunch": ["Chicken wrap", "Tuna sandwich", "Pasta salad", "Soup and bread roll", "Quinoa bowl", "Turkey sub", "Caesar salad", "Sushi box", "Jacket potato with beans", "Noodle pot"],
    "afternoon_snack": ["Yogurt", "Fruit", "Trail mix", "Crisps", "Chocolate bar", "Rice pudding", "Fruit smoothie", "Crackers", "Digestive biscuit", "Protein shake"],
    "dinner": ["Pizza", "Spaghetti bolognese", "Chicken curry with rice", "Grilled salmon with vegetables", "Beef stir-fry", "Fish and chips", "Chicken fajitas", "Lasagne", "Roast dinner", "Burger and fries", "Thai green curry", "Tacos", "Baked potato with chilli", "Shepherd's pie", "Pasta with pesto"],
    "evening_snack": ["Toast", "Hot chocolate", "Biscuits", "Cereal", "Fruit", "Yogurt", "Cheese and crackers", "Mug of milk", "Piece of cake", "Crisps"],
}

QUESTIONS_PER_ANCHOR: dict[str, list[tuple[str, str]]] = {
    "well_controlled": [("meal", "pizza and salad for dinner"), ("what_if", "can I have a dessert after dinner"), ("morning", "morning"), ("evening", "evening"), ("patterns", "show me my patterns")],
    "high_fat_delayed": [("meal", "chicken curry and rice"), ("what_if", "can I eat 6 chicken wings"), ("evening", "evening"), ("insights", "what patterns do you see with my dinners"), ("troubleshoot_high", "why is my sugar still high 4 hours after dinner")],
    "post_meal_spike": [("meal", "cereal for breakfast"), ("what_if", "can I eat a sugary snack mid afternoon"), ("troubleshoot_high", "why do I spike so fast after meals"), ("lunch", "lunch"), ("patterns", "patterns")],
    "brittle": [("troubleshoot_high", "why is my glucose going up and down so much"), ("meal", "pasta for lunch"), ("evening", "evening"), ("troubleshoot_low", "why am I going low for no reason")],
    "dawn_phenomenon": [("morning", "morning"), ("troubleshoot_high", "why is my sugar high when I wake up"), ("meal", "eggs on toast for breakfast"), ("lunch", "lunch"), ("patterns", "patterns")],
    "overnight_hypo": [("evening", "evening"), ("troubleshoot_low", "why do I keep going low at night"), ("meal", "fish and chips for dinner"), ("morning", "morning")],
    "exercise_sensitive": [("situation", "I went for a run and now I am low"), ("meal", "pasta for lunch before gym"), ("morning", "morning"), ("what_if", "can I eat a protein bar after exercise")],
    "exercise_regimen": [("situation", "I did a heavy gym session"), ("meal", "chicken and rice post workout"), ("lunch", "lunch"), ("patterns", "patterns")],
    "insulin_sensitive": [("troubleshoot_low", "why am I dropping fast after meals"), ("meal", "sushi for lunch"), ("morning", "morning"), ("what_if", "can I eat a bigger portion than usual")],
    "insulin_resistant": [("troubleshoot_high", "why does my sugar stay high for hours"), ("meal", "pizza and garlic bread"), ("evening", "evening"), ("patterns", "patterns")],
    "high_variability": [("patterns", "why is my glucose so unpredictable"), ("meal", "a sandwich and crisps for lunch"), ("evening", "evening"), ("troubleshoot_high", "why am I going high after the same meal I had yesterday")],
    "newly_diagnosed": [("morning", "morning what should I know"), ("meal", "breakfast ideas"), ("lunch", "lunch what should I watch for"), ("troubleshoot_high", "why am I going high and what does this mean"), ("patterns", "patterns")],
}


# ── Generation functions ──

def _log_normal(mean_val: float, std_pct: float) -> float:
    std = mean_val * std_pct
    val = random.gauss(mean_val, std)
    return max(mean_val * 0.2, min(val, mean_val * 2.5))

def _random_hour(window: tuple[int, int]) -> int:
    return random.randint(window[0], window[1])

def _make_timestamp(base_date: datetime, hour: int) -> str:
    return base_date.replace(hour=hour, minute=random.choice([0, 15, 30, 45])).isoformat()

def _generate_food_history(anchor_type: str, rng: random.Random) -> list[dict[str, Any]]:
    profiles = ANCHOR_MEAL_PROFILES.get(anchor_type, ANCHOR_MEAL_PROFILES["well_controlled"])
    start_date = datetime(2025, 1, 1, tzinfo=timezone.utc)
    rows = []
    for day_offset in range(90):
        base = start_date + timedelta(days=day_offset)
        for meal in MEAL_TYPES:
            if meal not in profiles:
                continue
            if rng.random() < 0.15 and meal.endswith("snack"):
                continue
            p = profiles[meal]
            carbs = round(_log_normal(p[0], p[3]), 1)
            fat = round(_log_normal(p[1], p[3]), 1)
            sugar_ratio = p[2] / max(p[0], 1)
            sugars = round(max(0, min(carbs, carbs * sugar_ratio * (0.7 + rng.random() * 0.6))), 1)
            protein = round(carbs * (0.15 + rng.random() * 0.25), 1)
            kcal = round(carbs * 4 + fat * 9 + protein * 4, 0)
            window = MEAL_WINDOWS.get(meal, (12, 13))
            hour = _random_hour(window)
            food = rng.choice(FOOD_NAMES.get(meal, ["Unknown"]))
            rows.append({"timestamp": _make_timestamp(base, hour), "meal_type": meal, "food": food,
                         "carb_estimate_g": carbs, "fat_g": fat, "sugars_g": sugars,
                         "protein_g": round(protein, 1), "kcal": kcal, "anchor_type": anchor_type})
    return rows

def _compute_insights(anchor_type: str, rows: list[dict[str, Any]]) -> dict[str, Any]:
    by_meal: dict[str, list[float]] = {m: [] for m in MEAL_TYPES}
    meal_names: dict[str, list[str]] = {m: [] for m in MEAL_TYPES}
    total_carbs: list[float] = []
    for r in rows:
        mt = r.get("meal_type", ""); c = r.get("carb_estimate_g", 0)
        by_meal.get(mt, []).append(c); total_carbs.append(c)
        meal_names.get(mt, []).append(r.get("food", ""))
    meal_stats = {}
    for mt in MEAL_TYPES:
        vals = by_meal.get(mt, []); foods = meal_names.get(mt, [])
        if not vals: continue
        fats = [r["fat_g"] for r in rows if r.get("meal_type") == mt]
        sug = [r["sugars_g"] for r in rows if r.get("meal_type") == mt]
        meal_stats[mt] = {"count": len(vals), "avg_carbs_g": round(mean(vals), 1),
            "avg_fat_g": round(mean(fats or [0]), 1), "avg_sugars_g": round(mean(sug or [0]), 1),
            "median_carbs_g": round(median(vals), 1), "std_carbs_g": round(stdev(vals), 1) if len(vals) > 1 else 0,
            "top_foods": [f[0] for f in Counter(foods).most_common(3)]}
    daily = round(mean(total_carbs or [0]) * 4, 0)
    daily_fat = round(mean([r["fat_g"] for r in rows]) * 4, 0)
    daily_sug = round(mean([r["sugars_g"] for r in rows]) * 4, 0)
    return {"total_meals": len(rows), "meal_stats": meal_stats,
            "overall": {"daily_avg_carbs_g": daily, "daily_avg_fat_g": daily_fat, "daily_avg_sugars_g": daily_sug}}

def _generate_current_cgm(anchor_type: str, rng: random.Random) -> dict[str, Any]:
    basal = {"well_controlled": 110, "high_fat_delayed": 115, "post_meal_spike": 120, "brittle": 130,
             "dawn_phenomenon": 140, "overnight_hypo": 95, "exercise_sensitive": 105, "exercise_regimen": 108,
             "insulin_sensitive": 100, "insulin_resistant": 140, "high_variability": 125, "newly_diagnosed": 135}
    base = basal.get(anchor_type, 110)
    return {"mg_dl": max(40, min(400, round(base + rng.gauss(0, 15)))),
            "trend": rng.choice(["stable", "rising slow", "rising fast", "falling slow", "falling fast"]),
            "arrow": rng.choice(["→", "↗", "↑", "↘", "↓"]),
            "timestamp": datetime.now(timezone.utc).isoformat()}


@dataclass
class Legend:
    name: str; age: int; diagnosis_years: float; anchor_type: str; anchor_label: str
    profile_config: dict[str, Any]; profile_summary: dict[str, Any]
    food_history: list[dict[str, Any]]; insights: dict[str, Any]
    current_cgm: dict[str, Any]; questions: list[tuple[str, str]]


def build_legends() -> list[dict[str, Any]]:
    profiles = json.loads(Path("/root/t1d/data/profile_configs.json").read_text())
    legends = []
    for i, anchor_type in enumerate(AnchorType):
        rng = random.Random(_SEED + i)
        ak = anchor_type.value
        pd = profiles.get(ak, {})
        config = generate_patient_config(anchor_type)
        pj = generate_profile_json(config)
        food_history = _generate_food_history(ak, rng)
        legends.append(asdict(Legend(
            name=_NAMES[i], age=_AGES[i], diagnosis_years=_DIAGNOSIS_YEARS[i],
            anchor_type=ak, anchor_label=pj["anchor_label"],
            profile_config=pd.get("patient_config", {}),
            profile_summary={"anchor_label": pj["anchor_label"],
                "profile": pd.get("profile", {}), "patient_config": pd.get("patient_config", {})},
            food_history=food_history, insights=_compute_insights(ak, food_history),
            current_cgm=_generate_current_cgm(ak, rng),
            questions=QUESTIONS_PER_ANCHOR.get(ak, [("patterns", "patterns")]),
        )))
    return legends


# ── DB writer ──

async def _write_legends_to_db(legends: list[dict[str, Any]]) -> None:
    from sqlalchemy import text as sql
    settings = get_settings()
    db_manager.init_db(settings.database_url)
    async with db_manager.get_session() as session:
        for legend in legends:
            name = legend["name"]; anchor = legend["anchor_type"]
            safe_name = name.lower().replace(' ', '.').replace("'", "")
            email = f"legend.{anchor}.{safe_name}@local"
            diag_years_int = max(1, int(legend.get("diagnosis_years", 1)))
            diagnosis_date = (datetime.now(timezone.utc) - timedelta(days=diag_years_int * 365)).replace(tzinfo=None)
            r1 = await session.execute(sql("""INSERT INTO tbl_users
                (full_name, email, hashed_password, is_active, is_verified, timezone, glucose_units,
                 target_range_low, target_range_high, created_at, updated_at,
                 nightscout_connected, librelinkup_connected, is_superuser, diabetes_type, diagnosis_date)
                VALUES
                (:n, :e, 'legends', TRUE, TRUE, 'Europe/London', 'mg/dL',
                 70.0, 180.0, NOW(), NOW(),
                 FALSE, FALSE, FALSE, 'type1', :dd)
                ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name
                RETURNING id"""),
                {"n": name, "e": email, "dd": diagnosis_date})
            uid = r1.scalar_one()

            # Insert sim_user (use an existing sim_run_id or skip)
            # sim_users has too many constraints for a quick insert; legends.json is canonical.
            # We store the anchor/profile info directly in tbl_users.metadata instead.
            await session.execute(
                sql("UPDATE tbl_users SET diabetes_type = :dt WHERE id = :uid"),
                {"dt": anchor, "uid": uid}
            )
            print(f"  user {uid}: {name} ({anchor})")

            entries = legend.get("food_history", [])
            for i in range(0, len(entries), 50):
                batch = entries[i:i + 50]
                vals = []
                p = {}
                for j, e in enumerate(batch):
                    ts = datetime.fromisoformat(e["timestamp"]).replace(tzinfo=None)
                    vals.append(f"(:uid,1.0,'serving',:dt{j},:mt{j},:fn{j},:ca{j},:fa{j},:su{j},:pr{j},:kc{j},'legend')")
                    p[f"dt{j}"] = ts; p[f"mt{j}"] = e["meal_type"]; p[f"fn{j}"] = e["food"]
                    p[f"ca{j}"] = e["carb_estimate_g"]; p[f"fa{j}"] = e["fat_g"]; p[f"su{j}"] = e["sugars_g"]
                    p[f"pr{j}"] = e.get("protein_g", 0); p[f"kc{j}"] = e.get("kcal", 0)
                p["uid"] = uid
                vals_str = ",".join(vals).replace("::timestamp", "")
                await session.execute(sql(f"""INSERT INTO food_entries (user_id,quantity,unit,entry_date,meal_type,food_name,carbs,fat,sugars,protein,calories,source)
                    VALUES {vals_str}"""), p)
            print(f"    {len(entries)} food entries")
        await session.commit()
        print("  All 12 legends committed to database")


def main() -> None:
    ap = argparse.ArgumentParser("Build T1D companion legends")
    ap.add_argument("--write-to-db", action="store_true")
    args = ap.parse_args()
    legends = build_legends()
    out = Path("data/legends.json")
    out.write_text(json.dumps(legends, indent=2))
    meals = sum(len(l["food_history"]) for l in legends)
    print(f"Wrote {out}: {len(legends)} legends, {meals} meal rows")
    if args.write_to_db:
        print("Writing to Postgres...")
        asyncio.run(_write_legends_to_db(legends))
        print("Done.")


if __name__ == "__main__":
    main()
