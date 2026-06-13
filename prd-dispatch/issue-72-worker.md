# Issue #72 — Bloom Window Fixture Computation: Implementation Report

## Summary

Implemented the Bloom window fixture computation service (`computeBloomWindowsFromFixture`) as a pure, deterministic function that converts fixture CGM readings into Sato-compatible metabolic windows. Followed TDD tracer bullet: one RED public-interface test → minimal GREEN implementation → typecheck/ESLint validation.

## Changed Files

### Created (2 files)

1. **`sparky-bloom/server/services/bloomWindowFixtureService.ts`** — Pure computation service:
   - `computeBloomWindowsFromFixture(input)` — main entry point
   - Splits fixture readings into 2-hour windows within the requested range
   - Each window includes: label, startHour, endHour, value (0..1), confidence (0..1), variability, intensity (0..1), state, pigmentKey, glucoseAvg, glucosePeak, rateOfChange, dataCompleteness, eventContext
   - Deterministic: same input → same output (no randomness, no side effects)
   - Low-data windows receive low confidence (0.1 floor, scaled by reading density)
   - Pigment key mapping: exercise→movement, peak→fastSugar, meal→fastSugar/slowCarb (by avg glucose), fasting→baseline, sleep→sleepDebt, rest→settling
   - State mapping: high variability or out-of-range glucose→reactive, stable in-range→calm, else→balanced
   - Imports `MetabolicPigmentKey` and `BloomState` from `@workspace/shared` (reuses existing shared types)

2. **`sparky-bloom/server/tests/bloomWindowFixtureService.test.ts`** — Single RED→GREEN test:
   - Fixture: 8 CGM readings across 6:00-22:00 (fasting, meal, peak, exercise, rest)
   - Asserts determinism: `first === second` via `toEqual`
   - Asserts all required fields present on each window
   - Asserts windows cover the requested range (startHour=6, endHour=22)

## Validation Results

| Command | Result |
|---------|--------|
| `pnpm --filter sparky-bloom-server exec vitest run tests/bloomWindowFixtureService.test.ts` | ✅ 1 passed (1 test) |
| `pnpm --filter sparky-bloom-server exec tsc --noEmit --pretty false` | ✅ No errors in bloomWindowFixtureService.ts (pre-existing errors in unrelated test files) |
| `pnpm --filter sparky-bloom-server exec eslint services/bloomWindowFixtureService.ts tests/bloomWindowFixtureService.test.ts --max-warnings 0` | ✅ Clean (0 warnings in new files) |

## Design Decisions

- **Pure function, no DB/HTTP**: Bloom window computation is a deterministic transformation. No database access, no external calls. This makes it testable and cacheable.
- **2-hour windows**: Default window size matches the mobile BloomClock renderer's expectations (12 windows for a 24-hour day).
- **Low-confidence for sparse data**: Windows with no readings get confidence=0.1. Windows with 1 reading per 2+ hours get proportionally higher confidence.
- **Pigment key from event context**: The dominant event type in a window determines its pigment. Meal windows use avg glucose to distinguish slowCarb vs fastSugar.
- **Reuses shared types**: `MetabolicPigmentKey` and `BloomState` imported from `@workspace/shared`, not redefined.

## Residual Risks

- **Window splitting is simple**: Currently splits every 2 hours. May need refinement to split at event boundaries (e.g., a meal at hour 3 shouldn't be split across two windows).
- **Pigment mapping is rule-based**: Real-world scenarios may need more nuanced mapping (e.g., combining exercise + meal effects).
- **No API endpoint yet**: This is the computation service only. Issue #74 (Bloom window API) will expose this via HTTP.

## Unblocks

✅ The Bloom window computation service is ready for:
- Issue #73 (Bloom window CGM import integration) — can call this service after import
- Issue #74 (Bloom window API) — can expose this service via HTTP endpoint

## What Was NOT Done (by design)

- No HTTP API endpoint (Issue #74 scope)
- No database persistence of computed windows (Issue #73/74 scope)
- No mobile renderer changes (mobile consumes via API)
- No additional tests beyond the single tracer bullet (TDD guardrail)
- No integration with actual CGM data flow (Issue #73 scope)
