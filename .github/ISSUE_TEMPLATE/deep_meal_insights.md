---
name: Deep meal insights
about: Upgrade meal output to show top carb contributor, absorption profile, uncertainty decomposition, and counterfactuals
title: "insight: deep meal interpretation"
labels: enhancement
assignees: ''
---

## Current

The forecast card shows: carbs, fat, peak, range, timing, baseline. The food evidence card shows per-item confidence and warnings.

## Target

Every meal output should surface:

- **Top carb contributor** → "Most of the rise is from the fries (62g), not the pizza (33g)."
- **Absorption profile tag** → "fast spike risk" / "late rise risk" / "mixed absorption" / "standard absorption"
- **Top uncertainty item** → "Main uncertainty: portion size of the fries."
- **Counterfactual note (what-if context)** → "Without the coke, this meal would be about 75g carbs — notably lower risk."
- **Confidence narrative** → "Confidence is high for the pizza (good match), medium for the fries (portion uncertain)."

Status: partially implemented in `src/companion.py` and `app/food/service.py` — needs CLI output polish and counterfactual logic.

## Acceptance criteria

- [ ] Meal forecast card shows absorption tag
- [ ] Meal forecast card shows top carb contributor
- [ ] Food evidence card shows per-item uncertainty reason
- [ ] Monitoring card shows key uncertainty
- [ ] Counterfactual note shown for what-if context
- [ ] Tests cover each new field

## Blocked by

- `text-ux` branch merge
