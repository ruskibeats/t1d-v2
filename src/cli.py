#!/usr/bin/env python3
"""CLI entry point for T1D Companion v2.

Detects user intent and surfaces companion cards press-by-press.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import logging
import sys

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


def _show_cards(cards: list[str], interactive: bool = True) -> None:
    """Show cards one at a time, waiting for Enter between each."""
    for i, card in enumerate(cards):
        print(card)
        if interactive and i < len(cards) - 1:
            input()  # Wait for Enter


def run_scenario_for_meal(text: str, anchor: str, no_llm: bool, ollama_url: str, ollama_model: str) -> list[str]:
    """Run the full meal pipeline and return companion cards."""
    result = asyncio.run(
        run_companion_scenario(
            text,
            anchor=anchor,
            use_llm_parse=not no_llm,
            ollama_url=ollama_url,
            ollama_model=ollama_model,
        )
    )

    if result.get("database_error"):
        return [f"\n{result['response']}"]

    profile_label = result["profile"].get("anchor_label", anchor)
    forecast = result["forecast"]
    chart = ""
    # Build an ASCII chart from forecast points
    if forecast.get("peak_mg_dl"):
        pts = []
        for p in result.get("food_evidence", []):
            pts.append(p)
        chart_lines = ["\n📈 Glucose Forecast (1–4 hours post-meal)"]
        chart_lines.append("─" * 50)
        for point_data in result.get("prediction", {}):
            pass
        # Use the raw response chart if available
    chart = result.get("response", "")
    if "📈" in chart:
        chart_section = chart[chart.find("📈"):]
        chart_section = chart_section[:chart_section.find("## Monitoring")].strip()
        if chart_section:
            chart = chart_section

    return meal_pipeline_section(
        profile_label=profile_label,
        parsed_foods=result["parsed_foods"],
        food_evidence=result["food_evidence"],
        meal_totals=result["meal_totals"],
        forecast=forecast,
        historical_context=result["historical_context"],
        risk_flags=result["risk_flags"],
        chart=chart,
    )


def run_what_if(text: str, anchor: str) -> list[str]:
    """Run what-if planning and return cards."""
    # Parse the food part out of the question
    import re
    # Strip "can I eat", "what if I eat", etc.
    cleaned = re.sub(
        r"\b(can|i|what|if|is|it|ok|safe|fine|to|should|have|eat|a|an|the)\b",
        "", text, flags=re.IGNORECASE
    ).strip()
    if not cleaned:
        cleaned = text

    # Run a forecast with the cleaned food text
    result = asyncio.run(
        run_companion_scenario(
            cleaned,
            anchor=anchor,
            use_llm_parse=False,
        )
    )

    if result.get("database_error"):
        return [f"\nCannot forecast that — database unavailable."]

    totals = result["meal_totals"]
    forecast = result["forecast"]
    risk_flags = result["risk_flags"]
    peak = forecast.get("peak_mg_dl", 0)
    peak_time = forecast.get("peak_time_minutes", 0)

    return what_if_card(
        food_text=text,
        carbs_g=totals.get("carbs_g", 0),
        fat_g=totals.get("fat_g", 0),
        sugars_g=totals.get("sugars_g", 0),
        peak_mg_dl=peak,
        peak_time_min=peak_time,
        risk_flags=risk_flags,
    )


def run_for_intent(
    text: str,
    anchor: str = "well_controlled",
    no_llm: bool = False,
    interactive: bool = True,
    ollama_url: str = DEFAULT_OLLAMA_URL,
    ollama_model: str = DEFAULT_OLLAMA_MODEL,
) -> list[str]:
    """Detect intent, run appropriate pipeline, return cards."""
    intent = detect_intent(text)

    if intent == Intent.MEAL:
        return run_scenario_for_meal(text, anchor, no_llm, ollama_url, ollama_model)

    if intent == Intent.WHAT_IF:
        return run_what_if(text, anchor)

    if intent == Intent.TROUBLESHOOT_HIGH:
        return troubleshoot_card("high")

    if intent == Intent.TROUBLESHOOT_LOW:
        return troubleshoot_card("low")

    if intent == Intent.SITUATION:
        lower = text.lower()
        if any(w in lower for w in ["hot", "heat", "sun", "warm"]):
            return situation_card("heat")
        if any(w in lower for w in ["exercis", "workout", "run", "walk", "gym", "sport", "active"]):
            return situation_card("exercise")
        if any(w in lower for w in ["alcohol", "beer", "wine", "drink", "drank"]):
            return situation_card("alcohol")
        if any(w in lower for w in ["sick", "ill", "flu", "cold", "vomit"]):
            return situation_card("illness")
        return situation_card("heat")

    if intent == Intent.MORNING_CALL:
        return morning_call_card()

    if intent == Intent.LUNCH_PRESSER:
        return lunch_presser_card()

    if intent == Intent.EVENING_ROUNDUP:
        return evening_roundup_card()

    if intent == Intent.INSIGHTS:
        return insights_card()

    return [f"\n━━━ Unknown ━━━\n\nCan't understand that yet. Try:\n  • \"pizza and large fries\"\n  • \"can I eat 6 scoops of ice cream\"\n  • \"why am I going high\"\n  • \"morning\" / \"evening\" / \"patterns\""]


def main() -> None:
    ap = argparse.ArgumentParser(description="T1D Companion v2 — press Enter to continue")
    ap.add_argument("text", nargs="?", default="", help="Your question or meal description")
    ap.add_argument("--anchor", default="well_controlled", choices=[a.value for a in AnchorType])
    ap.add_argument("--no-llm", action="store_true", help="Skip LLM parser")
    ap.add_argument("--json", action="store_true", help="Print full JSON result instead of cards")
    ap.add_argument("--interactive", "-i", action="store_true", default=True,
                    help="Press Enter between cards (default: true)")
    ap.add_argument("--no-interactive", action="store_true", help="Show all cards at once")
    args = ap.parse_args()

    interactive = args.interactive and not args.no_interactive

    # Welcome card if no text provided
    if not args.text:
        print(welcome_card())
        try:
            user_text = input("\n> ").strip()
        except (EOFError, KeyboardInterrupt):
            user_text = ""
        if not user_text:
            return
    else:
        user_text = args.text

    cards = run_for_intent(
        user_text,
        anchor=args.anchor,
        no_llm=args.no_llm,
        interactive=interactive,
    )

    _show_cards(cards, interactive=interactive)


if __name__ == "__main__":
    main()
