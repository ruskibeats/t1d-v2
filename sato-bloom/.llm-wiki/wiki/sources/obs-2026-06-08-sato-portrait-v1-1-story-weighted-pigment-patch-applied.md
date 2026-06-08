---
type: source
title: "Observation: Sato portrait v1.1 story-weighted pigment patch applied"
slug: obs-2026-06-08-sato-portrait-v1-1-story-weighted-pigment-patch-applied
status: observation
created: 2026-06-08
updated: 2026-06-08
relevance: critical
observed_at: 2026-06-08T18:47:54.448Z
tags: ["sato-bloom", "v1.1", "story-weight", "pigment", "patch"]
source_context: "Applying exact v1.1 parameter changes to portrait engine"
---
# 🔴 Observation: Sato portrait v1.1 story-weighted pigment patch applied
Applied exact v1.1 parameter changes: (1) Added storyWeight?: number to BloomEvent type. (2) Lunch event tagged storyWeight: 0.82. (3) buildPigmentDeposits boosts key events (storyWeight >= 0.7): opacity *= 1.22, length *= 1.12, width *= 1.08, granulation += 0.12, edgeChaos += 0.08, layers += 1. (4) Added memoryMark deposit for high storyWeight + mixed nutrients with warm ochre/apricot/sesame/olive color. (5) Added storyBias asymmetry to clusterOffset: cos(angle)*storyBias*18 and sin(angle)*storyBias*18. (6) Speck count increased to 6 + d.granulation * 22, alpha capped at 0.085. (7) Identity vessel wrapped in opacity 0.05 Group so it is felt not seen. (8) Medallion fill reduced to 0.58, stroke to 0.026, center text to 0.62. TypeScript and Expo iOS export pass.
*Relevance: critical*

*Context: Applying exact v1.1 parameter changes to portrait engine*

*Tags: sato-bloom v1.1 story-weight pigment patch*
---
*Observed: 2026-06-08T18:47:54.448Z*