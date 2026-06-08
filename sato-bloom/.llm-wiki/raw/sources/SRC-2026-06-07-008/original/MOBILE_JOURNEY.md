# T1D Companion: CLI → Stitch → Mobile Journey

## Complete Workflow

```
Terminal Input → Showcase Runner → Stitch MCP → React Native → localhost:8081
```

## Quick Start

```bash
# 1. View the complete journey
npx tsx scripts/user-journey.ts

# 2. Push all cards to Stitch
export STITCH_API_KEY="AQ.Ab8RN6KOiX2E2Gta8u3bYFCty4tXStnchuQuOdVUM40fFalUrw"
npx tsx scripts/push-cards-to-stitch.ts --legend tom

# 3. Start mobile app
cd mobile && npx expo start --web

# 4. Open browser
open http://localhost:8081
```

## Legend Profile

- **Name**: Tom Batchelor
- **Anchor**: Foot2Floor (glucose rises after waking)
- **Known routine**: Breakfast at 08:00 with toast, eggs, butter, avocado
- **CGM**: 108 mg/dL (baseline) → 145 mg/dL (peak)

## 5-Card Pipeline (All Wired)

| Step | Card Kind | Mobile Screen | Stitch Screen |
|------|-----------|--------------|---------------|
| 1 | parsedFoods | Meal Entry → Forecast | "Meal Results - Parsed Foods" |
| 2 | foodEvidence | Forecast deck | "Food Evidence" |
| 3 | forecast | Forecast deck | "Expected glucose shape" |
| 4 | mealMemory | Forecast deck | "Meal Memory Details" |
| 5 | confidence | Forecast deck | "Confidence Breakdown" |

## Tab Navigation (1:1 with Stitch)

| Tab | File | Purpose |
|-----|------|---------|
| Today | `(tabs)/home.tsx` | CGM, quick actions, food memory |
| Log Meal | `(tabs)/log-meal.tsx` | Meal entry with known routine |
| Patterns | `(tabs)/patterns.tsx` | Pattern genome, insights |
| History | `(tabs)/meals.tsx` | Saved meals, forecast replay |

## Stitch Project

**URL**: https://stitch.withgoogle.com/projects/3768458435933006236

**Screens**: 11 total (5 auto-generated + 6 existing)

## Terminal CLI Equivalent

```bash
python3 src/cli.py --legend tom --question "breakfast routine"
```