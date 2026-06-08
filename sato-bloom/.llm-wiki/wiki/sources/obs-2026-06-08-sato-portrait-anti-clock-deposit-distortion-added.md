---
type: source
title: "Observation: Sato portrait anti-clock deposit distortion added"
slug: obs-2026-06-08-sato-portrait-anti-clock-deposit-distortion-added
status: observation
created: 2026-06-08
updated: 2026-06-08
relevance: high
observed_at: 2026-06-08T18:29:20.487Z
tags: ["sato-bloom", "anti-clock", "pigment-deposits", "geometry"]
source_context: "Adding hidden-time distortion so pigment marks feel accumulated rather than arranged"
---
# ⭐ Observation: Sato portrait anti-clock deposit distortion added
Added v1.1 anti-clock rule to src/features/portrait/MetabolicPortraitEngine.tsx. Deposits are born from time but distorted by identity and physics. PigmentDeposit now includes clusterOffset. buildPigmentDeposits now accepts identitySeed and computes identityDrift, mealSag, hydrationDiffusion, finalAngle, and clusterOffset per event. All deposit kinds use finalAngle and clusterOffset. makeBrushPath now uses cx/cy plus clusterOffset for start/end, and granulation specks use the same shifted origin. Identity vessel deposits use clusterOffset {x:0,y:0}. TypeScript and Expo iOS export pass.
*Relevance: high*

*Context: Adding hidden-time distortion so pigment marks feel accumulated rather than arranged*

*Tags: sato-bloom anti-clock pigment-deposits geometry*
---
*Observed: 2026-06-08T18:29:20.487Z*