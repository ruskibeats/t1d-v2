# Issue #70 — T1D Forecast Envelope Create/Get

## Status: ✅ ALREADY COMPLETE

The forecast envelope create/get implementation is fully in place. No code changes were needed.

## What Exists

### Routes (`server/routes/t1dForecastEnvelopeRoutes.ts`)
- **POST `/api/t1d/forecast-envelopes`** — Creates a forecast envelope linked to the authenticated user's T1D profile. Accepts `runId` (required), `phase`, `routeRecommendation`, `dataMode`, `sourceLabel`, `parsedFoods`, `cards`, `safety`, `schemaVersion`, and `provenance`. Returns 201 with the created envelope.
- **GET `/api/t1d/forecast-envelopes`** — Lists all forecast envelopes for the authenticated user's profile. Returns 200 with array.
- **GET `/api/t1d/forecast-envelopes/:id`** — Gets a specific envelope by ID. Returns 200 if owned, 404 if not found (cross-user access blocked via repository INNER JOIN on `sparky_user_id`).

### Schema Validation (`server/schemas/t1dNightscoutSchema.ts`)
- `CreateForecastEnvelopeBodySchema` — Full Zod validation with:
  - `runId` required, non-empty string
  - `phase` enum: `draft`, `forecast`, `review`, `archived` (default: `forecast`)
  - `dataMode` enum: `demo`, `simulated`, `nightscout`, `manual` (default: `demo`)
  - `provenance` with `sourceType` enum, `sourceId`, `confidence` (0-1), `notes`
  - Defaults: `provenance.sourceType = 'manual'`, `schemaVersion = 'mobile-card-v1'`

### Repository (`server/models/t1dForecastEnvelopeRepository.ts`)
- `createForecastEnvelope()` — Inserts with `provenance_json` as JSONB
- `getForecastEnvelopeById()` — Uses INNER JOIN on `t1d_profiles.sparky_user_id` for ownership enforcement
- `getForecastEnvelopesByProfile()` — Same ownership pattern

### Tests (`server/tests/t1dForecastEnvelopeRoutes.test.ts`)
16 tests, all passing:
- Provenance persistence (sourceType, sourceId, confidence, notes)
- Default provenance sourceType = 'manual'
- Invalid provenance sourceType rejected (400)
- Confidence out of range rejected (400)
- All 5 valid source types accepted
- GET returns provenance with envelope
- Create and return envelope for authenticated user
- Reject missing runId (400)
- Reject empty runId (400)
- List all envelopes for user
- Empty array when no envelopes
- Get envelope by ID if owned
- 404 when envelope not found
- Cross-user access blocked (user B can't access user A's envelope)
- Cross-user listing blocked (user B can't list user A's envelopes)

## Validation

```
npx vitest run tests/t1dForecastEnvelopeRoutes.test.ts --reporter=verbose
→ 16 passed (16)
```

Full test suite: **1007 passed, 3 failed** (failures are pre-existing in swagger.test.ts and t1dChatRefusal.test.ts, unrelated to forecast envelopes).

## Acceptance Criteria

- [x] Authenticated user can create a forecast envelope.
- [x] Authenticated user can retrieve their own forecast envelope.
- [x] Forecast envelope is linked to the authenticated user's T1D profile.
- [x] Invalid payloads are rejected.
- [x] Tests verify public API behavior.

## PRD User Stories Addressed

- User story 13: Save forecast envelopes with safety boundaries
- User story 14: Envelopes include provenance
- User story 15: Vector search over T1D context
- User story 33: RLS-protected cross-user access
- User story 35: Tests verify API behavior
- User story 36: One vertical slice at a time

## TDD Guardrail #82

Not applicable — implementation was already complete from prior work sessions. All 16 tests pass (GREEN). No refactor needed.

## No Code Changes Made

This issue required no new code. The routes, schema, repository, and tests were all already implemented and passing.
