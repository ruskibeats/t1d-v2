#!/usr/bin/env python3
"""Generate 12 T1D companion legends with synthetic 90-day food histories.

Each legend has:
- Name, age, diagnosis duration
- Anchor type with full profile config
- 90 days of food history (breakfast, snack, lunch, snack, dinner, snack)
- Pre-computed per-meal-type stats
- Random CGM reading for "now"
- Questions they tend to ask
"""

from __future__ import annotations

import json
import random
from dataclasses import dataclass, field, asdict
from datetime import datetime, timedelta, timezone
from pathlib import Path
from statistics import mean, median, stdev
from typing import Any
from collections import Counter

import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.simulator.schemas import AnchorType
from app.simulator.patient_factory import generate_patient_config, generate_profile_json


_NAMES = [
    "Alex Chen", "Jordan Patel", "Samira Okafor", "Taylor Brooks",
    "Morgan Rivera", "Casey Kim", "Riley Thompson", "Avery Singh",
    "Quinn Nakamura", "Charlie Diaz", "Skyler Park", "Drew O'Brien",
]
_AGES = [24, 28, 31, 35, 38, 42, 45, 29, 33, 37, 41, 26]
_DIAGNOSIS_YEARS = [0.5, 1, 2, 3, 5, 7, 10, 12, 15, 18, 20, 25]
_SEED = 42


# Meal type definitions: time-of-day windows and macro distributions per anchor
MEAL_TYPES = ["breakfast", "morning_snack", "lunch", "afternoon_snack", "dinner", "evening_snack"]
MEAL_WINDOWS = {
    "breakfast": (7, 9),
    "morning_snack": (10, 11),
    "lunch": (12, 14),
    "afternoon_snack": (15, 16),
    "dinner": (18, 20),
    "evening_snack": (21, 22),
}

# Per-anchor macro profiles (carbs_g, fat_g, sugars_g) for each meal type
# Distribution shape: (mean_carbs, mean_fat, mean_sugars, std_dev)
ANCHOR_MEAL_PROFILES: dict[str, dict[str, tuple[float, float, float, float]]] = {
    "well_controlled": {
        "breakfast": (35, 8, 10, 0.2),
        "morning_snack": (15, 3, 8, 0.3),
        "lunch": (55, 12, 15, 0.2),
        "afternoon_snack": (20, 5, 10, 0.3),
        "dinner": (60, 15, 12, 0.2),
        "evening_snack": (10, 2, 5, 0.4),
    },
    "high_fat_delayed": {
        "breakfast": (30, 15, 8, 0.3),
        "morning_snack": (12, 8, 5, 0.4),
        "lunch": (50, 25, 10, 0.3),
        "afternoon_snack": (15, 10, 5, 0.4),
        "dinner": (65, 35, 12, 0.3),
        "evening_snack": (10, 5, 3, 0.5),
    },
    "post_meal_spike": {
        "breakfast": (40, 5, 25, 0.3),
        "morning_snack": (20, 2, 15, 0.4),
        "lunch": (60, 8, 30, 0.3),
        "afternoon_snack": (25, 3, 18, 0.4),
        "dinner": (55, 10, 25, 0.3),
        "evening_snack": (15, 2, 10, 0.5),
    },
    "brittle": {
        "breakfast": (35, 10, 12, 0.5),
        "morning_snack": (15, 5, 8, 0.5),
        "lunch": (55, 15, 18, 0.4),
        "afternoon_snack": (20, 5, 10, 0.5),
        "dinner": (60, 18, 15, 0.4),
        "evening_snack": (12, 4, 6, 0.5),
    },
    "dawn_phenomenon": {
        "breakfast": (30, 6, 8, 0.3),
        "morning_snack": (15, 3, 6, 0.3),
        "lunch": (50, 10, 12, 0.2),
        "afternoon_snack": (18, 4, 8, 0.3),
        "dinner": (55, 12, 10, 0.2),
        "evening_snack": (8, 2, 4, 0.4),
    },
    "overnight_hypo": {
        "breakfast": (35, 8, 10, 0.3),
        "morning_snack": (18, 4, 8, 0.3),
        "lunch": (50, 12, 12, 0.2),
        "afternoon_snack": (20, 5, 8, 0.3),
        "dinner": (55, 14, 10, 0.2),
        "evening_snack": (15, 3, 6, 0.4),
    },
    "exercise_sensitive": {
        "breakfast": (30, 6, 8, 0.3),
        "morning_snack": (20, 4, 8, 0.3),
        "lunch": (45, 8, 10, 0.2),
        "afternoon_snack": (25, 5, 10, 0.3),
        "dinner": (50, 10, 8, 0.2),
        "evening_snack": (12, 2, 4, 0.4),
    },
    "exercise_regimen": {
        "breakfast": (35, 7, 10, 0.2),
        "morning_snack": (22, 5, 10, 0.3),
        "lunch": (50, 10, 12, 0.2),
        "afternoon_snack": (25, 5, 10, 0.3),
        "dinner": (55, 12, 10, 0.2),
        "evening_snack": (15, 3, 5, 0.3),
    },
    "insulin_sensitive": {
        "breakfast": (30, 6, 8, 0.3),
        "morning_snack": (15, 3, 6, 0.3),
        "lunch": (45, 8, 10, 0.2),
        "afternoon_snack": (18, 4, 8, 0.3),
        "dinner": (50, 10, 10, 0.2),
        "evening_snack": (10, 2, 4, 0.4),
    },
    "insulin_resistant": {
        "breakfast": (40, 12, 15, 0.3),
        "morning_snack": (18, 6, 8, 0.4),
        "lunch": (60, 18, 20, 0.3),
        "afternoon_snack": (22, 8, 10, 0.4),
        "dinner": (65, 22, 18, 0.3),
        "evening_snack": (12, 4, 5, 0.5),
    },
    "high_variability": {
        "breakfast": (35, 8, 12, 0.5),
        "morning_snack": (15, 4, 8, 0.5),
        "lunch": (55, 14, 16, 0.4),
        "afternoon_snack": (20, 5, 10, 0.5),
        "dinner": (60, 16, 14, 0.4),
        "evening_snack": (12, 3, 6, 0.5),
    },
    "newly_diagnosed": {
        "breakfast": (30, 6, 10, 0.4),
        "morning_snack": (15, 3, 8, 0.4),
        "lunch": (50, 10, 14, 0.3),
        "afternoon_snack": (18, 4, 8, 0.4),
        "dinner": (55, 12, 12, 0.3),
        "evening_snack": (10, 2, 5, 0.5),
    },
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
    "well_controlled": [
        ("meal", "pizza and salad for dinner"),
        ("what_if", "can I have a dessert after dinner"),
        ("morning", "morning"),
        ("evening", "evening"),
        ("patterns", "show me my patterns"),
    ],
    "high_fat_delayed": [
        ("meal", "chicken curry and rice"),
        ("what_if", "can I eat 6 chicken wings"),
        ("evening", "evening"),
        ("insights", "what patterns do you see with my dinners"),
        ("troubleshoot_high", "why is my sugar still high 4 hours after dinner"),
    ],
    "post_meal_spike": [
        ("meal", "cereal for breakfast"),
        ("what_if", "can I eat a sugary snack mid afternoon"),
        ("troubleshoot_high", "why do I spike so fast after meals"),
        ("lunch", "lunch"),
        ("patterns", "patterns"),
    ],
    "brittle": [
        ("troubleshoot_high", "why is my glucose going up and down so much"),
        ("meal", "pasta for lunch"),
        ("evening", "evening"),
        ("troubleshoot_low", "why am I going low for no reason"),
    ],
    "dawn_phenomenon": [
        ("morning", "morning"),
        ("troubleshoot_high", "why is my sugar high when I wake up"),
        ("meal", "eggs on toast for breakfast"),
        ("lunch", "lunch"),
        ("patterns", "patterns"),
    ],
    "overnight_hypo": [
        ("evening", "evening"),
        ("troubleshoot_low", "why do I keep going low at night"),
        ("meal", "fish and chips for dinner"),
        ("morning", "morning"),
    ],
    "exercise_sensitive": [
        ("situation", "I went for a run and now I am low"),
        ("meal", "pasta for lunch before gym"),
        ("morning", "morning"),
        ("what_if", "can I eat a protein bar after exercise"),
    ],
    "exercise_regimen": [
        ("situation", "I did a heavy gym session"),
        ("meal", "chicken and rice post workout"),
        ("lunch", "lunch"),
        ("patterns", "patterns"),
    ],
    "insulin_sensitive": [
        ("troubleshoot_low", "why am I dropping fast after meals"),
        ("meal", "sushi for lunch"),
        ("morning", "morning"),
        ("what_if", "can I eat a bigger portion than usual"),
    ],
    "insulin_resistant": [
        ("troubleshoot_high", "why does my sugar stay high for hours"),
        ("meal", "pizza and garlic bread"),
        ("evening", "evening"),
        ("patterns", "patterns"),
    ],
    "high_variability": [
        ("patterns", "why is my glucose so unpredictable"),
        ("meal", "a sandwich and crisps for lunch"),
        ("evening", "evening"),
        ("troubleshoot_high", "why am I going high after the same meal I had yesterday"),
    ],
    "newly_diagnosed": [
        ("morning", "morning what should I know"),
        ("meal", "breakfast ideas"),
        ("lunch", "lunch what should I watch for"),
        ("troubleshoot_high", "why am I going high and what does this mean"),
        ("patterns", "patterns"),
    ],
}


@dataclass
class FoodEntry:
    timestamp: str
    meal_type: str
    food_name: str
    carbs_g: float
    fat_g: float
    sugars_g: float
    protein_g: float = 0.0
    kcal: float = 0.0


@dataclass
class Legend:
    name: str
    age: int
    diagnosis_years: float
    anchor_type: str
    anchor_label: str
    profile_config: dict[str, Any]
    profile_summary: dict[str, Any]
    food_history: list[dict[str, Any]]
    insights: dict[str, Any]
    current_cgm: dict[str, Any]
    questions: list[tuple[str, str]]


def _log_normal(mean_val: float, std_pct: float) -> float:
    """Generate a semi-realistic macro value. std_pct as fraction of mean."""
    std = mean_val * std_pct
    val = random.gauss(mean_val, std)
    return max(mean_val * 0.2, min(val, mean_val * 2.5))


def _random_hour(window: tuple[int, int]) -> int:
    return random.randint(window[0], window[1])


def _make_timestamp(base_date: datetime, hour: int) -> str:
    return base_date.replace(hour=hour, minute=random.choice([0, 15, 30, 45])).isoformat()


def _generate_food_history(anchor_type: str, anchor_name: str, rng: random.Random) -> list[dict[str, Any]]:
    """Generate 90 days of food history for a given anchor."""
    profiles = ANCHOR_MEAL_PROFILES.get(anchor_type, ANCHOR_MEAL_PROFILES["well_controlled"])
    start_date = datetime(2025, 1, 1, tzinfo=timezone.utc)
    rows: list[dict[str, Any]] = []

    for day_offset in range(90):
        base = start_date + timedelta(days=day_offset)
        for meal in MEAL_TYPES:
            if meal not in profiles:
                continue

            # 15% chance of skipping a meal (realistic)
            if rng.random() < 0.15 and meal.endswith("snack"):
                continue

            profile = profiles[meal]
            mean_carbs, mean_fat, mean_sugars, std_pct = profile

            carbs = round(_log_normal(mean_carbs, std_pct), 1)
            fat = round(_log_normal(mean_fat, std_pct), 1)
            sugar_ratio = mean_sugars / max(mean_carbs, 1)
            sugars = round(max(0, carbs * sugar_ratio * (0.7 + rng.random() * 0.6)), 1)
            sugars = min(sugars, carbs)
            protein = round(carbs * (0.15 + rng.random() * 0.25), 1)
            kcal = round(carbs * 4 + fat * 9 + protein * 4, 0)

            window = MEAL_WINDOWS.get(meal, (12, 13))
            hour = _random_hour(window)
            food = rng.choice(FOOD_NAMES.get(meal, ["Unknown food"]))

            rows.append({
                "timestamp": _make_timestamp(base, hour),
                "meal_type": meal,
                "food": food,
                "carb_estimate_g": carbs,
                "fat_g": fat,
                "sugars_g": sugars,
                "protein_g": round(protein, 1),
                "kcal": kcal,
                "anchor_type": anchor_type,
            })

    return rows


def _compute_insights(anchor_type: str, rows: list[dict[str, Any]]) -> dict[str, Any]:
    """Compute per-meal-type and overall statistics."""
    by_meal: dict[str, list[float]] = {m: [] for m in MEAL_TYPES}
    total_carbs: list[float] = []
    total_fat: list[float] = []
    total_sugars: list[float] = []

    meal_names: dict[str, list[str]] = {m: [] for m in MEAL_TYPES}

    for row in rows:
        mt = row.get("meal_type", "")
        c = row.get("carb_estimate_g", 0)
        f = row.get("fat_g", 0)
        s = row.get("sugars_g", 0)
        by_meal.get(mt, []).append(c)
        total_carbs.append(c)
        total_fat.append(f)
        total_sugars.append(s)
        meal_names.get(mt, []).append(row.get("food", ""))

    meal_stats = {}
    for mt in MEAL_TYPES:
        vals = by_meal.get(mt, [])
        foods = meal_names.get(mt, [])
        if not vals:
            continue
        top_foods = [f[0] for f in Counter(foods).most_common(3)]
        meal_stats[mt] = {
            "count": len(vals),
            "avg_carbs_g": round(mean(vals), 1),
            "avg_fat_g": round(mean([r["fat_g"] for r in rows if r.get("meal_type") == mt]), 1) if any(r["meal_type"] == mt for r in rows) else 0,
            "avg_sugars_g": round(mean([r["sugars_g"] for r in rows if r.get("meal_type") == mt]), 1) if any(r["meal_type"] == mt for r in rows) else 0,
            "median_carbs_g": round(median(vals), 1),
            "std_carbs_g": round(stdev(vals), 1) if len(vals) > 1 else 0,
            "top_foods": top_foods,
        }

    return {
        "total_meals": len(rows),
        "meal_stats": meal_stats,
        "overall": {
            "daily_avg_carbs_g": round(mean(total_carbs) * (len(MEAL_TYPES) - 2), 0),  # ~4 meals per day
            "daily_avg_fat_g": round(mean(total_fat) * (len(MEAL_TYPES) - 2), 0),
            "daily_avg_sugars_g": round(mean(total_sugars) * (len(MEAL_TYPES) - 2), 0),
        },
    }


def _generate_current_cgm(anchor_type: str, rng: random.Random) -> dict[str, Any]:
    """Generate a plausible current CGM reading."""
    basal = {
        "well_controlled": 110, "high_fat_delayed": 115, "post_meal_spike": 120,
        "brittle": 130, "dawn_phenomenon": 140, "overnight_hypo": 95,
        "exercise_sensitive": 105, "exercise_regimen": 108, "insulin_sensitive": 100,
        "insulin_resistant": 140, "high_variability": 125, "newly_diagnosed": 135,
    }
    base = basal.get(anchor_type, 110)
    current = round(base + rng.gauss(0, 15))
    direction = rng.choice(["stable", "rising slow", "rising fast", "falling slow", "falling fast"])
    trend_arrows = {"stable": "→", "rising slow": "↗", "rising fast": "↑", "falling slow": "↘", "falling fast": "↓"}
    return {
        "mg_dl": max(40, min(400, current)),
        "trend": direction,
        "arrow": trend_arrows.get(direction, "→"),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


def build_legends() -> list[dict[str, Any]]:
    """Generate all 12 legends with full synthetic data."""
    profiles = json.loads(Path("/root/t1d/data/profile_configs.json").read_text())
    legends = []
    rng = random.Random(_SEED)

    for i, anchor_type in enumerate(AnchorType):
        rng = random.Random(_SEED + i)  # Deterministic per anchor
        anchor_key = anchor_type.value
        profile_data = profiles.get(anchor_key, {})

        name = _NAMES[i % len(_NAMES)]
        age = _AGES[i % len(_AGES)]
        diag_years = _DIAGNOSIS_YEARS[i % len(_DIAGNOSIS_YEARS)]

        # Build profile config
        config = generate_patient_config(anchor_type)
        profile_json = generate_profile_json(config)
        profile_summary = {
            "anchor_label": profile_json["anchor_label"],
            "profile": profile_data.get("profile", {}),
            "patient_config": profile_data.get("patient_config", {}),
        }

        # Generate food history
        food_history = _generate_food_history(anchor_key, profile_json["anchor_label"], rng)

        # Compute insights
        insights = _compute_insights(anchor_key, food_history)

        # Current CGM
        current_cgm = _generate_current_cgm(anchor_key, rng)

        # Questions
        questions = QUESTIONS_PER_ANCHOR.get(anchor_key, [("patterns", "patterns")])

        legend = Legend(
            name=name,
            age=age,
            diagnosis_years=diag_years,
            anchor_type=anchor_key,
            anchor_label=profile_json["anchor_label"],
            profile_config=profile_data.get("patient_config", {}),
            profile_summary=profile_summary,
            food_history=food_history,
            insights=insights,
            current_cgm=current_cgm,
            questions=questions,
        )
        legends.append(asdict(legend))

    return legends


def main() -> None:
    data_dir = Path("data")
    data_dir.mkdir(exist_ok=True)
    legends = build_legends()
    output_path = data_dir / "legends.json"
    output_path.write_text(json.dumps(legends, indent=2))
    total_meals = sum(len(l["food_history"]) for l in legends)
    print(f"Wrote {output_path}")
    print(f"  Legends: {len(legends)}")
    print(f"  Total meal history rows: {total_meals}")
    print(f"  Avg meals per legend: {total_meals // len(legends)}")


if __name__ == "__main__":
    main()
