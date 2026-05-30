---
name: Historical insight depth
about: Upgrade similar meals from counts to similarity reason, response band, best past outcome, consistency score
title: "insight: historical meal depth"
labels: enhancement
assignees: ''
---

## Current

`historical_context_for_meal` returns: count, avg rise, avg peak, range, observations.

## Target

Each similar-meals card should show:

- **Similarity reason** → "Matched on pizza + fries + sugared drink"
- **What changed vs prior** → "This time carbs are 18g higher than your usual pizza meal"
- **Response band** → "Meals like this usually peak between 95 and 135 minutes"
- **Best past outcome** → "Your best result for this type of meal was when the drink was absent"
- **Consistency score** → High / medium / low (how predictable is this meal type)
- **Meal-to-meal variance** → "Same breakfast, different rise — your morning response has been less predictable this week"

## Acceptance criteria

- [ ] Similar-meals card shows response band (range, already exists)
- [ ] Similarity reason computed from meal composition comparison
- [ ] What-changed computed from carb/fat deltas vs historical avg
- [ ] Best past outcome: min-peak delta from matches (data available in food_history_90d)
- [ ] Consistency score: spread-based (low spread = high consistency)
- [ ] Tests cover each new field

## Blocked by

- `text-ux` branch merge
- Existing historical matcher in `app/services/historical_meal_matcher.py`
