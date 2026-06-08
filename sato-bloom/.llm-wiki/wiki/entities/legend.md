---
type: entity
created: 2026-06-07
updated: 2026-06-07
sources: [[[sources/SRC-2026-06-07-007]]]
---

# Legend

A simulated T1D user with a name, age, diagnosis duration, anchor type, 90-day food history, current CGM reading, and characteristic questions

## Overview

Legends are more than just simulation parameters - they have names, backstories, and questions that make them relatable for demos and testing. Each legend represents a T1D patient archetype with a specific physiological profile (anchor type) that determines calibration constants and typical meal response patterns.

## Properties

- **Name** — e.g., Tom Batchelor, Sarah Chen
- **Age** — Patient age
- **Diagnosis duration** — Years since T1D diagnosis
- **Anchor type** — Physiological profile category (high_fat_delayed, dawn_phenomenon, etc.)
- **90-day food history** — Simulated meal entries across 6 meal types
- **Current CGM reading** — Real-time glucose value
- **Characteristic questions** — Map to specific Intents

## Examples

- **Foot2Floor** — Glucose rises after waking (Tom Batchelor)
- **Dawn Phenomenon** — Overnight glucose rise pattern
- **High Fat Delayed** — Slow, extended glucose response to fatty meals

## Links

- [[sources/SRC-2026-06-07-007]]
- [[anchor-type]]
- [[profile-config]]
- [[cgm]]
- [[t1d-companion-v2]]