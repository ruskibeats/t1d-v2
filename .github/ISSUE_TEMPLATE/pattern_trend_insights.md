---
name: Pattern and trend insights
about: Add time-of-day phenotypes, post-meal recovery, variability streaks, and safety-first trend summaries
title: "insight: pattern and trend cards"
labels: enhancement
assignees: ''
---

## What to build

Longitudinal companion cards that go beyond single-meal analysis:

- **Time-of-day phenotype** → "Evenings are your least stable window this week."
- **Post-meal recovery** → "Lunch spikes are normalizing within 2 hours; dinner spikes stay elevated longer."
- **Variability insight** → "Same breakfast, different rise — your morning response has been less predictable."
- **Streak insight** → "You've had 5 steadier mornings in a row."
- **Safety-first pattern** → "Lows improved, but evening highs increased."
- **Time below range** → Always surfaced as a priority when present.

These require longitudinal querying of the `food_entries` and `tbl_glucose_readings` tables. For demo purposes, the legends' 90-day history provides the source data.

## Acceptance criteria

- [ ] `patterns` CLI command returns time-of-day phenotype card
- [ ] `morning` / `evening` command shows current-week pattern summary
- [ ] Streak detection: consecutive days of stable morning readings
- [ ] Variability computation: per-meal-type CV over last 14 days
- [ ] Safety-first: lows always surfaced before highs in the card ordering
- [ ] Tests cover each pattern type

## Data sources

- `tbl_users` → `food_entries` (meal history)
- `tbl_glucose_readings` (CGM traces)
- `data/legends.json` (for demo fallback)

## Blocked by

- `text-ux` branch merge
- `app/services/historical_meal_matcher.py` (can extend)
