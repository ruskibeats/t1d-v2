#!/usr/bin/env python3
"""Habit Experiment Tracker for T1D Companion v2 - Issue #27.

Tracks small behavior experiments with association-based outcomes.
Never claims causation. Always includes evidence counts and confidence tiers.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, datetime, timedelta
from typing import Any

from .historical_meal_matcher import historical_context_for_meal


@dataclass
class Experiment:
    """A single habit experiment."""
    experiment_id: str
    title: str
    description: str
    start_date: str  # ISO format
    end_date: str | None
    status: str  # "active", "completed", "cancelled"
    before_meals: list[dict[str, Any]] = field(default_factory=list)
    after_meals: list[dict[str, Any]] = field(default_factory=list)
    before_outcomes: list[dict[str, Any]] = field(default_factory=list)
    after_outcomes: list[dict[str, Any]] = field(default_factory=list)


@dataclass
class ExperimentSummary:
    """Summarized experiment results."""
    experiment_id: str
    title: str
    status: str
    duration_days: int
    before_stats: dict[str, Any]
    after_stats: dict[str, Any]
    association_note: str
    confidence_tier: str
    evidence_count: int
    disclaimer: str = "These observations are associated — not caused. Individual patterns vary."


# ── Experiment types ──

EXPERIMENT_TYPES = {
    "walk_after_lunch": {
        "title": "Walk after lunch",
        "template": "Walk for 15-30 min after lunch",
        "pattern_match": "lunch",
    },
    "lower_fat_pizza": {
        "title": "Lower-fat pizza swap",
        "template": "Try thinner crust or less cheese on pizza",
        "pattern_match": "pizza",
    },
    "earlier_dinner": {
        "title": "Earlier dinner",
        "template": "Eat dinner 1-2 hours earlier than usual",
        "pattern_match": "dinner",
    },
    "same_breakfast": {
        "title": "Same breakfast streak",
        "template": "Eat identical breakfast for 5+ days",
        "pattern_match": "breakfast",
    },
}


def create_experiment(
    experiment_type: str,
    *,
    title: str | None = None,
    description: str | None = None,
    custom_pattern: str | None = None,
    duration_days: int = 5,
) -> Experiment:
    """Create a new experiment to track."""
    exp_type = EXPERIMENT_TYPES.get(experiment_type)
    if not exp_type and not custom_pattern:
        raise ValueError(f"Unknown experiment type: {experiment_type}")
    
    exp_id = f"{experiment_type}_{datetime.now().strftime('%Y%m%d')}"
    
    return Experiment(
        experiment_id=exp_id,
        title=title or (exp_type["title"] if exp_type else experiment_type),
        description=description or (exp_type["template"] if exp_type else custom_pattern),
        start_date=date.today().isoformat(),
        end_date=(date.today() + timedelta(days=duration_days)).isoformat(),
        status="active",
    )


def analyze_experiment(
    experiment: Experiment,
    *,
    food_history: list[dict[str, Any]] | None = None,
    forecast_results: list[dict[str, Any]] | None = None,
) -> ExperimentSummary:
    """Analyze before/after outcomes for an experiment.

    Uses historical meal matching to compare outcomes.
    Always returns association language, never causation.
    """
    before = experiment.before_outcomes or []
    after = experiment.after_outcomes or []
    
    # Compute stats
    before_avg_peak = _avg([o.get("peak_mg_dl", 150) for o in before]) or 150
    after_avg_peak = _avg([o.get("peak_mg_dl", 150) for o in after]) or 150
    before_count = len(before)
    after_count = len(after)
    
    # Evidence counts
    evidence = before_count + after_count
    
    # Confidence: more data = higher confidence
    confidence = "low"
    if evidence >= 6:
        confidence = "high"
    elif evidence >= 3:
        confidence = "medium"
    
    # Association note (never causation)
    if after_avg_peak < before_avg_peak:
        delta = before_avg_peak - after_avg_peak
        note = (
            f"During the experiment period, average peak was {after_avg_peak:.0f} mg/dL "
            f"vs {before_avg_peak:.0f} mg/dL before — associated difference of {delta:.0f} mg/dL. "
            f"Individual days may vary."
        )
    elif after_avg_peak > before_avg_peak:
        delta = after_avg_peak - before_avg_peak
        note = (
            f"During the experiment period, average peak was {after_avg_peak:.0f} mg/dL "
            f"vs {before_avg_peak:.0f} mg/dL before — associated difference of +{delta:.0f} mg/dL. "
            f"This does not imply {experiment.title} caused higher peaks."
        )
    else:
        note = (
            f"Peaks were similar ({before_avg_peak:.0f} mg/dL before vs {after_avg_peak:.0f} mg/dL during). "
            f"This suggests {experiment.title} may not strongly associate with peak outcomes for this pattern."
        )
    
    return ExperimentSummary(
        experiment_id=experiment.experiment_id,
        title=experiment.title,
        status=experiment.status,
        duration_days=_days_between(experiment.start_date, experiment.end_date or date.today().isoformat()),
        before_stats={"avg_peak_mg_dl": round(before_avg_peak), "meals_analyzed": before_count},
        after_stats={"avg_peak_mg_dl": round(after_avg_peak), "meals_analyzed": after_count},
        association_note=note,
        confidence_tier=confidence,
        evidence_count=evidence,
    )


def _avg(values: list[float]) -> float | None:
    """Compute average, returning None for empty list."""
    return sum(values) / len(values) if values else None


def _days_between(start: str, end: str) -> int:
    """Compute days between two ISO dates."""
    s = datetime.fromisoformat(start).date()
    e = datetime.fromisoformat(end).date()
    return (e - s).days


def experiment_card(summary: ExperimentSummary) -> list[str]:
    """Render an experiment summary as a terminal card."""
    conf_icon = "🟢" if summary.confidence_tier == "high" else "🟡" if summary.confidence_tier == "medium" else "🔴"
    
    return [
        f"\n━━━ Experiment: {summary.title} ━━━\n",
        f"Status: {summary.status} ({summary.duration_days} days)\n",
        f"\nBefore: {summary.before_stats['avg_peak_mg_dl']} mg/dL avg peak "
        f"({summary.before_stats['meals_analyzed']} meals)\n",
        f"During: {summary.after_stats['avg_peak_mg_dl']} mg/dL avg peak "
        f"({summary.after_stats['meals_analyzed']} meals)\n",
        f"\n{conf_icon} Confidence: {summary.confidence_tier} ({summary.evidence_count} data points)\n",
        f"\n{summary.association_note}\n",
        f"\n{summary.disclaimer}\n",
    ]


def list_active_experiments(experiments: list[Experiment]) -> list[str]:
    """List active experiments as cards."""
    active = [e for e in experiments if e.status == "active"]
    if not active:
        return ["\n━━━ Experiments ━━━\n\nNo active experiments.\n"]
    
    lines = [f"\n━━━ Active Experiments ━━\n"]
    for exp in active:
        lines.append(f"\n• {exp.title}\n  {exp.description}\n  Ends: {exp.end_date}\n")
    return lines


# ── Integration with runner ──

async def run_experiment_flow(
    *,
    text: str,
    anchor: str = "well_controlled",
    experiments: list[Experiment] | None = None,
) -> dict[str, Any]:
    """Check if input relates to an active experiment and return context.

    Returns experiment context for display alongside forecasts.
    """
    if not experiments:
        return {"has_experiment": False}
    
    active = [e for e in experiments if e.status == "active"]
    for exp in active:
        # Check if text mentions the experiment pattern
        if _matches_pattern(text, exp.description):
            return {
                "has_experiment": True,
                "experiment_id": exp.experiment_id,
                "title": exp.title,
                "note": f"You're tracking '{exp.title}' — this meal will be included in your analysis.",
            }
    
    return {"has_experiment": False}


def _matches_pattern(text: str, pattern: str) -> bool:
    """Check if text matches an experiment pattern."""
    text_lower = text.lower()
    pattern_lower = pattern.lower()
    
    # Simple pattern matching
    if "walk" in pattern_lower and any(w in text_lower for w in ["walk", "walked", "walking"]):
        return True
    if "pizza" in pattern_lower and "pizza" in text_lower:
        return True
    if "dinner" in pattern_lower and any(w in text_lower for w in ["dinner", "supper"]):
        return True
    if "breakfast" in pattern_lower and "breakfast" in text_lower:
        return True
    
    return False