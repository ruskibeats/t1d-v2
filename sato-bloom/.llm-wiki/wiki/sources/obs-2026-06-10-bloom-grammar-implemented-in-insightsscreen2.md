---
type: source
title: "Observation: Bloom Grammar implemented in InsightsScreen2"
slug: obs-2026-06-10-bloom-grammar-implemented-in-insightsscreen2
status: observation
created: 2026-06-10
updated: 2026-06-10
relevance: high
observed_at: 2026-06-10T10:11:44.266Z
tags: ["skia", "bloom-grammar", "insights-screen"]
source_context: "Implementing bloom grammar from user's design framework"
---
# ⭐ Observation: Bloom Grammar implemented in InsightsScreen2
Replaced decorative `WatercolorBloom` with generative `Bloom` component encoding meaningful biometric grammar: `BloomCategory` (food/sleep/activity/stress/insulin/routine), confidence (0-1), strength (weak/medium/strong), certainty, variability, frequency, recency. Each discovery now maps to category and geometric families (rounded/organic/warm for food, elongated/soft/vertical for sleep, radial/balanced for activity, fragmented/offset for stress, high symmetry for routine). Added `WhatSatoNoticed` component before chart on detail page. TypeScript passed. Only `src/screens/InsightsScreen2.tsx` edited per user direction.
*Relevance: high*

*Context: Implementing bloom grammar from user's design framework*

*Tags: skia bloom-grammar insights-screen*
---
*Observed: 2026-06-10T10:11:44.266Z*