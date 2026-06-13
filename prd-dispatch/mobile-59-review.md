# Mobile Integration Review: #59 Sato Theme API

**Reviewer:** T1D-bot3
**Date:** 2026-06-12
**Scope:** Mobile/Skia rendering integration review of `GET /api/theme/sato` against `/root/tld-v2/sato-bloom`

---

## 1. Does `/api/theme/sato` return the Sato theme contract from #58?

**✅ YES — The API response correctly returns the `SATO_THEME` contract.**

| Key | Value | Status |
|-----|-------|--------|
| `name` | `"Sato"` | ✅ |
| `version` | `"1.0.0"` | ✅ |
| `palette` | 17 hex color tokens matching prototype | ✅ |
| `pigments` | All 11 `MetabolicPigmentKey` entries with `name`, `hex`, `meaning`, `opacityBias`, `spreadBias`, `granulationBias` | ✅ |
| `surfaces` | `background`, `card`, `elevated`, `subtle`, `ink` | ✅ |
| `typography` | `display`, `headline`, `body`, `caption` with Georgia metadata | ✅ |
| `visualTokens` | 11 watercolor rendering parameters | ✅ |

The route implementation (`sparky-bloom/server/routes/satoThemeRoutes.ts`) is a thin passthrough — it imports `SATO_THEME` from `@workspace/shared` and returns it as JSON without transformation. No DB access, no auth, no mutation.

The test (`sparky-bloom/server/tests/satoThemeRoutes.test.ts`) verifies all required keys exist in the response.

---

## 2. Does mobile code import the contract from `@workspace/shared`?

**❌ NO — Sato-bloom has ZERO imports from `@workspace/shared`.**

```bash
$ grep -rn "@workspace/shared" /root/tld-v2/sato-bloom/src/
# No results
```

Sato-bloom (`/root/tld-v2/sato-bloom`) is a **separate npm workspace** from `sparky-bloom`. It has its own `package.json` with no dependency on `@workspace/shared`. The mobile app maintains **three local duplicate copies** of shared contract data:

### Duplicate 1: `src/features/bloom/pigmentSystem.ts`

Defines its own local `SATO_PIGMENTS` — identical structure, identical hex values, identical bias values. This is a byte-for-byte duplicate of `@workspace/shared/src/pigments/palette.ts`:

```typescript
// Local copy (sato-bloom)
export const SATO_PIGMENTS: Record<MetabolicPigmentKey, {
  name: string;
  hex: string;
  meaning: string;
  opacityBias: number;
  spreadBias: number;
  granulationBias: number;
}> = { /* 11 identical pigments */ };
```

### Duplicate 2: `src/features/bloom/bloomColors.ts`

Defines its own local `bloomPalette` — identical hex values to `SATO_PALETTE` in `@workspace/shared/src/theme/satoTheme.ts`:

```typescript
// Local copy (sato-bloom)
export const bloomPalette = {
  mutedTeal: "#6F9FA0",  // identical
  blueGrey: "#8FB3C2",  // identical
  // ... all 17 keys match SATO_PALETTE exactly
};
```

Additionally, `bloomColors.ts` exports rendering-specific helpers (`colorForBloomValue`, `interpolateHex`, `rgba`) that are **mobile-only rendering utilities** — these should stay local.

### Duplicate 3: `src/features/bloom/bloomTypes.ts`

Defines its own local `BloomWindow` type that is structurally identical to the shared `@workspace/shared/src/pigments/types.ts` version with **one difference**:

| Field | Shared (`@workspace/shared`) | Local (sato-bloom) |
|-------|------------------------------|-------------------|
| `pigmentKey` | **Required** `MetabolicPigmentKey` | **Optional** `MetabolicPigmentKey?` |

This would cause a **TypeScript compilation error** if sato-bloom tried to import the shared type directly.

---

## 3. Are there mobile-only rendering expectations not in the API response?

**❌ YES — One incompatibility found: variability range.**

### The BloomClock renderer uses `variability` in 0..1 range

In `BloomClock.tsx` (lines ~116, ~380):
```typescript
// Renderer checks expect 0..1 range
if (w.state === "reactive" || w.variability > 0.55) { /* granulation specks */ }
if (w.state === "reactive" || w.variability > 0.5) { /* center drift */ }
```

Sample data (`bloomSampleData.ts`) confirms the expected range:
```typescript
{ variability: 0.18 },  // calm
{ variability: 0.72 },  // reactive
{ variability: 0.82 },  // reactive
```

### But the Bloom Window services compute variability as an unclamped percentage

From `bloomWindowFixtureService.ts`:
```typescript
const variability =
  windowReadings.length > 1
    ? Math.round(((stats.peak - stats.min) / stats.avg) * 100 * 10) / 10
    : 0;
// Output: 0-100+ range (e.g., 72.3 = 72.3% variation)
```

From `bloomWindowCgmService.ts`:
```typescript
const variability =
  stats.avg !== null && stats.avg > 0 && stats.peak !== null && stats.min !== null
    ? Math.round(((stats.peak - stats.min) / stats.avg) * 100 * 10) / 10
    : 0;
// Same issue: 0-100+ range
```

**Impact:** The `(stats.peak - stats.min) / stats.avg * 100` formula produces a percentage (0-100+), but the renderer checks `variability > 0.55` which would mean "variability > 55%" if both sides used the same scale. However, the sample data uses 0..1 (e.g., `variability: 0.72` = 72% expressed as 0-1). The services produce variability values like `72.3` which would be interpreted as 0-100, causing the renderer's `> 0.55` and `> 0.5` checks to always fail.

### All other rendering fields map correctly

| Renderer Field | Source | Maps Correctly? |
|---------------|--------|----------------|
| `value` → `colorForBloomValue(w.value)` | API: `value` (0..1) | ✅ |
| `confidence` → wash opacity | API: `confidence` (0.1..1) | ✅ |
| `variability` → granulation specks | API: `variability` (unclamped) | ❌ Range mismatch |
| `intensity` → wash size, pigment pooling | API: `intensity` (0..1) | ✅ |
| `state` → reactive checks | API: `state` (BloomState) | ✅ |
| `pigmentKey` → pigment metadata lookup | API: `pigmentKey` (required) | ✅ (when present) |
| `glucoseAvg` → caption display | API: `glucoseAvg` (number?) | ✅ |
| `glucosePeak` → caption display | API: `glucosePeak` (number?) | ✅ |

### Missing `note` field

The local `BloomWindow` type in sato-bloom has a `note?: string` field. The shared `BloomWindow` type does NOT include `note`. This is a minor rendering-only field used in the `GalleryCaption` — it doesn't break anything but the computed API windows won't include it.

---

## 4. Check for missing public exports in `pigmentSystem.ts`

**✅ All necessary exports are present.**

The file's `index.ts` (`src/features/bloom/index.ts`) exports:
- `SATO_PIGMENTS` — the full pigment registry
- `pigmentForKey` — lookup helper
- `MetabolicPigmentKey` — the type
- `BloomWindow`, `BloomMemoryMark`, `BloomState`, `IdentityBloom` — all renderer types

**One observation:** `pigmentForKey` returns `SATO_PIGMENTS[key]` — a plain accessor. The shared `@workspace/shared` already exports `pigmentForKey` from `pigments/palette.ts`. When migrating to shared, this should be re-exported rather than duplicated.

---

## Summary of Findings

| # | Finding | Severity | Action Required |
|---|---------|----------|----------------|
| 1 | **sato-bloom has zero imports from `@workspace/shared`** | 🔴 CRITICAL | Wire sato-bloom to consume `@workspace/shared` as its canonical source |
| 2 | **`SATO_PIGMENTS` duplicated locally** | 🟡 MEDIUM | Re-export from `@workspace/shared` instead of local definition |
| 3 | **`bloomPalette` duplicated locally** | 🟡 MEDIUM | Import palette from `@workspace/shared`, keep only rendering helpers locally |
| 4 | **`pigmentKey` required vs optional mismatch** | 🟡 MEDIUM | Align local `BloomWindow.pigmentKey` to required (API always returns it) |
| 5 | **`variability` range mismatch (0..1 vs percentage)** | 🔴 CRITICAL | Normalize variability to 0..1 in both bloom window services |
| 6 | **API response structurally correct** | ✅ OK | No changes needed to #59 endpoint |
| 7 | **Palette hex values identical between shared and mobile** | ✅ OK | Source-of-truth is correct |
| 8 | **Typography metadata matches Georgia serif system** | ✅ OK | Backend-safe and renderer-compatible |

---

## Recommendations

### Immediate (blocking rendering correctness)
1. **Normalize variability in bloom window services** — In both `bloomWindowFixtureService.ts` and `bloomWindowCgmService.ts`, divide variability by 100 (or apply `clamp(v / 100, 0, 1)`) so the output range matches the renderer's 0..1 expectation.

### High priority (sync sato-bloom with shared contract)
2. **Create a tracking issue** — "Wire sato-bloom to consume `@workspace/shared` as canonical contract source". This is NOT a TDD slice — it's a mobile integration refactor:
   - Add `@workspace/shared` as a dependency in sato-bloom's `package.json`
   - Refactor `pigmentSystem.ts` to re-export from `@workspace/shared`
   - Refactor `bloomColors.ts` to import palette from shared and keep `colorForBloomValue`, `interpolateHex`, `rgba` as local rendering utilities
   - Align `BloomWindow.pigmentKey` to required in the local type definition

### Low priority
3. **Add `note` field to shared `BloomWindow` type** — if the `GalleryCaption` rendering path is used with API data

---

## References

- `sparky-bloom/server/routes/satoThemeRoutes.ts` — #59 API route implementation
- `sparky-bloom/shared/src/theme/satoTheme.ts` — #58 shared theme contract
- `sparky-bloom/shared/src/theme/types.ts` — Theme type definitions
- `sparky-bloom/shared/src/pigments/palette.ts` — Shared pigment registry
- `sparky-bloom/shared/src/pigments/types.ts` — Shared pigment and BloomWindow types
- `sato-bloom/src/features/bloom/pigmentSystem.ts` — Local duplicate of pigments
- `sato-bloom/src/features/bloom/bloomColors.ts` — Local duplicate of palette + render helpers
- `sato-bloom/src/features/bloom/bloomTypes.ts` — Local BloomWindow type (pigmentKey optional)
- `sato-bloom/src/features/bloom/bloomSampleData.ts` — Sample data (variability in 0..1)
- `sato-bloom/src/features/bloom/BloomClock.tsx` — Clock renderer consuming BloomWindow
- `sato-bloom/src/features/bloom/index.ts` — Public exports
- `sparky-bloom/server/services/bloomWindowFixtureService.ts` — Variability computation (no clamp)
- `sparky-bloom/server/services/bloomWindowCgmService.ts` — Variability computation (no clamp)
- `issues/001-sato-shared-theme-contract.md` — Issue #58 spec
- `issues/002-sato-theme-api.md` — Issue #59 spec
