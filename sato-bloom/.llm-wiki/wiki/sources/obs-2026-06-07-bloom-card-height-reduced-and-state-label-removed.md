---
type: source
title: "Observation: Bloom card height reduced and state label removed"
slug: obs-2026-06-07-bloom-card-height-reduced-and-state-label-removed
status: observation
created: 2026-06-07
updated: 2026-06-07
relevance: medium
observed_at: 2026-06-07T21:35:30.406Z
tags: ["react-native", "layout", "bloom-card", "sato-bloom"]
source_context: "Fixing cropped bloom between top bar and momentum card"
---
# 🔍 Observation: Bloom card height reduced and state label removed
Updated App.tsx so the bloom canvas uses a shorter responsive height (`BLOOM_WIDTH * 0.86`, capped at `PHONE_HEIGHT * 0.34`) and tightened stateBloomStage/orbPanel padding and gap. Removed the `{profile.label} state bloom` eyebrow text while keeping the title/subtitle. TypeScript check passed.
*Relevance: medium*

*Context: Fixing cropped bloom between top bar and momentum card*

*Tags: react-native layout bloom-card sato-bloom*
---
*Observed: 2026-06-07T21:35:30.406Z*