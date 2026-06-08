---
type: entity
created: 2026-06-07
updated: 2026-06-07
sources: [[[sources/SRC-2026-06-07-007]]]
---

# Evidence Bundle

Structured bridge from forecast/model output to narrator AI. Contains forecast results, historical context, uncertainty bands, and evidence fields for safe narration.

## Overview

The Evidence Bundle connects the forecast engine output to the narrator AI, providing structured data that enables the companion to explain glucose predictions without giving medical advice. It includes uncertainty information, top drivers, missing information flags, and safety boundaries.

## Structure

- Forecast results (peak glucose, time-to-peak, baseline)
- Uncertainty bands (low/point/high forecast triplet)
- Top drivers for observed patterns
- Evidence fields for grounding AI responses
- Safety policy integration

## Links

- [[sources/SRC-2026-06-07-007]]
- [[forecast-result]]
- [[uncertainty-band]]
- [[physiology-model]]
- [[safety-scaffold]]