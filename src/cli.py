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
import random
import sys
from pathlib import Path
from typing import Any

from app.simulator.schemas import AnchorType
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


def _press_enter(text: str = "Press Enter to continue...") -> None:
    try:
        input(f"\n{text}")
    except (EOFError, KeyboardInterrupt):
        pass


# ── Legend showcase cards ──

def _legend_intro_card(legend: dict[str, Any]) -> str:
    p = legend["profile_summary"]["profile"]
    diag = legend["diagnosis_years"]
    diag_str = f"diagnosed {int(diag)} year{'s' if int(diag) != 1 else ''} ago" if diag >= 0.5 else "newly diagnosed"
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


def _legend_question_card(legend: dict[str, Any], question_type: str, question: str) -> list[str]:
    """Route the legend's question through the companion pipeline."""
    return question_to_cards(question, question_type=question_type, anchor=legend["anchor_type"],
                              profile_config=legend.get("profile_config", {}) | {"anchor_label": legend.get("anchor_label", legend["anchor_type"])})


def question_to_cards(text: str, *, question_type: str | None = None, anchor: str = "well_controlled",
                      profile_config: dict[str, Any] | None = None) -> list[str]:
    """Route a question through the companion system and return cards."""
    if question_type is None:
        intent = detect_intent(text)
        question_type = intent.value if intent != Intent.UNKNOWN else "meal"

    if question_type in ("meal",):
        return _run_meal_scenario(text, anchor, profile_config=profile_config)
    if question_type in ("what_if",):
        return _run_what_if(text, anchor)
    if question_type == "troubleshoot_high":
        return troubleshoot_card("high")
    if question_type == "troubleshoot_low":
        return troubleshoot_card("low")
    if question_type == "situation":
        return situation_card("heat")  # default
    if question_type == "morning":
        return morning_call_card()
    if question_type == "lunch":
        return lunch_presser_card()
    if question_type == "evening":
        return evening_roundup_card()
    if question_type in ("patterns", "insights"):
        return insights_card()
    return [f"\n━━━ Unknown ━━━\n\nCan't handle that yet."]


def _run_meal_scenario(text: str, anchor: str, *, profile_config: dict[str, Any] | None = None) -> list[str]:
    result = asyncio.run(
        run_companion_scenario(text, anchor=anchor, use_llm_parse=True, profile_config=profile_config)
    )
    if result.get("database_error"):
        return [f"\n{result['response']}"]

    forecast = result["forecast"]
    chart = result.get("response", "")
    if "📈" in chart:
        cs = chart[chart.find("📈"):]
        for m in ["## Monitoring", "Educational simulation"]:
            idx = cs.find(m)
            if idx >= 0:
                cs = cs[:idx].strip()
        chart = cs if cs else ""

    return meal_pipeline_section(
        profile_label=result["profile"].get("anchor_label", anchor),
        parsed_foods=result["parsed_foods"],
        food_evidence=result["food_evidence"],
        meal_totals=result["meal_totals"],
        forecast=forecast,
        historical_context=result["historical_context"],
        risk_flags=result["risk_flags"],
        chart=chart,
    )


def _run_what_if(text: str, anchor: str) -> list[str]:
    import re
    cleaned = re.sub(r"\b(can|i|what|if|is|it|ok|safe|fine|to|should|have|eat|a|an|the)\b", "", text, flags=re.IGNORECASE).strip()
    if not cleaned:
        cleaned = text
    result = asyncio.run(run_companion_scenario(cleaned, anchor=anchor, use_llm_parse=False))
    if result.get("database_error"):
        return [f"\nCannot forecast that."]
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


def _show_cards(cards: list[str]) -> None:
    for i, card in enumerate(cards):
        print(card)
        if i < len(cards) - 1:
            _press_enter()


def run_showcase() -> None:
    """Pick a random legend and walk through their data."""
    legends = _load_legends()
    rng = random.Random()

    # Pick legend
    legend = rng.choice(legends)
    anchor_type = legend["anchor_type"]
    insights = legend["insights"]
    cgm = legend["current_cgm"]
    questions = legend.get("questions", [("patterns", "patterns")])

    # Pick a random question
    question_type, question = rng.choice(questions)

    print(f"\n━━━ T1D Companion Showcase ━━━")
    _press_enter("Press Enter to start the showcase")

    # Card 1: Meet the legend
    print(_legend_intro_card(legend))
    _press_enter()

    # Card 2: Their food history
    lines = _legend_meal_stats_card(insights)
    lines = lines.replace("{name}", legend["name"])
    print(lines)
    _press_enter()

    # Card 3: Current CGM
    print(_legend_current_cgm_card(cgm))
    _press_enter()

    # Card 4: Their question
    print(f"\n━━━ {legend['name']} Asks ━━━\n💬 \"{question}\"")
    _press_enter()

    # Card 5+: Answer cards
    cards = _legend_question_card(legend, question_type, question)
    _show_cards(cards)

    print(f"\n━━━ End of {legend['name']}'s Showcase ━━━")
    print("Press Ctrl+C or Enter to exit.")
    try:
        input()
    except (EOFError, KeyboardInterrupt):
        pass


def main() -> None:
    ap = argparse.ArgumentParser(description="T1D Companion v2")
    ap.add_argument("text", nargs="?", default="", help="Your question or meal description")
    ap.add_argument("--anchor", default="well_controlled", choices=[a.value for a in AnchorType])
    ap.add_argument("--no-llm", action="store_true", help="Skip LLM parser")
    ap.add_argument("--no-interactive", action="store_true", help="Show all cards at once")
    args = ap.parse_args()

    if not args.text:
        run_showcase()
        return

    cards = question_to_cards(args.text, anchor=args.anchor)
    _show_cards(cards)


if __name__ == "__main__":
    main()
