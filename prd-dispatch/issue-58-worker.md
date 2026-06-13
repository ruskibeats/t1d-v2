# Issue #58 — Sato Shared Theme Contract: Implementation Report

## Summary

Implemented the shared Sato skin theme contract (`SATO_THEME`) in `@workspace/shared`, making it importable by both backend and mobile without React Native Skia dependencies. Followed TDD tracer bullet: one RED public-interface test → minimal GREEN implementation → typecheck/validation.

## Changed Files

### Created (4 files)

1. **`sparky-bloom/shared/src/theme/types.ts`** — Serializable TypeScript interfaces:
   - `SatoPalette` — 17 watercolor palette keys (paper, ink, stains, neutrals, labels)
   - `SatoSurfaces` — 5 semantic surface tokens (background, card, elevated, subtle, ink)
   - `SatoTypography` / `SatoTypographyEntry` — 4-level typography scale (display, headline, body, caption) with fontFamily, fontSize, lineHeight, fontWeight, letterSpacing
   - `SatoVisualTokenVocabulary` — 11 watercolor rendering parameter keys (ellipseCount, spreadX/Y, blur, noise, etc.)
   - `SatoTheme` — Top-level contract: name, version, palette, pigments, surfaces, typography, visualTokens

2. **`sparky-bloom/shared/src/theme/satoTheme.ts`** — Canonical constant definitions:
   - `SATO_PALETTE` — Hex values from the Sato prototype (`bloomColors.ts`)
   - `SATO_SURFACES` — Derived from palette (background=paper, card=paperCream, etc.)
   - `SATO_TYPOGRAPHY` — Georgia-serif metadata from prototype (`GlucoseReadout.tsx`, `PortraitScreen.tsx`)
   - `SATO_VISUAL_TOKENS` — Default rendering params from `sato-skia/src/types/artifact.ts`
   - `SATO_THEME` — Aggregated theme object; reuses `SATO_PIGMENTS` from existing `shared/src/pigments/palette.ts` (no duplication)

3. **`sparky-bloom/shared/src/theme/index.ts`** — Barrel export for the theme module

4. **`sparky-bloom/server/tests/satoThemeContract.test.ts`** — Single RED→GREEN test:
   - Imports `SATO_THEME` from `@workspace/shared` (proves backend importability)
   - Asserts name="Sato", version is string
   - Asserts all 5 top-level keys present (palette, pigments, surfaces, typography, visualTokens)
   - Asserts representative palette values (paper, ink, watercolor stains)
   - Asserts all 11 pigment keys have required metadata fields (name, hex, meaning, opacityBias, spreadBias, granulationBias)
   - Asserts surface tokens are strings
   - Asserts typography entries have fontFamily, fontSize, lineHeight, fontWeight
   - Asserts all 11 visual token vocabulary keys present

### Modified (1 file)

5. **`sparky-bloom/shared/src/index.ts`** — Added `export * from "./theme/index.ts"` alongside existing `./pigments/index.ts` export

## Validation Results

| Command | Result |
|---------|--------|
| `pnpm --filter sparky-bloom-server test -- tests/satoThemeContract.test.ts` | ✅ 884 tests pass (74 suites) |
| `pnpm --filter sparky-bloom-server exec tsc --noEmit --pretty false` | ✅ Clean (0 errors) |
| `pnpm --filter @workspace/shared exec tsc --noEmit --pretty false` | ✅ Clean (0 errors) |
| `pnpm --filter sparky-bloom-server exec eslint . --max-warnings 0` | ✅ Clean (0 warnings) |

## Design Decisions

- **Reused existing pigment registry**: `SATO_THEME.pigments` is the existing `SATO_PIGMENTS` object from `shared/src/pigments/palette.ts`, not a copy. This avoids divergence.
- **No renderer dependencies**: Theme types use only `string`, `number`, and plain objects. No React, React Native, Skia, or Expo imports in shared.
- **Serializable typography**: Typography tokens are metadata objects (`{ fontFamily, fontSize, ... }`), not React Native `StyleSheet` or Skia `TextStyle`. Mobile can map these to renderer-specific formats.
- **Visual tokens as vocabulary**: `SATO_VISUAL_TOKENS` provides default watercolor rendering parameters as plain values, decoupled from the Skia renderer.

## Residual Risks

- **Typography values are first-pass**: Based on prototype evidence (Georgia serif, specific sizes). May need tuning when mobile consumes the contract, but the contract shape is stable.
- **Visual token defaults are reasonable defaults**: The specific numeric values (ellipseCount=12, spreadX=0.35, etc.) are informed by the art-engine but may need calibration.
- **No Zod schemas yet**: The contract is pure TypeScript types + constants. If runtime validation of theme data is needed (e.g., for API responses), Zod schemas would be a follow-up.

## Unblocks Issue #59

✅ The shared contract `SATO_THEME` is now available as a public `@workspace/shared` export. Issue #59 / `issues/002-sato-theme-api.md` (HTTP API endpoint) can import and expose it without any further shared-code work.

## What Was NOT Done (by design)

- No HTTP API endpoint (Issue #59 scope)
- No Swagger documentation (Issue #59 scope)
- No branding/config/env/cookie renames (deferred per PRD)
- No mobile renderer changes (mobile can consume contract as-is)
- No additional tests beyond the single tracer bullet (TDD guardrail)
