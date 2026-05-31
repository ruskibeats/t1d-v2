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
        )
        response = _make_text_response(bundle, chart)
        safety = self.safety.validate(response, {"source": "assistant"})

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
