"""Pattern Genome analyzer for T1D Companion v2 — Issue #21.

Generates a user-specific pattern profile from 30/60/90-day food history.
Analyzes 6 trait dimensions:

  1. Breakfast spike tendency
  2. High-fat delayed rise tendency
  3. Exercise sensitivity
  4. Overnight risk
  5. Variability (consistency score)
  6. Repeat trigger foods

Each trait produces: evidence count, confidence tier, plain-language explanation.
All output is labeled "synthetic_legends_demo" when using legends data.

Uses the existing historical_meal_matcher.py patterns and legends.json food_history.
"""

from __future__ import annotations

import logging
from collections import Counter
from dataclasses import dataclass, field
from pathlib import Path
from statistics import mean, median, stdev
from typing import Any

logger = logging.getLogger(__name__)


# ── Data shapes ──

@dataclass
class TraitInsight:
    """Single pattern trait with evidence and explanation."""
    trait_id: str
    label: str
    description: str          # plain-language explanation
    evidence_count: int       # number of data points supporting this trait
    confidence: str           # "high" | "medium" | "low"
    confidence_score: float   # 0.0–1.0
    detail: str               # specific numbers / supporting detail
    icon: str = "🧬"


@dataclass
class PatternGenome:
    """Full pattern genome profile for a user."""
    profile_name: str
    data_source: str                           # "synthetic_legends_demo" or "real_history"
    total_meals_analyzed: int
    analysis_window_days: int
    traits: list[TraitInsight] = field(default_factory=list)
    top_trigger_foods: list[dict[str, Any]] = field(default_factory=list)
    summary_narrative: str = ""
    disclaimer: str = "Pattern analysis from simulated history (synthetic_legends_demo). Not medical advice."


# ── Per-meal-type helpers ──

_MEAL_TYPE_ALIASES = {
    "breakfast": ["breakfast", "morning"],
    "morning_snack": ["morning_snack", "morning snack"],
    "lunch": ["lunch", "midday"],
    "afternoon_snack": ["afternoon_snack", "afternoon snack"],
    "dinner": ["dinner", "evening"],
    "evening_snack": ["evening_snack", "evening snack", "night"],
}


def _filter_by_meal_type(rows: list[dict[str, Any]], meal_type: str) -> list[dict[str, Any]]:
    """Filter food history rows by meal type (handles aliases)."""
    aliases = _MEAL_TYPE_ALIASES.get(meal_type, [meal_type])
    return [r for r in rows if r.get("meal_type", "").lower().replace(" ", "_") in aliases]


def _safe_stdev(values: list[float]) -> float:
    """Safe standard deviation (0.0 for < 2 values)."""
    return stdev(values) if len(values) > 1 else 0.0


def _safe_mean(values: list[float]) -> float:
    """Safe mean (0.0 for empty list)."""
    return mean(values) if values else 0.0


def _confidence_tier(score: float) -> str:
    if score >= 0.8:
        return "high"
    if score >= 0.5:
        return "medium"
    return "low"


# ── Trait analyzers ──

def _analyze_breakfast_spike(rows: list[dict[str, Any]], anchor_type: str) -> TraitInsight:
    """Analyze breakfast spike tendency from morning meal history."""
    breakfast = _filter_by_meal_type(rows, "breakfast")
    if not breakfast:
        return TraitInsight(
            trait_id="breakfast_spike",
            label="Breakfast Spike",
            description="Insufficient breakfast history to determine pattern.",
            evidence_count=0, confidence="low", confidence_score=0.0,
            detail="No breakfast meals found in history.", icon="🍳")

    sugars = [r["sugars_g"] for r in breakfast if r.get("sugars_g", 0) > 0]
    carbs = [r["carb_estimate_g"] for r in breakfast if r.get("carb_estimate_g", 0) > 0]
    avg_sugar = _safe_mean(sugars)
    avg_carbs = _safe_mean(carbs)
    high_sugar_pct = len([s for s in sugars if s > 15]) / max(len(sugars), 1)

    # Spike = high sugar ratio at breakfast
    is_spike_prone = avg_sugar > 12 or high_sugar_pct > 0.5
    sugar_to_carb_ratio = avg_sugar / max(avg_carbs, 1)

    # Evidence score: more meals + higher ratio = higher confidence
    evidence = len(breakfast)
    conf_score = min(1.0, (evidence / 20) * 0.5 + (sugar_to_carb_ratio) * 0.5)

    if is_spike_prone:
        desc = (f"Your breakfasts tend to spike quickly — average {avg_sugar:.0f}g sugars "
                f"({sugar_to_carb_ratio:.0%} of carbs are sugars). "
                f"Fast carbs in the morning may push glucose up faster than other meals.")
        detail = (f"{evidence} breakfast meals analyzed. Avg sugar: {avg_sugar:.0f}g, "
                  f"avg carbs: {avg_carbs:.0f}g. {high_sugar_pct:.0%} of breakfasts have >15g sugar.")
    else:
        desc = (f"Your breakfasts show moderate sugar content — average {avg_sugar:.0f}g sugars "
                f"({sugar_to_carb_ratio:.0%} of carbs). "
                f"Morning glucose rise may be more gradual.")
        detail = (f"{evidence} breakfast meals analyzed. Avg sugar: {avg_sugar:.0f}g, "
                  f"avg carbs: {avg_carbs:.0f}g.")

    return TraitInsight(
        trait_id="breakfast_spike", label="Breakfast Spike Tendency",
        description=desc, evidence_count=evidence,
        confidence=_confidence_tier(conf_score), confidence_score=round(conf_score, 3),
        detail=detail, icon="🍳")


def _analyze_fat_delay_tendency(rows: list[dict[str, Any]], anchor_type: str) -> TraitInsight:
    """Analyze high-fat delayed rise tendency from dinner meals."""
    # Focus on dinner only — evening snacks are typically low-fat and dilute the signal
    dinner = _filter_by_meal_type(rows, "dinner")

    if not dinner:
        return TraitInsight(
            trait_id="fat_delay", label="Fat Delay",
            description="Insufficient dinner history to determine fat delay pattern.",
            evidence_count=0, confidence="low", confidence_score=0.0,
            detail="No dinner meals found.", icon="🧈")

    fats = [r["fat_g"] for r in dinner if r.get("fat_g", 0) > 0]
    avg_fat = _safe_mean(fats)
    high_fat_count = len([f for f in fats if f > 20])
    high_fat_pct = high_fat_count / max(len(fats), 1)
    evidence = len(dinner)

    # Fat delay = regularly eating high-fat dinners (>20g avg or >40% high-fat meals)
    is_delay_prone = avg_fat > 18 or high_fat_pct > 0.4
    conf_score = min(1.0, (evidence / 20) * 0.4 + (high_fat_pct) * 0.3 + (avg_fat / 50) * 0.3)

    if is_delay_prone:
        desc = (f"Your dinners tend to be higher in fat (avg {avg_fat:.0f}g). "
                f"Fat can delay glucose peak by 1–3 hours. "
                f"Watch the 3–5 hour window after dinner, not just the first 2 hours.")
        detail = (f"{evidence} dinner meals. Avg fat: {avg_fat:.0f}g. "
                  f"{high_fat_pct:.0%} of dinners have >20g fat.")
    else:
        desc = (f"Your dinners are relatively moderate in fat (avg {avg_fat:.0f}g). "
                f"Delayed rises are less likely — the standard 1–3 hour monitoring window applies.")
        detail = (f"{evidence} dinner meals. Avg fat: {avg_fat:.0f}g.")

    return TraitInsight(
        trait_id="fat_delay", label="High-Fat Delayed Rise",
        description=desc, evidence_count=evidence,
        confidence=_confidence_tier(conf_score), confidence_score=round(conf_score, 3),
        detail=detail, icon="🧈")


def _analyze_exercise_sensitivity(rows: list[dict[str, Any]], anchor_type: str) -> TraitInsight:
    """Analyze exercise sensitivity from afternoon snack patterns and anchor profile."""
    # Use afternoon snack timing as proxy for activity-related meals
    afternoon = _filter_by_meal_type(rows, "afternoon_snack")
    dinner = _filter_by_meal_type(rows, "dinner")
    combined = afternoon + dinner

    if not combined:
        return TraitInsight(
            trait_id="exercise_sensitivity", label="Exercise Sensitivity",
            description="Insufficient data to determine exercise-glucose relationship.",
            evidence_count=0, confidence="low", confidence_score=0.0,
            detail="No afternoon meals found.", icon="🏃")

    carbs = [r["carb_estimate_g"] for r in combined if r.get("carb_estimate_g", 0) > 0]
    avg_carbs = _safe_mean(carbs)
    carb_std = _safe_stdev(carbs)
    evidence = len(combined)

    # High variability in afternoon/dinner carbs may indicate timing-sensitive eating
    # (e.g., eating more on exercise days)
    cv = carb_std / max(avg_carbs, 1)  # coefficient of variation
    is_variable = cv > 0.35

    conf_score = min(1.0, (evidence / 15) * 0.5 + (cv) * 0.5)

    if is_variable:
        desc = (f"Your afternoon/dinner carb intake varies significantly (CV: {cv:.0%}). "
                f"This may reflect activity-day eating patterns. "
                f"Consider how exercise timing relates to your meals.")
        detail = (f"{evidence} meals analyzed. Avg carbs: {avg_carbs:.0f}g, "
                  f"std dev: {carb_std:.0f}g (CV: {cv:.0%}). "
                  f"Variable intake may correlate with activity changes.")
    else:
        desc = (f"Your afternoon/dinner carb intake is relatively consistent (CV: {cv:.0%}). "
                f"Exercise-related glucose swings may be more predictable.")
        detail = (f"{evidence} meals analyzed. Avg carbs: {avg_carbs:.0f}g, "
                  f"CV: {cv:.0%}.")

    return TraitInsight(
        trait_id="exercise_sensitivity", label="Exercise Sensitivity",
        description=desc, evidence_count=evidence,
        confidence=_confidence_tier(conf_score), confidence_score=round(conf_score, 3),
        detail=detail, icon="🏃")


def _analyze_overnight_risk(rows: list[dict[str, Any]], anchor_type: str) -> TraitInsight:
    """Analyze overnight risk from dinner + evening snack patterns."""
    dinner = _filter_by_meal_type(rows, "dinner")
    evening = _filter_by_meal_type(rows, "evening_snack")
    combined = dinner + evening

    if not combined:
        return TraitInsight(
            trait_id="overnight_risk", label="Overnight Risk",
            description="Insufficient evening meal data to assess overnight risk.",
            evidence_count=0, confidence="low", confidence_score=0.0,
            detail="No dinner/evening meals found.", icon="🌙")

    fats = [r["fat_g"] for r in combined if r.get("fat_g", 0) > 0]
    carbs = [r["carb_estimate_g"] for r in combined if r.get("carb_estimate_g", 0) > 0]
    avg_fat = _safe_mean(fats)
    avg_carbs = _safe_mean(carbs)
    evidence = len(combined)

    # Risk factors: high fat (>20g) + high carbs (>60g) = delayed overnight rise
    # Low carbs (<40g) + no snack = possible overnight low
    high_risk_meals = len([r for r in combined
                          if r.get("fat_g", 0) > 20 and r.get("carb_estimate_g", 0) > 50])
    low_risk_meals = len([r for r in combined
                         if r.get("carb_estimate_g", 0) < 30])
    risk_ratio = high_risk_meals / max(evidence, 1)

    conf_score = min(1.0, (evidence / 20) * 0.5 + (risk_ratio) * 0.3 + (avg_fat / 50) * 0.2)

    if risk_ratio > 0.3:
        desc = (f"Your evening meals are often high in both fat and carbs. "
                f"This combination can cause a delayed rise that peaks overnight. "
                f"Consider setting an alert for 3–5 hours after dinner.")
        detail = (f"{evidence} evening meals. {high_risk_meals} ({risk_ratio:.0%}) are high-fat+high-carb. "
                  f"Avg fat: {avg_fat:.0f}g, avg carbs: {avg_carbs:.0f}g.")
    elif low_risk_meals > evidence * 0.5:
        desc = (f"Your dinners tend to be lighter (avg {avg_carbs:.0f}g carbs). "
                f"Overnight lows are possible if you take insulin — keep a snack by the bed.")
        detail = (f"{evidence} evening meals. {low_risk_meals} ({low_risk_meals/max(evidence,1):.0%}) "
                  f"have <30g carbs. Avg carbs: {avg_carbs:.0f}g.")
    else:
        desc = (f"Your evening meals are moderate (avg {avg_carbs:.0f}g carbs, {avg_fat:.0f}g fat). "
                f"Standard overnight monitoring (check at 3 AM) is recommended.")
        detail = (f"{evidence} evening meals. Avg carbs: {avg_carbs:.0f}g, avg fat: {avg_fat:.0f}g.")

    return TraitInsight(
        trait_id="overnight_risk", label="Overnight Risk",
        description=desc, evidence_count=evidence,
        confidence=_confidence_tier(conf_score), confidence_score=round(conf_score, 3),
        detail=detail, icon="🌙")


def _analyze_variability(rows: list[dict[str, Any]], anchor_type: str) -> TraitInsight:
    """Analyze overall glucose variability from meal consistency."""
    if len(rows) < 10:
        return TraitInsight(
            trait_id="variability", label="Variability",
            description="Insufficient meal history to assess variability.",
            evidence_count=len(rows), confidence="low", confidence_score=0.0,
            detail=f"Only {len(rows)} meals in history.", icon="📊")

    carbs = [r["carb_estimate_g"] for r in rows if r.get("carb_estimate_g", 0) > 0]
    if len(carbs) < 5:
        return TraitInsight(
            trait_id="variability", label="Variability",
            description="Insufficient carb data to assess variability.",
            evidence_count=len(carbs), confidence="low", confidence_score=0.0,
            detail=f"Only {len(carbs)} meals with carb data.", icon="📊")

    avg = mean(carbs)
    std = _safe_stdev(carbs)
    cv = std / max(avg, 1)
    evidence = len(carbs)

    conf_score = min(1.0, (evidence / 50) * 0.4 + min(cv, 1.0) * 0.6)

    if cv > 0.4:
        desc = (f"Your carb intake is highly variable (CV: {cv:.0%}). "
                f"This makes glucose outcomes harder to predict. "
                f"Consider more consistent meal sizes or tracking patterns by day of week.")
        detail = f"{evidence} meals. Mean carbs: {avg:.0f}g, std dev: {std:.0f}g (CV: {cv:.0%})."
    elif cv > 0.25:
        desc = (f"Your carb intake shows moderate variability (CV: {cv:.0%}). "
                f"Some predictability, but portion consistency could improve forecasts.")
        detail = f"{evidence} meals. Mean carbs: {avg:.0f}g, std dev: {std:.0f}g (CV: {cv:.0%})."
    else:
        desc = (f"Your carb intake is fairly consistent (CV: {cv:.0%}). "
                f"This makes glucose outcomes more predictable.")
        detail = f"{evidence} meals. Mean carbs: {avg:.0f}g, std dev: {std:.0f}g (CV: {cv:.0%})."

    return TraitInsight(
        trait_id="variability", label="Meal-to-Meal Variability",
        description=desc, evidence_count=evidence,
        confidence=_confidence_tier(conf_score), confidence_score=round(conf_score, 3),
        detail=detail, icon="📊")


def _analyze_trigger_foods(rows: list[dict[str, Any]], anchor_type: str) -> TraitInsight:
    """Identify repeat trigger foods — items that appear frequently in the history."""
    foods = [r.get("food", "") for r in rows if r.get("food")]
    if not foods:
        return TraitInsight(
            trait_id="trigger_foods", label="Repeat Trigger Foods",
            description="No food names found in history.",
            evidence_count=0, confidence="low", confidence_score=0.0,
            detail="No food names in data.", icon="🍽️")

    counter = Counter(foods)
    most_common = counter.most_common(5)
    total_unique = len(counter)
    evidence = len(foods)

    # Trigger foods = items appearing more than expected (>3x average frequency)
    avg_freq = evidence / max(total_unique, 1)
    triggers = [(name, count) for name, count in most_common if count > avg_freq * 2]

    conf_score = min(1.0, (evidence / 100) * 0.3 + (len(triggers) / 5) * 0.3 + 0.4)

    if triggers:
        trigger_str = ", ".join(f"{name} ({count}x)" for name, count in triggers[:3])
        desc = (f"Your most repeated meals: {trigger_str}. "
                f"These form your 'usual' patterns — deviations from these may "
                f"lead to less predictable glucose outcomes.")
    else:
        desc = (f"You have {total_unique} unique meals in your history — high variety. "
                f"No single food dominates, which makes patterns harder to spot.")
        trigger_str = "n/a"

    top_detail = "; ".join(f"{name}: {count}x" for name, count in most_common[:5])
    detail = (f"{evidence} meals, {total_unique} unique foods. "
              f"Top 5: {top_detail}. Avg frequency: {avg_freq:.1f}x.")

    return TraitInsight(
        trait_id="trigger_foods", label="Repeat Trigger Foods",
        description=desc, evidence_count=evidence,
        confidence=_confidence_tier(conf_score), confidence_score=round(conf_score, 3),
        detail=detail, icon="🍽️")


# ── Main analysis function ──

def analyze_pattern_genome(
    food_history: list[dict[str, Any]],
    profile_name: str = "User",
    anchor_type: str = "",
    *,
    data_source: str = "synthetic_legends_demo",
    window_days: int = 90,
) -> PatternGenome:
    """Generate a Pattern Genome profile from food history.

    Args:
        food_history: List of meal records from food_history (legends.json format).
        profile_name: Name/label for this profile.
        anchor_type: The T1D anchor type for calibration context.
        data_source: "synthetic_legends_demo" or "real_history".
        window_days: Analysis window (30, 60, or 90).

    Returns:
        PatternGenome with 6 trait analyses.
    """
    if not food_history:
        return PatternGenome(
            profile_name=profile_name, data_source=data_source,
            total_meals_analyzed=0, analysis_window_days=window_days,
            summary_narrative="No meal history available for pattern analysis.",
        )

    # Run all 6 trait analyzers
    traits: list[TraitInsight] = [
        _analyze_breakfast_spike(food_history, anchor_type),
        _analyze_fat_delay_tendency(food_history, anchor_type),
        _analyze_exercise_sensitivity(food_history, anchor_type),
        _analyze_overnight_risk(food_history, anchor_type),
        _analyze_variability(food_history, anchor_type),
        _analyze_trigger_foods(food_history, anchor_type),
    ]

    # Compute top trigger foods for separate display
    foods = [r.get("food", "") for r in food_history if r.get("food")]
    counter = Counter(foods)
    top_triggers = [
        {"food": name, "count": count, "frequency_pct": round(count / max(len(foods), 1) * 100, 1)}
        for name, count in counter.most_common(5)
    ]

    # Build summary narrative
    high_conf_traits = [t for t in traits if t.confidence == "high"]
    med_conf_traits = [t for t in traits if t.confidence == "medium"]
    overall_conf = round(mean([t.confidence_score for t in traits]), 3) if traits else 0.0

    parts = [f"Pattern genome from {len(food_history)} meals over {window_days} days."]
    if high_conf_traits:
        parts.append(f"Strong patterns found: {', '.join(t.label for t in high_conf_traits)}.")
    if med_conf_traits:
        parts.append(f"Moderate patterns: {', '.join(t.label for t in med_conf_traits)}.")
    parts.append(f"Overall confidence: {_confidence_tier(overall_conf)} ({overall_conf:.0%}).")

    return PatternGenome(
        profile_name=profile_name,
        data_source=data_source,
        total_meals_analyzed=len(food_history),
        analysis_window_days=window_days,
        traits=traits,
        top_trigger_foods=top_triggers,
        summary_narrative=" ".join(parts),
    )


def render_pattern_genome_card(genome: PatternGenome) -> list[str]:
    """Render the Pattern Genome as a terminal card.

    Returns a list of card strings for the meal pipeline.
    """
    lines: list[str] = []

    source_label = "synthetic legends demo data" if genome.data_source == "synthetic_legends_demo" else "real user history"
    lines.append(f"  Analyzed {genome.total_meals_analyzed} meals over {genome.analysis_window_days} days ({source_label}).")
    lines.append("")

    # Render each trait
    for trait in genome.traits:
        icon = trait.icon
        conf_icon = "🟢" if trait.confidence == "high" else "🟡" if trait.confidence == "medium" else "🔴"
        lines.append(f"  {icon} {trait.label}  {conf_icon} {trait.confidence} ({trait.evidence_count} data points)")
        lines.append(f"     {trait.description}")
        if trait.detail:
            lines.append(f"     📋 {trait.detail}")
        lines.append("")

    # Top trigger foods
    if genome.top_trigger_foods:
        lines.append("  🍽️ Most frequent meals:")
        for tf in genome.top_trigger_foods[:5]:
            lines.append(f"     • {tf['food']} — {tf['count']} times ({tf['frequency_pct']:.0f}% of meals)")
        lines.append("")

    lines.append(f"  ⚠️ {genome.disclaimer}")

    return [
        "\n━━━ Pattern Genome ━━━",
        "",
        f"  Profile: {genome.profile_name}",
        "",
    ] + lines


# ── Convenience: analyze from legends.json ──

def genome_from_legends(anchor_type: str, profile_name: str = "") -> PatternGenome:
    """Load a legend by anchor_type and generate its pattern genome."""
    from src.cli import _load_legends

    legends = _load_legends()
    legend = next((l for l in legends if l["anchor_type"] == anchor_type), None)
    if legend is None:
        return PatternGenome(
            profile_name=profile_name or anchor_type,
            data_source="synthetic_legends_demo",
            total_meals_analyzed=0, analysis_window_days=90,
            summary_narrative=f"No legend found for anchor: {anchor_type}",
        )

    name = profile_name or legend.get("anchor_label", anchor_type)
    return analyze_pattern_genome(
        food_history=legend["food_history"],
        profile_name=name,
        anchor_type=anchor_type,
        data_source="synthetic_legends_demo",
        window_days=90,
    )
