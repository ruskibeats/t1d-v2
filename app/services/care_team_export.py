"""Clinician / care-team Markdown export pack.

The export is evidence-only and intended for sharing observed simulator/demo
patterns with a clinician or care team. It must not include medication, device,
or care-plan instructions.
"""

from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from typing import Any
import re

from app.services.pattern_genome import analyze_pattern_genome


_SYNTHETIC_SOURCE = "synthetic_legends_demo"


def _source_label(data_source: str) -> str:
    if data_source == _SYNTHETIC_SOURCE:
        return "Synthetic/demo data source: synthetic_legends_demo"
    return f"Data source: {data_source or 'unspecified'}"


def _fmt(value: Any, default: str = "?") -> str:
    if value is None or value == "":
        return default
    return str(value)


def _sanitize_safety_terms(text: str) -> str:
    """Remove terms that could be read as device/medication guidance."""
    replacements = {
        "insulin": "medication",
        "bolus": "meal-time medication",
        "injection": "medication delivery",
        "inject": "use medication",
        "dosing": "medication planning",
        "dose": "amount",
        "treatment": "care plan",
        "units of": "amount of",
    }
    safe = text
    for term, replacement in replacements.items():
        safe = re.sub(re.escape(term), replacement, safe, flags=re.IGNORECASE)
    return safe


def _top_meal_examples(food_history: list[dict[str, Any]], limit: int = 5) -> list[dict[str, Any]]:
    examples = sorted(
        food_history,
        key=lambda row: (row.get("carb_estimate_g", 0), row.get("fat_g", 0), row.get("sugars_g", 0)),
        reverse=True,
    )
    return examples[:limit]


def render_care_team_export_markdown(
    legend: dict[str, Any],
    *,
    generated_at: datetime | None = None,
    data_source: str = _SYNTHETIC_SOURCE,
) -> str:
    """Render a Markdown care-team export from a legend/profile dictionary."""
    generated_at = generated_at or datetime.now(timezone.utc)
    name = legend.get("name", "Unknown profile")
    anchor = legend.get("anchor_type", "unknown")
    anchor_label = legend.get("anchor_label", anchor)
    profile = legend.get("profile_summary", {}).get("profile", {})
    insights = legend.get("insights", {})
    overall = insights.get("overall", {})
    food_history = legend.get("food_history", [])
    cgm = legend.get("current_cgm", {})

    genome = analyze_pattern_genome(
        food_history,
        profile_name=anchor_label,
        anchor_type=anchor,
        data_source=data_source,
        window_days=90,
    )

    lines: list[str] = [
        "# Clinician / Care-Team Export Pack",
        "",
        f"Generated: {generated_at.isoformat()}",
        f"Profile: {name} ({anchor_label})",
        f"{_source_label(data_source)}",
        "",
        "> Educational summary only. Discuss care decisions with the clinician or care team.",
        "",
        "## Overview",
        "",
        f"- Anchor type: `{anchor}`",
        f"- Age: {_fmt(legend.get('age'))}",
        f"- Diagnosis history: {_fmt(legend.get('diagnosis_years'))} years",
        f"- Estimated time in range: {_fmt(profile.get('estimated_tir'))}%",
        f"- Estimated A1C: {_fmt(profile.get('estimated_a1c'))}",
        f"- Variability: {_fmt(profile.get('variability_category'))}",
        "",
        "## Meals Logged",
        "",
        f"- Meals analyzed: {insights.get('total_meals', len(food_history))}",
        f"- Daily average carbs: {_fmt(overall.get('daily_avg_carbs_g'))}g",
        f"- Daily average fat: {_fmt(overall.get('daily_avg_fat_g'))}g",
        f"- Daily average sugars: {_fmt(overall.get('daily_avg_sugars_g'))}g",
        "",
        "| Meal type | Count | Avg carbs | Example foods |",
        "|---|---:|---:|---|",
    ]

    for meal_type, stats in sorted(insights.get("meal_stats", {}).items()):
        top_foods = ", ".join(stats.get("top_foods", [])[:3]) or "—"
        lines.append(
            f"| {meal_type.replace('_', ' ')} | {stats.get('count', 0)} | "
            f"{_fmt(stats.get('avg_carbs_g'))}g | {top_foods} |"
        )

    lines += [
        "",
        "## Recurring Patterns",
        "",
        genome.summary_narrative,
        "",
        "| Pattern | Confidence | Evidence | Detail |",
        "|---|---|---:|---|",
    ]

    for trait in genome.traits:
        detail = trait.detail.replace("|", "/")
        lines.append(f"| {trait.label} | {trait.confidence} | {trait.evidence_count} | {detail} |")

    lines += [
        "",
        "## Uncertainty & Evidence Quality",
        "",
        f"- Source label: {_source_label(data_source)}",
        f"- Pattern-analysis confidence varies by trait; see evidence counts above.",
        f"- Current CGM snapshot: {_fmt(cgm.get('mg_dl'))} mg/dL, trend `{_fmt(cgm.get('trend'))}` at {_fmt(cgm.get('timestamp'))}.",
        "- Forecasts and pattern summaries are simulator outputs; actual results can differ.",
        "",
        "## Example Meals For Discussion",
        "",
        "| Food | Meal type | Carbs | Fat | Sugars |",
        "|---|---|---:|---:|---:|",
    ]

    for row in _top_meal_examples(food_history):
        lines.append(
            f"| {_fmt(row.get('food'))} | {_fmt(row.get('meal_type'))} | "
            f"{_fmt(row.get('carb_estimate_g'))}g | {_fmt(row.get('fat_g'))}g | {_fmt(row.get('sugars_g'))}g |"
        )

    lines += [
        "",
        "## Questions For Clinician / Care Team",
        "",
        "- Which recurring meal patterns are most useful to track before the next visit?",
        "- Which uncertainty areas would be worth logging more consistently?",
        "- Are there specific time windows the care team wants reviewed in future reports?",
        "- Which example meals would be most helpful to compare against real-world records?",
        "",
        "## Safety Boundary",
        "",
        "This export summarizes simulated observations and questions only. It does not provide care-plan changes or medication guidance.",
        "",
    ]

    return _sanitize_safety_terms("\n".join(lines))


def write_care_team_export_markdown(
    legend: dict[str, Any],
    path: str | Path,
    *,
    generated_at: datetime | None = None,
    data_source: str = _SYNTHETIC_SOURCE,
) -> Path:
    """Write the care-team export Markdown artifact and return its path."""
    out = Path(path)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(
        render_care_team_export_markdown(legend, generated_at=generated_at, data_source=data_source),
        encoding="utf-8",
    )
    return out
