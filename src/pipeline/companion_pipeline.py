#!/usr/bin/env python3
"""Companion pipeline — full flow: parse → food → forecast → safety → render."""

from __future__ import annotations

import logging
from dataclasses import asdict
from typing import Any

from app.ai.safety import SafetyScaffold
from app.core.database import db_manager, get_settings
from app.food.service import FoodService, calculate_food_evidence, combine_food_evidence
from app.services.historical_meal_matcher import historical_context_for_meal
from app.simulator.patient_factory import generate_patient_config, generate_profile_json
from src.adapter import forecast_to_prediction_schema, make_evidence_bundle
from src.counterfactual_coach import generate_counterfactuals, render_counterfactual_bundle
from src.forecast_engine import ForecastStage, MealTotals
from src.forecast.renderer import render_forecast
from src.parser import DeterministicParser, LLMParser, OllamaClient

logger = logging.getLogger(__name__)


class CompanionPipeline:
    """Full companion pipeline. Testable in isolation with mock parser/forecast/safety."""

    def __init__(
        self,
        parser: LLMParser | DeterministicParser | None = None,
        safety: SafetyScaffold | None = None,
        ollama_url: str = "http://192.168.0.137:11434",
        ollama_model: str = "llama3.1:latest",
    ):
        self.parser = parser or LLMParser(OllamaClient(ollama_url=ollama_url, model=ollama_model))
        self.safety = safety or SafetyScaffold()
        self.ollama_url = ollama_url
        self.ollama_model = ollama_model

    async def run(
        self,
        text: str,
        *,
        anchor: str = "well_controlled",
        use_llm_parse: bool = True,
        profile_config: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Run the full companion pipeline."""
        # 0. Input safety gate — block dangerous queries before processing
        from src.pipeline.safety_middleware import SafetyMiddleware
        middleware = SafetyMiddleware(scaffold=self.safety)
        input_safe, block_reason = middleware.validate_input(text)
        if not input_safe:
            return {
                "scenario": text,
                "parsed_foods": [],
                "food_evidence": [],
                "meal_totals": {},
                "profile": {"anchor_type": "blocked"},
                "forecast": {},
                "historical_context": {"similar_meals_count": 0},
                "prediction": {},
                "evidence_bundle": {},
                "risk_flags": [],
                "safety": {"is_safe": False, "reason": block_reason},
                "response": (
                    "That's a question for your care plan or clinician — "
                    "I can only explain the meal's likely glucose impact and when to monitor.\n\n"
                    "Educational simulation only — not medical advice."
                ),
            }

        # 1. Parse
        if use_llm_parse:
            foods, _ = await self.parser.parse_async(text)
        else:
            foods = DeterministicParser().parse(text)

        # 2. Food evidence
        settings = get_settings()
        db_manager.init_db(settings.database_url)
        evidence = []
        try:
            async with db_manager.get_session() as session:
                service = FoodService(session)
                evidence = [
                    calculate_food_evidence(f, await service.search_food_candidates(f))
                    for f in foods
                ]
        except (RuntimeError, Exception) as exc:
            logger.warning("Database not available: %s", exc)

        meal = combine_food_evidence(evidence)

        if not any(ev.computed for ev in evidence):
            return _build_early_return(text, foods, meal)

        # 2a. Clarification check — uncertainty-driven (Issue #39)
        from src.clarification_policy import ClarificationPolicy
        clarification_policy = ClarificationPolicy()
        clarification_decision = clarification_policy.evaluate_with_fallback(
            evidence_items=evidence,
            meal_totals=meal["totals"],
            parsed_foods=foods,
            clarification_already_asked=False,
        )
        if clarification_decision.should_ask:
            return _build_clarification_return(
                text, foods, meal,
                {
                    "food_item": clarification_decision.target_food,
                    "question": clarification_decision.question_text,
                    "unit": None,
                    "quantity": 1,
                    "portion_uncertainty_pct": 0.0,
                    "top_uncertainty_reason": clarification_decision.reason,
                },
                profile_label=anchor.replace("_", " ").title(),
            )

        # 3. Profile + forecast
        stage, profile_json, config = _build_profile(profile_config, anchor)
        totals = MealTotals.from_dict(meal["totals"])
        forecast = stage.forecast(totals, carb_range_g=meal["total_carbs_g_range"])
        forecast.missing_information_flags = meal.get("missing_information_flags", [])
        forecast.evidence_items = meal.get("evidence_items", [])

        # 4. Historical context
        anchor_value = config.anchor_type.value if hasattr(config, "anchor_type") else config.value
        historical = historical_context_for_meal(
            text, carbs_g=totals.carbs_g, fat_g=totals.fat_g,
            food_name=" ".join(f.item for f in foods),
            anchor_type=anchor_value,
        )

        # 4a. Counterfactual what-if scenarios
        counterfactuals = generate_counterfactuals(
            totals, stage, hour=19,
            current_forecast=forecast,
            historical_context=historical,
        )
        counterfactual_text = render_counterfactual_bundle(
            counterfactuals, food_text=text,
        )

        # 5. Bundle + safety
        chart = render_forecast(forecast)
        prediction = forecast_to_prediction_schema(
            forecast, totals,
            confidence_tier=meal["confidence_overall"],
            ascii_chart=chart,
        )
        bundle = make_evidence_bundle(
            forecast=forecast, totals=totals,
            profile={"anchor_type": anchor_value, "label": profile_json["anchor_label"]},
            total_carbs_g_range=meal["total_carbs_g_range"],
            confidence_overall=meal["confidence_overall"],
            confidence_why="Food database lookup plus historical context.",
            historical_context=historical,
            counterfactual_context=_cf_bundle_to_dict(counterfactuals),
        )
        response = _make_text_response(bundle, chart)

        # SafetyMiddleware gate — replaces direct SafetyScaffold call
        from src.pipeline.safety_middleware import SafetyMiddleware
        middleware = SafetyMiddleware(scaffold=self.safety)
        output_ok, validation_results = middleware.validate_output(
            response, {"scenario": text, "forecast": bundle.get("forecast", {}),
                        "evidence_bundle": bundle, "food_evidence": meal.get("evidence_items", []),
                        "historical_context": historical},
            context={"source": "assistant"},
        )
        if not output_ok:
            response = middleware.build_safe_fallback(response, validation_results)
        safety = {"is_safe": output_ok, "validation_results": [r.__dict__ for r in validation_results]}

        return {
            "scenario": text,
            "parsed_foods": [asdict(f) for f in foods],
            "food_evidence": meal["evidence_items"],
            "meal_totals": meal["totals"],
            "profile": profile_json,
            "forecast": bundle["forecast"],
            "historical_context": historical,
            "prediction": prediction.model_dump(),
            "evidence_bundle": bundle,
            "risk_flags": _risk_flags(meal["totals"], foods),
            "safety": safety,
            "response": response,
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


def _cf_bundle_to_dict(bundle: Any) -> dict[str, Any]:
    """Convert counterfactual bundle to plain dict for evidence context."""
    if not bundle or not bundle.scenarios:
        return {}
    return {
        "available_scenarios": [
            {
                "type": s.type,
                "label": s.label,
                "description": s.description,
                "comparison_delta_mg_dl": s.comparison.peak_delta_mg_dl,
                "comparison_timing_delta_min": s.comparison.timing_delta_minutes,
            }
            for s in bundle.scenarios
        ],
        "disclaimer": bundle.disclaimer,
    }


def _build_early_return(text: str, foods: list, meal: dict[str, Any]) -> dict[str, Any]:
    return {
        "scenario": text,
        "parsed_foods": [asdict(f) for f in foods],
        "food_evidence": meal["evidence_items"],
        "meal_totals": meal["totals"],
        "profile": {"anchor_type": "disconnected"},
        "forecast": {},
        "historical_context": {"similar_meals_count": 0},
        "prediction": {},
        "evidence_bundle": {},
        "risk_flags": [],
        "safety": {"is_safe": True},
        "response": "Cannot estimate this meal — database connection is not available.",
        "database_error": "DATABASE_URL not set or Postgres unreachable.",
    }


def _build_profile(profile_config: dict[str, Any] | None, anchor: str) -> tuple[ForecastStage, dict[str, Any], Any]:
    from app.simulator.schemas import AnchorType
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


def _risk_flags(totals: dict[str, float], foods: list) -> list[str]:
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


def _check_clarification_needed(
    foods: list, evidence: list, meal: dict[str, Any]
) -> dict[str, Any] | None:
    """Check if any food items need clarification before forecasting.

    Only triggers when BOTH conditions hold:
    1. The food matches a known ambiguity pattern (pizza, drink, fries, etc.)
    2. The evidence shows high portion uncertainty (no specific unit, low confidence)

    Returns a dict with clarification info if needed, None otherwise.
    """
    from src.clarification_loop import detect_ambiguity

    for ev in evidence:
        item = ev.parsed.get("item", "")
        unit = ev.parsed.get("unit")
        try:
            portion_unc = float(getattr(ev, "portion_uncertainty_pct", 0.0) or 0.0)
        except (TypeError, ValueError):
            portion_unc = 0.0
        confidence = getattr(ev, "confidence", "high")

        # Only clarify when uncertainty is actually high
        is_uncertain = portion_unc >= 0.3 or confidence == "low"
        if not is_uncertain:
            continue

        question = detect_ambiguity(item, unit)
        if question:
            return {
                "food_item": item,
                "question": question,
                "unit": unit,
                "quantity": ev.parsed.get("quantity", 1),
                "portion_uncertainty_pct": portion_unc,
                "top_uncertainty_reason": getattr(ev, "top_uncertainty_reason", ""),
            }

    return None


def _build_clarification_return(
    text: str, foods: list, meal: dict[str, Any],
    clarification: dict[str, Any],
    profile_label: str,
) -> dict[str, Any]:
    """Build a pipeline result that shows a clarification card instead of forecast."""
    from src.clarification_loop import clarification_card

    card = clarification_card(clarification["question"], clarification["food_item"])

    return {
        "scenario": text,
        "parsed_foods": [asdict(f) for f in foods],
        "food_evidence": meal["evidence_items"],
        "meal_totals": meal["totals"],
        "profile": {"anchor_type": "disconnected", "label": profile_label},
        "forecast": {},
        "historical_context": {"similar_meals_count": 0},
        "prediction": {},
        "evidence_bundle": {},
        "risk_flags": [],
        "safety": {"is_safe": True},
        "response": card,
        "clarification_needed": clarification,
    }


def _make_text_response(bundle: dict[str, Any], chart: str) -> str:
    p = bundle["profile"]
    t = bundle["totals"]
    f = bundle["forecast"]
    cr = bundle["total_carbs_g_range"]
    band = f.get("uncertainty_band", {})
    pr = band.get("peak_range_mg_dl", [f["peak_mg_dl"], f["peak_mg_dl"]])
    tr = band.get("peak_time_range_minutes", [f["peak_time_minutes"], f["peak_time_minutes"]])
    lines = [
        "## Profile Overview",
        f"Using the {p['label']} simulated profile: {p['plain_meaning']}.",
        "",
        "## Meal Details",
        f"About {t['carbs_g']:.0f}g carbs (likely range {cr[0]:.0f}–{cr[1]:.0f}g).",
        f"Estimated fat is {t['fat_g']:.0f}g and sugars are {t['sugars_g']:.0f}g.",
        "",
        "## Timing Insights",
        f"The forecast peaks around {f['peak_mg_dl']} mg/dL at about {f['peak_time_minutes']} minutes.",
        f"With portion uncertainty, peak could be about {pr[0]}–{pr[1]} mg/dL, timing {tr[0]}–{tr[1]} minutes.",
        "",
        chart,
        "",
        "Educational simulation only — not medical advice.",
    ]
    return "\n".join(lines)
