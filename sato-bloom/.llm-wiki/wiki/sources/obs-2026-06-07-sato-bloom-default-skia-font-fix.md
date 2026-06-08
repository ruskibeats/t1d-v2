---
type: source
title: "Observation: Sato bloom default Skia font fix"
slug: obs-2026-06-07-sato-bloom-default-skia-font-fix
status: observation
created: 2026-06-07
updated: 2026-06-07
relevance: high
observed_at: 2026-06-07T19:38:38.746Z
tags: ["sato", "skia", "font", "runtime-error", "react-native"]
source_context: "Fixing Skia center glucose label error and SafeAreaView warning"
---
# ⭐ Observation: Sato bloom default Skia font fix
Runtime error `[Error: Expected arraybuffer as first parameter]` persisted with `matchFont({ fontFamily: "System" })`. Correct Skia-native fix in App.tsx is to avoid `matchFont` entirely and use `Skia.Font(undefined, 18)` with `Text as SkiaText` inside the Canvas. Also replaced deprecated React Native `SafeAreaView` with a regular `View` wrapper to remove the warning in this centered prototype layout. TypeScript passes with `npx tsc --noEmit`.
*Relevance: high*

*Context: Fixing Skia center glucose label error and SafeAreaView warning*

*Tags: sato skia font runtime-error react-native*
---
*Observed: 2026-06-07T19:38:38.746Z*