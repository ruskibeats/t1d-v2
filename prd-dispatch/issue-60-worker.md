# Issue #60 Worker Output — T1D Profile Create/Get

## Summary
Implemented T1D profile creation and retrieval APIs for authenticated users, following TDD guardrails. The implementation provides POST (create) and GET (retrieve by ID) endpoints, plus a GET list endpoint that was added by a concurrent worker.

## Files Changed

### New files
1. `sparky-bloom/server/tests/t1dProfileRoutes.test.ts` — Integration tests (4 tests, all pass)

### Modified files
1. `sparky-bloom/server/routes/t1dProfileRoutes.ts` — Added POST create endpoint + swagger docs (GET list and GET by ID already existed from concurrent worker)
2. `sparky-bloom/server/integrations/healthData/t1dRoutes.ts` — Removed unused `summarizeCgmEntries` import (ESLint fix)

## TDD Process (RED → GREEN)

### RED: Write failing test
- Created `t1dProfileRoutes.test.ts` with 4 tests:
  1. POST /t1d-profiles — create profile (201)
  2. GET /t1d-profiles/:id — retrieve profile (200)
  3. GET /t1d-profiles/:id — not found (404)
  4. GET /t1d-profiles — list profiles (200)
- Tests mock the repository layer and auth middleware
- Tests use `supertest` for HTTP assertions

### GREEN: Minimal implementation
- Added POST `/` handler to existing `t1dProfileRoutes.ts`
- Uses `t1dProfileRepository.getOrCreateProfileForSparkyUser()` for idempotent create
- Uses `authenticate` middleware (consistent with existing routes)
- Returns 201 with profile JSON on success
- Added swagger JSDoc annotations for all endpoints

### REFACTOR
- Removed unused `summarizeCgmEntries` import from `t1dRoutes.ts` (ESLint warning)
- Used inline swagger schemas instead of `$ref` to avoid missing schema component issues
- All 4 tests pass, typecheck clean, ESLint clean

## Validation

### Tests
```
pnpm --filter sparky-bloom-server exec vitest run tests/t1dProfileRoutes.test.ts
→ 1 passed (4 tests)
```

### Typecheck
```
pnpm --filter sparky-bloom-server exec tsc --noEmit
→ No errors in t1dProfileRoutes.ts or t1dProfileRoutes.test.ts
(Pre-existing errors in other subagents' files: t1dForecastEnvelopeRoutes, t1dChatRefusal, etc.)
```

### ESLint
```
pnpm exec eslint routes/t1dProfileRoutes.ts tests/t1dProfileRoutes.test.ts --max-warnings 0
→ Clean (0 warnings)
```

### Full test suite
```
pnpm --filter sparky-bloom-server exec vitest run
→ 81 passed, 4 failed (failures in other subagents' work: t1dForecastEnvelopeRoutes, t1dChatRefusal, t1dCgmSummaryRoutes, t1dOnboardingRoutes)
→ Swagger test passes (T1DProfile $ref issue resolved)
```

## API Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/api/t1d-profiles` | Create T1D profile | Required |
| GET | `/api/t1d-profiles` | List user's T1D profiles | Required |
| GET | `/api/t1d-profiles/:id` | Get T1D profile by ID | Required |

## RLS Enforcement
- Routes use `authenticate` middleware → `req.userId` set from session
- `getProfileById(profileId, req.userId)` enforces RLS via database policy
- `getProfilesForSparkyUser(req.userId)` filters by `sparky_user_id`
- `getOrCreateProfileForSparkyUser(req.userId, req.userId, ...)` ensures ownership

## Residual Risks
1. **Concurrent worker overlap**: Another subagent may have modified `t1dProfileRoutes.ts` concurrently. Current state has all 3 endpoints (POST create, GET list, GET by ID).
2. **Date formatting**: Repository returns `Date` objects directly; JSON serialization handles ISO conversion. No explicit `toISOString()` needed.
3. **Validation**: No Zod schema validation on POST body (consistent with existing patterns in the codebase). Invalid fields are handled by the database constraint.
4. **Swagger**: Uses inline schemas instead of `$ref` to avoid missing schema component issues. Could be refactored to shared schemas later.

## Unblocks
- #61 (T1D profile list and RLS) — already implemented by concurrent worker
- #62+ (Nightscout import, CGM, vector search, meal reviews, forecast envelopes, Bloom windows, onboarding, chat)
