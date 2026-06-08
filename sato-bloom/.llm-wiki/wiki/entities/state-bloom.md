---
type: entity
created: 2026-06-07
updated: 2026-06-07
sources: [[[sources/SRC-2026-06-07-007]]]
---

# State Bloom

The end-to-end visual system that transforms health metrics into a living watercolor cloud visualization on mobile

## Definition

The State Bloom processes five **Health Dimensions** to produce a watercolor cloud rendered by the **Bloom Engine** inside a **Bloom Card**. Each **Health Dimension** produces one **Pigment** with a specific color and angular position. Overlapping petals form the Core where all pigments blend into a unified representation of metabolic state.

## Health Dimensions

| Dimension | Description |
|-----------|-------------|
| Time in Range | Percentage of time CGM readings are in target range |
| Variability | Glucose fluctuation magnitude |
| Activity | Exercise and movement metrics |
| Consistency | Routine and pattern stability |
| Feeling | Subjective wellness score |

## Components

- **Bloom Engine** — Skia-based renderer composing petal geometry, center wash, glow, texture overlay, and paper base
- **Pigment** — Colored, semi-transparent layer derived from one health dimension
- **Petal** — Individual translucent oval rendered by Skia
- **Core** — Dense center where all pigments overlap and blend
- **Bloom Card** — Pressable UI card containing the Skia canvas visualization

## Links

- [[sources/SRC-2026-06-07-007]]
- [[health-dimension]]
- [[pigment]]
- [[petal]]
- [[core]]
- [[bloom-engine]]
- [[bloom-card]]
- [[sato]]
