# Sato-Bloom Design Context for Mobile Integration Refactor

Source repo: `/root/tld-v2/sato-bloom`  
Purpose: design-system and Bloom renderer context for T1D issue `#026` / mobile integration refactor.  
Scope: read-only scouting; no source files edited.

## 1. Design-system patterns identified

### Color system architecture

Sato-Bloom currently has three overlapping color systems:

1. **Metabolic pigment system** — `src/features/bloom/pigmentSystem.ts`
   - Exports `MetabolicPigmentKey` and `SATO_PIGMENTS`.
   - This is the strongest source for backend/mobile shared Sato theme work.
   - Pigments are semantic metabolic causes, not UI status colors.
   - Each pigment has:
     - `name`
     - `hex`
     - `meaning`
     - `opacityBias`
     - `spreadBias`
     - `granulationBias`

2. **Watercolor palette** — `src/features/bloom/bloomColors.ts`
   - Exports `bloomPalette`, `interpolateHex`, `rgba`, and `colorForBloomValue`.
   - `bloomPalette` groups:
     - Watercolor stains: `mutedTeal`, `blueGrey`, `mossGreen`, `warmOchre`, `apricot`, `softCoral`, `fadedClay`
     - Identity vessel neutrals: `vesselWarm`, `vesselNeutral`
     - Ink/labels: `ink`, `inkWarm`, `captionBlue`, `muted`, `mutedLight`
     - Paper: `paper`, `paperDeep`, `paperCream`
     - Deprecated aliases: `lower`, `lowIndigo`, `calmBlue`, `balancedGreen`, `softGold`, `coral`, `warmRose`, `lavender`
   - `colorForBloomValue(value)` maps numeric `0..1` bloom value to a warm-to-cool watercolor gradient:
     - low: `blueGrey` → `mutedTeal`
     - mid-low: `mutedTeal` → `mossGreen`
     - mid: `mossGreen` → `warmOchre`
     - mid-high: `warmOchre` → `apricot`
     - high: `apricot` → `softCoral`

3. **Artifact renderer palette** — `src/types/artifact.ts`, `src/grammar/mapper.ts`, `src/renderers/sceneBuilder.ts`
   - Exports `EventCategory`, `Domain`, `ZBand`, `PrimitiveKind`, `ArtifactFeatures`, `VisualTokens`, `VisualToken`, `RenderScene`.
   - This is a separate visual-token vocabulary for a different renderer path.
   - Domain palettes live in `sceneBuilder.ts` as `DOMAIN_COLORS` and category palettes live in `mapper.ts` as `PALETTES`.
   - Should remain separate from metabolic pigments.

Important integration implication: do **not** collapse these systems into one generic `colors` object. The shared contract should namespace them, e.g. `satoTheme.palette`, `satoTheme.pigments`, and `satoTheme.visualTokens`.

### Typography system

Typography is not centralized. It is mostly literal `fontFamily` values in screens/components:

- `src/screens/InsightsScreen2.tsx`
  - Uses Expo Google Fonts:
    - `CormorantGaramond_400Regular`
    - `CormorantGaramond_500Medium`
    - `CormorantGaramond_600SemiBold`
    - `CormorantGaramond_700Bold`
  - Uses Cormorant Garamond for display/title hierarchy:
    - page title: `56 / 56 / SemiBold`
    - section title: `32 / SemiBold`
    - featured title: `28 / 32 / SemiBold`
    - discovery title: `18 / Medium`

- `src/screens/PortraitScreen.tsx`, `PitchScreen.tsx`, `InsightsScreen.tsx`
  - Use `"Georgia"` for editorial/brand text.

- `src/features/bloom/GlucoseReadout.tsx`
  - Uses `"Georgia"` for glucose numeric readout.

- `src/features/bloom/GalleryCaption.tsx`
  - Uses `"Georgia"` for body caption and `#5795C7` for time label.

Recommended shared typography metadata:

```ts
typography: {
  displaySerif: { family: "Cormorant Garamond", fallbacks: ["Georgia", "serif"] },
  editorialSerif: { family: "Georgia", fallbacks: ["serif"] },
  numericSerif: { family: "Georgia", fallbacks: ["serif"] },
  uiSans: { family: "system", fallbacks: ["sans-serif"] },
  roles: {
    pageTitle: { family: "displaySerif", size: 56, lineHeight: 56, weight: 600 },
    sectionTitle: { family: "displaySerif", size: 32, weight: 600 },
    body: { family: "uiSans", size: 16, lineHeight: 22 },
    glucoseValue: { family: "numericSerif", size: 58, lineHeight: 62, weight: 400 }
  }
}
```

The shared contract should expose metadata only, not load fonts.

### Component patterns

Key Sato/Bloom components:

- `src/features/bloom/BloomClock.tsx`
  - Primary Bloom window renderer.
  - Uses React Native Skia, gesture handlers, haptics, animated `requestAnimationFrame`, deterministic noise, and local layout math.
  - Renders:
    - dawn wash
    - paper grain
    - charcoal ticks
    - lived window washes
    - pigment pools
    - granulation specks
    - metabolic input brush strokes
    - selected-window highlight
    - Blossom seal
    - glucose readout
    - gallery caption

- `src/features/bloom/GalleryCaption.tsx`
  - Absolute-positioned caption near selected window.
  - Shows `window.label` and a generic body line.
  - Uses `window.startHour === 12 ? "1 PM" : window.label`.

- `src/features/bloom/GlucoseReadout.tsx`
  - Displays glucose numeric value with layered highlight/shadow text.
  - Takes `value`, `unit`, `trend`, and `size`, but currently only renders `value`.

- `src/features/bloom/PaperGrain.tsx` and `DawnWash.tsx`
  - Deterministic Skia background effects.
  - Use local hash/noise helpers.

- `src/features/bloom/BlossomSeal.tsx`
  - Center medallion/blossom seal.
  - Uses local petal path generation and deterministic noise.

- `src/features/bloom/BrushStroke.tsx`
  - Skia path brush mark.
  - Supports `pigmentPool`.

- `src/screens/InsightsScreen2.tsx`
  - Sato app chrome/discover screen.
  - Uses Cormorant Garamond and literal Sato colors.
  - Has custom `SafeAreaView`, `ScrollView`, `Pressable`, bottom nav.

- `src/screens/PortraitScreen.tsx`
  - Demo portrait page.
  - Uses `BloomClock`, `todayBloomWindows`, `bloomPalette.paper`, `bloomPalette.ink`.
  - Uses Georgia typography and local hand-drawn nav icons.

- `src/screens/PitchScreen.tsx`
  - Editorial/product pitch page.
  - Uses Georgia typography and Sato paper/ink colors.

### Theme management approach

Current theme management is **not centralized**:

- `bloomPalette` is exported from `src/features/bloom/bloomColors.ts`.
- `SATO_PIGMENTS` is exported from `src/features/bloom/pigmentSystem.ts`.
- Screens use many hard-coded colors:
  - `#F6F2EA`, `#F9F6F1`, `#181614`, `#D97947`, `#E3DDD1`, `#ECE6DB`, `#857D74`, etc.
- Typography is hard-coded in `fontFamily` props.
- Surface tokens are not grouped into a `surfaces` object.
- There is no `satoTheme`/`satoSkinTheme` object yet in this repo.

Recommended integration direction:

- Keep Sato skin theme outside mobile-only renderer code.
- Use a pure shared module such as `shared/satoTheme.ts` or `src/shared/satoTheme.ts`.
- Export `satoTheme` / `satoSkinTheme` as a frozen plain object.
- Keep Skia components, gestures, haptics, Expo fonts, and React Native UI in mobile-only code.
- Move only pure color/type/value metadata into the shared contract.

## 2. Bloom window renderer expectations

### What the renderer expects

`BloomClock` expects `BloomWindow[]` from `src/features/bloom/bloomTypes.ts`.

Required `BloomWindow` fields currently used by the renderer or caption:

```ts
export type BloomWindow = {
  id: string;
  startHour: number;
  endHour: number;
  label: string;
  value: number;
  confidence: number;
  variability: number;
  intensity: number;
  state: BloomState;
  pigmentKey?: MetabolicPigmentKey;
  glucoseAvg?: number;
  glucosePeak?: number;
  rateOfChange?: string;
  dataCompleteness?: number;
  eventContext?: string;
  classificationReason?: string;
  note?: string;
};

export type BloomState = "balanced" | "reactive" | "calm";
```

`BloomClock` also receives props:

```ts
type BloomClockProps = {
  windows: BloomWindow[];
  size?: number;
  glucose?: number;
  currentHour?: number;
};
```

### Transformations applied

For each window, `BloomClock` computes a `LivedWindow`:

```ts
type LivedWindow = BloomWindow & {
  isCurrent: boolean;
  isDried: boolean;
  progress: number;
  angle: number;
  color: string;
  length: number;
  width: number;
};
```

Transformation details:

- **Angle**
  - `windowAngle(w) = -Math.PI / 2 + ((w.startHour + 1) / 24) * Math.PI * 2`
  - This maps `startHour` into a 24-hour radial clock.

- **Current/dried state**
  - `isCurrent = startHour <= currentHour && currentHour < endHour`
  - `isDried = endHour <= currentHour`
  - `progress`:
    - `1` if dried
    - otherwise `(currentHour - startHour) / max(1, endHour - startHour)`
    - clamped to `0.06..1`

- **Strongest reactive pull**
  - Finds strongest past/current window where:
    - `state === "reactive"` or `variability > 0.55`
  - Pull amount: `intensity * 0.18`
  - Nearby window angles are nudged toward strongest angle.

- **Color**
  - Currently derived from numeric `value`, not from `pigmentKey`:
    - `color: colorForBloomValue(w.value)`
  - `pigmentKey` is carried through but not used for window color in `BloomClock`.

- **Opacity**
  - Base opacity: `0.048 + confidence * 0.042`
  - Multiplied by `progressScale`
  - `progressScale` differs for current vs dried windows.

- **Granulation count**
  - `14` specks for `state === "reactive"` or `variability > 0.5`
  - otherwise `6`

- **Length/width**
  - `length = baseLength * (0.78 + intensity * 0.38)`
  - `width = baseWidth * (0.85 + intensity * 0.22)`

- **Selection**
  - Tap/long-press/scrub hit-testing maps pointer coordinates to a 2-hour index.
  - Selected window gets local pigment brightening.

- **Center drift**
  - Center medallion drifts away from the strongest reactive window.

### Missing fields from API responses

The current API/theme work does not necessarily produce Bloom windows, but the renderer expectations imply the Bloom API should return these fields:

Required for rendering:

- `id`
- `startHour`
- `endHour`
- `label`
- `value`
- `confidence`
- `variability`
- `intensity`
- `state`

Strongly useful for UX/caption/provenance:

- `pigmentKey`
- `glucoseAvg`
- `glucosePeak`
- `rateOfChange`
- `dataCompleteness`
- `eventContext`
- `classificationReason`
- `note`

Potential mismatch:

- `pigmentKey` exists in `BloomWindow`, and `SATO_PIGMENTS` exists as the authoritative pigment metadata, but `BloomClock` currently ignores `pigmentKey` for color.
- If the backend API emits pigment keys, mobile should either:
  - keep the current numeric gradient behavior, or
  - intentionally switch to pigment-key color mapping in a separate, tested change.
- Do not change both theme contract and renderer color semantics in the same refactor unless issue scope explicitly includes it.

## 3. Missing public exports or integration gaps

### What is exported

`src/features/bloom/index.ts` currently exports:

```ts
export { BloomClock } from "./BloomClock";
export { BrushStroke } from "./BrushStroke";
export { BlossomSeal } from "./BlossomSeal";
export { CenterMedallion } from "./CenterMedallion";
export { GalleryCaption } from "./GalleryCaption";
export { GlucoseReadout } from "./GlucoseReadout";
export { PaperGrain } from "./PaperGrain";
export { DawnWash } from "./DawnWash";
export { todayBloomWindows } from "./bloomSampleData";
export { placeholderIdentityBloom } from "./identityBloom";
export { todayMemoryMarks } from "./memoryMarks";
export { bloomPalette, colorForBloomValue, interpolateHex, rgba } from "./bloomColors";
export { SATO_PIGMENTS, pigmentForKey } from "./pigmentSystem";
export type { MetabolicPigmentKey } from "./pigmentSystem";
export type { BloomMemoryMark, BloomState, BloomWindow, IdentityBloom } from "./bloomTypes";
```

`src/types/artifact.ts` exports the separate artifact renderer contract:

```ts
export type EventCategory = "meal" | "run" | "sleep" | "glucose" | "stress" | "note";
export type Domain = "rest" | "move" | "nourish" | "energy" | "ground";
export type ZBand = "atmosphere" | "body" | "accent" | "ground";
export type PrimitiveKind = "oval" | "path" | "dot" | "anchor";
export type ArtifactFeatures = { ... };
export type VisualTokens = { ... };
export type VisualToken = { ... };
export type RenderScene = { ... };
export type SceneLayer = VisualToken;
```

### What is needed for mobile integration

Needed shared/public exports:

- A single `satoTheme` or `satoSkinTheme` object.
- Typed pigment metadata:
  - `MetabolicPigmentKey`
  - `SATO_PIGMENTS`
  - `pigmentForKey`
- Typed Bloom window contract:
  - `BloomWindow`
  - `BloomState`
- Pure color utilities if needed by mobile:
  - `interpolateHex`
  - `rgba`
- Renderer-safe derived color mapping:
  - `colorForBloomValue`
- Surface tokens:
  - app background
  - paper surfaces
  - card surfaces
  - borders
  - caption surface
  - nav/backdrop
- Typography metadata:
  - family names
  - fallbacks
  - roles/scale
- Visual-token vocabulary:
  - `EventCategory`
  - `Domain`
  - `ZBand`
  - `PrimitiveKind`
  - `ArtifactFeatures`
  - `VisualToken`
  - `RenderScene`

### Type mismatches / naming risks

- `bloomPalette` is useful but not sufficient as the shared theme because:
  - it is not grouped as `palette/surfaces/typography`
  - it includes deprecated aliases
  - it does not include pigment metadata
  - it does not include visual-token vocabulary
- `bloomPalette.lower`, `balancedGreen`, etc. are deprecated aliases and should not become the public API.
  - If preserved, place them under `legacyAliases`.
- Existing `/root/tld-v2/mobile/src/theme/theme.ts` has a clinical MD3/Stitch `colors` object:
  - `primary`, `secondary`, `surface`, `error`, `warning`, `success`, etc.
  - Do not replace it with Sato tokens directly.
  - Add Sato as a separate namespace, e.g. `satoTheme`.
- `BloomWindow.pigmentKey` is optional, but `SATO_PIGMENTS` is authoritative.
  - If API responses include `pigmentKey`, validate against the union.
- Artifact renderer types are separate from Bloom window types.
  - `ArtifactFeatures.category` is not the same semantic space as `MetabolicPigmentKey`.
  - `Domain` is renderer layout/domain vocabulary, not metabolic pigment vocabulary.

### Rendering-only code that should stay out of shared/backend-importable code

Do **not** move these into backend-importable shared theme code:

- `src/features/bloom/BloomClock.tsx`
  - React Native
  - Skia
  - gestures
  - haptics
  - animation loop

- `src/features/bloom/PaperGrain.tsx`, `DawnWash.tsx`, `BlossomSeal.tsx`, `BrushStroke.tsx`
  - Skia primitives

- `src/features/bloom/GlucoseReadout.tsx`
  - React Native `Text`, `StyleSheet`

- `src/features/bloom/GalleryCaption.tsx`
  - React Native `Text`, `StyleSheet`

- `src/screens/*`
  - React Native screens/navigation/app chrome

- Font loaders:
  - `@expo-google-fonts/cormorant-garamond`
  - `expo-font`

Backend-importable/shared code should be limited to plain TS values, types, and pure functions with no RN/Skia/Expo/Paper imports.

## Recommended integration shape

A backend-safe shared contract should look like:

```ts
export const satoTheme = {
  name: "Sato",
  version: 1,
  palette: {
    watercolor: {
      mutedTeal: "#6F9FA0",
      blueGrey: "#8FB3C2",
      mossGreen: "#9FAE86",
      warmOchre: "#D7B36A",
      apricot: "#E3A061",
      softCoral: "#DB8A6F",
      fadedClay: "#C47B61"
    },
    vessel: {
      vesselWarm: "#D9C49D",
      vesselNeutral: "#C9B49A"
    },
    ink: {
      ink: "#211F1B",
      inkWarm: "#5A5249",
      captionBlue: "#5795C7",
      muted: "#8C8175",
      mutedLight: "#A89F95"
    },
    paper: {
      paper: "#FBF3E6",
      paperDeep: "#F7EEDC",
      paperCream: "#FFF9EF"
    }
  },
  legacyAliases: {
    lower: "#6F9FA0",
    lowIndigo: "#8FB3C2",
    calmBlue: "#8FB3C2",
    balancedGreen: "#9FAE86",
    softGold: "#D7B36A",
    coral: "#DB8A6F",
    warmRose: "#DB8A6F",
    lavender: "#A98BC5"
  },
  pigments: SATO_PIGMENTS,
  surfaces: {
    appBackground: "#F6F2EA",
    paper: "#FBF3E6",
    paperDeep: "#F7EEDC",
    paperCream: "#FFF9EF",
    card: "#F9F6F1",
    cardBorder: "#E3DDD1",
    cardSubtle: "#ECE6DB",
    caption: "rgba(255,251,244,0.78)",
    navBackdrop: "rgba(246,242,234,0.95)"
  },
  typography: {
    displaySerif: { family: "Cormorant Garamond", fallbacks: ["Georgia", "serif"] },
    editorialSerif: { family: "Georgia", fallbacks: ["serif"] },
    numericSerif: { family: "Georgia", fallbacks: ["serif"] },
    uiSans: { family: "system", fallbacks: ["sans-serif"] }
  },
  visualTokens: {
    eventCategories: ["meal", "run", "sleep", "glucose", "stress", "note"],
    domains: ["rest", "move", "nourish", "energy", "ground"],
    zBands: ["atmosphere", "body", "accent", "ground"],
    primitiveKinds: ["oval", "path", "dot", "anchor"],
    blendModes: ["srcOver", "multiply"],
    numericRanges: {
      intensity: "0..1",
      confidence: "0..1",
      variability: "0..1",
      value: "0..1"
    }
  }
} as const;
```

## Integration notes for issue #026

- Use `SATO_PIGMENTS` and `MetabolicPigmentKey` as the authoritative pigment contract.
- Keep deprecated `bloomPalette` aliases out of the main API or place them under `legacyAliases`.
- Keep artifact renderer domain palettes separate from metabolic pigments.
- Keep the contract pure TS/JSON; no React Native, Skia, Expo, haptics, gesture, or react-native-paper imports.
- For Bloom windows, preserve the current `BloomWindow` shape and add validation against `MetabolicPigmentKey`.
- If mobile integration wants pigment-key coloring, treat that as a renderer behavior change separate from the theme contract.
