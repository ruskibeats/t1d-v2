# 027 - Bloom Window Variability Normalization

## Description
Normalize `variability` field in BloomWindow computation to 0..1 range instead of 0..100.

## Problem
**CRITICAL:** There's a range mismatch between backend services and BloomClock renderer.

### Backend Services (sparky-bloom/server)
Compute variability as: `(peak - min) / avg * 100`

This produces values like:
- 18.2, 72.3, 105.7 (for real CGM data)
- Fixture service produces values in 0..100 range

### sato-bloom BloomClock Renderer
Checks: `w.variability > 0.55` and `w.variability > 0.5`

Expects 0..1 range based on sample data:
- variability: 0.18, 0.72, 0.82 (in sample data)

**Impact:**
- Granulation specks behave incorrectly when consuming real API data
- Reactive-state checks fail or misbehave
- Renderers treat high variability values as low, and vice versa

## Requirements

### 1. Normalize variability in bloomWindowFixtureService.ts
```typescript
// Before: (peak - min) / avg * 100
const variability = ((peak - min) / avg) * 100;

// After: Normalize to 0..1 range
const variability = ((peak - min) / avg) * 100;
const normalizedVariability = Math.min(Math.max(variability, 0), 100) / 100;
```

### 2. Normalize variability in bloomWindowCgmService.ts
Same normalization applied to CGM-integrated variability calculation.

### 3. Remove variablity * 100 from math
Once normalized, the formula becomes simpler:
```typescript
// Instead of:
const variability = ((peak - min) / avg) * 100;

// Use:
const variability = (peak - min) / avg;  // Range is 0..1 naturally
```

### 4. Update ComputedBloomWindow type (if still using local type)
- Ensure `ComputedBloomWindow` matches shared `BloomWindow` type
- Include `id` field if needed
- Include `note` field if needed

### 5. Unify to shared BloomWindow type
- Deprecate local `ComputedBloomWindow` type
- Use shared `BloomWindow` type from `@workspace/shared/theme`
- This resolves both type mismatch and missing fields issues

## TDD Guardrail #82
- One RED test at a time, minimal GREEN implementation
- Test variablity normalization before or after each service change

## Dependencies
- #63 - Nightscout import idempotent (complete)
- #65 - CGM summary metrics (complete)
- #74 - Bloom window API (review complete)

## Acceptance Criteria
- [ ] All variablity values in both services normalized to 0..1 range
- [ ] Tests pass: `bloomWindowFixtureService.test.ts`, `bloomWindowCgmService.test.ts`
- [ ] Real CGM data produces expected 0..1 variablity (e.g., 0.18, 0.72, 0.82)
- [ ] Sample data matches expected renderer checks (>0.55, >0.5)
- [ ] Granulation specks and reactive-state checks work correctly in sato-bloom
- [ ] Optional: Unify to shared BloomWindow type in fixture service