#!/usr/bin/env python3
"""CLI entry point for T1D Companion v2.

Separated from src/runner.py to keep orchestration logic and presentation separate.
"""

from __future__ import annotations

import argparse
import asyncio
import json

from app.simulator.schemas import AnchorType
from src.runner import run_companion_scenario, DEFAULT_OLLAMA_URL, DEFAULT_OLLAMA_MODEL


def _print_result(result: dict[str, Any]) -> None:
    from app.ai.safety import SafetyScaffold
    safety = SafetyScaffold() if False else None  # noqa
    
    if result.get("database_error"):
        print(f"\n{result['response']}")
        print(f"DB: {result['database_error']}")
        return

    print("=" * 72)
    print("T1D COMPANION V2")
    print("=" * 72)
    print(f"Scenario: {result['scenario']}")
    print(f"Profile: {result['profile']['anchor_label']} ({result['profile']['anchor_type']})\n")
    print("Foods:")
    for item in result["food_evidence"]:
        p = item["parsed"]
        c = item["computed"]
        w = item.get("warnings") or []
        print(f"  {p['quantity']} {p.get('unit') or ''} {p['item']}: confidence={item['confidence']}", end="")
        if c:
            print(f" | {c['carbs_g']}g carbs, {c['fat_g']}g fat")
        else:
            print()
        for warning in w:
            print(f"    warning: {warning}")
    totals = result["meal_totals"]
    print(f"\nTotals: {totals['carbs_g']}g carbs, {totals['fat_g']}g fat, {totals['sugars_g']}g sugars")
    print(f"\n{result['response']}")
    if not result["safety"]["is_safe"]:
        print("\nSAFETY WARNING:", result["safety"])


def main() -> None:
    ap = argparse.ArgumentParser(description="T1D companion pipeline v2")
    ap.add_argument("scenario", help="Natural-language meal scenario")
    ap.add_argument("--anchor", default="well_controlled", choices=[a.value for a in AnchorType])
    ap.add_argument("--json", action="store_true", help="Print full JSON result")
    ap.add_argument("--no-llm", action="store_true", help="Skip LLM parser, use deterministic parser only")
    ap.add_argument("--ollama-url", default=DEFAULT_OLLAMA_URL)
    ap.add_argument("--ollama-model", default=DEFAULT_OLLAMA_MODEL)
    args = ap.parse_args()

    result = asyncio.run(
        run_companion_scenario(
            args.scenario,
            anchor=args.anchor,
            use_llm_parse=not args.no_llm,
            ollama_url=args.ollama_url,
            ollama_model=args.ollama_model,
        )
    )
    if args.json:
        print(json.dumps(result, indent=2))
    else:
        _print_result(result)


if __name__ == "__main__":
    main()
