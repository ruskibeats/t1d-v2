---
type: source
title: "Observation: Sato bloom Skia-native text constraint"
slug: obs-2026-06-07-sato-bloom-skia-native-text-constraint
status: observation
created: 2026-06-07
updated: 2026-06-07
relevance: high
observed_at: 2026-06-07T19:37:04.623Z
tags: ["sato", "skia", "react-native", "text"]
source_context: "Fixing center bloom glucose label runtime error"
---
# ⭐ Observation: Sato bloom Skia-native text constraint
User explicitly requested bloom visuals stay within the Skia framework. The prior React Native absolute Text overlay was rejected. App.tsx was changed to render the center glucose label `110mg/dl` with `@shopify/react-native-skia` Text inside the Canvas, using `matchFont({ fontFamily: "System", fontSize: 18, fontWeight: "400" })` and measured centering. TypeScript passes with `npx tsc --noEmit`.
*Relevance: high*

*Context: Fixing center bloom glucose label runtime error*

*Tags: sato skia react-native text*
---
*Observed: 2026-06-07T19:37:04.623Z*