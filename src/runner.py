#!/usr/bin/env python3
"""V2 T1D Companion runner — thin composition root.

Pipeline:
1. Parse meal text (LLM or deterministic)
2. Lookup nutrition evidence
3. Select simulator profile
4. Forecast glucose
5. Add historical context
6. Build evidence bundle
7. Safety validation
8. Render text response

Historical parser code remains for backward compatibility.
New code should use `src.parser` and `src.forecast` packages directly.
"""

from __future__ import annotations

import logging
from dataclasses import asdict
from typing import Any

from app.ai.safety import SafetyScaffold
from app.core.database import db_manager, get_settings
from app.food.service import (
    FoodService,
    ParsedFood,
    calculate_food_evidence,
    combine_food_evidence,
)
from app.services.historical_meal_matcher import historical_context_for_meal
from app.simulator.patient_factory import generate_patient_config, generate_profile_json
from app.simulator.schemas import AnchorType
from src.adapter import make_evidence_bundle, forecast_to_prediction_schema
from src.forecast_engine import ForecastStage, MealTotals, populate_evidence_fields
from src.forecast_renderer import render_forecast
from src.parser import DeterministicParser, LLMParser, OllamaClient

logger = logging.getLogger(__name__)

# ── Backward-compatible re-exports ──
# Old code importing from src.runner can still access these.
# New code should import from src.parser directly.

from src.parser.llm import _extract_json, _normalise_food_dict  # noqa: F401
from src.parser.deterministic import _parse_deterministic  # noqa: F401
from src.counterfactual_coach import generate_counterfactuals, render_counterfactual_bundle

DEFAULT_OLLAMA_URL = "http://192.168.0.137:11434"
DEFAULT_OLLAMA_MODEL = "llama3.1:latest"


# ── Backward-compatible async parser (strict LLM; no deterministic fallback) ──

async def parse_meal_llm(
    text: str,
    ollama_url: str = DEFAULT_OLLAMA_URL,
    model: str = DEFAULT_OLLAMA_MODEL,
) -> tuple[list[ParsedFood], str | None]:
    """Parse meal text via LLM.

    Backward-compatible return shape, but failures now raise instead of falling
    back to deterministic parsing.
    """
    client = OllamaClient(ollama_url=ollama_url, model=model)
    parser = LLMParser(client=client)
    foods, _meta = await parser.parse_async(text)
    return foods, None


# ── Risk flags ──

def _risk_flags(totals: dict[str, float], foods: list[ParsedFood]) -> list[str]:
    flags = []
    if totals.get("carbs_g", 0) >= 80:
        flags.append("large_carb_load")
    if totals.get("sugars_g", 0) >= 50:
        flags.append("rapid_sugar_spike")
    if totals.get("fat_g", 0) >= 15:
        flags.append("fat_may_extend_or_delay_rise")
    if any(f.item in {"lager", "beer"} for f in foods):
        flags.append("alcohol_can_increase_delayed_hypo_risk")
    return flags


# ── Response renderer ──

def _make_response(bundle: dict[str, Any], chart: str, risk_flags: list[str]) -> str:
    p = bundle["profile"]
    t = bundle["totals"]
    f = bundle["forecast"]
    h = bundle["historical_context"]
    cr = bundle["total_carbs_g_range"]
    band = f.get("uncertainty_band", {})
    pr = band.get("peak_range_mg_dl", [f["peak_mg_dl"], f["peak_mg_dl"]])
    tr = band.get("peak_time_range_minutes", [f["peak_time_minutes"], f["peak_time_minutes"]])
    lines = [
        "## Profile Overview",
        f"Using the {p['label']} simulated profile: {p['plain_meaning']}.",
        "",
        "## Meal Details",
        f"About {t['carbs_g']:.0f}g carbs (likely range {cr[0]:.0f}–{cr[1]:.0f}g, confidence {bundle['confidence_overall']}).",
        f"Estimated fat is {t['fat_g']:.0f}g and sugars are {t['sugars_g']:.0f}g.",
        "",
        "## Timing Insights",
        f"The forecast peaks around {f['peak_mg_dl']} mg/dL at about {f['peak_time_minutes']} minutes.",
        f"With portion uncertainty, peak could be about {pr[0]}–{pr[1]} mg/dL, timing {tr[0]}–{tr[1]} minutes.",
    ]
    if h.get("similar_meals_count"):
        lines += ["", "## Historical Context", f"Found {h['similar_meals_count']} similar historical meals.", *(h.get("case_based_observations") or [])[:2]]
    lines += ["", chart, "", "## Monitoring Suggestions"]
    if "fat_may_extend_or_delay_rise" in risk_flags:
        lines.append("Higher fat may delay or stretch the rise, so the later window matters too.")
    if "large_carb_load" in risk_flags:
        lines.append("This is a larger carb estimate, so the uncertainty range matters.")
    if "alcohol_can_increase_delayed_hypo_risk" in risk_flags:
        lines.append("Alcohol can increase delayed low risk, especially overnight or with activity.")
    if not risk_flags:
        lines.append("Watch the expected peak window and compare it with your actual trend.")
    lines.append("Educational simulation only — not medical advice.")
    return "\n".join(lines)


# ── Main pipeline ──

async def run_companion_scenario(
    text: str,
    *,
    anchor: str = "well_controlled",
    use_llm_parse: bool = True,
    profile_config: dict[str, Any] | None = None,
    ollama_url: str = DEFAULT_OLLAMA_URL,
    ollama_model: str = DEFAULT_OLLAMA_MODEL,
) -> dict[str, Any]:
    logger.info("Running companion scenario: text=%s anchor=%s use_llm_parse=%s", text, anchor, use_llm_parse)

    # 1. Parse
    if use_llm_parse:
        foods, _parse_error = await parse_meal_llm(text, ollama_url, ollama_model)
        parse_metadata = {
            "parser": "llm",
            "llm_requested": True,
            "parse_error": None,
            "ollama_url": ollama_url,
            "ollama_model": ollama_model,
        }
    else:
        foods = DeterministicParser().parse(text)
        parse_metadata = {"parser": "deterministic", "llm_requested": False, "parse_error": None}
    logger.info("Parsed %d foods from input via %s", len(foods), parse_metadata["parser"])

    # 2. Food evidence
    settings = get_settings()
    db_manager.init_db(settings.database_url)
    evidence = []
    try:
        async with db_manager.get_session() as session:
            service = FoodService(session)
            evidence = [calculate_food_evidence(f, await service.search_food_candidates(f)) for f in foods]
    except (RuntimeError, Exception) as exc:
        logger.warning("Database not available: %s", exc)
    meal = combine_food_evidence(evidence)
    logger.info("Food evidence computed: %d items, confidence=%s",
                len(evidence), meal.get("confidence_overall", "n/a"))

    if not any(ev.computed for ev in evidence):
        return _build_early_return(text, foods, meal)

    # 3. Profile + forecast
    stage, profile_json, config = _build_profile(profile_config, anchor)
    totals = MealTotals.from_dict(meal["totals"])
    forecast = stage.forecast(totals, carb_range_g=meal["total_carbs_g_range"])

    # 4. Historical context
    anchor_value = config.anchor_type.value if hasattr(config, "anchor_type") else config.value
    historical = historical_context_for_meal(
        text, carbs_g=totals.carbs_g, fat_g=totals.fat_g,
        food_name=" ".join(f.item for f in foods),
        anchor_type=anchor_value,
    )
    historical["similar_better_meals"] = await _fetch_similar_better_meals(totals.carbs_g)

    # 4a. Counterfactual what-if scenarios
    counterfactuals = generate_counterfactuals(
        totals, stage, hour=19,
        current_forecast=forecast,
        historical_context=historical,
    )
    counterfactual_text = render_counterfactual_bundle(
        counterfactuals, food_text=text,
    )

    # 5. Render, bundle, safety
    chart = render_forecast(forecast)
    prediction = forecast_to_prediction_schema(forecast, totals, confidence_tier=meal["confidence_overall"], ascii_chart=chart)
    _cf_context = {
        "available_scenarios": [
            {
                "type": s.type,
                "label": s.label,
                "description": s.description,
                "comparison_delta_mg_dl": s.comparison.peak_delta_mg_dl,
                "comparison_timing_delta_min": s.comparison.timing_delta_minutes,
            }
            for s in counterfactuals.scenarios
        ],
        "disclaimer": counterfactuals.disclaimer,
    } if counterfactuals.scenarios else {}
    bundle = make_evidence_bundle(forecast=forecast, totals=totals, profile={"anchor_type": anchor_value, "label": profile_json["anchor_label"]}, total_carbs_g_range=meal["total_carbs_g_range"], confidence_overall=meal["confidence_overall"], confidence_why="Food database lookup plus historical context.", historical_context=historical, counterfactual_context=_cf_context)
    response = _make_response(bundle, chart, _risk_flags(meal["totals"], foods))
    safety = SafetyScaffold().validate(response, {"source": "assistant"})
    logger.info("Safety check: is_safe=%s risk=%s", safety["is_safe"], safety["risk_level"])

    meal_totals_for_cards = dict(meal["totals"])
    meal_totals_for_cards.update({
        "top_carb_contributor": meal.get("top_carb_contributor", ""),
        "top_uncertainty_items": meal.get("top_uncertainty_items", []),
        "absorption_profile": meal.get("absorption_profile", "standard"),
    })

    return {
        "scenario": text, "parse_metadata": parse_metadata,
        "parsed_foods": [asdict(f) for f in foods],
        "food_evidence": meal["evidence_items"], "meal_totals": meal_totals_for_cards,
        "profile": profile_json, "forecast": bundle["forecast"],
        "historical_context": historical, "prediction": prediction.model_dump(),
        "evidence_bundle": bundle, "risk_flags": _risk_flags(meal["totals"], foods),
        "safety": safety, "response": response,
        "counterfactuals": {
            "scenarios": [
                {
                    "type": s.type,
                    "label": s.label,
                    "description": s.description,
                    "forecast_peak_mg_dl": s.forecast["peak_mg_dl"],
                    "forecast_peak_time_minutes": s.forecast["peak_time_minutes"],
                    "peak_range_mg_dl": s.forecast.get("peak_range_mg_dl", []),
                    "comparison": {
                        "peak_delta_mg_dl": s.comparison.peak_delta_mg_dl,
                        "peak_delta_percent": s.comparison.peak_delta_percent,
                        "timing_delta_minutes": s.comparison.timing_delta_minutes,
                        "peak_low_delta_mg_dl": s.comparison.peak_low_delta_mg_dl,
                        "peak_high_delta_mg_dl": s.comparison.peak_high_delta_mg_dl,
                    },
                }
                for s in counterfactuals.scenarios
            ],
            "counterfactual_text": counterfactual_text,
        },
    }


# ── Pipeline helpers ──

def _build_early_return(
    text: str, foods: list[ParsedFood], meal: dict[str, Any]
) -> dict[str, Any]:
    logger.info("No food evidence computed — returning early")
    return {
        "scenario": text, "parsed_foods": [asdict(f) for f in foods],
        "food_evidence": meal["evidence_items"], "meal_totals": meal["totals"],
        "profile": {"anchor_type": "disconnected"}, "forecast": {},
        "historical_context": {"similar_meals_count": 0}, "prediction": {},
        "evidence_bundle": {}, "risk_flags": [],
        "safety": {"is_safe": True},
        "response": "Cannot estimate this meal — database connection is not available. Please set DATABASE_URL to start.",
        "database_error": "DATABASE_URL not set or Postgres unreachable.",
    }


def _build_profile(
    profile_config: dict[str, Any] | None, anchor: str
) -> tuple[ForecastStage, dict[str, Any], Any]:
    if profile_config:
        stage = ForecastStage(
            anchor_type=profile_config.get("anchor_type", anchor),
            basal_mg_dl=profile_config.get("basal_glucose_mean", 110),
            carb_ratio=profile_config.get("carb_ratio", 15),
            insulin_sensitivity=profile_config.get("insulin_sensitivity", 40),
            fat_delay_hours=profile_config.get("fat_delay_hours", 3.0),
            exercise_drop_factor=profile_config.get("exercise_drop_factor", 1.0),
        )
        profile_json = {
            "anchor_type": profile_config.get("anchor_type", anchor),
            "anchor_label": profile_config.get("anchor_label", anchor.replace("_", " ").title()),
        }
        config = AnchorType(profile_config.get("anchor_type", anchor))
    else:
        config = generate_patient_config(anchor)
        profile_json = generate_profile_json(config)
        stage = ForecastStage.from_profile(config)
    return stage, profile_json, config


async def _fetch_similar_better_meals(carbs_g: float) -> list[dict[str, Any]]:
    """Query graph for similar meals with better outcomes."""
    from sqlalchemy import text as sql_raw
    similar_better: list[dict[str, Any]] = []
    try:
        async with db_manager.get_session() as gsession:
            gq = await gsession.execute(sql_raw("""
                SELECT m.id, m.value AS carbs_g, m.measured_at AS meal_time,
                       g.value AS peak_glucose, e.confidence,
                       'synthetic_outcome_only' AS outcome_source
                FROM health_metrics m
                JOIN health_metric_edges e ON e.source_metric_id = m.id
                    AND e.edge_type = 'meal_to_glucose_spike'
                JOIN health_metrics g ON g.id = e.target_metric_id
                WHERE m.user_id = 727 AND m."type" = 'carbs'
                  AND m.value BETWEEN :lo AND :hi
                  AND g.value IS NOT NULL
                ORDER BY g.value ASC LIMIT 3
            """), {"lo": max(0, carbs_g - 15), "hi": carbs_g + 15})
            similar_better = [dict(r._mapping) for r in gq.fetchall()]
    except Exception as exc:
        logger.warning("Similar better meals query failed: %s", exc)
    return similar_better
