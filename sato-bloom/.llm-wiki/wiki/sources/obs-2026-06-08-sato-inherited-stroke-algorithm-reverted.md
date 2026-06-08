---
type: source
title: "Observation: Sato inherited stroke algorithm reverted"
slug: obs-2026-06-08-sato-inherited-stroke-algorithm-reverted
status: observation
created: 2026-06-08
updated: 2026-06-08
relevance: high
observed_at: 2026-06-08T17:11:39.948Z
tags: ["sato-bloom", "revert", "correction"]
source_context: "User rejected inherited stroke algorithm and requested revert"
---
# ⭐ Observation: Sato inherited stroke algorithm reverted
User rejected the inherited 70/30 moment-stroke algorithm and said 'revert back'. Reverted the last pass: restored previous brush-stroke renderer without strokeBlueprint inheritance, restored value-based strokeColor, restored bloom sizing/layout to bloomSize Math.min(386, SCREEN_WIDTH - 28), bloomWrap margins -14/16, stateLabel marginTop 36, restored radii artRadius 0.43/strokeOuter 0.405/strokeInner 0.11/hitOuter 0.58, and reduced medallion pigment kiss back to prior subtle values. TypeScript and Expo iOS export pass.
*Relevance: high*

*Context: User rejected inherited stroke algorithm and requested revert*

*Tags: sato-bloom revert correction*
---
*Observed: 2026-06-08T17:11:39.948Z*