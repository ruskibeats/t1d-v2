#!/usr/bin/env python3
"""V2 T1D Companion runner.

Pipeline:
1. Parse meal text into foods (LLM when available, deterministic fallback)
2. Lookup nutrition evidence from Postgres/OpenFoodFacts
3. Select simulator profile
4. Forecast glucose
5. Add historical context
6. Build evidence bundle
7. Safety validation
8. Render text-first response
"""

from __future__ import annotations

import argparse
import asyncio
import json
import logging
import os
import re
from dataclasses import asdict
from pathlib import Path
from typing import Any

import httpx


logger = logging.getLogger(__name__)

from app.ai.safety import SafetyScaffold
from app.core.database import db_manager, get_settings
from app.food.service import FoodService, ParsedFood, calculate_food_evidence, combine_food_evidence
from app.services.historical_meal_matcher import historical_context_for_meal
from app.simulator.patient_factory import generate_patient_config, generate_profile_json
from app.simulator.schemas import AnchorType
from src.evidence_bundle import make_evidence_bundle
from src.forecast_engine import ForecastStage, MealTotals, populate_evidence_fields
from src.forecast_renderer import render_forecast
from src.prediction_schema_adapter import forecast_to_prediction_schema

# ── Constants ──

ALIASES = {
    "coke": ["coca cola", "coke", "cola"],
    "cola": ["coca cola", "cola", "coke"],
    "diet coke": ["diet coke", "coca cola zero", "diet cola"],
    "donut": ["donut", "doughnut"],
    "doughnut": ["doughnut", "donut"],
    "pizza": ["pizza", "pepperoni pizza"],
    "cereal": ["cereal", "breakfast cereal", "corn flakes"],
    "pasta": ["pasta", "spaghetti", "noodles"],
    "rice": ["rice", "white rice"],
    "sushi": ["sushi", "sushi roll"],
    "fries": ["fries", "french fries", "chips"],
    "chips": ["fries", "french fries"],
    "lager": ["lager", "beer", "pilsner"],
    "beer": ["beer", "lager"],
    "ice cream": ["ice cream", "vanilla ice cream"],
    "chicken wings": ["chicken wings", "buffalo wings"],
    "chicken": ["chicken", "grilled chicken", "chicken breast"],
    "steak": ["steak", "fillet steak"],
    "bread": ["bread", "toast", "sliced bread"],
    "bacon": ["bacon", "rashers"],
    "burger": ["burger", "beef burger", "cheeseburger"],
    "sausage": ["sausage", "pork sausage"],
    "eggs": ["eggs", "scrambled eggs", "fried eggs"],
    "fish": ["fish", "cod", "salmon", "haddock"],
    "salad": ["salad", "green salad", "side salad"],
    "vegetables": ["vegetables", "mixed vegetables"],
    "banana": ["banana"],
    "apple": ["apple"],
    "cake": ["cake", "sponge cake"],
    "biscuit": ["biscuit", "cookies"],
    "chocolate": ["chocolate", "milk chocolate"],
    "crisps": ["crisps", "potato crisps"],
    "cheese": ["cheese", "cheddar"],
    "potato": ["potato", "potatoes"],
    "milk": ["milk", "semi skimmed milk", "whole milk"],
    "coffee": ["coffee", "latte", "cappuccino"],
    "tea": ["tea", "black tea"],
    "wine": ["wine", "red wine", "white wine"],
    "yogurt": ["yogurt", "greek yogurt"],
    "coleslaw": ["coleslaw", "slaw"],
    "soup": ["soup", "stew"],
    "curry": ["curry", "tikka masala"],
    "fruit": ["fruit", "mixed fruit"],
    "donut": ["donut", "doughnut", "glazed doughnut"],
    "butter": ["butter", "spread"],
}

DEFAULT_OLLAMA_URL = os.getenv("OLLAMA_URL", os.getenv("OLLAMA_HOST", "http://192.168.0.137:11434"))
DEFAULT_OLLAMA_MODEL = os.getenv("T1D_LOCAL_MODEL", "llama3.1:latest")
PROMPTS_DIR = Path(__file__).resolve().parents[1] / "prompts"

_JSON_BLOCK_RE = re.compile(r"```(?:json)?\s*(.*?)```", re.DOTALL | re.IGNORECASE)

# ── Prompt helpers ──

def _load_prompt(name: str) -> str:
    path = PROMPTS_DIR / name
    try:
        return path.read_text().strip()
    except FileNotFoundError:
        return ""

def _extract_json(text: str) -> Any:
    text = text.strip()
    for candidate in [*_JSON_BLOCK_RE.findall(text), text]:
        candidate = candidate.strip()
        try:
            return json.loads(candidate)
        except json.JSONDecodeError:
            pass
        for start in [candidate.find("{"), candidate.find("[")]:
            if start < 0:
                continue
            for end in range(len(candidate), start, -1):
                try:
                    return json.loads(candidate[start:end])
                except json.JSONDecodeError:
                    continue
    raise ValueError("No valid JSON found in LLM response")

# ── LLM parser (recovered from V1) ──

def _canonical_item(value: str) -> str:
    item = " ".join(value.lower().strip().split())
    item = item.strip(".,?!;:")
    if item in {"coca cola", "coca-cola", "cola"}:
        return "coke"
    if item in {"doughnut", "doughnuts", "donuts"}:
        return "donut"
    if item in {"french fries", "large fries", "chip", "chips", "fries"}:
        return "fries"
    if item in {"beer", "ale", "pilsner"}:
        return "lager"
    if item in {"potatoes", "mashed potato", "jacket potato"}:
        return "potato"
    if item in {"crisps", "potato crisps"}:
        return "crisps"
    if item in {"cookies", "cookie"}:
        return "biscuit"
    if item.endswith("s") and item not in {"fries", "chips", "crisps", "eggs", "wings", "fries"}:
        item = item[:-1]
    return item


def _normalise_food_dict(raw: dict[str, Any]) -> ParsedFood:
    item = _canonical_item(str(raw.get("item") or raw.get("name") or raw.get("food") or "unknown"))
    quantity = float(raw.get("quantity", raw.get("qty", 1)) or 1)
    unit = raw.get("unit")
    unit = str(unit).strip().lower() if unit else None
    terms = raw.get("search_terms") or raw.get("search") or []
    if isinstance(terms, str):
        terms = [terms]
    terms = [str(t).strip().lower() for t in terms if str(t).strip()]
    if not terms:
        terms = ALIASES.get(item, [item])
    return ParsedFood(item=item, quantity=quantity, unit=unit, search_terms=terms)


async def _call_ollama(client, ollama_url: str, model: str, system: str, text: str) -> str:
    resp = await client.post(
        f"{ollama_url.rstrip('/')}/v1/chat/completions",
        json={
            "model": model,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": text},
            ],
            "temperature": 0,
            "max_tokens": 300,
        },
        timeout=httpx.Timeout(15.0, connect=5.0, read=10.0),
    )
    resp.raise_for_status()
    return resp.json()["choices"][0]["message"]["content"]


async def _call_ollama_with_retry(
    ollama_url: str, model: str, system: str, text: str, max_retries: int = 2,
) -> str | None:
    last_error: Exception | None = None
    for attempt in range(1, max_retries + 2):
        try:
            async with httpx.AsyncClient() as client:
                return await _call_ollama(client, ollama_url, model, system, text)
        except httpx.TimeoutException as exc:
            logger.warning("Ollama timeout (attempt %d/%d): %s", attempt, max_retries, exc)
            last_error = exc
        except httpx.HTTPStatusError as exc:
            logger.warning("Ollama HTTP %s (attempt %d/%d): %s", exc.response.status_code, attempt, max_retries, exc)
            last_error = exc
        except Exception as exc:
            logger.error("Ollama call failed (attempt %d/%d): %s", attempt, max_retries, exc)
            last_error = exc
            break  # Non-retryable error
        if attempt < max_retries + 1:
            await asyncio.sleep(2 ** attempt)
    logger.error("Ollama exhausted retries: %s", last_error)
    return None


async def parse_meal_llm(
    text: str,
    ollama_url: str = DEFAULT_OLLAMA_URL,
    model: str = DEFAULT_OLLAMA_MODEL,
) -> tuple[list[ParsedFood], str | None]:
    """Parse meal text via local Ollama, falling back to deterministic parser."""
    system = _load_prompt("parser_system.txt")
    if not system:
        logger.info("No parser_system.txt prompt found, using deterministic parser")
        return _parse_deterministic(text), None

    logger.info("Parsing meal via Ollama (%s / %s): %s", ollama_url, model, text)
    content = await _call_ollama_with_retry(ollama_url, model, system, text)

    if content is None:
        logger.info("Ollama parse failed, falling back to deterministic parser")
        return _parse_deterministic(text), "llm_parse_failed: retries exhausted"

    try:
        data = _extract_json(content)
        if isinstance(data, list):
            foods_raw = data
        elif isinstance(data, dict):
            foods_raw = data.get("foods", [])
        else:
            foods_raw = []
        foods = [_normalise_food_dict(item) for item in foods_raw if isinstance(item, dict)]
        if foods:
            fallback = _parse_deterministic(text)
            by_item = {fd.item: fd for fd in fallback}
            for food in foods:
                hint = by_item.get(food.item)
                if hint:
                    food.unit = food.unit or hint.unit
                    food.search_terms = food.search_terms or hint.search_terms
            logger.info("Ollama parsed %d foods from: %s", len(foods), text)
            return foods, content
    except (ValueError, json.JSONDecodeError) as exc:
        logger.warning("Failed to extract JSON from Ollama response: %s", exc)

    logger.info("Ollama returned no parseable foods, falling back to deterministic")
    return _parse_deterministic(text), None


# ── Deterministic parser (recovered from V1 fallback_parse_scenario) ──

def _parse_deterministic(text: str) -> list[ParsedFood]:
    lower = text.lower()
    foods: list[ParsedFood] = []

    patterns = [
        (r"(\d+(?:\.\d+)?)\s+(?:cans?\s+of\s+)?(diet\s+coke|coke|cola|coca[- ]?cola|soft drink)s?\b", "can"),
        (r"(\d+(?:\.\d+)?)\s+(donuts?|doughnuts?)\b", None),
        (r"(\d+(?:\.\d+)?)\s+(slices?)\s+of\s+(pizza|pepperoni pizza|toast|bread)\b", "slice"),
        (r"(\d+(?:\.\d+)?)\s+(pints?)\s+of\s+(lager|beer|ale)\b", "pint"),
        (r"(\d+(?:\.\d+)?)\s+(wings?)\b", "wings"),
        (r"(\d+(?:\.\d+)?)\s+(scoops?)\s+of\s+(ice cream)\b", "scoop"),
        (r"(\d+(?:\.\d+)?)\s+(burgers?)\b", "burger"),
        (r"(\d+(?:\.\d+)?)\s+(sausages?)\b", None),
        (r"(\d+(?:\.\d+)?)\s+(eggs?)\b", None),
    ]
    for pattern, forced_unit in patterns:
        for match in re.finditer(pattern, lower):
            qty = float(match.group(1))
            item = match.group(match.lastindex or 2)
            if item in {"slice", "slices", "pint", "pints", "wing", "wings", "scoop", "scoops"} and (match.lastindex or 0) >= 3:
                item = match.group(3)
            item = _canonical_item(item)
            foods.append(ParsedFood(item=item, quantity=qty, unit=forced_unit, search_terms=ALIASES.get(item, [item])))

    known = ["big mac", "large fries", "fries", "pizza", "cereal", "pasta", "rice", "bread", "potato", "sushi", "fruit", "chicken", "steak", "bacon", "burger", "sausage", "eggs", "fish", "salad", "vegetables", "banana", "apple", "cake", "biscuit", "chocolate", "crisps", "cheese", "lager", "wine", "milk", "coffee", "tea", "yogurt", "butter", "soup", "curry", "donut", "ice cream", "coleslaw"]
    seen = {f.item for f in foods}
    for name in known:
        item = _canonical_item(name)
        if re.search(rf"\b{re.escape(name)}\b", lower) and item not in seen:
            foods.append(ParsedFood(item=item, quantity=1, unit="large" if name == "large fries" else None, search_terms=ALIASES.get(item, [item])))
            seen.add(item)

    if foods:
        foods.sort(key=lambda f: lower.find(f.item) if lower.find(f.item) >= 0 else len(lower))
        return foods

    cleaned = re.sub(r"[^a-zA-Z0-9 .,]+", " ", lower)
    for part in re.split(r"\s+(?:and|with|plus)\s+|,", cleaned):
        part = part.strip(" .")
        if not part:
            continue
        qty = 1.0
        m = re.match(r"(\d+(?:\.\d+)?)\s+(.+)", part)
        if m:
            qty = float(m.group(1))
            part = m.group(2)
        foods.append(ParsedFood(item=_canonical_item(part), quantity=qty, search_terms=ALIASES.get(_canonical_item(part), [_canonical_item(part)])))
    return foods or [ParsedFood(item=text, quantity=1, search_terms=[text])]


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
    ollama_url: str = DEFAULT_OLLAMA_URL,
    ollama_model: str = DEFAULT_OLLAMA_MODEL,
) -> dict[str, Any]:
    logger.info("Running companion scenario: text=%s anchor=%s use_llm_parse=%s", text, anchor, use_llm_parse)
    if use_llm_parse:
        foods, _ = await parse_meal_llm(text, ollama_url, ollama_model)
    else:
        foods = _parse_deterministic(text)
    logger.info("Parsed %d foods from input", len(foods))

    settings = get_settings()
    db_manager.init_db(settings.database_url)
    evidence = []
    try:
        async with db_manager.get_session() as session:
            service = FoodService(session)
            evidence = [calculate_food_evidence(f, await service.search_food_candidates(f)) for f in foods]
    except RuntimeError as exc:
        logger.warning("Database not available: %s", exc)
    except Exception as exc:
        logger.error("Food lookup failed: %s", exc, exc_info=True)
    meal = combine_food_evidence(evidence)
    logger.info("Food evidence computed: %d items, overall confidence=%s",
                len(evidence), meal.get("confidence_overall", "n/a"))

    if not any(ev.computed for ev in evidence):
        logger.warning("No food evidence computed \u2014 returning early")
        return {
            "scenario": text, "parsed_foods": [asdict(f) for f in foods],
            "food_evidence": meal["evidence_items"], "meal_totals": meal["totals"],
            "profile": {"anchor_type": "disconnected"}, "forecast": {},
            "historical_context": {"similar_meals_count": 0}, "prediction": {},
            "evidence_bundle": {}, "risk_flags": [],
            "safety": {"is_safe": True},
            "response": "Cannot estimate this meal \u2014 database connection is not available. Please set DATABASE_URL to start.",
            "database_error": "DATABASE_URL not set or Postgres unreachable.",

        }

    config = generate_patient_config(anchor)
    profile_json = generate_profile_json(config)
    stage = ForecastStage.from_profile(config)
    totals = MealTotals.from_dict(meal["totals"])
    forecast = stage.forecast(totals, carb_range_g=meal["total_carbs_g_range"])
    historical = historical_context_for_meal(text, carbs_g=totals.carbs_g, fat_g=totals.fat_g, food_name=" ".join(f.item for f in foods), anchor_type=config.anchor_type.value)
    forecast = populate_evidence_fields(forecast, evidence_items=meal["evidence_items"], historical_similarity_score=historical.get("similarity_score"), missing_info=[] if meal["confidence_overall"] != "low" else ["low_confidence_food_match"], calibration=stage.calibration)
    chart = render_forecast(forecast)
    prediction = forecast_to_prediction_schema(forecast, totals, confidence_tier=meal["confidence_overall"], ascii_chart=chart)
    bundle = make_evidence_bundle(forecast=forecast, totals=totals, profile={"anchor_type": config.anchor_type.value, "label": profile_json["anchor_label"]}, total_carbs_g_range=meal["total_carbs_g_range"], confidence_overall=meal["confidence_overall"], confidence_why="Food database lookup plus historical context.", historical_context=historical)
    response = _make_response(bundle, chart, _risk_flags(meal["totals"], foods))
    safety = SafetyScaffold().validate(response, {"source": "assistant"}); logger.info("Safety check: is_safe=%s risk=%s", safety["is_safe"], safety["risk_level"])
    return {
        "scenario": text, "parsed_foods": [asdict(f) for f in foods],
        "food_evidence": meal["evidence_items"], "meal_totals": meal["totals"],
        "profile": profile_json, "forecast": bundle["forecast"],
        "historical_context": historical, "prediction": prediction.model_dump(),
        "evidence_bundle": bundle, "risk_flags": _risk_flags(meal["totals"], foods),
        "safety": safety, "response": response,
    }


# Logging setup helper kept for use by callers; cli.py configures its own.
