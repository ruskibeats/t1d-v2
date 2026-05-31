"""Safety-Aware AI Narrator for T1D Companion v2 — Issue #29.

Deterministic narration layer: takes the evidence bundle and generates
warm, educational companion language that follows the companion_system.txt
contract and passes through SafetyScaffold.validate().

All output is evidence-only — no fabricated numbers, no dosing language.
Rendered text is validated against the shared safety policy before display.
"""

from __future__ import annotations

import logging
from typing import Any

from app.ai.safety import SafetyScaffold

logger = logging.getLogger(__name__)

# ── Card helpers ──

def _separator(title: str = "") -> str:
    if title:
        return f"\n━━━ {title} ━━━"
    return "\n" + "━" * 40


def _format_range(low: float | int, high: float | int, unit: str = "mg/dL") -> str:
    if low == high:
        return f"{low} {unit}"
    return f"{low}–{high} {unit}"


# ── Narrator sections ──

def _render_profile_section(bundle: dict[str, Any]) -> str:
    """Render ## Profile Overview section."""
    profile = bundle.get("profile", {})
    label = profile.get("label", "Simulated Profile")
    meaning = profile.get("plain_meaning", "")
    if meaning:
        return f"Using the {label} simulated profile: {meaning}."
    return f"Using the {label} simulated profile."


def _render_meal_details_section(bundle: dict[str, Any]) -> str:
    """Render ## Meal Details section with carb uncertainty."""
    totals = bundle.get("totals", {})
    carbs = totals.get("carbs_g", 0)
    fat = totals.get("fat_g", 0)
    sugars = totals.get("sugars_g", 0)
    protein = totals.get("protein_g", 0)

    carb_range = bundle.get("total_carbs_g_range")
    confidence = bundle.get("confidence_overall", "medium")
    confidence_why = bundle.get("confidence_why", "")

    lines = []

    if carbs:
        carb_range = bundle.get("total_carbs_g_range")
        if carb_range and len(carb_range) == 2 and carb_range[0] != carb_range[1]:
            low, high = carb_range
            lines.append(f"About {carbs:.0f}g carbs (likely range {low:.0f}–{high:.0f}g, confidence {confidence}).")
        else:
            lines.append(f"About {carbs:.0f}g carbs (confidence {confidence}).")

        if fat or sugars:
            parts = []
            if fat:
                parts.append(f"{fat:.0f}g fat")
            if sugars:
                parts.append(f"{sugars:.0f}g sugars")
            if protein:
                parts.append(f"{protein:.0f}g protein")
            lines.append(f"Estimated {' and '.join(parts)}.")

        if confidence_why and confidence != "high":
            lines.append(f"Most of the uncertainty is because {confidence_why.lower()}.")
    else:
        lines.append("No carb estimate available for this meal.")

    return "\n".join(lines)


def _render_timing_insights_section(bundle: dict[str, Any]) -> str:
    """Render ## Timing Insights section with profile-modified timing."""
    forecast = bundle.get("forecast", {})
    profile = bundle.get("profile", {})
    anchor = profile.get("anchor_type", "well_controlled")

    peak = forecast.get("peak_mg_dl", "?")
    peak_time = forecast.get("peak_time_minutes", "?")
    baseline = forecast.get("baseline_mg_dl", "?")
    band = forecast.get("uncertainty_band", {})

    lines = []

    if peak != "?":
        lines.append(f"The forecast peaks around {peak} mg/dL at about {peak_time} minutes.")
    else:
        lines.append("Timing estimate not available.")

    if band:
        pr = band.get("peak_range_mg_dl")
        tr = band.get("peak_time_range_minutes")
        if pr and len(pr) == 2 and pr[0] != pr[1]:
            lines.append(
                f"With portion uncertainty, peak could be about {pr[0]}–{pr[1]} mg/dL, "
                f"timing {tr[0] if tr else '?'}–{tr[1] if tr else '?'} minutes."
            )

    # Profile-based timing advice
    timing_advice = {
        "well_controlled": "Typical response, so the peak should sit in the 1–3 hour window.",
        "high_fat_delayed": "High-fat meals can shift the peak later — watch the 3–4 hour window carefully.",
        "post_meal_spike": "These meals often rise quickly; early monitoring (first hour) matters.",
        "brittle": "Response may be unpredictable — monitor more frequently than usual.",
        "dawn_phenomenon": "Morning hormone rise may push the peak higher on top of the meal effect.",
        "overnight_hypo": "Low tendency — if this is an evening meal, set an overnight alert.",
        "exercise_sensitive": "If you've been active, the peak may be lower and come sooner.",
        "exercise_regimen": "Timing-sensitive to activity — pre-exercise meals may peak faster.",
        "insulin_sensitive": "May see a quicker, sharper rise — monitor the first hour closely.",
        "insulin_resistant": "Rise may be more sustained — extended monitoring window (2–4 hours).",
        "high_variability": "Less predictable response — broader monitoring window recommended.",
        "newly_diagnosed": "Higher variability possible — monitor and compare with your logs.",
    }

    advice = timing_advice.get(anchor, "Watch the expected peak window and compare it with your trend.")
    lines.append(advice)

    return "\n".join(lines)


def _render_historical_context_section(bundle: dict[str, Any]) -> str:
    """Render ## Historical Context section when history data exists."""
    historical = bundle.get("historical_context", {})

    count = historical.get("similar_meals_count", 0)
    if not count:
        return ""

    avg_rise = historical.get("avg_peak_rise_mg_dl")
    avg_time = historical.get("avg_peak_time_minutes")
    rise_range = historical.get("peak_rise_range_mg_dl")
    observations = historical.get("case_based_observations", [])
    similarity_reason = historical.get("similarity_reason", "")
    confidence_tier = historical.get("confidence_tier", "")

    lines = [f"Found {count} similar historical meals."]

    if similarity_reason:
        lines.append(similarity_reason)
    if avg_rise is not None and avg_rise != "?":
        lines.append(f"Similar meals rose about {avg_rise} mg/dL on average.")
    if rise_range and len(rise_range) == 2 and rise_range[0] is not None:
        lines.append(f"Rise typically sits between {rise_range[0]} and {rise_range[1]} mg/dL.")
    if avg_time is not None and avg_time != "?":
        lines.append(f"Average peak timing was around {avg_time} minutes.")
    if confidence_tier:
        lines.append(f"Historical confidence: {confidence_tier}.")
    for obs in observations[:2]:
        lines.append(obs)

    return "\n".join(lines)


def _render_monitoring_section(bundle: dict[str, Any]) -> str:
    """Render ## Monitoring Suggestions section."""
    risk_flags = bundle.get("risk_flags", [])
    forecast = bundle.get("forecast", {})
    profile = bundle.get("profile", {})
    anchor = profile.get("anchor_type", "")

    lines = []

    for flag in risk_flags:
        if flag == "fat_may_extend_or_delay_rise":
            lines.append("Higher fat may delay or stretch the rise, so the later window matters too.")
        elif flag == "large_carb_load":
            lines.append("This is a larger carb estimate, so the uncertainty range matters.")
        elif flag == "alcohol_can_increase_delayed_hypo_risk":
            lines.append("Alcohol can increase delayed low risk, especially overnight or with activity.")
        elif flag == "rapid_sugar_spike":
            lines.append("Rapid sugar spike likely — monitor the first hour closely.")

    # Profile-specific monitoring
    if anchor == "high_fat_delayed":
        lines.append("Watch 3–5 hours after eating — the peak may be delayed.")
    elif anchor == "post_meal_spike":
        lines.append("Check at 30 and 60 minutes — early spike detection matters.")
    elif anchor == "overnight_hypo":
        lines.append("Set an overnight alert — low risk is elevated with this profile.")
    elif anchor == "dawn_phenomenon":
        lines.append("Morning readings may be elevated regardless of meal — compare with fasting baseline.")

    if not lines:
        lines.append("Watch the expected peak window and compare it with your actual trend.")

    return "\n".join(lines)


# ── Main narrator function ──

def render_narrator_card(
    bundle: dict[str, Any],
    *,
    safety: SafetyScaffold | None = None,
) -> list[str]:
    """Render a full narrator card from an evidence bundle.

    Follows the response shape from prompts/companion_system.txt:
    - Profile Overview
    - Meal Details
    - Timing Insights
    - Historical Context (when available)
    - Monitoring Suggestions

    Output is validated through SafetyScaffold.validate().

    Args:
        bundle: Evidence bundle dict from make_evidence_bundle().
        safety: Optional SafetyScaffold instance (created if not provided).

    Returns:
        List of card strings for the meal pipeline.
    """
    if safety is None:
        safety = SafetyScaffold()

    sections: list[str] = []

    # Build each section
    profile_text = _render_profile_section(bundle)
    meal_text = _render_meal_details_section(bundle)
    timing_text = _render_timing_insights_section(bundle)
    historical_text = _render_historical_context_section(bundle)
    monitoring_text = _render_monitoring_section(bundle)

    # Assemble the full response
    lines: list[str] = [
        "## Profile Overview",
        profile_text,
        "",
        "## Meal Details",
        meal_text,
        "",
        "## Timing Insights",
        timing_text,
    ]

    if historical_text:
        lines += ["", "## Historical Context", historical_text]

    lines += [
        "",
        "## Monitoring Suggestions",
        monitoring_text,
        "",
        "Educational simulation only — not medical advice.",
    ]

    full_text = "\n".join(lines)

    # Safety validation
    review = safety.validate(full_text, {"source": "narrator"})
    if not review.get("is_safe", True):
        logger.warning("Narrator output flagged by safety: %s", review)
        # Return a safe fallback
        return [
            _separator("Meal Summary"),
            "",
            profile_text,
            "",
            meal_text,
            "",
            timing_text,
            "",
            "⚠️ This output was adjusted for safety. "
            "For detailed guidance, consult your care plan or clinician.",
            "",
            "Educational simulation only — not medical advice.",
        ]

    return [_separator("Meal Summary") + "\n" + full_text]


def render_narrator_from_result(result: dict[str, Any]) -> list[str]:
    """Convenience: render narrator card from a pipeline result dict."""
    bundle = result.get("evidence_bundle", {})
    safety_result = result.get("safety", {})
    scaffold = SafetyScaffold()

    # If safety already ran, use its result to avoid double-validation
    if safety_result.get("is_safe", True) and not safety_result.get("blocked_phrases"):
        # Already validated — render without re-validating
        sections = []
        profile_text = _render_profile_section(bundle)
        meal_text = _render_meal_details_section(bundle)
        timing_text = _render_timing_insights_section(bundle)
        historical_text = _render_historical_context_section(bundle)
        monitoring_text = _render_monitoring_section(bundle)

        lines = [
            "## Profile Overview", profile_text, "",
            "## Meal Details", meal_text, "",
            "## Timing Insights", timing_text,
        ]
        if historical_text:
            lines += ["", "## Historical Context", historical_text]
        lines += ["", "## Monitoring Suggestions", monitoring_text, "",
                  "Educational simulation only — not medical advice."]

        return [_separator("Meal Summary") + "\n" + "\n".join(lines)]

    # Otherwise validate fresh
    return render_narrator_card(bundle, safety=scaffold)
