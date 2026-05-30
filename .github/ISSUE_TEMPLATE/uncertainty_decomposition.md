---
name: Uncertainty decomposition
about: Decompose food evidence uncertainty into identity, portion, nutrition, and aggregation
title: "data: uncertainty decomposition for food evidence"
labels: enhancement
assignees: ''
---

## Current

Food evidence has a single `confidence` string (high/medium/low) and a `carb_range_g` tuple. Uncertainty is implicit.

## Target

Each `FoodEvidence` item should carry:

- `identity_confidence` — how sure we matched the right food
- `portion_uncertainty_pct` — 0.0 (exact) to 0.5 (very uncertain), based on unit/quantity signal
- `nutrition_variance_pct` — spread across top-k candidate matches
- `top_uncertainty_reason` — user-facing: "portion of fries unclear" or "multiple plausible foods"
- `absorption_profile` — fast / mixed / delayed / standard

Aggregated meal output should surface:

- `top_carb_contributor` — which food drives most carbs
- `top_uncertainty_items` — top 2 uncertainty reasons
- `absorption_profile` — computed from meal composition (sugar ratio + fat threshold)

Status: `FoodEvidence` dataclass expanded in `app/food/service.py`, values populated in `calculate_food_evidence()`, aggregated in `combine_food_evidence()`. Needs validation against real confidence distributions.

## Acceptance criteria

- [ ] Each `FoodEvidence` carries decomposed fields (checked in test output)
- [ ] `portion_uncertainty_pct` scales with unit specificity
- [ ] `nutrition_variance_pct` is computed from top-3 candidate spread
- [ ] `combine_food_evidence()` returns `top_carb_contributor`, `top_uncertainty_items`, `absorption_profile`
- [ ] Tests verify the decomposition fields
- [ ] CLI output surfaces these fields

## Blocked by

- `text-ux` branch merge
