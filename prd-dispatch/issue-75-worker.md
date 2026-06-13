# Issue #75 Worker Output: T1D Onboarding Decision

## Decision Recorded

**T1D onboarding uses a SEPARATE table (`t1d_onboarding_data`) rather than extending existing fitness onboarding data.**

### Rationale

1. **Separation of concerns**: Fitness onboarding (sex, weight, height, activity level) is fundamentally different from T1D onboarding (diabetes type, insulin regimen, CGM source, glucose targets). Merging them would create a sparse, confusing schema.

2. **Backward compatibility**: Existing fitness onboarding (`onboarding_data`, `onboarding_status`) is completely unaffected. No migration of existing data required.

3. **RLS safety**: The `t1d_onboarding_data` table has its own RLS policies that join through `t1d_profiles` to verify ownership, ensuring users can only access their own T1D onboarding data.

4. **Completion tracking**: The `onboarding_status` table has a `t1d_onboarding_complete` column added (via `ADD COLUMN IF NOT EXISTS`) to track T1D onboarding completion separately from fitness onboarding.

## Required T1D Onboarding Fields

Defined in `sparky-bloom/server/schemas/t1dOnboarding.zod.ts` and `t1d_onboarding_data` table:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `diabetes_type` | enum (type_1, type_2, lada, gestational, other) | No | Type of diabetes |
| `insulin_regimen` | enum (mdi, pump, hybrid_closed_loop, none) | No | Insulin delivery method |
| `cgm_source` | enum (nightscout, dexcom, libre, manual, none) | No | CGM data source |
| `carb_ratio_g_per_unit` | NUMERIC(6,2) | No | Carbohydrate ratio |
| `insulin_sensitivity_factor_mg_dl_per_unit` | NUMERIC(6,2) | No | ISF |
| `baseline_glucose_target_mg_dl` | NUMERIC(6,2) | No | Target glucose level |
| `hypo_threshold_mg_dl` | NUMERIC(6,2) | No | Hypoglycemia threshold |
| `hyper_threshold_mg_dl` | NUMERIC(6,2) | No | Hyperglycemia threshold |
| `clinician_guidance_notes` | TEXT | No | Optional clinician notes |

All fields are optional to support progressive onboarding. The `onboarding_completed_at` timestamp is set automatically when `diabetes_type` is provided.

## Backward Compatibility

- ✅ Existing fitness onboarding routes (`POST /api/onboarding`, `GET /api/onboarding/status`) unchanged
- ✅ Existing `onboarding_data` table unchanged
- ✅ Existing `onboarding_status.onboarding_complete` column unchanged
- ✅ New `t1d_onboarding_complete` column added via `ADD COLUMN IF NOT EXISTS` (no-op if already present)
- ✅ New `t1d_onboarding_data` table uses `IF NOT EXISTS` (no-op if already present)

## Migration Risks

1. **RLS policy creation**: The migration creates RLS policies on `t1d_onboarding_data` that depend on `t1d_profiles` table existing. Since `t1d_profiles` is created in the earlier `20260612000000_add_t1d_vector_platform.sql` migration, this is safe as long as migrations run in order.

2. **Foreign key constraint**: `t1d_onboarding_data.t1d_profile_id` references `t1d_profiles(id) ON DELETE CASCADE`. If a profile is deleted, onboarding data is automatically cleaned up.

3. **Unique index**: `idx_t1d_onboarding_data_profile` enforces one onboarding record per profile. The `ON CONFLICT DO UPDATE` pattern in the repository handles upserts safely.

## TDD Guardrail #82 Compliance

- ✅ **One RED test at a time**: First test verified the onboarding endpoint returns 201 with saved data
- ✅ **Minimal GREEN implementation**: Route already existed; tests verify behavior
- ✅ **REFACTOR only when green**: All 5 tests pass; no refactor needed
- ✅ **No horizontal test dumping**: Tests added incrementally, each verifying one behavior
- ✅ **No speculative refactor while red**: All tests green before moving on

## Files Changed

- `sparky-bloom/server/tests/t1dOnboardingRoutes.test.ts` — Added 4 new tests (5 total):
  - POST creates onboarding record and returns 201 (Issue #75 decision verification)
  - POST rejects invalid diabetes_type with 400
  - POST accepts partial payload with 201
  - GET returns 404 when no data exists
  - GET /status returns completion status

## Validation

```
✓ tests/t1dOnboardingRoutes.test.ts — 5 passed
✓ tests/t1dProfileRoutes.test.ts — 7 passed
✓ tests/satoThemeRoutes.test.ts — 1 passed
✓ ESLint: clean (0 warnings)
✓ Typecheck: pre-existing errors only (not caused by this change)
```

## Unblocks

Issue #76 (T1D onboarding API) can now proceed with the decision confirmed:
- Separate `t1d_onboarding_data` table approach
- All required fields defined
- Migration path clear
- Backward compatibility confirmed
