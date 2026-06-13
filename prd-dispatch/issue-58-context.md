# Issue #58 / 001 — Sato shared theme contract: implementation context

## Request / source facts

- GitHub Issue #58 (`001 - Sato shared theme contract`) matches local `issues/001-sato-shared-theme-contract.md`.
- Issue scope: create a shared Sato skin theme contract for backend + mobile, defining palette, pigment metadata, surfaces, typography metadata, and visual-token vocabulary **without** adding React Native Skia dependencies to backend (`issues/001-sato-shared-theme-contract.md:5-20`).
- TDD tracer bullet: one test verifies the shared Sato theme object exports expected palette, pigment, surface, and typography keys (`issues/001-sato-shared-theme-contract.md:9-12`).
- PRD says this is the first backend reskin slice and should avoid cosmetic rename work (`issues/prd.md:13-26`, `issues/prd.md:73-98`).
- Relevant user stories: shared mobile/backend Sato tokens, no duplicated definitions, Skia stays mobile-only, public-interface-focused tests, one vertical slice at a time (`issues/prd.md:54-65`).
- #82/#25 workflow guardrail: do **not** write all tests first; do **not** refactor while red; pick one public behavior, write one failing public-interface test, minimal implementation, refactor only after green (`issues/025-tdd-workflow-guardrails.md:5-19`, `issues/prd.md:100-137`).

## Repo orientation / likely target area

There are several Sato/Bloom code areas; the likely implementation target for this issue is the `sparky-bloom` workspace because it has a TypeScript backend, mobile app, and `@workspace/shared` package already consumed by both.

- `sparky-bloom/shared` is the existing shared package. It is dependency-light: only `zod`; no Skia/React Native dependencies (`sparky-bloom/shared/package.json:1-14`).
- `sparky-bloom/server` depends on `@workspace/shared` and has Vitest tests (`sparky-bloom/server/package.json:23-59`, scripts at `:7-17`).
- `sparky-bloom/mobile` also depends on `@workspace/shared` and separately depends on `@shopify/react-native-skia`; Skia is mobile-side only (`sparky-bloom/mobile/package.json`, not line-numbered here due length; key evidence also in `sparky-bloom/mobile/src/features/bloom/BloomClock.tsx:5-8`).
- `sparky-bloom/server/vitest.config.ts:8-17` aliases `@workspace/shared` to `../shared/src`, so a server Vitest test can verify backend importability of the shared contract without mounting the whole server.
- `sparky-bloom/shared/src/index.ts:78-86` already exports constants/utils and `./pigments/index.ts`; a new theme module should be exported there.

## Existing high-value patterns / code to reuse

### Shared pigment registry already exists in `@workspace/shared`

`sparky-bloom/shared/src/pigments/types.ts` defines the existing shared Bloom/Sato vocabulary:

- `MetabolicPigmentKey` is the canonical 11-key union: `slowCarb`, `fastSugar`, `fatDelay`, `proteinSteady`, `movement`, `recovery`, `stress`, `sleepDebt`, `settling`, `baseline`, `unknown` (`sparky-bloom/shared/src/pigments/types.ts:8-20`).
- `PigmentDef` already matches the issue acceptance criteria exactly: `name`, `hex`, `meaning`, `opacityBias`, `spreadBias`, `granulationBias` (`sparky-bloom/shared/src/pigments/types.ts:22-30`).
- `BloomWindow` already includes `pigmentKey: MetabolicPigmentKey`, glucose fields, confidence, etc. (`sparky-bloom/shared/src/pigments/types.ts:56-79`).

`sparky-bloom/shared/src/pigments/palette.ts` exports:

- `SATO_PIGMENTS: Record<MetabolicPigmentKey, PigmentDef>` with the full metadata required by Issue #58 (`sparky-bloom/shared/src/pigments/palette.ts:16-105`).
- Existing pigment values are copied from the Sato prototype and should be reused instead of duplicating a new divergent registry.
- `BLOOM_CONDITIONS` with weather/condition vocabulary and hex tints (`sparky-bloom/shared/src/pigments/palette.ts:127-175`).
- Helpers `pigmentForKey`, `interpolateHex`, `rgba`, `pigmentForMacros` (`sparky-bloom/shared/src/pigments/palette.ts:107-205`).

### Prototype/mobile Sato palette and typography evidence

The richer Sato palette currently lives in mobile/prototype code, not shared backend-safe contract:

- `sato-bloom/src/features/bloom/bloomColors.ts:1-40` defines `bloomPalette`:
  - watercolor stains: `mutedTeal`, `blueGrey`, `mossGreen`, `warmOchre`, `apricot`, `softCoral`, `fadedClay`
  - vessel neutrals: `vesselWarm`, `vesselNeutral`
  - ink/labels: `ink`, `inkWarm`, `captionBlue`, `muted`, `mutedLight`
  - paper: `paper`, `paperDeep`, `paperCream`
  - legacy aliases
- Prototype typography repeatedly uses Georgia-style serif metadata:
  - glucose value uses `fontFamily: "Georgia"`, `fontSize: 58`, `lineHeight: 62`, `fontWeight: "400"`, letter spacing (`sato-bloom/src/features/bloom/GlucoseReadout.tsx:39-50`).
  - portrait logo/headline/caption use `fontFamily: "Georgia"`, lightweight weights, line heights, colors from `bloomPalette` (`sato-bloom/src/screens/PortraitScreen.tsx:188-247`).
- Root `mobile/src/theme/theme.ts:3-30` has an older Material-style palette and surfaces; it is useful evidence of surface token naming but appears not to be the canonical Sato watercolor palette.
- `sparky-bloom/mobile/src/features/bloom/BloomClock.tsx:5-8` imports Skia and `@workspace/shared` side-by-side, confirming Skia must remain in mobile renderer code, not shared/backend modules.

### Visual-token vocabulary evidence

- `sato-skia/src/types/artifact.ts:19-31` defines a renderer-oriented `VisualTokens` shape: `palette`, `ellipseCount`, `spreadX`, `spreadY`, `blur`, `noise`, `accentCount`, `rotationBias`, `opacityBase`, `elongation`, `edgeSoftness`.
- `sato-skia/src/grammar/mapper.ts:20-48` shows category palettes and default visual token fields. This is Skia/art-engine adjacent; for Issue #58, reuse the vocabulary as plain serializable metadata only, not renderer dependencies.

## Public behavior to test first (TDD)

Write exactly one public-interface test first, likely in `sparky-bloom/server/tests/satoThemeContract.test.ts`, importing from `@workspace/shared`:

Suggested behavior statement:

> `@workspace/shared` exports a deterministic `SATO_THEME`/`satoTheme` object that backend code can import, and it includes the Sato theme name/version, centralized palette, pigment metadata, surfaces, typography metadata, and visual token vocabulary without requiring React Native Skia.

Target assertions for the single test:

- import `{ SATO_THEME }` (or chosen public name) from `@workspace/shared` succeeds under server Vitest.
- `SATO_THEME.name === "Sato"` and has a stable `version` string/number.
- top-level keys include at least: `palette`, `pigments`, `surfaces`, `typography`, `visualTokens`.
- `palette` includes Sato watercolor keys from prototype: e.g. `paper`, `paperDeep`, `paperCream`, `ink`, `inkWarm`, `mutedTeal`, `blueGrey`, `mossGreen`, `warmOchre`, `apricot`, `softCoral`.
- `pigments.baseline` includes `{ name, hex, meaning, opacityBias, spreadBias, granulationBias }`, and all canonical pigment keys are present.
- `surfaces` includes paper/background/card-ish tokens using palette values (e.g. `background`, `card`, `elevated`, `subtle`, `ink`).
- `typography` includes serializable metadata, not React Native styles/functions; e.g. `display`, `headline`, `body`, `caption` with `fontFamily`, `fontSize`, `lineHeight`, `fontWeight`, `letterSpacing`.
- `visualTokens` includes vocabulary keys from art-engine evidence: e.g. `palette`, `ellipseCount`, `spreadX`, `spreadY`, `blur`, `noise`, `accentCount`, `rotationBias`, `opacityBase`, `elongation`, `edgeSoftness`.

Avoid testing private file paths or helper internals. The public contract is the export from `@workspace/shared`.

## Likely implementation files

Add/adjust in `sparky-bloom/shared`:

- New `sparky-bloom/shared/src/theme/types.ts`
  - serializable TypeScript interfaces, e.g. `SatoTheme`, `SatoPalette`, `SatoSurfaces`, `SatoTypography`, `SatoVisualTokenVocabulary`.
  - May reference/reuse `PigmentDef` and `MetabolicPigmentKey` from `../pigments/types.js`.
- New `sparky-bloom/shared/src/theme/satoTheme.ts` (or `sato.ts`)
  - export constant `SATO_PALETTE` based on `sato-bloom/src/features/bloom/bloomColors.ts:5-40`.
  - export `SATO_SURFACES` derived from palette (`background: paper`, `card: paperCream`, `elevated: paperDeep`, etc.).
  - export `SATO_TYPOGRAPHY` as plain metadata inspired by prototype Georgia typography (`GlucoseReadout.tsx:39-50`, `PortraitScreen.tsx:188-247`).
  - export `SATO_VISUAL_TOKENS` as vocabulary/defaults, derived from `sato-skia/src/types/artifact.ts:19-31` but no Skia imports.
  - export `SATO_THEME = { name, version, palette, pigments: SATO_PIGMENTS, surfaces, typography, visualTokens } as const`.
- New `sparky-bloom/shared/src/theme/index.ts` exporting public theme symbols.
- Update `sparky-bloom/shared/src/index.ts` to export `./theme/index.ts` near the existing `./pigments/index.ts` export (`sparky-bloom/shared/src/index.ts:78-86`).

Add one test:

- `sparky-bloom/server/tests/satoThemeContract.test.ts` (recommended because it directly proves backend can import the shared theme via `@workspace/shared` and uses existing Vitest setup).

Do not add a backend API route in Issue #58. `issues/002-sato-theme-api.md` is explicitly the next slice and is blocked by this contract; it will expose the public endpoint and Swagger later.

## Constraints / invariants

- Keep shared theme outside mobile-only code (`issues/001-sato-shared-theme-contract.md:15`).
- Do not import React, React Native, Expo, Skia, or renderer code from `@workspace/shared`; backend must remain able to import it (`issues/001-sato-shared-theme-contract.md:19`, `issues/prd.md:58`, `issues/prd.md:92-94`).
- Do not do branding/config/env/cookie renames; PRD defers cosmetic rename and requires preserving existing SparkyFitness behavior (`issues/prd.md:75-98`, `issues/prd.md:139-150`).
- One RED test only for the first behavior, then minimal implementation; no speculative refactor while red (`issues/025-tdd-workflow-guardrails.md:7-19`).
- Do not implement Issue #59/#002 theme API in this slice; only provide the contract it will consume.

## Risks / decisions to watch

- **Multiple Sato sources:** `sato-bloom`, `sato-skia`, root `mobile`, and `sparky-bloom` have overlapping palettes. Treat `sparky-bloom/shared` as the contract home and use prototype values as source evidence, not imports.
- **Duplicate pigment registry risk:** `sparky-bloom/shared/src/pigments` already has canonical `SATO_PIGMENTS`. The theme should reference/re-export it, not copy it into a second registry.
- **API boundary risk:** Issue #58 is shared contract only. Endpoint/Swagger belongs to `issues/002-sato-theme-api.md`.
- **Dependency risk:** Adding any shared dependency beyond plain TS/zod can violate backend importability. No `@shopify/react-native-skia`, `react-native`, `expo`, or `react` imports in shared.
- **TypeScript module style:** Current shared exports use `.ts` extension in `src/index.ts`; internal imports in pigments use `.js`. Follow existing project style carefully and validate with typecheck.
- **No line of evidence for exact typography contract:** Prototype uses Georgia and font sizes/weights, but the exact token shape is a product/API decision. Keep it simple, serializable, and stable; escalate only if exact naming/values are disputed.

## Validation commands

From repo root:

```bash
cd /root/tld-v2/sparky-bloom
pnpm --filter sparky-bloom-server test -- satoThemeContract
pnpm --filter sparky-bloom-server typecheck
pnpm --filter @workspace/shared typecheck
```

Broader check if time permits:

```bash
cd /root/tld-v2/sparky-bloom
pnpm validate
```

If the focused test cannot be filtered by name in this setup, run:

```bash
cd /root/tld-v2/sparky-bloom/server
pnpm test -- tests/satoThemeContract.test.ts
```

## Implementation-ready meta-prompt

Goal: Implement Issue #58 by adding a backend/mobile-safe Sato shared theme contract in `sparky-bloom/shared`, with one public-interface test proving backend importability and required contract keys. Do not implement the theme API endpoint; that is Issue #59/#002.

Context/evidence:

- Requirements are in `issues/001-sato-shared-theme-contract.md:5-20`.
- PRD requires shared Sato palette/pigments/surfaces/typography, Skia mobile-only, and one vertical TDD slice (`issues/prd.md:54-65`, `issues/prd.md:90-98`, `issues/prd.md:100-137`).
- TDD guardrail: one public behavior test first; minimal implementation; refactor only after green (`issues/025-tdd-workflow-guardrails.md:7-19`).
- Existing shared pigment contract is already in `sparky-bloom/shared/src/pigments/types.ts:8-30` and `sparky-bloom/shared/src/pigments/palette.ts:16-105`; reuse it.
- Sato palette source values are in `sato-bloom/src/features/bloom/bloomColors.ts:5-40`.
- Typography evidence is in `sato-bloom/src/features/bloom/GlucoseReadout.tsx:39-50` and `sato-bloom/src/screens/PortraitScreen.tsx:188-247`.
- Visual token vocabulary evidence is in `sato-skia/src/types/artifact.ts:19-31`.
- Backend test can import `@workspace/shared` because `sparky-bloom/server/vitest.config.ts:8-17` aliases it to `../shared/src`.

Success criteria:

- A public `@workspace/shared` export (suggested `SATO_THEME`) exists.
- It includes deterministic top-level `name`, `version`, `palette`, `pigments`, `surfaces`, `typography`, `visualTokens`.
- Pigments are centralized/reused from existing `SATO_PIGMENTS` and expose required metadata fields.
- Shared package remains free of Skia/React Native/Expo/React imports and dependencies.
- One focused test validates the public shared contract from the backend side.
- Focused test and typechecks pass.

Suggested approach:

1. RED: add `sparky-bloom/server/tests/satoThemeContract.test.ts` importing the intended public theme export from `@workspace/shared` and asserting the public contract keys/representative values.
2. GREEN: add minimal theme types/constant files under `sparky-bloom/shared/src/theme/`, reusing `SATO_PIGMENTS`, and export them from `sparky-bloom/shared/src/index.ts`.
3. Run focused test + shared/server typechecks.
4. Only after green, refactor names/organization if needed; avoid broad cleanup.

Hard constraints:

- No endpoint, Swagger, DB, auth, env var, cookie, or branding rename work in Issue #58.
- No mobile renderer dependency in shared or backend.
- Do not duplicate the pigment registry.
- Do not batch extra tests beyond the first public behavior before implementation.

Stop/escalation rules:

- Ask before choosing a materially different public contract shape (e.g. omitting typography or visualTokens, or changing pigment key names).
- Stop after the contract test and minimal implementation are green; leave API exposure for Issue #59/#002.

Resolved assumptions:

- `sparky-bloom/shared` is the intended shared-code home because both `sparky-bloom/server` and `sparky-bloom/mobile` already consume `@workspace/shared`.
- Exact typography/surface values can be simple first-pass metadata based on prototype values; the key acceptance requirement is centralized, serializable contract shape and backend importability.
