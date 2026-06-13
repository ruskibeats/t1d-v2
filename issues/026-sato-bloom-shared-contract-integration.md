# 026 - Sato Bloom Shared Contract Integration

## Description
Mobile integration refactor to wire sato-bloom mobile app to use `@workspace/shared` as the canonical source for Sato theme contracts instead of maintaining local duplicates.

## Problem
The sato-bloom mobile app (Expo workspace at `/root/tld-v2/sato-bloom`) currently maintains its own local copies of the Sato theme contracts:
- `pigmentSystem.ts` — defines `SATO_PIGMENTS` (duplicate of shared contract)
- `bloomColors.ts` — defines `bloomPalette` (duplicate) + rendering helpers
- `bloomTypes.ts` — defines `BloomWindow` type

There are ZERO imports from `@workspace/shared` in the sato-bloom mobile codebase.

## Impact
1. **Code duplication** — Maintains sync burden between shared and sato-bloom contracts
2. **Type mismatch risk** - Local `BloomWindow.pigmentKey` is OPTIONAL vs shared REQUIRED
3. **Maintainability** - Changes to contracts must be synced across two codebases
4. **Type safety** - No TS validation that sato-bloom contracts match shared contract

## Requirements

### 1. Add @workspace/shared dependency to sato-bloom
- Add to `sato-bloom/package.json`
- Either workspace protocol or direct path resolution
- No code changes needed until this is in place

### 2. Refactor pigmentSystem.ts
```typescript
// Before: Local duplicate
const SATO_PIGMENTS = { ... };

// After: Re-export from shared
export { SATO_PIGMENTS } from '@workspace/shared/theme';
```

### 3. Refactor bloomColors.ts
```typescript
// Before: Local palette definition + rendering helpers
const bloomPalette = { ... };
export function colorForBloomValue() { ... };

// After: Import palette from shared, keep rendering helpers
import { SATO_PALETTE } from '@workspace/shared/theme';
export function colorForBloomValue() { ... };
```

### 4. Fix BloomWindow type mismatch
- Review `BloomWindow.pigmentKey` type in `bloomTypes.ts`
- Align with shared contract (REQUIRED vs OPTIONAL)
- Either import type or update to match

### 5. Optionally consolidate bloomTypes.ts
- Import `BloomWindow` from shared if compatible
- Keep local type if there's mobile-specific deviation

## TDD Guardrail #82
- This is a mobile refactor, not a backend feature
- No new backend tests required
- Should be implemented with existing mobile tests in mind

## Dependencies
- #58 - Sato shared theme contract (complete)
- #59 - Sato theme API endpoint (complete)
- #75 - T1D onboarding decision (not required)
- Backend mobile integration pending

## Acceptance Criteria
- [ ] `sato-bloom/package.json` includes `@workspace/shared` dependency
- [ ] `pigmentSystem.ts` imports `SATO_PIGMENTS` from shared, no local duplicate
- [ ] `bloomColors.ts` imports `SATO_PALETTE` from shared, keeps rendering helpers
- [ ] `BloomWindow.pigmentKey` type aligned with shared contract (REQUIRED)
- [ ] No TS errors when importing from shared in sato-bloom
- [ ] All sato-bloom tests pass after refactoring