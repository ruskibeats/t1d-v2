#!/usr/bin/env python3
"""CLI entry point for T1D Companion v2.

No argument: walks through a random simulator legend showing off every module.
With argument: detects intent and responds with companion cards.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import logging
import os
import random
import sys
from pathlib import Path
from typing import Any

from app.simulator.schemas import AnchorType
from app.simulator.patient_factory import generate_patient_config, generate_profile_json
from src.companion import (
    Intent,
    detect_intent,
    welcome_card,
    meal_pipeline_section,
    what_if_card,
    troubleshoot_card,
    situation_card,
    morning_call_card,
    lunch_presser_card,
    evening_roundup_card,
    insights_card,
    _separator,
)
from src.runner import (
    run_companion_scenario,
    DEFAULT_OLLAMA_URL,
    DEFAULT_OLLAMA_MODEL,
)

logger = logging.getLogger(__name__)
_LEGENDS: list[dict[str, Any]] | None = None


def _load_legends() -> list[dict[str, Any]]:
    global _LEGENDS
    if _LEGENDS is None:
        path = Path(__file__).resolve().parents[1] / "data" / "legends.json"
        _LEGENDS = json.loads(path.read_text())
    return _LEGENDS


def _press_enter(text: str = "Press Enter to continue...", *, interactive: bool = True) -> None:
    if not interactive:
        return
    try:
        input(f"\n{text}")
    except (EOFError, KeyboardInterrupt):
        pass


# ── Legend showcase cards ──

def _legend_intro_card(legend: dict[str, Any]) -> str:
    p = legend["profile_summary"]["profile"]
    diag = legend["diagnosis_years"]
    diag_str = f"diagnosed {int(diag)} year{'s' if int(diag) != 1 else ''} ago" if diag >= 1 else "newly diagnosed"
    return (
        f"\n━━━ Meet {legend['name']} ━━━\n"
        f"  Age: {legend['age']}, {diag_str}\n"
        f"  Profile: {p.get('anchor_label', legend['anchor_label'])}\n"
        f"  {p.get('description', '')}\n"
        f"  Estimated TIR: {p.get('estimated_tir', '?')}%\n"
        f"  Estimated A1C: {p.get('estimated_a1c', '?')}\n"
        f"  Variability: {p.get('variability_category', '?')}"
    )


def _legend_meal_stats_card(insights: dict[str, Any]) -> str:
    lines = ["\n━━━ {name}'s 90-Day Food History ━━━"]
    overall = insights.get("overall", {})
    lines.append(f"\n  Daily averages:")
    lines.append(f"  🍝 {overall.get('daily_avg_carbs_g', '?')}g carbs")
    lines.append(f"  🧈 {overall.get('daily_avg_fat_g', '?')}g fat")
    lines.append(f"  🍬 {overall.get('daily_avg_sugars_g', '?')}g sugars")
    lines.append(f"\n  Meals logged: {insights.get('total_meals', 0)}")
    lines.append(f"\n  Per-meal type:")
    for mt in ["breakfast", "morning_snack", "lunch", "afternoon_snack", "dinner", "evening_snack"]:
        stats = insights.get("meal_stats", {}).get(mt, {})
        if stats.get("count", 0) > 0:
            top = ", ".join(stats.get("top_foods", [])[:2])
            lines.append(f"    {mt:<16s}: avg {stats['avg_carbs_g']}g carbs | e.g. {top}")
    return "\n".join(lines)


def _legend_current_cgm_card(cgm: dict[str, Any]) -> str:
    return (
        f"\n━━━ Current CGM Reading ━━━\n"
        f"  {cgm['mg_dl']} mg/dL  {cgm['arrow']} {cgm['trend']}\n"
        f"  Recorded: {cgm.get('timestamp', 'now')[:19]}"
    )


async def _legend_question_card(
    legend: dict[str, Any],
    question_type: str,
    question: str,
    *,
    use_llm_parse: bool = True,
    ollama_url: str = DEFAULT_OLLAMA_URL,
    ollama_model: str = DEFAULT_OLLAMA_MODEL,
) -> list[str]:
    """Route the legend's question through the companion pipeline."""
    return await question_to_cards(
        question,
        question_type=question_type,
        anchor=legend["anchor_type"],
        profile_config=legend.get("profile_config", {}) | {"anchor_label": legend.get("anchor_label", legend["anchor_type"])},
        use_llm_parse=use_llm_parse,
        ollama_url=ollama_url,
        ollama_model=ollama_model,
    )


async def question_to_cards(
    text: str,
    *,
    question_type: str | None = None,
    anchor: str = "well_controlled",
    profile_config: dict[str, Any] | None = None,
    use_llm_parse: bool = True,
    ollama_url: str = DEFAULT_OLLAMA_URL,
    ollama_model: str = DEFAULT_OLLAMA_MODEL,
) -> list[str]:
    """Route a question through the companion system and return cards."""
    if question_type is None:
        intent = detect_intent(text)
        question_type = intent.value if intent != Intent.UNKNOWN else "meal"

    if question_type in ("meal",):
        return await _run_meal_scenario(
            text,
            anchor,
            profile_config=profile_config,
            use_llm_parse=use_llm_parse,
            ollama_url=ollama_url,
            ollama_model=ollama_model,
        )
    if question_type in ("what_if",):
        return await _run_what_if(
            text,
            anchor,
            profile_config=profile_config,
            use_llm_parse=use_llm_parse,
            ollama_url=ollama_url,
            ollama_model=ollama_model,
        )
    if question_type == "troubleshoot_high":
        return troubleshoot_card("high")
    if question_type == "troubleshoot_low":
        return troubleshoot_card("low")
    if question_type == "situation":
        return situation_card(_situation_category(text))
    if question_type in ("morning", "morning_call"):
        return morning_call_card()
    if question_type in ("lunch", "lunch_presser"):
        return lunch_presser_card()
    if question_type in ("evening", "evening_roundup"):
        return evening_roundup_card()
    if question_type in ("patterns", "insights"):
        return insights_card()
    return [f"\n━━━ Unknown ━━━\n\nCan't handle that yet."]


def _situation_category(text: str) -> str:
    lower = text.lower()
    if any(word in lower for word in ["run", "gym", "workout", "exercise", "walk", "sport"]):
        return "exercise"
    if any(word in lower for word in ["beer", "wine", "alcohol", "drink", "drank"]):
        return "alcohol"
    if any(word in lower for word in ["sick", "ill", "flu", "cold", "vomit", "infection"]):
        return "illness"
    return "heat"


async def _run_meal_scenario(
    text: str,
    anchor: str,
    *,
    profile_config: dict[str, Any] | None = None,
    use_llm_parse: bool = True,
    ollama_url: str = DEFAULT_OLLAMA_URL,
    ollama_model: str = DEFAULT_OLLAMA_MODEL,
) -> list[str]:
    result = await run_companion_scenario(
        text,
        anchor=anchor,
        use_llm_parse=use_llm_parse,
        profile_config=profile_config,
        ollama_url=ollama_url,
        ollama_model=ollama_model,
    )
    if result.get("database_error"):
        return [f"\n{result['response']}"]

    forecast = result["forecast"]
    chart = result.get("response", "")
    if "📈" in chart:
        cs = chart[chart.find("📈"):]
        for m in ["## Monitoring Suggestions", "## Monitoring", "Educational simulation"]:
            idx = cs.find(m)
            if idx >= 0:
                cs = cs[:idx].strip()
        chart = cs if cs else ""

    parse_metadata = result.get("parse_metadata", {})
    parser_label = parse_metadata.get("parser", "unknown").replace("_", " ")
    return meal_pipeline_section(
        profile_label=f"{result['profile'].get('anchor_label', anchor)} | Parser: {parser_label}",
        parsed_foods=result["parsed_foods"],
        food_evidence=result["food_evidence"],
        meal_totals=result["meal_totals"],
        forecast=forecast,
        historical_context=result["historical_context"],
        risk_flags=result["risk_flags"],
        chart=chart,
    )


async def _run_what_if(
    text: str,
    anchor: str,
    *,
    profile_config: dict[str, Any] | None = None,
    use_llm_parse: bool = True,
    ollama_url: str = DEFAULT_OLLAMA_URL,
    ollama_model: str = DEFAULT_OLLAMA_MODEL,
) -> list[str]:
    import re
    cleaned = re.sub(r"\b(can|i|what|if|is|it|ok|safe|fine|to|should|have|eat|a|an|the)\b", "", text, flags=re.IGNORECASE).strip()
    if not cleaned:
        cleaned = text
    result = await run_companion_scenario(
        cleaned,
        anchor=anchor,
        use_llm_parse=use_llm_parse,
        profile_config=profile_config,
        ollama_url=ollama_url,
        ollama_model=ollama_model,
    )
    if result.get("database_error"):
        return what_if_card(
            food_text=text,
            carbs_g=30,
            fat_g=10,
            sugars_g=15,
            peak_mg_dl=150,
            peak_time_min=90,
            risk_flags=["portion_uncertain"],
        )
    totals = result["meal_totals"]
    forecast = result["forecast"]
    return what_if_card(
        food_text=text,
        carbs_g=totals.get("carbs_g", 0),
        fat_g=totals.get("fat_g", 0),
        sugars_g=totals.get("sugars_g", 0),
        peak_mg_dl=forecast.get("peak_mg_dl", 0),
        peak_time_min=forecast.get("peak_time_minutes", 0),
        risk_flags=result["risk_flags"],
    )


def _show_cards(cards: list[str], *, interactive: bool = True) -> None:
    for i, card in enumerate(cards):
        print(card)
        if i < len(cards) - 1:
            _press_enter(interactive=interactive)


def _find_legend(legends: list[dict[str, Any]], selector: str | None) -> dict[str, Any]:
    """Find a legend by name, anchor type, or 1-based list index."""
    if not selector:
        return random.Random().choice(legends)

    key = selector.strip().lower()
    if key.isdigit():
        idx = int(key) - 1
        if 0 <= idx < len(legends):
            return legends[idx]

    for legend in legends:
        if key in {legend["name"].lower(), legend["anchor_type"].lower(), legend["anchor_label"].lower()}:
            return legend
        if key in legend["name"].lower():
            return legend

    valid = ", ".join(f"{i + 1}:{l['name']} ({l['anchor_type']})" for i, l in enumerate(legends))
    raise SystemExit(f"Unknown legend '{selector}'. Choose one of: {valid}")


def _legend_question_deck_card(legend: dict[str, Any]) -> str:
    """Show every demo question configured for this legend."""
    lines = [f"\n━━━ {legend['name']}'s Question Deck ━━━\n"]
    for i, (question_type, question) in enumerate(legend.get("questions", []), start=1):
        lines.append(f"  {i}. [{question_type}] {question}")
    return "\n".join(lines)


_ALL_CARD_DEMO_QUESTIONS: list[tuple[str, str]] = [
    ("meal", "pizza and salad for dinner"),
    ("what_if", "can I have a banana after dinner"),
    ("troubleshoot_high", "why is my sugar still high 4 hours after dinner"),
    ("troubleshoot_low", "why am I going low for no reason"),
    ("situation", "I went for a run and now I am low"),
    ("morning", "morning"),
    ("lunch", "lunch"),
    ("evening", "evening"),
    ("patterns", "show me my patterns"),
]


async def run_showcase(
    *,
    legend_selector: str | None = None,
    all_questions: bool = False,
    all_card_types: bool = False,
    interactive: bool = True,
    use_llm_parse: bool = True,
    ollama_url: str = DEFAULT_OLLAMA_URL,
    ollama_model: str = DEFAULT_OLLAMA_MODEL,
) -> None:
    """Walk through a legend demo and route one, configured, or all card-family questions."""
    legends = _load_legends()
    rng = random.Random()

    legend = _find_legend(legends, legend_selector)
    insights = legend["insights"]
    cgm = legend["current_cgm"]
    questions = legend.get("questions", [("patterns", "patterns")])
    if all_card_types:
        selected_questions = _ALL_CARD_DEMO_QUESTIONS
    elif all_questions:
        selected_questions = questions
    else:
        selected_questions = [rng.choice(questions)]

    print(f"\n━━━ T1D Companion Showcase ━━━")
    print(f"Legend: {legend['name']} ({legend['anchor_type']})")
    _press_enter("Press Enter to start the showcase", interactive=interactive)

    print(_legend_intro_card(legend))
    _press_enter(interactive=interactive)

    lines = _legend_meal_stats_card(insights).replace("{name}", legend["name"])
    print(lines)
    _press_enter(interactive=interactive)

    print(_legend_current_cgm_card(cgm))
    _press_enter(interactive=interactive)

    print(_legend_question_deck_card(legend))
    _press_enter(interactive=interactive)

    for idx, (question_type, question) in enumerate(selected_questions, start=1):
        print(f"\n━━━ {legend['name']} Asks ({idx}/{len(selected_questions)}) ━━━\n💬 [{question_type}] \"{question}\"")
        _press_enter(interactive=interactive)
        cards = await _legend_question_card(
            legend,
            question_type,
            question,
            use_llm_parse=use_llm_parse,
            ollama_url=ollama_url,
            ollama_model=ollama_model,
        )
        _show_cards(cards, interactive=interactive)
        if idx < len(selected_questions):
            _press_enter("Press Enter for next question...", interactive=interactive)

    print(f"\n━━━ End of {legend['name']}'s Showcase ━━━")
    if interactive:
        print("Press Ctrl+C or Enter to exit.")
        try:
            input()
        except (EOFError, KeyboardInterrupt):
            pass


def main() -> None:
    ap = argparse.ArgumentParser(description="T1D Companion v2")
    ap.add_argument("text", nargs="?", default="", help="Your question or meal description")
    ap.add_argument("--anchor", default="well_controlled", choices=[a.value for a in AnchorType])
    ap.add_argument("--no-llm", action="store_true", help="Developer/debug only: skip LLM parser and use deterministic parsing")
    ap.add_argument("--no-interactive", action="store_true", help="Show all cards at once")
    ap.add_argument("--legend", help="Showcase a specific legend by name, anchor type, or 1-based index")
    ap.add_argument("--all-questions", action="store_true", help="Run every configured question for the selected legend")
    ap.add_argument("--all-cards", action="store_true", help="Run one demo question for every terminal card family")
    ap.add_argument("--compare-legends", metavar="MEAL", help="Compare meal forecast across all 12 legend profiles")
    ap.add_argument(
        "--ollama-url",
        default=os.environ.get("OLLAMA_URL", DEFAULT_OLLAMA_URL),
        help=f"Ollama base URL (default: env OLLAMA_URL or {DEFAULT_OLLAMA_URL})",
    )
    ap.add_argument(
        "--ollama-model",
        default=os.environ.get("OLLAMA_MODEL", DEFAULT_OLLAMA_MODEL),
        help=f"Ollama model (default: env OLLAMA_MODEL or {DEFAULT_OLLAMA_MODEL})",
    )
    args = ap.parse_args()

    try:
        if args.compare_legends:
            asyncio.run(_run_legend_theater(args.compare_legends, use_llm=False))
            return

        if not args.text:
            asyncio.run(run_showcase(
                legend_selector=args.legend,
                all_questions=args.all_questions,
                all_card_types=args.all_cards,
                interactive=not args.no_interactive,
                use_llm_parse=not args.no_llm,
                ollama_url=args.ollama_url,
                ollama_model=args.ollama_model,
            ))
            return

        cards = asyncio.run(question_to_cards(
            args.text,
            anchor=args.anchor,
            use_llm_parse=not args.no_llm,
            ollama_url=args.ollama_url,
            ollama_model=args.ollama_model,
        ))
        _show_cards(cards, interactive=not args.no_interactive)
    except KeyboardInterrupt:
        print("\nExiting showcase.")
    except RuntimeError as exc:
        print(f"\nLLM error: {exc}", file=sys.stderr)
        raise SystemExit(1) from exc


# ── Legend Theater: compare same meal across all 12 profiles ──

async def _run_legend_theater(meal_text: str, *, use_llm: bool = False) -> None:
    """Run a meal across all 12 legend profiles and print a comparison table."""
    from src.forecast.model import MealTotals
    from src.forecast.stage import ForecastStage, make_forecaster
    from src.parser.deterministic import DeterministicParser
    from app.food.service import combine_food_evidence, calculate_food_evidence, FoodService
    from app.core.database import db_manager, get_settings

    # Parse meal
    if use_llm:
        from src.runner import parse_meal_llm
        foods, _ = await parse_meal_llm(meal_text)
    else:
        foods = DeterministicParser().parse(meal_text)

    if not foods:
        print("No foods parsed from input.")
        return

    # Get food evidence (best-effort; works without DB via archetype fallback)
    evidence = []
    try:
        settings = get_settings()
        db_manager.init_db(settings.database_url)
        async with db_manager.get_session() as session:
            service = FoodService(session)
            evidence = [
                calculate_food_evidence(f, await service.search_food_candidates(f))
                for f in foods
            ]
    except Exception:
        pass

    # Fallback totals if no DB evidence
    meal = combine_food_evidence(evidence)
    totals_dict = meal.get("totals", {})
    if not totals_dict.get("carbs_g"):
        # Rough heuristic: ~30g carbs per food item if no evidence
        totals_dict = {
            "carbs_g": len(foods) * 30.0,
            "fat_g": len(foods) * 10.0,
            "sugars_g": len(foods) * 5.0,
            "protein_g": len(foods) * 8.0,
            "kcal": len(foods) * 250.0,
        }
    totals = MealTotals.from_dict(totals_dict)

    legends = _load_legends()
    results: list[dict[str, Any]] = []

    for legend in legends:
        pc = legend.get("profile_config", {})
        anchor = legend["anchor_type"]
        label = legend.get("anchor_label", anchor.replace("_", " ").title())

        # Build ForecastStage
        stage = ForecastStage(
            anchor_type=anchor,
            basal_mg_dl=pc.get("basal_glucose_mean", 110),
            carb_ratio=pc.get("carb_ratio", 15),
            insulin_sensitivity=pc.get("insulin_sensitivity", 40),
            fat_delay_hours=pc.get("fat_delay_hours", 3.0),
            exercise_drop_factor=pc.get("exercise_drop_factor", 1.0),
        )

        forecast = stage.forecast(totals)

        # Risk flags from totals
        flags: list[str] = []
        if totals.carbs_g >= 80:
            flags.append("large_carb_load")
        if totals.fat_g >= 15:
            flags.append("fat_delay")
        if totals.sugars_g >= 50:
            flags.append("rapid_sugar")

        band = forecast.uncertainty_band
        pr = list(band.peak_range_mg_dl) if band else [forecast.peak_mg_dl, forecast.peak_mg_dl]

        results.append({
            "name": legend["name"],
            "anchor": anchor,
            "label": label,
            "baseline": forecast.baseline_mg_dl,
            "peak": forecast.peak_mg_dl,
            "peak_time": forecast.peak_time_minutes,
            "peak_low": pr[0],
            "peak_high": pr[1],
            "flags": flags,
            "cgm": legend.get("current_cgm", {}).get("mg_dl", "?"),
        })

    # Sort by peak descending
    results.sort(key=lambda r: r["peak"], reverse=True)

    # ── Render table ──
    print(f"\n━━━ Legend Theater: \"{meal_text}\" ━━━")
    print(f"  Meal totals: {totals.carbs_g:.0f}g carbs, {totals.fat_g:.0f}g fat, {totals.sugars_g:.0f}g sugars")
    print(f"  {'Profile':<24s} {'Baseline':>8s} {'Peak':>6s} {'Range':>14s} {'Time':>6s} {'Flags':<20s}")
    print(f"  {'─'*24} {'─'*8} {'─'*6} {'─'*14} {'─'*6} {'─'*20}")
    for r in results:
        range_str = f"{r['peak_low']}–{r['peak_high']}"
        flags_str = ", ".join(r["flags"]) if r["flags"] else "—"
        print(f"  {r['label']:<24s} {r['baseline']:>8} {r['peak']:>6} {range_str:>14} {r['peak_time']:>6} {flags_str:<20s}")

    print(f"\n  Meal parsed: {', '.join(f.item for f in foods)}")
    print(f"  Legend CGM baseline shown for context.")
    print(f"  Synthetic/demo forecasts — not medical advice.")

    # Summary insight
    best = results[-1]
    worst = results[0]
    spread = worst["peak"] - best["peak"]
    print(f"\n  Peak spread: {spread} mg/dL between profiles.")
    print(f"  Highest peak: {worst['label']} ({worst['peak']} mg/dL)")
    print(f"  Lowest peak:  {best['label']} ({best['peak']} mg/dL)")
    if spread > 60:
        print(f"  This meal behaves very differently across profile types — personalization matters.")
    elif spread > 30:
        print(f"  Moderate profile sensitivity — some users will see notably different outcomes.")
    else:
        print(f"  Relatively consistent response across profiles.")

        raise SystemExit(1) from exc


if __name__ == "__main__":
    main()
