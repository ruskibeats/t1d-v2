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
    counterfactual_text: str = "",
    safety: dict[str, Any] | None = None,
    pattern_genome: dict[str, Any] | None = None,
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

    # Card 2: Food evidence with top contributor and uncertainty
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
        top_reason = item.get("top_uncertainty_reason", "")
        if top_reason:
            lines.append(f"    💡 Main uncertainty: {top_reason}")
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
    sugars = meal_totals.get("sugars_g", 0)
    top_carb = meal_totals.get("top_carb_contributor", "")
    absorption = meal_totals.get("absorption_profile", "standard")
    uncertainty_items = meal_totals.get("top_uncertainty_items", [])
    profile_tags = {"fast": "fast spike risk", "delayed": "late rise risk", "mixed": "mixed absorption", "standard": "standard absorption"}
    tag = profile_tags.get(absorption, "")
    lines = [
        f"  Meal: {carbs}g carbs, {fat}g fat, {sugars}g sugars",
        f"  → Absorption: {tag}",
        f"  → Top driver: {top_carb}",
        f"  → Peak: ~{peak} mg/dL at ~{peak_time} min",
        f"  → Range: {pr[0]}–{pr[1]} mg/dL",
        f"  → Timing: {tr[0]}–{tr[1]} min",
        f"  → Baseline: {baseline} mg/dL",
    ]
    cards.append(_separator("Step 3: Forecast") + "\n" + "\n".join(lines) + "\n" + chart)

    # Card 4: Meal Memory — historical context
    if historical_context.get("similar_meals_count"):
        hist_count = historical_context["similar_meals_count"]
        avg_rise = historical_context.get("avg_peak_rise_mg_dl", "?")
        avg_time = historical_context.get("avg_peak_time_minutes", "?")
        rise_range = historical_context.get("peak_rise_range_mg_dl", None)
        similarity_reason = historical_context.get("similarity_reason", "")
        what_changed = historical_context.get("what_changed_note", "")
        best_outcome = historical_context.get("best_past_outcome", "")
        worst_outcome = historical_context.get("worst_past_outcome", "")
        consistency_tier = historical_context.get("consistency_tier", "")
        consistency_score = historical_context.get("consistency_score", 0)
        confidence_tier = historical_context.get("confidence_tier", "")
        evidence_count = historical_context.get("evidence_count", {})
        data_source = historical_context.get("data_source", "")
        top_meals = historical_context.get("top_meals", [])
        case_based_observations = historical_context.get("case_based_observations", [])

        lines = [
            f"  {hist_count} meals matched | {similarity_reason}" if similarity_reason else f"  {hist_count} meals matched",
        ]

        # Top 3 meals with outcome detail
        if top_meals:
            lines.append("")
            lines.append("  Top matches:")
            for i, meal in enumerate(top_meals, 1):
                outcome_str = f"{meal['peak_rise_mg_dl']} mg/dL @ {meal['peak_time_min']} min" if meal.get('has_outcome') else "(no CGM outcome)"
                sim_str = f"sim: {meal['similarity']:.0%}"
                lines.append(f"    {i}. {meal['food']} | {meal['carbs_g']}g carbs | {outcome_str} | {sim_str}")
            lines.append("")

        # Summary stats
        if avg_rise and rise_range and rise_range[0]:
            lines.append(f"  Typical rise: {avg_rise} mg/dL (range {rise_range[0]}–{rise_range[1]} mg/dL)")
        if avg_time:
            lines.append(f"  Peak timing: ~{avg_time} min")
        if consistency_tier and consistency_tier != "unknown":
            lines.append(f"  Consistency: {consistency_tier} (score: {consistency_score})")
        if confidence_tier and confidence_tier != "unknown":
            lines.append(f"  Confidence: {confidence_tier}")
        if what_changed:
            lines.append(f"  What changed: {what_changed}")
        if best_outcome:
            lines.append(f"  {best_outcome}")
        if worst_outcome:
            lines.append(f"  {worst_outcome}")
        for obs in case_based_observations[:2]:
            lines.append(f"  Note: {obs}")

        # Evidence count
        if evidence_count and evidence_count.get("total_matches", 0) > 0:
            lines.append(f"  Evidence: {evidence_count['with_cgm_outcome']} meals with CGM outcome, {evidence_count['food_only']} food-only records")

        # Data source label
        if data_source == "synthetic_legends_demo":
            lines.append("  Source: synthetic legends demo data")

        cards.append(_separator("Step 4: Meal Memory") + "\n" + "\n".join(lines))
    else:
        cards.append(_separator("Step 4: Meal Memory") + "\n  No similar meals found (data source: no_history).")

    # Card 5: Counterfactual what-if scenarios
    cf_cards = counterfactual_scenarios_card(counterfactual_text)
    if cf_cards:
        cards.extend(cf_cards)

    # Card 6: Monitoring
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
    for u in uncertainty_items[:1]:
        lines.append(f"  💡 Key uncertainty: {u}")
    if not lines:
        lines.append("  Watch the expected peak window and compare with your trend.")
    lines.append("\n  Educational simulation only — not medical advice.")
    cards.append(_separator("Step 6: Monitoring") + "\n" + "\n".join(lines))

    # Card 7: Data Quality & Confidence
    conf_cards = confidence_card(
        food_evidence=food_evidence,
        forecast=forecast,
        historical_context=historical_context,
        safety=safety,
    )
    if conf_cards:
        cards.extend(conf_cards)

    # Card 8: Pattern Genome
    if pattern_genome and pattern_genome.get("traits"):
        genome_cards = _render_pattern_card(pattern_genome)
        cards.extend(genome_cards)

    return cards


def confidence_card(
    food_evidence: list[dict[str, Any]],
    forecast: dict[str, Any],
    historical_context: dict[str, Any],
    safety: dict[str, Any] | None = None,
) -> list[str]:
    """Build a Step 7: Data Quality & Confidence card.

    Shows:
    - Overall confidence tier with explanation
    - Per-item food confidence with decomposed uncertainty
    - Forecast uncertainty (peak range)
    - Historical consistency
    - Safety status
    - Missing information flags
    """
    lines: list[str] = []

    # Gather confidence signals
    food_confidences = [
        (item.get("parsed", {}).get("item", "?"),
         item.get("confidence", "?"),
         item.get("identity_confidence", "") or item.get("confidence", ""),
         item.get("portion_uncertainty_pct", 0),
         item.get("nutrition_variance_pct", 0),
         item.get("top_uncertainty_reason", ""),
         item.get("warnings", []))
        for item in food_evidence
        if item.get("computed")
    ]

    # Overall confidence (derived from lowest per-item confidence)
    conf_tiers = [c[1] for c in food_confidences]
    if "low" in conf_tiers:
        overall_tier = "low"
        overall_color = "🔴"
    elif conf_tiers and all(c == "high" for _, c, *_ in food_confidences):
        overall_tier = "high"
        overall_color = "🟢"
    else:
        overall_tier = "medium"
        overall_color = "🟡"

    explanations = []

    # Per-item confidence breakdown
    for name, conf, identity_conf, portion_pct, nutrition_pct, reason, warnings in food_confidences:
        icon = "🟢" if conf == "high" else "🟡" if conf == "medium" else "🔴"
        lines.append(f"  {icon} {name}: conf={conf}")
        if reason:
            lines.append(f"     💡 {reason}")
        if identity_conf and identity_conf != conf:
            lines.append(f"     Identity: {identity_conf}")
        if portion_pct > 0:
            label = "high" if portion_pct >= 0.3 else "moderate" if portion_pct >= 0.15 else "low"
            lines.append(f"     Portion uncertainty: {label} ({portion_pct:.0%})")
        if nutrition_pct > 0:
            label = "high" if nutrition_pct >= 0.3 else "moderate" if nutrition_pct >= 0.15 else "low"
            lines.append(f"     Nutrition variance: {label} ({nutrition_pct:.0%})")
        for w in warnings:
            lines.append(f"     ⚠ {w}")

    lines.append("")

    # Forecast uncertainty
    band = forecast.get("uncertainty_band", {})
    pr = band.get("peak_range_mg_dl")
    tr = band.get("peak_time_range_minutes")
    if pr and len(pr) == 2 and pr[0] != pr[1]:
        spread = pr[1] - pr[0]
        uncert_label = "high" if spread > 40 else "moderate" if spread > 20 else "low"
        lines.append(f"  Forecast uncertainty: {uncert_label} (peak range {pr[0]}–{pr[1]} mg/dL)")
        if tr and len(tr) == 2 and tr[0] != tr[1]:
            lines.append(f"  Timing uncertainty: {tr[0]}–{tr[1]} min")
    else:
        lines.append(f"  Forecast uncertainty: not estimated (single-point forecast)")

    lines.append("")

    # Historical consistency
    hist_count = historical_context.get("similar_meals_count", 0)
    hist_consistency = historical_context.get("consistency_tier", "")
    hist_score = historical_context.get("consistency_score", 0)
    if hist_count:
        cons_icon = "🟢" if hist_consistency == "high" else "🟡" if hist_consistency == "medium" else "🔴"
        lines.append(f"  {cons_icon} Historical consistency: {hist_consistency} (score: {hist_score})")
        lines.append(f"     Based on {hist_count} similar meals")
    else:
        lines.append(f"  ⚫ Historical consistency: no data")

    lines.append("")

    # Safety status
    if safety:
        is_safe = safety.get("is_safe", True)
        risk = safety.get("risk_level", "none")
        safe_icon = "🟢" if is_safe else "🔴"
        safe_label = "Passed" if is_safe else "Flagged"
        lines.append(f"  {safe_icon} Safety gate: {safe_label} (risk: {risk})")
        if not is_safe:
            for phrase in safety.get("blocked_phrases", []):
                lines.append(f"     ⚠ Blocked phrase: {phrase}")
            reason = safety.get("reason", "")
            if reason:
                lines.append(f"     Reason: {reason}")
    else:
        lines.append(f"  ⚫ Safety gate: not checked")

    return [_separator("Step 7: Data Quality & Confidence") + "\n" + "\n".join(lines)]


def counterfactual_scenarios_card(
    counterfactual_text: str,
) -> list[str]:
    """Add counterfactual what-if scenarios as a companion card.
    
    Shows smaller portion, lower-fat, different timing, and separate snack
    scenarios with comparison metrics.
    """
    if not counterfactual_text:
        return []
    # The rendered text starts with a separator already; add Step label
    # The rendered text typically starts with a leading newline, e.g.
    # "\n━━━ What-If Scenarios ━━━\n  ...". Find the separator line.
    for line in counterfactual_text.split("\n"):
        if "What-If Scenarios" in line:
            # Strip everything up to and including that line
            idx = counterfactual_text.find(line)
            remainder = counterfactual_text[idx + len(line):]
            return [_separator("Step 5: What-If Scenarios") + remainder]
    return [counterfactual_text]


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


def counterfactual_note_card(
    food_text: str,
    carbs_g: float,
    sugars_g: float,
    top_food_name: str,
    similar_better_meals: list[dict[str, Any]],
) -> list[str]:
    """Generate a counterfactual note: 'Without X, this meal would likely be lower risk.'
    
    Compares the current meal to similar meals that had better glucose outcomes
    and generates an educational what-if note.
    """
    if not similar_better_meals:
        return []

    note_lines = [
        "\n━━━ What-If Note ━━━",
    ]

    # Find the best comparison: similar carbs but lower sugar/simpler composition
    simpler_alternatives = [
        m for m in similar_better_meals
        if m.get("carbs_g", 0) > 0
    ][:3]

    if simpler_alternatives:
        avg_better_carbs = sum(m["carbs_g"] for m in simpler_alternatives) / len(simpler_alternatives)
        avg_better_peak = sum(m.get("peak_glucose", 0) for m in simpler_alternatives if m.get("peak_glucose")) / max(1, sum(1 for m in simpler_alternatives if m.get("peak_glucose")))
        carb_diff = carbs_g - avg_better_carbs

        if carb_diff > 10 and top_food_name:
            note_lines += [
                f"\n  Similar meals without the {top_food_name} had lower glucose impact.",
                f"\n  Typical composition: {avg_better_carbs:.0f}g carbs"
                f"\n  Typical peak: ~{avg_better_peak:.0f} mg/dL",
                f"\n  This meal: {carbs_g:.0f}g carbs",
                f"\n  Estimated difference: ~{carb_diff:.0f}g fewer carbs without the {top_food_name}.",
            ]
        elif simpler_alternatives:
            best = simpler_alternatives[0]
            note_lines += [
                f"\n  Meals like this one had a typical peak around {best.get('peak_glucose', '?')} mg/dL.",
                f"\n  Your estimated peak may be higher — monitor and compare.",
            ]
    else:
        note_lines.append("\n  No sufficiently similar historical meals for comparison yet.")

    return ["\n".join(note_lines)]


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


def _render_pattern_card(genome_dict: dict[str, Any]) -> list[str]:
    """Render a Pattern Genome card from a genome dict (Step 8)."""
    lines: list[str] = []
    traits = genome_dict.get("traits", [])
    source = genome_dict.get("data_source", "unknown")
    total_meals = genome_dict.get("total_meals_analyzed", 0)
    window = genome_dict.get("analysis_window_days", 90)

    source_label = "synthetic legends demo data" if source == "synthetic_legends_demo" else "real user history"
    lines.append(f"  Analyzed {total_meals} meals over {window} days ({source_label}).")
    lines.append("")

    for trait in traits:
        icon = trait.get("icon", "🧬")
        conf = trait.get("confidence", "low")
        conf_icon = "🟢" if conf == "high" else "🟡" if conf == "medium" else "🔴"
        evidence = trait.get("evidence_count", 0)
        lines.append(f"  {icon} {trait.get('label', '?')}  {conf_icon} {conf} ({evidence} data points)")
        lines.append(f"     {trait.get('description', '')}")
        detail = trait.get("detail", "")
        if detail:
            lines.append(f"     📋 {detail}")
        lines.append("")

    trigger_foods = genome_dict.get("top_trigger_foods", [])
    if trigger_foods:
        lines.append("  🍽️ Most frequent meals:")
        for tf in trigger_foods[:5]:
            lines.append(f"     • {tf.get('food', '?')} — {tf.get('count', 0)} times ({tf.get('frequency_pct', 0):.0f}% of meals)")
        lines.append("")

    disclaimer = genome_dict.get("disclaimer", "Pattern analysis — not medical advice.")
    lines.append(f"  ⚠️ {disclaimer}")

    return ["\n━━━ Pattern Genome ━━━", ""] + lines


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


def clarification_card(question: str, food_item: str) -> str:
    """Clarification request card (delegates to clarification_loop for consistent rendering)."""
    from src.clarification_loop import clarification_card as _cc
    return _cc(question, food_item)


def debrief_card(
    foods_logged: list[str] | None = None,
    carb_totals: dict[str, float] | None = None,
    forecast: dict[str, Any] | None = None,
    historical_context: dict[str, Any] | None = None,
) -> list[str]:
    """Daily debrief / Glucose Story of the Day card.

    Uses generate_daily_debrief() for dynamic content when data is provided,
    otherwise falls back to a static placeholder.
    """
    if foods_logged is None:
        foods_logged = []
    if carb_totals is None:
        carb_totals = {}

    try:
        from app.services.daily_debrief import generate_daily_debrief
        debrief = generate_daily_debrief(
            foods_logged=foods_logged,
            carb_totals=carb_totals,
            forecast=forecast,
            historical_context=historical_context,
        )
    except Exception:
        debrief = {}

    lines = [
        "\n━━━ Daily Debrief 🌙 ━━━\n",
        "Today's glucose story:\n",
    ]

    # Meals logged
    if foods_logged:
        lines.append(f"  • Meals logged: {', '.join(foods_logged)}")
    else:
        lines.append("  • Meals logged: none today")

    # Top driver
    top_driver = debrief.get("top_driver", {})
    if top_driver.get("amount_g"):
        lines.append(f"  • Top driver: {top_driver.get('driver_type', 'carbs')} ({top_driver['amount_g']:.0f}g total)")
    else:
        lines.append("  • Top driver: carbs (primary contributor)")

    # Most useful observation
    observation = debrief.get("most_useful_observation", "")
    if observation:
        lines.append(f"  • Biggest observation: {observation}")

    lines.append("")
    lines.append("Evidence & context:")

    evidence = debrief.get("evidence_counts", {})
    if evidence.get("similar_meals_analyzed", 0) > 0:
        lines.append(f"  Based on {evidence['similar_meals_analyzed']} similar historical meals plus forecast uncertainty.")
    else:
        lines.append("  Based on forecast uncertainty — add meal history for better context.")

    tier = evidence.get("confidence_tier", "unknown")
    lines.append(f"  Confidence: {tier}")

    # Delayed rise risk
    delayed_rise = debrief.get("delayed_rise_risk", {})
    if delayed_rise.get("risk_level") in ("high", "medium"):
        lines.append(f"  ⚠ Delayed rise risk: {delayed_rise['risk_level']}")
        note = delayed_rise.get("note", "")
        if note:
            lines.append(f"     {note}")

    # Overnight watch
    overnight = debrief.get("overnight_watch", [])
    if overnight:
        lines.append("")
        lines.append("Overnight watch:")
        for item in overnight[:3]:
            lines.append(f"  • {item}")

    # Tomorrow's watch-outs
    tomorrow = debrief.get("tomorrow_watch", [])
    if tomorrow:
        lines.append("")
        lines.append("Tomorrow's watch-outs:")
        for item in tomorrow[:3]:
            lines.append(f"  • {item}")

    # Unusual events
    unusual = debrief.get("unusual_events", [])
    if unusual:
        lines.append("")
        lines.append("Notable patterns:")
        for event in unusual[:2]:
            lines.append(f"  • {event.get('description', '')}")

    lines.append("")
    lines.append("Educational — not medical advice.")

    return ["\n".join(lines)]
