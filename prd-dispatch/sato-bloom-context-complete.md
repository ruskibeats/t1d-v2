# Sato-Bloom Design-Context Scouting (Complete)

## Date
2026-06-12

## Design-System Patterns

### Color Systems
1. **SATO_PIGMENTS** — Base pigment definitions
2. **bloomPalette** — Bloom-specific palette with rendering helpers (colorForBloomValue, interpolateHex, rgba)
3. **DOMAIN_COLORS/PALETTES** — Artifact renderer colors

### Typography
- NOT centralized
- Cormorant Garamond in InsightsScreen2
- Georgia in older screens/Bloom readout
- Recommendation: Centralize under namespaced `satoTheme/satoSkinTheme`

### Component Patterns
- BloomClock, GalleryCaption, GlucoseReadout, Skia primitives, Sato screens

### Theme Management
- Fragmented
- Recommendation: Namespaced `satoTheme` / `satoSkinTheme`

## Bloom Window Renderer Expectations

### Required Fields
- id
- startHour
- endHour
- label
- value (0..1)
- confidence (0..1)
- variability (0..1)
- intensity (0..1)
- state

### Optional Fields
- pigmentKey
- glucose
- context

### Renderer Transformations
- Converts BloomWindow → LivedWindow
- LivedWindow fields: isCurrent, isDried, progress, angle, color, length, width

### Color Strategy
- **Current color uses** `colorForBloomValue(w.value)`
- **pigmentKey exists but is NOT used** for color (keep as renderer behavior decision)

## Missing Exports / Integration Gaps

### Existing Exports
- BloomClock
- bloomPalette / color helpers
- SATO_PIGMENTS / pigmentForKey
- BloomWindow / BloomState
- artifact VisualToken types

### Missing
- Single `satoTheme` object with:
  - palette
  - surfaces
  - typography
  - visualTokens

### Recommendations
1. Add Sato separately under a distinct namespace
2. Keep mobile clinical colors in `/root/tld-v2/mobile/src/theme/theme.ts` (do NOT replace)
3. Keep Skia/RN/Expo/haptics/gestures out of backend-importable shared code

### Integration Notes
- Test files mention issue #026 (Sato Bloom shared contract integration)
- Test files mention issue #027 (variability normalization)
- Context-builder is handling #63, #65
- #026 and #027 have tracking issues created

## Next Steps

1. **T1D-bot3 or T1D-bot4 should implement** tracking issues:
   - #026: Sato Bloom shared contract integration
   - #027: Bloom window variability normalization

2. **Backend implementers should use** this context to align:
   - Shared contract exports
   - Renderer expectations
   - Color strategy decisions

3. **Mobile developers should use** this context to:
   - Update imports from shared
   - Refactor to use centralized `satoTheme`
   - Normalize variability to 0..1
   - Align pigmentKey optional/required

## Files Referenced
- `/root/tld-v2/sato-bloom/src/features/bloom/pigmentSystem.ts`
- `/root/tld-v2/sato-bloom/src/features/bloom/bloomColors.ts`
- `/root/tld-v2/sato-bloom/src/features/bloom/bloomTypes.ts`
- `/root/tld-v2/sato-bloom/src/screens/BloomClock.tsx`
- `/root/tld-v2/mobile/src/theme/theme.ts` (do NOT replace)