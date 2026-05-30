"""Historical meal matching for T1D Companion v2.

Recovered and adapted from V1. Uses a curated 90-day food history JSON file when
present, and returns prompt-friendly educational context. Never returns dosing
recommendations.
"""

from __future__ import annotations

import json
import logging
import math
import os
from dataclasses import asdict, dataclass, field
from pathlib import Path
from statistics import mean, stdev
from typing import Any

logger = logging.getLogger(__name__)

_DEFAULT_HISTORY_PATHS = [
    Path(os.getenv("T1D_FOOD_HISTORY_PATH", "")) if os.getenv("T1D_FOOD_HISTORY_PATH") else None,
    Path("data/food_history_90d.json"),
    Path("/root/t1d/data/food_history_90d.json"),
]

_DEFAULT_CARB_TOLERANCE_G = 15.0
_DEFAULT_FAT_TOLERANCE_G = 10.0
_DEFAULT_MAX_MATCHES = 10
_DEFAULT_MIN_MATCHES = 3


@dataclass
class HistoricalMealMatch:
    food_name: str
    timestamp: str
    carb_estimate_g: float
    fat_g: float
    peak_delta_mgdl: float | None
    peak_time_minutes: float | None
    anchor_type: str
    similarity_score: float = 0.0


@dataclass
class HistoricalMealSummary:
    query_description: str
    query_carbs_g: float
    query_fat_g: float
    matches_found: int
    avg_carbs_g: float
    avg_fat_g: float
    avg_peak_delta_mgdl: float | None
    avg_peak_time_minutes: float | None
    min_peak_delta_mgdl: float | None
    max_peak_delta_mgdl: float | None
    peak_rise_range_mgdl: tuple[int | None, int | None] = (None, None)
    confidence_tier: str = "low"
    confidence_score: float = 0.0
    matched_meals: list[HistoricalMealMatch] = field(default_factory=list)
    case_based_observations: list[str] = field(default_factory=list)
    narrative: str = ""
    disclaimer: str = "Educational observation from historical meal data, not medical advice."
    similarity_reason: str = ""
    what_changed_note: str = ""
    best_past_outcome: str = ""
    consistency_score: float = 0.0
    consistency_tier: str = "unknown"


def _history_path() -> Path | None:
    for path in _DEFAULT_HISTORY_PATHS:
        if path and path.exists():
            return path
    return None


def _load_food_history() -> list[dict[str, Any]]:
    path = _history_path()
    if path is None:
        logger.warning("No food history data available")
        return []
    try:
        data = json.loads(path.read_text())
    except (OSError, json.JSONDecodeError) as exc:
        logger.warning("Failed to load food history %s: %s", path, exc)
        return []
    return data if isinstance(data, list) else []


def _normalize_text(value: str | None) -> str:
    return " ".join((value or "").lower().replace("_", " ").split())


def _nutrient_distance(entry_carbs: float, entry_fat: float, query_carbs: float, query_fat: float) -> float:
    if entry_carbs <= 0:
        return float("inf")
    carb_diff = abs(entry_carbs - query_carbs) / _DEFAULT_CARB_TOLERANCE_G
    fat_diff = abs(entry_fat - query_fat) / _DEFAULT_FAT_TOLERANCE_G
    return math.sqrt(carb_diff**2 + fat_diff**2)


def _text_similarity(entry_name: str, query_name: str) -> float:
    entry_tokens = set(_normalize_text(entry_name).split())
    query_tokens = set(_normalize_text(query_name).split())
    if not entry_tokens or not query_tokens:
        return 0.0
    return len(entry_tokens & query_tokens) / len(entry_tokens | query_tokens)


def find_similar_meals(
    *,
    carbs_g: float | None = None,
    fat_g: float | None = None,
    food_name: str | None = None,
    anchor_type: str | None = None,
    max_matches: int = _DEFAULT_MAX_MATCHES,
) -> list[HistoricalMealMatch]:
    """Find similar historical meals by nutrient distance and optional text match."""
    history = _load_food_history()
    if not history:
        return []
    if carbs_g is None and not food_name:
        return []

    query_fat = max(float(fat_g or 0), 0.0)
    scored: list[tuple[float, dict[str, Any]]] = []

    for entry in history:
        if anchor_type and str(entry.get("anchor_type", "")) != anchor_type:
            continue
        entry_carbs = float(entry.get("carb_estimate_g", 0) or 0)
        entry_fat = float(entry.get("fat_g", 0) or 0)
        entry_name = str(entry.get("food", "") or "")
        if entry_carbs <= 0:
            continue

        nutrient_dist = float("inf")
        if carbs_g is not None:
            nutrient_dist = _nutrient_distance(entry_carbs, entry_fat, float(carbs_g), query_fat)

        text_score = _text_similarity(entry_name, food_name or "")
        if carbs_g is not None and nutrient_dist > 2.0 and text_score < 0.5:
            continue
        if carbs_g is None and text_score < 0.3:
            continue

        combined_score = nutrient_dist - text_score
        scored.append((combined_score, entry))

    scored.sort(key=lambda pair: pair[0])
    matches: list[HistoricalMealMatch] = []
    for score, entry in scored[:max_matches]:
        cgm = entry.get("cgm_impact", {}) or {}
        similarity = max(0.0, min(1.0, 1.0 / (1.0 + max(score, 0.0))))
        matches.append(HistoricalMealMatch(
            food_name=str(entry.get("food", "")),
            timestamp=str(entry.get("timestamp", "")),
            carb_estimate_g=float(entry.get("carb_estimate_g", 0) or 0),
            fat_g=float(entry.get("fat_g", 0) or 0),
            peak_delta_mgdl=cgm.get("expected_peak_delta"),
            peak_time_minutes=cgm.get("peak_time_minutes"),
            anchor_type=str(entry.get("anchor_type", "")),
            similarity_score=round(similarity, 3),
        ))
    return matches


def summarize_similar_meals(
    query_description: str,
    *,
    carbs_g: float | None = None,
    fat_g: float | None = None,
    food_name: str | None = None,
    anchor_type: str | None = None,
) -> HistoricalMealSummary:
    """Summarize matched historical meals for educational context."""
    matches = find_similar_meals(
        carbs_g=carbs_g,
        fat_g=fat_g,
        food_name=food_name,
        anchor_type=anchor_type,
    )
    if not matches:
        return HistoricalMealSummary(
            query_description=query_description,
            query_carbs_g=float(carbs_g or 0),
            query_fat_g=float(fat_g or 0),
            matches_found=0,
            avg_carbs_g=float(carbs_g or 0),
            avg_fat_g=float(fat_g or 0),
            avg_peak_delta_mgdl=None,
            avg_peak_time_minutes=None,
            min_peak_delta_mgdl=None,
            max_peak_delta_mgdl=None,
            similarity_reason="",
            what_changed_note="",
            best_past_outcome="",
            consistency_score=0.0,
            consistency_tier="unknown",
            narrative="No similar historical meals found.",
        )

    peak_deltas = [m.peak_delta_mgdl for m in matches if m.peak_delta_mgdl is not None]
    peak_times = [m.peak_time_minutes for m in matches if m.peak_time_minutes is not None]
    avg_delta = mean(peak_deltas) if peak_deltas else None
    avg_time = mean(peak_times) if peak_times else None
    spread = stdev(peak_deltas) if len(peak_deltas) > 1 else 0.0
    confidence_score = min(1.0, (len(matches) / _DEFAULT_MIN_MATCHES) * 0.4 + mean(m.similarity_score for m in matches) * 0.6)
    confidence_tier = "high" if confidence_score >= 0.8 else "medium" if confidence_score >= 0.5 else "low"

    observations: list[str] = []
    if avg_delta is not None:
        observations.append(f"Similar meals rose about {round(avg_delta)} mg/dL on average.")
    if avg_time is not None:
        observations.append(f"Average peak timing was around {round(avg_time)} minutes.")
    if spread >= 20:
        observations.append("Past responses varied noticeably, so uncertainty is meaningful.")

    # Deep insights
    similarity_reason = _build_similarity_reason(matches, food_name)
    what_changed_note = _build_what_changed_note(
        carbs_g, fat_g,
        round(mean(m.carb_estimate_g for m in matches), 1),
        round(mean(m.fat_g for m in matches), 1),
    )
    best_past_outcome = _build_best_outcome(matches, carbs_g)

    return HistoricalMealSummary(
        query_description=query_description,
        query_carbs_g=float(carbs_g or 0),
        query_fat_g=float(fat_g or 0),
        matches_found=len(matches),
        avg_carbs_g=round(mean(m.carb_estimate_g for m in matches), 1),
        avg_fat_g=round(mean(m.fat_g for m in matches), 1),
        avg_peak_delta_mgdl=round(avg_delta, 1) if avg_delta is not None else None,
        avg_peak_time_minutes=round(avg_time, 1) if avg_time is not None else None,
        min_peak_delta_mgdl=min(peak_deltas) if peak_deltas else None,
        max_peak_delta_mgdl=max(peak_deltas) if peak_deltas else None,
        peak_rise_range_mgdl=(
            round(min(peak_deltas)) if peak_deltas else None,
            round(max(peak_deltas)) if peak_deltas else None,
        ),
        consistency_score=round(max(0.0, 1.0 - spread / 50.0), 2),
        consistency_tier="high" if spread < 15 else "medium" if spread < 30 else "low",
        similarity_reason=similarity_reason,
        what_changed_note=what_changed_note,
        best_past_outcome=best_past_outcome,
        confidence_tier=confidence_tier,
        confidence_score=round(confidence_score, 3),
        matched_meals=matches,
        case_based_observations=observations,
        narrative=" ".join(observations),
    )


def _build_similarity_reason(matches: list, food_name: str | None) -> str:
    if not matches or not food_name:
        return ""
    top_names = list(dict.fromkeys(m.food_name for m in matches[:5] if m.food_name))
    if not top_names:
        return ""
    name_parts = []
    for n in top_names[:3]:
        words = n.lower().split()[:3]
        name_parts.extend(w for w in words if len(w) > 2)
    key_terms = list(dict.fromkeys(name_parts))[:4]
    return f"Matched on {' + '.join(key_terms)}" if key_terms else ""


def _build_what_changed_note(
    carbs_g: float | None, fat_g: float | None,
    avg_carbs: float, avg_fat: float,
) -> str:
    notes = []
    if carbs_g is not None and avg_carbs:
        diff = carbs_g - avg_carbs
        if abs(diff) >= 5:
            direction = "higher" if diff > 0 else "lower"
            notes.append(f"carbs are {abs(diff):.0f}g {direction} than usual")
    if fat_g is not None and avg_fat:
        diff = fat_g - avg_fat
        if abs(diff) >= 5:
            direction = "higher" if diff > 0 else "lower"
            notes.append(f"fat is {abs(diff):.0f}g {direction} than usual")
    if notes:
        return f"This time, {' and '.join(notes)}."
    return ""


def _build_best_outcome(matches: list, query_carbs: float | None) -> str:
    best = None
    for m in matches:
        if m.peak_delta_mgdl is not None:
            if best is None or m.peak_delta_mgdl < best.peak_delta_mgdl:
                best = m
    if best is None:
        return ""
    return f"Best past result: {round(best.peak_delta_mgdl)} mg/dL rise ({best.food_name})."


def historical_context_for_meal(
    query_description: str,
    *,
    carbs_g: float | None = None,
    fat_g: float | None = None,
    food_name: str | None = None,
    anchor_type: str | None = None,
) -> dict[str, Any]:
    """Return the historical_context shape expected by companion_system.txt."""
    summary = summarize_similar_meals(
        query_description,
        carbs_g=carbs_g,
        fat_g=fat_g,
        food_name=food_name,
        anchor_type=anchor_type,
    )
    return {
        "similar_meals_count": summary.matches_found,
        "avg_peak_rise_mg_dl": round(summary.avg_peak_delta_mgdl) if summary.avg_peak_delta_mgdl is not None else None,
        "peak_rise_range_mg_dl": list(summary.peak_rise_range_mgdl),
        "avg_peak_time_minutes": round(summary.avg_peak_time_minutes) if summary.avg_peak_time_minutes is not None else None,
        "confidence_tier": summary.confidence_tier,
        "similarity_score": summary.confidence_score,
        "case_based_observations": summary.case_based_observations,
        "narrative": summary.narrative,
        "similarity_reason": summary.similarity_reason,
        "what_changed_note": summary.what_changed_note,
        "best_past_outcome": summary.best_past_outcome,
        "consistency_score": summary.consistency_score,
        "consistency_tier": summary.consistency_tier,
    }


def summary_to_dict(summary: HistoricalMealSummary) -> dict[str, Any]:
    return asdict(summary)
