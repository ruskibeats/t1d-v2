#!/usr/bin/env python3
"""Push showcase runner output to Stitch design, then wire back to React.

Workflow:
1. Run showcase cards → JSON envelope
2. Open Stitch project URL for design review
3. Connect to React Native via legend data service

Usage:
    python scripts/stitch-workflow.py --legend tom --question "pizza and salad for dinner"
    python scripts/stitch-workflow.py --all-cards
"""

import argparse
import asyncio
import json
from pathlib import Path

# Load legend data
LEGEND_FILE = Path(__file__).parent.parent / "data" / "legends.json"

def load_legends():
    return json.loads(LEGEND_FILE.read_text())

def get_tom_legend():
    legends = load_legends()
    for l in legends:
        if l.get("anchor_type") == "foot_to_floor":
            return l
    return legends[0]

def format_envelope_for_stitch(envelope_data):
    """Format companion envelope to Stitch MCP compatible format."""
    return {
        "runId": envelope_data.get("runId", "demo"),
        "sourceLabel": envelope_data.get("sourceLabel", "Unknown"),
        "dataMode": envelope_data.get("dataMode", "synthetic_demo"),
        "cards": envelope_data.get("cards", [])
    }

def main():
    ap = argparse.ArgumentParser("Stitch design workflow for T1D Companion")
    ap.add_argument("--legend", default="tom", help="Legend to use (tom, or legend index)")
    ap.add_argument("--question", default="breakfast routine", help="Meal question to process")
    ap.add_argument("--all-cards", action="store_true", help="Show all card types")
    args = ap.parse_args()

    print("🎨 T1D Companion → Stitch Design Workflow")
    print("═══════════════════════════════════════════\n")

    legend = get_tom_legend() if args.legend == "tom" else load_legends()[int(args.legend) - 1]
    
    print(f"📊 Legend: {legend['name']} ({legend['anchor_type']})")
    print(f"   Known routine: {legend.get('profile_summary', {}).get('known_routine', 'N/A')}")
    print(f"   CGM: {legend.get('current_cgm', {}).get('mg_dl', '?')} mg/dL\n")

    print("🔗 Stitch Design Project:")
    print("   https://stitch.withgoogle.com/projects/3768458435933006236")
    print("   Screens available:")
    print("     • Today Dashboard with Food Memory")
    print("     • Log Meal")
    print("     • Today Dashboard")
    print("     • Patterns & Insights\n")

    print("📱 React Native Integration Points:")
    print("   mobile/src/data/tomLegend.ts")
    print("   mobile/src/state/useLegendProfile.ts")
    print("   mobile/app/(tabs)/log-meal.tsx (tab)")
    print("   mobile/app/(tabs)/home.tsx")
    print("   mobile/app/(tabs)/patterns.tsx\n")

    print("🚀 Dev server:")
    print("   cd mobile && npm start")
    print("   npx expo start --web  (then open localhost:8081)\n")

    print("💡 Next steps:")
    print("   1. Open Stitch URL above to review/edit designs")
    print("   2. Mobile tabs now align with Stitch: Today, Log Meal, Patterns, History")
    print("   3. Tom Batchelor profile pre-selected with Foot2Floor anchor")
    print("   4. Run app and verify forecast cards display correctly\n")

    print("📝 Mobile terminal parity:")
    print("   To trigger showcase: npx expo start --web")
    print("   Card types wired: forecast, parsedFoods, foodEvidence, mealMemory, confidence\n")

if __name__ == "__main__":
    main()