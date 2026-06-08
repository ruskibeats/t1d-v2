---
type: source
title: "Observation: Sato bloom Skia error dependency mismatch"
slug: obs-2026-06-07-sato-bloom-skia-error-dependency-mismatch
status: observation
created: 2026-06-07
updated: 2026-06-07
relevance: high
observed_at: 2026-06-07T19:53:53.576Z
tags: ["sato-bloom", "skia", "expo", "dependencies", "metro-cache", "runtime-error"]
source_context: "Fixing persistent Expected arraybuffer runtime error"
---
# ⭐ Observation: Sato bloom Skia error dependency mismatch
Persistent runtime error `[Error: Expected arraybuffer as first parameter]` remained after removing all Skia font/text APIs from App.tsx. Investigation found `sato-bloom` installed incompatible versions (`@shopify/react-native-skia@2.6.4`, `react@19.2.7`, `react-native@0.81.6`) while Expo 54 expects `@shopify/react-native-skia@2.2.12`, `react@19.1.0`, `react-native@0.81.5`, matching `/root/tld-v2/sato-skia`. Fixed by pinning exact versions (`@shopify/react-native-skia 2.2.12`, `react 19.1.0`, `react-dom 19.1.0`, `react-native 0.81.5`, `react-native-worklets 0.5.1`) and adding `babel-preset-expo 54.0.11`. Restarted Metro with `--clear`; bundle now builds and app bundle contains `SkiaPixelText`/`110mg/dl` with no app-level Skia font/text calls.
*Relevance: high*

*Context: Fixing persistent Expected arraybuffer runtime error*

*Tags: sato-bloom skia expo dependencies metro-cache runtime-error*
---
*Observed: 2026-06-07T19:53:53.576Z*