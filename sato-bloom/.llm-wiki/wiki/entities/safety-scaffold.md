---
type: entity
created: 2026-06-07
updated: 2026-06-07
sources: [[[sources/SRC-2026-06-07-007]]]
---

# Safety scaffold

The emergency keyword, dosing-pattern, and treatment-pattern validator that acts as the final veto gate before any output reaches the user

## Overview

The Safety Scaffold is a strict content filter that prevents the T1D Companion from outputting any language related to insulin dosing, treatment recommendations, or emergency interventions. It serves as a critical safety boundary since the app does **not** provide medical advice.

## Validation Rules

- **Emergency words** — Must never be output
- **Dosing patterns** — Regex patterns matching insulin-unit language (e.g., "take 3 units")
- **Treatment patterns** — Medication-related language filters

## Banned Words

Includes but not limited to: "insulin", "bolus", "dose", "inject", treatment instructions, medication recommendations.

## Role

- Final veto gate before any output reaches the user
- Part of the `app/ai/safety.py` module
- Used by the showcase runner and meal forecast pipeline

## Links

- [[sources/SRC-2026-06-07-007]]
- [[banned-word]]
- [[dosing-pattern]]
- [[t1d-companion-v2]]
