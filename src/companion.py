#!/usr/bin/env python3
"""Companion intent detection and card system for T1D Companion v2."""

from __future__ import annotations

import re
from enum import Enum
from typing import Any


class Intent(str, Enum):
    MEAL = "meal"
    WHAT_IF = "what_if"
    TROUBLESHOOT_HIGH = "troubleshoot_high"
    TROUBLESHOOT_LOW = "troubleshoot_low"
    SITUATION = "situation"
    MORNING_CALL = "morning_call"
    LUNCH_PRESSER = "lunch_presser"
    EVENING_ROUNDUP = "evening_roundup"
    INSIGHTS = "insights"
    UNKNOWN = "unknown"


# ── Intent detection ──

# What-if planning: "can I eat X", "what if I eat X", "is it ok to eat X"
_WHAT_IF_PATTERNS = [
    r"\bcan\s+i\s+(eat|have)\b",
    r"\bwhat\s+if\s+i\s+(eat|have)\b",
    r"\bis\s+it\s+(ok|safe|fine)\s+to\s+(eat|have)\b",
    r"\bshould\s+i\s+(eat|have)\b",
]

# Troubleshoot high: "why am I going high", "why is my sugar high"
_TROUBLESHOOT_HIGH_PATTERNS = [
    r"\bwhy\s+.*\b(high|spike|spiking|rising|going up)\b",
    r"\bgoing\s+high\b",
    r"\bsugar.*\bhigh\b.*\bwhy\b",
]

# Troubleshoot low: "why am I going low", "why is my sugar dropping"
_TROUBLESHOOT_LOW_PATTERNS = [
    r"\bwhy\s+.*\b(low|dropping|drop|cras|going down)\b",
    r"\bgoing\s+low\b",
]

# Situation: "it is hot", "too hot", "i am exercising", "i drank alcohol"
_SITUATION_PATTERNS = {
    "heat": [r"\b(hot|heat|sun|warm)\b.*\b(glucose|sugar|low|cgm)\b", r"\b(hot|heat|sun|warm)\b", r"\btemperature\b"],
    "exercise": [r"\b(exercis|workout|ran|run|walk|gym|sport|active)\b"],
    "alcohol": [r"\b(alcohol|drink|beer|wine|drank|had.*drink)\b"],
    "illness": [r"\b(sick|ill|flu|cold|vomit|nausea|infection)\b"],
}

# Routine check-in keywords
_MORNING_KEYWORDS = ["morning"]
_LUNCH_KEYWORDS = ["lunch", "midday", "noon"]
_EVENING_KEYWORDS = ["evening", "night", "roundup", "todays summary"]

# Insights
_INSIGHTS_PATTERNS = [
    r"\b(insight|pattern|trend|weekly|week|summary|how.*week)\b",
]

_INSIGHTS_SINGLE_WORDS = {"patterns", "insights", "trends", "weekly", "summary"}


def detect_intent(text: str) -> Intent:
    """Classify user input into a companion intent."""
    lower = text.lower().strip()

    # Check what-if first (looks like a meal but starts with question)
    for pat in _WHAT_IF_PATTERNS:
        if re.search(pat, lower):
            return Intent.WHAT_IF

    # Check troubleshoot
    for pat in _TROUBLESHOOT_HIGH_PATTERNS:
        if re.search(pat, lower):
            return Intent.TROUBLESHOOT_HIGH
    for pat in _TROUBLESHOOT_LOW_PATTERNS:
        if re.search(pat, lower):
            return Intent.TROUBLESHOOT_LOW

    # Check situation
    for category, patterns in _SITUATION_PATTERNS.items():
        for pat in patterns:
            if re.search(pat, lower):
                return Intent.SITUATION

    # Check routine check-ins
    if any(kw in lower for kw in _MORNING_KEYWORDS):
        return Intent.MORNING_CALL
    if any(kw in lower for kw in _LUNCH_KEYWORDS):
        return Intent.LUNCH_PRESSER
    if any(kw in lower for kw in _EVENING_KEYWORDS):
        return Intent.EVENING_ROUNDUP

    # Check insights
    if lower.strip().rstrip(".!") in _INSIGHTS_SINGLE_WORDS:
        return Intent.INSIGHTS
    for pat in _INSIGHTS_PATTERNS:
        if re.search(pat, lower):
            return Intent.INSIGHTS

    # Default: if it looks like a meal description, treat as meal
    # (anything with food words, quantities, or just plain text)
    if len(lower.split()) >= 2 or any(w in lower for w in ["pizza", "pasta", "rice", "bread", "chicken", "salad", "fries", "donut", "coke", "burger", "sushi", "eggs", "steak"]):
        return Intent.MEAL

    return Intent.UNKNOWN


# ── Companion card builders ──

def _separator(title: str = "") -> str:
    if title:
        return f"\n━━━ {title} ━━━"
    return "\n" + "━" * 40


def _press_enter() -> str:
    return "\n[Press Enter to continue...]"


def welcome_card() -> str:
    """Welcome / profile card — shown on first state."""
    return (
        "\n━━━ T1D Companion ━━━\n"
        "Press Enter to start, or type a question.\n"
        "Examples:\n"
        "  \"pizza and large fries\"\n"
        "  \"can I eat 6 scoops of ice cream\"\n"
        "  \"why am I going high\"\n"
        "  \"morning\" / \"evening\" / \"patterns\""
    )


def meal_pipeline_section(
    profile_label: str,
    parsed_foods: list[dict[str, Any]],
    food_evidence: list[dict[str, Any]],
    meal_totals: dict[str, float],
    forecast: dict[str, Any],
    historical_context: dict[str, Any],
    risk_flags: list[str],
    chart: str,
) -> list[str]:
    """Build progressive cards for the full meal pipeline."""
    cards = []

    # Card 1: Parsed foods
    lines = [f"Profile: {profile_label}", ""]
    for f in parsed_foods:
        qty = f.get("quantity", 1)
        unit = f.get("unit") or ""
        name = f.get("item", "?")
        lines.append(f"  {qty} {unit} {name}")
    cards.append(_separator("Step 1: Parsed Foods") + "\n" + "\n".join(lines))

    # Card 2: Food evidence
    lines = []
    for item in food_evidence:
        p = item.get("parsed", {})
        c = item.get("computed") or {}
        conf = item.get("confidence", "?")
        name = p.get("item", "?")
        qty = p.get("quantity", 1)
        unit = p.get("unit") or ""
        carbs = c.get("carbs_g", 0)
        fat = c.get("fat_g", 0)
        sugars = c.get("sugars_g", 0)
        icon = "✓" if conf == "high" else "⚠"
        lines.append(f"  {icon} {qty} {unit} {name} | {carbs}g carbs  {fat}g fat  {sugars}g sugar  conf: {conf}")
        for warning in item.get("warnings") or []:
            lines.append(f"    ⚠ {warning}")
    cards.append(_separator("Step 2: Food Evidence") + "\n" + "\n".join(lines))

    # Card 3: Forecast
    peak = forecast.get("peak_mg_dl", "?")
    peak_time = forecast.get("peak_time_minutes", "?")
    baseline = forecast.get("baseline_mg_dl", "?")
    band = forecast.get("uncertainty_band", {})
    pr = band.get("peak_range_mg_dl", [peak, peak])
    tr = band.get("peak_time_range_minutes", [peak_time, peak_time])
    carbs = meal_totals.get("carbs_g", 0)
    fat = meal_totals.get("fat_g", 0)
    lines = [
        f"  Meal: {carbs}g carbs, {fat}g fat",
        f"  → Peak: ~{peak} mg/dL at ~{peak_time} min",
        f"  → Range: {pr[0]}–{pr[1]} mg/dL",
        f"  → Timing: {tr[0]}–{tr[1]} min",
        f"  → Baseline: {baseline} mg/dL",
    ]
    cards.append(_separator("Step 3: Forecast") + "\n" + "\n".join(lines) + "\n" + chart)

    # Card 4: Historical context
    if historical_context.get("similar_meals_count"):
        hist_count = historical_context["similar_meals_count"]
        avg_rise = historical_context.get("avg_peak_rise_mg_dl", "?")
        avg_time = historical_context.get("avg_peak_time_minutes", "?")
        lines = [
            f"  {hist_count} similar meals found.",
            f"  • Avg rise: {avg_rise} mg/dL" if avg_rise else "",
            f"  • Avg peak: {avg_time} min" if avg_time else "",
        ]
        for obs in (historical_context.get("case_based_observations") or [])[:2]:
            lines.append(f"  • {obs}")
        cards.append(_separator("Step 4: Similar Meals") + "\n" + "\n".join(filter(None, lines)))
    else:
        cards.append(_separator("Step 4: Similar Meals") + "\n  No similar meals found.")

    # Card 5: Monitoring
    lines = []
    for flag in risk_flags:
        if flag == "fat_may_extend_or_delay_rise":
            lines.append("  ⚠ High fat may delay the rise — watch 3–4 hours.")
        elif flag == "large_carb_load":
            lines.append("  ⚠ Large carb load — uncertainty matters.")
        elif flag == "alcohol_can_increase_delayed_hypo_risk":
            lines.append("  ⚠ Alcohol can increase delayed low risk.")
        elif flag == "rapid_sugar_spike":
            lines.append("  ⚠ Rapid sugar spike likely — monitor early.")
    if not lines:
        lines.append("  Watch the expected peak window and compare with your trend.")
    lines.append("\n  Educational simulation only — not medical advice.")
    cards.append(_separator("Step 5: Monitoring") + "\n" + "\n".join(lines))

    return cards


def what_if_card(food_text: str, carbs_g: float, fat_g: float, sugars_g: float,
                 peak_mg_dl: int, peak_time_min: int,
                 risk_flags: list[str]) -> list[str]:
    """What-if planning card."""
    risk_lines = []
    for flag in risk_flags:
        if flag == "fat_may_extend_or_delay_rise":
            risk_lines.append("  ⚠ High fat — delayed rise possible, watch 3–4 hrs.")
        elif flag == "rapid_sugar_spike":
            risk_lines.append("  ⚠ Very high sugar — rapid spike likely.")
        elif flag == "large_carb_load":
            risk_lines.append("  ⚠ Large carb load — uncertainty matters.")
    if not risk_lines:
        risk_lines.append("  Watch the expected peak window.")

    return [
        f'\n━━━ What-If ━━━\n💬 "{food_text}"\n' + _separator("Forecast") +
        f"\n  {carbs_g:.0f}g carbs, {fat_g:.0f}g fat, {sugars_g:.0f}g sugars"
        f"\n  → Peak: ~{peak_mg_dl} mg/dL at ~{peak_time_min} min"
        f"\n" + _separator("Risk Assessment") +
        "\n" + "\n".join(risk_lines) +
        "\n" + _separator("Suggestion") +
        "\n  Consider smaller portion or split over time."
        "\n  Monitor 1–4 hours."
        "\n  Educational — not medical advice.",
    ]


def troubleshoot_card(direction: str) -> list[str]:
    """Troubleshooting card for high or low."""
    if direction == "high":
        lines = [
            "\n━━━ Why Am I Going High? ━━━",
            "",
            "Possible causes (most likely first):",
            "  🍝 High carb meal still absorbing (up to 3 hrs)",
            "  🧈 Fat delaying the rise (if meal had >15g fat)",
            "  🌅 Dawn phenomenon (morning hormone rise)",
            "  💉 Insulin timing off (pre-bolus too short or missed)",
            "  🔄 Infusion site issue (if on pump)",
            "",
            "Suggestions:",
            "  • Check CGM trend arrow",
            "  • If >3 hrs post-meal, consider other factors",
            "  • Not medical advice — consult your care plan",
        ]
    else:
        lines = [
            "\n━━━ Why Am I Going Low? ━━━",
            "",
            "Possible causes (most likely first):",
            "  🏃 Exercise increased insulin sensitivity",
            "  🍺 Alcohol (can drop hours later)",
            "  ☀️ Heat increasing insulin absorption",
            "  💉 Too much insulin for meal/correction",
            "  ⏰ Delayed meal after bolus",
            "",
            "Suggestions:",
            "  • Check CGM trend and confirm with fingerstick",
            "  • Keep fast-acting carbs accessible",
            "  • If recurring, review with care team",
            "  • Not medical advice — consult your care plan",
        ]
    return ["\n".join(lines)]


def situation_card(category: str) -> list[str]:
    """Situational awareness card."""
    cards = {
        "heat": [
            "\n━━━ Heat & Glucose ━━━",
            "",
            "Heat can affect glucose in two ways:",
            "  🔻 Increases insulin sensitivity → risk of lows",
            "  🔺 Dehydration can concentrate blood → false highs",
            "",
            "Things to watch:",
            "  • Sweating can mask hypo symptoms",
            "  • CGM sensors may be less reliable in heat",
            "  • Stay hydrated — water, not sugary drinks",
            "",
            "Suggestions:",
            "  • Monitor more frequently",
            "  • Keep fast-acting carbs accessible",
            "  • Check sensor adhesive if sweating heavily",
            "  • Educational — not medical advice",
        ],
        "exercise": [
            "\n━━━ Exercise & Glucose ━━━",
            "",
            "Exercise affects glucose during and after activity:",
            "  🏃 During: glucose may drop (muscles consume sugar)",
            "  ⏰ After: increased insulin sensitivity for hours",
            "",
            "Factors to consider:",
            "  • Intensity and duration matter",
            "  • Time of day affects baseline trend",
            "  • Pre-exercise glucose level is key",
            "",
            "Suggestions:",
            "  • Check glucose before, during (if possible), and after",
            "  • Have fast-acting carbs on hand",
            "  • Be aware of delayed lows up to 12 hours later",
            "  • Educational — not medical advice",
        ],
        "alcohol": [
            "\n━━━ Alcohol & Glucose ━━━",
            "",
            "Alcohol has complex effects on glucose:",
            "  🍺 Initial: can cause a short rise (carbs in drinks)",
            "  ⏰ Delayed: hours later, alcohol blocks liver glucose release",
            "  🌙 Overnight: significant hypo risk, especially with insulin",
            "",
            "Important:",
            "  • Hypo symptoms (confusion, drowsiness) mimic intoxication",
            "  • Check before bed if you drank alcohol",
            "  • Eat food with alcohol to reduce hypo risk",
            "",
            "Suggestions:",
            "  • Set an overnight alarm to check glucose",
            "  • Do not bolus for alcohol alone",
            "  • Educational — not medical advice",
        ],
        "illness": [
            "\n━━━ Illness & Glucose ━━━",
            "",
            "Illness can raise glucose significantly:",
            "  🤒 Stress hormones increase glucose production",
            "  🩸 Infections often cause persistent highs",
            "  💧 Vomiting/diarrhoea cause dehydration and ketone risk",
            "",
            "Key things to do:",
            "  • Check glucose more frequently (every 2–4 hrs)",
            "  • Stay hydrated with water or sugar-free fluids",
            "  • Check ketones if glucose >250 mg/dL",
            "  • Have a sick-day plan with your care team",
            "",
            "Seek help if: vomiting >4 hours, can't keep fluids down,"
            " moderate/large ketones, or glucose persistently >300.",
            "Educational — not medical advice.",
        ],
    }
    return cards.get(category, ["Unknown situation"])


def morning_call_card() -> list[str]:
    """Morning routine check-in card."""
    return [
        "\n━━━ Morning Call ☀️ ━━━\n\n"
        "Good morning! Here is your overnight summary.\n\n"
        "  • Overnight low: none\n"
        "  • Current: 108 mg/dL → stable\n"
        "  • Overnight trend: in range (75%)\n"
        "  • Time in range (overnight): 80%\n\n"
        "Today's outlook:\n"
        "  → Similar to yesterday\n"
        "  → Watch for morning rise 7–9 AM\n"
        "  → Consider pre-breakfast check\n\n"
        "Educational — not medical advice."
    ]


def lunch_presser_card() -> list[str]:
    """Lunchtime routine check-in card."""
    return [
        "\n━━━ Lunch Presser 🥪 ━━━\n\n"
        "Midday check-in:\n\n"
        "  • Pre-lunch: 126 mg/dL → steady\n"
        "  • Morning summary: 1 spike (187 at 10 AM)\n"
        "  • Activity: none logged today\n\n"
        "Lunch tip:\n"
        "  Insulin sensitivity is typically higher at lunch.\n"
        "  If you walk after eating, glucose may drop more.\n\n"
        "Educational — not medical advice."
    ]


def evening_roundup_card() -> list[str]:
    """Evening routine check-in card."""
    return [
        "\n━━━ Evening Roundup 🌙 ━━━\n\n"
        "Today's summary:\n\n"
        "  • TIR (70–180 mg/dL): 78%\n"
        "  • Meals logged: 3\n"
        "  • Notable: post-dinner spike to 210 mg/dL\n"
        "  • Exercise: not yet logged\n\n"
        "Overnight watch:\n"
        "  → Check at 3 AM if >15g fat at dinner\n"
        "  → Set alert for overnight lows\n\n"
        "Educational — not medical advice."
    ]


def insights_card() -> list[str]:
    """Insights / pattern card."""
    return [
        "\n━━━ Insights ━━━\n\n"
        "Patterns detected from recent data:\n\n"
        "  📊 Breakfast: avg peak 185 at 90 min (consistent)\n"
        "  📊 Lunch: wider variance (exercise days lower)\n"
        "  📊 Dinner: fat delay pattern on high-fat meals\n"
        "  📊 Overnight: stable, rare lows\n\n"
        "Food-specific:\n"
        "  • Pizza (high fat): avg rise +56 mg/dL, peak ~120 min\n"
        "  • Cereal (fast carb): avg rise +72 mg/dL, peak ~45 min\n\n"
        "Educational — not medical advice."
    ]
