---
name: Ranked companion insight backlog
about: 20 companion insights ranked by value, effort, and dependency
title: "insight: companion insight backlog"
labels: enhancement, backlog
assignees: ''
---

## Priority 1 — Meal result depth (in progress)

| # | Insight | Files | Status |
|---|---------|-------|--------|
| 1 | Top carb contributor | `app/food/service.py` → `combine_food_evidence` | ✅ Done |
| 2 | Absorption profile tag | `app/food/service.py` + `src/companion.py` | ✅ Done |
| 3 | Top uncertainty reason per food | `app/food/service.py` → `calculate_food_evidence` | ✅ Done |
| 4 | Key uncertainty in monitoring card | `src/companion.py` | ✅ Done |
| 5 | Decomposed uncertainty (identity/portion/nutrition) | `app/food/service.py` | ✅ Done |

## Priority 2 — Historical depth (next)

| # | Insight | Effort | Dependencies |
|---|---------|--------|-------------|
| 6 | Similarity reason (matched on...) | 1hr | Historical matcher |
| 7 | What changed vs prior meals | 1hr | Historical matcher |
| 8 | Best past outcome | 1hr | Historical matcher |
| 9 | Consistency score (spread-based) | 30min | Historical matcher |
| 10 | Counterfactual note (without X, this meal is...) | 2hr | What-if context passing |

## Priority 3 — Pattern & trend

| # | Insight | Effort | Dependencies |
|---|---------|--------|-------------|
| 11 | Time-of-day phenotype | 2hr | Legend data queries |
| 12 | Post-meal recovery time | 2hr | Legend data queries |
| 13 | Variability insight (same meal, different rise) | 3hr | Historical matcher + meal clustering |
| 14 | Streak detection (5 steadier mornings) | 2hr | Legend data queries |
| 15 | Safety-first: TBR surfaced before TAR | 1hr | Pattern engine order |

## Priority 4 — Causal explanation

| # | Insight | Effort | Dependencies |
|---|---------|--------|-------------|
| 16 | Query-aware ranked causes for "why am I high" | 4hr | Meal composition + timing + current trend |
| 17 | Expected time above range (if forecast > threshold) | 2hr | Forecast + TIR thresholds |
| 18 | Confidence narrative (not just a tier) | 2hr | Decomposed uncertainty |
| 19 | Meal-to-meal consistency (predictable or not) | 3hr | Historical matcher |
| 20 | Calibration validation (does confidence = accuracy?) | 5hr | Validation set + metrics |

## Quick-start

Items 6–10 can be built from the existing `historical_context_for_meal()` response:

- `peak_rise_range_mg_dl` → response band
- `matched_meals` → iterate for min-peak (best outcome)
- Compare query carbs vs `avg_carbs_g` → what changed
- `stdev` of peak deltas → consistency score
