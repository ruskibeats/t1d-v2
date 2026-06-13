# Mobile Integration Review — #59 Sato Theme API

## Date
2026-06-12

## Status
✅ API response structurally correct

## ❌ CRITICAL Issues

### 1. sato-bloom has ZERO imports from @workspace/shared
The sato-bloom mobile app at `/root/tld-v2/sato-bloom` maintains its own local copies of contracts:
- `pigmentSystem.ts` — defines `SATO_PIGMENTS` (duplicate)
- `bloomColors.ts` — defines `bloomPalette` (duplicate) + rendering helpers
- `bloomTypes.ts` — defines `BloomWindow` type

**Recommendation:** Add `@workspace/shared` as dependency and refactor to use shared contract

### 2. Type mismatch: pigmentKey required vs optional
- Shared `BloomWindow.pigmentKey` is **REQUIRED**
- sato-bloom local `BloomWindow.pigmentKey` is **OPTIONAL**
- This would cause TS errors on direct import

**Recommendation:** Align types or handle optional in consumers

## 🟡 Issues

### 3. Variability range mismatch (from #74 review)
- Backend computes variability as `(peak - min) / avg * 100` (range 0..100)
- BloomClock renderer expects 0..1 range (checks `>0.55`, sample data shows `0.18, 0.72`)
- This breaks granulation specks and reactive-state checks

**Recommendation:** Normalize variability to 0..1 (see issue #027)

### 4. Value mismatch (from #74 review)
- Backend `value` field is correct (clamp(avg/250, 0, 1))
- Backend `confidence` field is correct (clamp 0.1..1.0)
- Backend `intensity` field is correct (clamp 0..1)
- **Variability is NOT clamped** → range 0..100

## Action Plan

### Short-term (this issue)
1. Create tracking issue #026 for shared contract integration
2. Document required refactor for mobile codebase
3. Coordinate with T1D-bot4 (sato-bloom context) on implementation

### Long-term (future issues)
1. Implement #027 variability normalization (0..1)
2. Implement shared contract integration in sato-bloom
3. Align BloomWindow.pigmentKey type (required vs optional)
4. Centralize typography system under `satoTheme`

## Files Referenced
- `/root/tld-v2/sato-bloom/src/features/bloom/pigmentSystem.ts`
- `/root/tld-v2/sato-bloom/src/features/bloom/bloomColors.ts`
- `/root/tld-v2/sato-bloom/src/features/bloom/bloomTypes.ts`
- `/root/tld-v2/sato-bloom/package.json` (needs @workspace/shared dependency)