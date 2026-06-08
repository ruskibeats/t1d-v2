---
type: source
title: "Observation: Sato internal metabolic pigment system added"
slug: obs-2026-06-08-sato-internal-metabolic-pigment-system-added
status: observation
created: 2026-06-08
updated: 2026-06-08
relevance: high
observed_at: 2026-06-08T17:16:35.491Z
tags: ["sato-bloom", "pigment-system", "watercolor-engine"]
source_context: "Adding internal metabolic pigment vocabulary for consistent Bloom Engine painting"
---
# ⭐ Observation: Sato internal metabolic pigment system added
Added internal SATO_PIGMENTS system at src/features/bloom/pigmentSystem.ts. Pigments are metabolic paint ingredients, not user-facing labels: slowCarb, fastSugar, fatDelay, proteinSteady, movement, recovery, stress, sleepDebt, settling, baseline, unknown, each with hex, opacityBias, spreadBias, granulationBias. BloomWindow and BloomMemoryMark now support optional pigmentKey. Sample day windows and memory marks tagged with pigment keys. MetabolicPortraitEngine now paints color from pigmentKey and uses pigment opacity/spread/granulation biases for stroke opacity, size/spread, and speck count/strength. Feature barrel exports pigment system. TypeScript and Expo iOS export pass.
*Relevance: high*

*Context: Adding internal metabolic pigment vocabulary for consistent Bloom Engine painting*

*Tags: sato-bloom pigment-system watercolor-engine*
---
*Observed: 2026-06-08T17:16:35.491Z*