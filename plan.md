# Implementation Plan: SparkyFitness Backend → T1D/Bloom Backend

## Goal

Reskin the SparkyFitness backend into a T1D/Bloom backend by first exposing and integrating the existing T1D platform, adding T1D-aware AI/Bloom behavior, and only then performing the lower-risk branding/config rename.

## Guiding Strategy

1. **Functional reskin before cosmetic rename.** The backend already contains a partial T1D vector platform, but it is not exposed through API routes. Start there.
2. **Preserve compatibility during transition.** Keep SparkyFitness env vars, cookies, DB roles, and API routes working while introducing Bloom/T1D aliases.
3. **Use existing migration/RLS patterns.** The T1D tables and policies already exist; new work should extend them rather than duplicate them.
4. **Add medical safety boundaries early.** Any T1D AI behavior must be conservative, educational, and non-dosing.
5. **Rename branding last.** Env var, cookie, Docker, DB role, and email renames are high-risk deployment changes and should happen after API behavior is stable.

## Phase 1 — Confirm Scope and Compatibility Map

**Work items**

- Decide the public product name for the reskin: `Bloom`, `SparkyBloom`, or another T1D-specific name.
- Create a backend compatibility map for SparkyFitness → Bloom/T1D names:
  - `SPARKY_FITNESS_*` env vars
  - `sparky_active_user_id` cookie
  - Better Auth `advanced.cookiePrefix: 'sparky'`
  - Swagger title `SparkyFitness API`
  - email subjects/from defaults
  - Docker service/volume names
  - DB roles: `sparky`, `sparky_uat`, `sparky-uat`, `sparky uat`
  - `sparky_chat_history` table and service names

**Files to inspect / modify**

- `sparky-bloom/server/SparkyFitnessServer.ts`
- `sparky-bloom/server/auth.ts`
- `sparky-bloom/server/middleware/authMiddleware.ts`
- `sparky-bloom/server/middleware/signOutCookieCleanup.ts`
- `sparky-bloom/server/config/swagger.ts`
- `sparky-bloom/server/services/emailService.ts`
- `sparky-bloom/server/db/poolManager.ts`
- `sparky-bloom/server/db/grantPermissions.ts`
- `sparky-bloom/server/utils/preflightChecks.ts`
- `sparky-bloom/docker/compose.dev.yml`
- `sparky-bloom/.env.example`
- `sparky-bloom/db_schema_backup.sql`

**Acceptance criteria**

- A compatibility map exists before code changes.
- The plan distinguishes:
  - safe cosmetic renames,
  - dual-read/dual-write transition changes,
  - breaking deployment changes that require migration.
- No public API behavior changes in this phase.

## Phase 2 — Expose Existing T1D Platform as API Routes

**Work items**

Add route handlers for the T1D tables/services that already exist but are not mounted in `SparkyFitnessServer.ts`.

Suggested route group:

- `POST /api/t1d/profiles`
  - create or get a T1D profile for the current Sparky/Bloom user
- `GET /api/t1d/profiles`
  - list accessible profiles
- `GET /api/t1d/profiles/:profileId`
  - fetch one profile
- `GET /api/t1d/cgm`
  - fetch CGM entries for a date range
- `POST /api/t1d/cgm/nightscout/import`
  - import Nightscout CGM entries using `t1dNightscoutImportService`
- `GET /api/t1d/meal-reviews`
  - list saved T1D meal reviews
- `POST /api/t1d/meal-reviews`
  - save a meal review/envelope snapshot
- `GET /api/t1d/forecast-envelopes`
  - list forecast envelopes
- `POST /api/t1d/forecast-envelopes`
  - save or update a forecast envelope
- `POST /api/t1d/vector/search`
  - search T1D vector documents by query or embedding

**Files to add**

- `sparky-bloom/server/routes/t1dProfileRoutes.ts`
- `sparky-bloom/server/routes/t1dCgmRoutes.ts`
- `sparky-bloom/server/routes/t1dNightscoutRoutes.ts`
- `sparky-bloom/server/routes/t1dMealReviewRoutes.ts`
- `sparky-bloom/server/routes/t1dForecastEnvelopeRoutes.ts`
- `sparky-bloom/server/routes/t1dVectorRoutes.ts`
- `sparky-bloom/server/schemas/t1dProfiles.zod.ts`
- `sparky-bloom/server/schemas/t1dCgm.zod.ts`
- `sparky-bloom/server/schemas/t1dMealReviews.zod.ts`
- `sparky-bloom/server/schemas/t1dForecastEnvelopes.zod.ts`

**Files to modify**

- `sparky-bloom/server/SparkyFitnessServer.ts`
  - mount the new T1D route group under `/api/t1d`
- `sparky-bloom/server/config/swagger.ts`
  - add JSDoc/schema coverage for new endpoints
- `sparky-bloom/server/AGENTS.md`
  - update source map if needed after final route structure is stable

**Acceptance criteria**

- T1D routes are mounted from `SparkyFitnessServer.ts`.
- Each route uses authentication and `req.userId`.
- Each route uses existing repositories/services where possible.
- Each public request body is validated with Zod.
- RLS protects profile-owned data.
- Supertest coverage exists for:
  - unauthenticated request rejection,
  - successful profile creation/retrieval,
  - Nightscout import success,
  - invalid import rejection,
  - vector search success.

## Phase 3 — Integrate T1D Profile Creation with Onboarding

**Work items**

- Add optional T1D onboarding fields:
  - diabetes type
  - insulin regimen
  - CGM source
  - carb ratio
  - insulin sensitivity factor
  - baseline glucose target
  - hypo threshold
  - hyper threshold
  - clinician guidance boundary
- Decide whether to extend existing `onboarding_data` or create a separate T1D onboarding table.
- Ensure existing users can opt into T1D mode without losing fitness tracking.
- Create a service that creates/updates the T1D profile during or after onboarding.

**Files to inspect / modify**

- `sparky-bloom/server/routes/onboardingRoutes.ts`
- `sparky-bloom/server/services/onboardingService.ts`
- `sparky-bloom/server/models/onboardingRepository.ts`
- `sparky-bloom/server/models/userRepository.ts`
- `sparky-bloom/server/models/t1dProfileRepository.ts`
- `sparky-bloom/shared/src/schemas/database/OnboardingData.zod.ts`
- `sparky-bloom/shared/src/schemas/api/*.zod.ts` if onboarding API contracts are shared

**Acceptance criteria**

- Existing onboarding flow remains backward-compatible.
- New T1D fields are optional during transition.
- A user can complete T1D onboarding after initial SparkyFitness onboarding.
- `t1d_profiles.sparky_user_id` is populated for real users.
- Tests cover both legacy onboarding and T1D onboarding.

## Phase 4 — Harden CGM and Nightscout Import

**Work items**

- Add route-level validation around `ImportNightscoutCgmBodySchema`.
- Ensure duplicate CGM entries are idempotent.
- Validate units and convert between `mg/dL` and `mmol/L`.
- Encrypt or safely store Nightscout API tokens if direct Nightscout source persistence is used.
- Add time-window query params and pagination.
- Add summary endpoints:
  - latest CGM value
  - min/max/avg for range
  - time-in-range summary

**Files to inspect / modify**

- `sparky-bloom/server/routes/t1dCgmRoutes.ts`
- `sparky-bloom/server/routes/t1dNightscoutRoutes.ts`
- `sparky-bloom/server/services/t1dNightscoutImportService.ts`
- `sparky-bloom/server/models/t1dCgmEntryRepository.ts`
- `sparky-bloom/server/schemas/t1dNightscoutSchema.ts`
- `sparky-bloom/server/services/measurementService.ts`
- `sparky-bloom/server/integrations/healthData/healthDataRoutes.ts`

**Acceptance criteria**

- Nightscout import returns:
  - `normalizedCount`
  - `insertedCgmCount`
  - `healthMetricCount`
  - `vectorDocumentId`
  - summary range/min/max/avg
- Invalid entries return clear validation errors.
- Duplicate entries update instead of duplicating.
- CGM data remains accessible through T1D RLS policies.
- Tests cover timezone parsing and duplicate imports.

## Phase 5 — Add T1D Meal Review and Forecast Envelope APIs

**Work items**

- Add CRUD/list endpoints for `t1d_meal_reviews`.
- Add CRUD/list endpoints for `t1d_forecast_envelopes`.
- Link saved reviews/envelopes to:
  - `t1d_profile_id`
  - `legend_key`
  - `saved_chat_thread_id`
  - food entry IDs where available
  - CGM window IDs or timestamps where available
- Add safety metadata validation:
  - no dosing recommendation
  - educational/simulation boundary
  - confidence/provenance fields

**Files to add / modify**

- `sparky-bloom/server/services/t1dMealReviewService.ts`
- `sparky-bloom/server/services/t1dForecastEnvelopeService.ts`
- `sparky-bloom/server/models/t1dMealReviewRepository.ts`
- `sparky-bloom/server/models/t1dForecastEnvelopeRepository.ts`
- `sparky-bloom/server/routes/t1dMealReviewRoutes.ts`
- `sparky-bloom/server/routes/t1dForecastEnvelopeRoutes.ts`
- `sparky-bloom/server/schemas/t1dMealReviews.zod.ts`
- `sparky-bloom/server/schemas/t1dForecastEnvelopes.zod.ts`

**Acceptance criteria**

- Users can save, retrieve, update, and list their own T1D meal reviews.
- Users can save, retrieve, update, and list forecast envelopes.
- RLS prevents cross-user access.
- Safety metadata is required or defaulted.
- Tests verify owner-only access and invalid safety metadata rejection.

## Phase 6 — Replace Sparky AI Persona with T1D-Aware Bloom/T1D Coach

**Work items**

- Replace or extend `getSystemPrompt()` in `chatService.ts`.
- Add a T1D-specific system prompt with:
  - educational boundary,
  - no dosing/treatment advice,
  - conservative confidence language,
  - encouragement to consult clinician,
  - CGM-aware interpretation,
  - meal-review context awareness.
- Add retrieval from T1D vector documents when relevant.
- Add optional chat tools for:
  - latest CGM summary,
  - saved meal review lookup,
  - forecast envelope lookup,
  - Bloom window lookup.
- Rename chat history functions gradually or keep aliases for compatibility.

**Files to inspect / modify**

- `sparky-bloom/server/services/chatService.ts`
- `sparky-bloom/server/routes/chatRoutes.ts`
- `sparky-bloom/server/models/chatRepository.ts`
- `sparky-bloom/shared/src/schemas/database/SparkyChatHistory.zod.ts`
- `sparky-bloom/server/db/rls_policies.sql`
- `sparky-bloom/db_schema_backup.sql`

**Acceptance criteria**

- Chat responses use T1D-aware language.
- Chat refuses dosing, insulin adjustment, and treatment recommendations.
- Chat can reference CGM/meal-review context when available.
- Existing Sparky chat behavior does not regress during transition.
- Tests cover:
  - dosing advice refusal,
  - medical emergency deferral,
  - CGM context retrieval,
  - backward-compatible chat history access.

## Phase 7 — Implement Server-Side Bloom Window Computation

**Work items**

- Add a Bloom computation service that consumes:
  - food entries,
  - exercise entries,
  - sleep entries,
  - CGM entries,
  - mood/stress if available.
- Use existing shared types and palette:
  - `shared/src/pigments/types.ts`
  - `shared/src/pigments/palette.ts`
- Generate `BloomWindow[]` with:
  - `startHour`
  - `endHour`
  - `label`
  - `value`
  - `confidence`
  - `variability`
  - `intensity`
  - `state`
  - `pigmentKey`
  - `glucoseAvg`
  - `glucosePeak`
  - `rateOfChange`
  - `dataCompleteness`
  - `eventContext`
  - `classificationReason`
- Add route:
  - `GET /api/bloom/windows?from=YYYY-MM-DD&to=YYYY-MM-DD`

**Files to add**

- `sparky-bloom/server/services/bloomWindowService.ts`
- `sparky-bloom/server/services/bloomMealImpactService.ts`
- `sparky-bloom/server/services/bloomWeatherService.ts`
- `sparky-bloom/server/routes/bloomRoutes.ts`
- `sparky-bloom/server/schemas/bloomWindows.zod.ts`
- `sparky-bloom/server/tests/bloomWindowService.test.ts`
- `sparky-bloom/server/tests/bloomRoutes.test.ts`

**Files to modify**

- `sparky-bloom/server/SparkyFitnessServer.ts`
- `sparky-bloom/server/config/swagger.ts`
- `sparky-bloom/shared/src/index.ts` if new shared request/response schemas are needed

**Acceptance criteria**

- Bloom windows are computed server-side from real backend data.
- `pigmentForMacros()` is used or extended as part of the computation.
- CGM data influences `glucoseAvg`, `glucosePeak`, `rateOfChange`, and weather condition.
- Results are deterministic for a given fixture dataset.
- Tests cover:
  - low-data day,
  - high-glucose-reactive meal,
  - post-exercise recovery window,
  - incomplete CGM data.

## Phase 8 — Branding and Config Rename

**Work items**

Perform this phase last, after API behavior is stable.

- Introduce new env var aliases while preserving old ones:
  - `BLOOM_DB_HOST` / `SPARKY_FITNESS_DB_HOST`
  - `BLOOM_DB_USER` / `SPARKY_FITNESS_DB_USER`
  - `BLOOM_FRONTEND_URL` / `SPARKY_FITNESS_FRONTEND_URL`
  - etc.
- Introduce dual cookie handling:
  - read `sparky_active_user_id`
  - write `bloom_active_user_id`
  - clear both during sign-out
- Rename Better Auth cookie prefix from `sparky` to `bloom` with compatibility period.
- Rename Swagger title/description/contact.
- Rename email subjects and default sender domain.
- Rename Docker service/volume names.
- Rename DB roles only after deployment migration plan is approved.

**Files to modify**

- `sparky-bloom/server/SparkyFitnessServer.ts`
- `sparky-bloom/server/auth.ts`
- `sparky-bloom/server/middleware/authMiddleware.ts`
- `sparky-bloom/server/middleware/signOutCookieCleanup.ts`
- `sparky-bloom/server/config/logging.ts`
- `sparky-bloom/server/config/swagger.ts`
- `sparky-bloom/server/services/emailService.ts`
- `sparky-bloom/server/db/poolManager.ts`
- `sparky-bloom/server/db/grantPermissions.ts`
- `sparky-bloom/server/utils/preflightChecks.ts`
- `sparky-bloom/docker/compose.dev.yml`
- `sparky-bloom/.env.example`
- `sparky-bloom/package.json`
- `sparky-bloom/db_schema_backup.sql`

**Acceptance criteria**

- Old SparkyFitness env vars still work during transition.
- New Bloom/T1D env vars work in dev/stage.
- Both cookie names are handled safely during migration.
- Swagger/docs show the new brand.
- Email templates no longer expose SparkyFitness as the primary brand.
- DB role rename is validated against RLS policies and grants before production.

## Phase 9 — Tests, Docs, and Deployment Validation

**Work items**

- Add route tests for all new T1D/Bloom endpoints.
- Add service tests for:
  - Nightscout normalization,
  - CGM import idempotency,
  - T1D profile RLS,
  - Bloom window computation,
  - AI safety prompt behavior if prompt can be isolated.
- Add migration validation:
  - clean DB apply,
  - RLS policy apply,
  - permission grant apply.
- Update developer docs:
  - `sparky-bloom/server/AGENTS.md`
  - backend reskin notes
  - env var compatibility notes
- Add Swagger coverage for new endpoints.

**Acceptance criteria**

- `pnpm run validate` passes.
- Targeted Vitest suites pass.
- Swagger renders without missing schemas.
- Clean dev DB can apply migrations and RLS policies.
- Supertest confirms authenticated users cannot access another user’s T1D data.

## Dependencies

- Phase 1 must happen before Phase 8.
- Phase 2 must happen before Phase 3, 4, and 5 because those depend on public T1D routes.
- Phase 4 depends on Phase 2 and existing `t1dNightscoutImportService`.
- Phase 5 depends on Phase 2 and stable T1D profile IDs.
- Phase 6 depends on Phase 2 and/or Phase 4 if chat should retrieve T1D data.
- Phase 7 depends on existing food/exercise/sleep routes and CGM import availability.
- Phase 8 should happen after Phases 2–7 to avoid renaming before behavior is stable.
- Phase 9 runs throughout, but full validation happens after each phase and again at the end.

## Risks and Mitigations

### Risk: T1D migration is not applied or not synced

**Mitigation:** Verify `server/db/migrations/20260612000000_add_t1d_vector_platform.sql` is applied on startup and reflected in `db_schema_backup.sql`.

### Risk: RLS leaks T1D data

**Mitigation:** Add tests proving:
- users can read/write their own T1D profiles,
- users cannot read another user’s CGM/meal-review/forecast data,
- legend/simulated profiles remain read-only unless admin.

### Risk: Env var rename breaks deployments

**Mitigation:** Use dual-read aliases first. Do not remove `SPARKY_FITNESS_*` until all environments are migrated.

### Risk: Cookie rename breaks sessions

**Mitigation:** Read old cookie and write new cookie during transition. Clear both on sign-out.

### Risk: AI gives unsafe medical advice

**Mitigation:** Add explicit system prompt guardrails and tests for dosing/treatment refusal. Keep language educational and clinician-directed.

### Risk: Mobile app is still coupled to SparkyFitness

**Mitigation:** Keep API paths stable or versioned. Coordinate mobile changes before changing public route names or env-dependent behavior.

### Risk: DB role rename is dangerous

**Mitigation:** Treat DB role rename as a separate migration with rollback. Prefer keeping DB roles unchanged until later.

### Risk: Bloom computation is under-specified

**Mitigation:** Start with deterministic fixture-based Bloom windows before adding ML-like confidence scoring.

### Risk: Upstream `prod/` subtree conflicts

**Mitigation:** Do not rename upstream-facing SparkyFitness files without a sync/merge plan.

## Suggested Next Implementation Slice

Start with the smallest high-value slice:

1. Add T1D profile routes.
2. Add Nightscout/CGM import route.
3. Add vector search route.
4. Mount them in `SparkyFitnessServer.ts`.
5. Add Swagger JSDoc.
6. Add Supertest coverage.

This slice proves the existing T1D layer can become a real backend API without touching the risky branding/config rename.

## Concrete First Tickets

1. **Expose T1D profile API**
   - Files: `routes/t1dProfileRoutes.ts`, `schemas/t1dProfiles.zod.ts`, `SparkyFitnessServer.ts`, `config/swagger.ts`
   - Acceptance: authenticated user can create/get/list their T1D profile.

2. **Expose Nightscout CGM import API**
   - Files: `routes/t1dNightscoutRoutes.ts`, `routes/t1dCgmRoutes.ts`, `schemas/t1dNightscoutSchema.ts`
   - Acceptance: valid Nightscout payload imports CGM rows and returns summary.

3. **Expose T1D vector search API**
   - Files: `routes/t1dVectorRoutes.ts`, `models/t1dVectorDocumentRepository.ts`, `schemas/t1dNightscoutSchema.ts`
   - Acceptance: query search returns profile-scoped vector documents.

4. **Add T1D route tests**
   - Files: `tests/t1dProfileRoutes.test.ts`, `tests/t1dNightscoutRoutes.test.ts`, `tests/t1dVectorRoutes.test.ts`
   - Acceptance: auth, validation, RLS, and success paths covered.

5. **Add T1D-aware chat prompt**
   - Files: `services/chatService.ts`, `routes/chatRoutes.ts`, possibly `server/ai/`
   - Acceptance: dosing/treatment advice is refused; CGM context can be referenced.

## No-Code Plan Artifact Note

This plan is implementation guidance only. It does not modify backend code.
