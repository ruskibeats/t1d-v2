---
type: source
title: "InsightsScreen2 hero bloom replaced with BloomClock from PortraitScreen"
slug: insightsscreen2-hero-bloom-replaced-with-bloomclock
status: insight
created: 2026-06-10
updated: 2026-06-10
category: design
---
# InsightsScreen2 hero bloom replaced with BloomClock from PortraitScreen
Successfully replaced the large decorative bloom in InsightsScreen2.tsx with the actual BloomClock component from PortraitScreen.tsx. Key changes:
- Imported `BloomClock` and `todayBloomWindows` from the bloom feature
- Hero card now uses real-time bloom visualization instead of static flower decoration
- Maintained PortraitScreen visual language (windows, size, glucose, currentHour props)
- Preserved small compact blooms in DiscoveryCard for Recently uncovered list
- All changes scoped to InsightsScreen2.tsx only, as directed

This keeps the Insights screen connected to Portrait's visual system while maintaining its own card-based layout.
*Category: design*
---
*Captured: 2026-06-10*
## Related
_Add links to related pages._