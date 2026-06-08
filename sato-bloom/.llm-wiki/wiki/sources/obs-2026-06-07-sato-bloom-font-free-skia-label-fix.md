---
type: source
title: "Observation: Sato bloom font-free Skia label fix"
slug: obs-2026-06-07-sato-bloom-font-free-skia-label-fix
status: observation
created: 2026-06-07
updated: 2026-06-07
relevance: high
observed_at: 2026-06-07T19:47:04.068Z
tags: ["sato-bloom", "skia", "font-free", "runtime-error", "pixel-label"]
source_context: "Fixing persistent Skia Expected arraybuffer runtime error for center glucose label"
---
# ⭐ Observation: Sato bloom font-free Skia label fix
The `Expected arraybuffer as first parameter` runtime error continued after attempts with `matchFont`, `Skia.Font(undefined)`, `Skia.Font(null)`, and `Skia.Font()` for a Skia Text label. Final fix in `/root/tld-v2/sato-bloom/App.tsx`: remove all Skia font/text APIs and render `110mg/dl` inside the Canvas as a pixel-style label built only from Skia `Circle` primitives via `SkiaPixelText`. This follows `/root/tld-v2/sato-skia`'s working primitive-only Skia rendering pattern. `grep` confirms no `Skia.Font`, `matchFont`, `useFont`, `SkiaText`, or `Text as` remains; `npx tsc --noEmit` passes.
*Relevance: high*

*Context: Fixing persistent Skia Expected arraybuffer runtime error for center glucose label*

*Tags: sato-bloom skia font-free runtime-error pixel-label*
---
*Observed: 2026-06-07T19:47:04.068Z*