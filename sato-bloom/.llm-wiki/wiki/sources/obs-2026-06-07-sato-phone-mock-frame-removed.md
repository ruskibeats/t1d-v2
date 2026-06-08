---
type: source
title: "Observation: Sato phone mock frame removed"
slug: obs-2026-06-07-sato-phone-mock-frame-removed
status: observation
created: 2026-06-07
updated: 2026-06-07
relevance: medium
observed_at: 2026-06-07T20:47:56.320Z
tags: ["sato", "react-native", "fullscreen", "navigation"]
source_context: "Converting Sato app from phone mock preview to full-screen app"
---
# 🔍 Observation: Sato phone mock frame removed
Updated App.tsx to remove the centered rounded phone preview frame. The root now renders as a full-screen warm ivory app surface (#FAF8F4), the main container fills available space, and the bottom navigation remains at the actual bottom with safe-area support. Removed the grey/cream staging background, rounded phone border, and phone shadow from active styles.
*Relevance: medium*

*Context: Converting Sato app from phone mock preview to full-screen app*

*Tags: sato react-native fullscreen navigation*
---
*Observed: 2026-06-07T20:47:56.320Z*