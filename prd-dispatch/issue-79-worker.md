# Issue #79 / `issues/022-env-cookie-compat-decision.md` — Worker Artifact

## Scope

This is a **decision gate**, not a code implementation task. No code changes are made.

The issue requires product owner decisions on env var and auth cookie compatibility before implementation (#80) can proceed.

## Current State (from codebase audit)

The existing server (`sparky-bloom/server/`) has **extensive `SPARKY_FITNESS_*` env var usage** across:

- `SparkyFitnessServer.ts` — `SPARKY_FITNESS_SERVER_PORT`, `SPARKY_FITNESS_FRONTEND_URL`, `SPARKY_FITNESS_PUBLIC_API_DOCS`, `SPARKY_FITNESS_CUSTOM_UPLOADS_DIRECTORY`, `SPARKY_FITNESS_ADMIN_EMAIL`, `SPARKY_FITNESS_OIDC_*` (10+ OIDC vars)
- `poolManager.ts` — `SPARKY_FITNESS_DB_HOST`, `SPARKY_FITNESS_DB_NAME`, `SPARKY_FITNESS_DB_USER`, `SPARKY_FITNESS_DB_PASSWORD`, `SPARKY_FITNESS_DB_PORT`, `SPARKY_FITNESS_APP_DB_USER`, `SPARKY_FITNESS_APP_DB_PASSWORD`
- `emailService.ts` — `SPARKY_FITNESS_EMAIL_HOST`, `SPARKY_FITNESS_EMAIL_PORT`, `SPARKY_FITNESS_EMAIL_USER`, `SPARKY_FITNESS_EMAIL_PASS`, `SPARKY_FITNESS_EMAIL_FROM`, `SPARKY_FITNESS_EMAIL_SECURE`
- `oidcEnvConfig.ts` — `SPARKY_FITNESS_OIDC_ISSUER_URL`, `SPARKY_FITNESS_OIDC_CLIENT_ID`, `SPARKY_FITNESS_OIDC_CLIENT_SECRET`, `SPARKY_FITNESS_OIDC_PROVIDER_SLUG`, `SPARKY_FITNESS_OIDC_PROVIDER_NAME`, `SPARKY_FITNESS_OIDC_SCOPE`, `SPARKY_FITNESS_OIDC_AUTO_REGISTER`, `SPARKY_FITNESS_OIDC_LOGO_URL`, `SPARKY_FITNESS_OIDC_DOMAIN`, `SPARKY_FITNESS_OIDC_TOKEN_AUTH_METHOD`, `SPARKY_FITNESS_OIDC_ID_TOKEN_SIGNED_ALG`, `SPARKY_FITNESS_OIDC_USERINFO_SIGNED_ALG`, `SPARKY_FITNESS_OIDC_TIMEOUT`, `SPARKY_FITNESS_OIDC_ADMIN_GROUP`
- `preflightChecks.ts` — validates all above at startup
- `diagnosticLogger.ts` — `SPARKY_FITNESS_SAVE_MOCK_DATA`
- `polarService.ts` — `SPARKY_FITNESS_POLAR_DATA_SOURCE`
- `withingsService.ts` — `SPARKY_FITNESS_WITHINGS_DATA_SOURCE`
- `imageDownloader.ts` — `SPARKY_FITNESS_CUSTOM_UPLOADS_DIRECTORY`
- Cookie: `Better Auth` with `BETTER_AUTH_SECRET` (already generic, not Sparky-branded)

**Total: ~40+ `SPARKY_FITNESS_*` env vars** in active use.

## Decisions Required

The product owner must confirm the following four decisions before implementation (#80) can proceed:

### Decision 1: Env Var Alias Strategy

**Options:**
- **A. Dual-read aliases (recommended):** New `BLOOM_*` / `T1D_*` env vars are introduced as primary; old `SPARKY_FITNESS_*` vars remain supported as fallbacks during transition. Log deprecation warnings when old vars are used.
- **B. Clean break:** New `BLOOM_*` vars only; old `SPARKY_FITNESS_*` vars removed immediately. Requires coordinated deploy with all consumers updated simultaneously.
- **C. Prefix-only rename:** All `SPARKY_FITNESS_*` vars renamed to `BLOOM_*` with no backward compatibility. Simplest but breaks existing deployments.

**PRD guidance:** "New Bloom/T1D env vars should be introduced as aliases before old SparkyFitness env vars are removed." → Recommends **Option A**.

### Decision 2: Cookie Transition Behavior

**Options:**
- **A. Read-old-write-new (recommended):** Server reads both `sparky_session` and `session` cookies; always writes new `session` cookie. Users on old cookies get silently migrated on next request.
- **B. Read-both-keep-both:** Server reads both cookie names; writes whichever name the client used. No forced migration.
- **C. New-only with grace period:** Server only reads new `session` cookie; old `sparky_session` cookie triggers a 302 redirect to re-authenticate. Forces migration within one session.

**PRD guidance:** "Auth cookies should support a transition period where old Sparky cookies are read and new Bloom cookies are written." → Recommends **Option A**.

### Decision 3: DB Role Rename

**Options:**
- **A. Defer entirely (recommended):** Keep `SPARKY_FITNESS_DB_USER` / `SPARKY_FITNESS_APP_DB_USER` role names. No rename in this wave.
- **B. Alias in Postgres:** Create a new `bloom_app` role alongside `sparky_fitness_app`; grant same permissions; switch app config to new role.
- **C. Full rename:** Rename all DB roles from `sparky_fitness_*` to `bloom_*` with migration script.

**PRD guidance:** "DB role renaming is out of the first implementation wave and should be treated as a separate migration." → Recommends **Option A (defer)**.

### Decision 4: Rollout Constraints

**Options:**
- **A. Feature-flag gated (recommended):** New Bloom env vars only activate when `BLOOM_ENABLED=true`. Default is SparkyFitness behavior. Allows gradual rollout.
- **B. Instant cutover:** All changes deploy at once. No feature flag.
- **C. Per-var gradual:** Each env var migration is independently feature-flagged.

**PRD guidance:** "The backend should preserve existing SparkyFitness behavior during transition." → Recommends **Option A**.

## Recommended Decisions (from PRD)

| Decision | Recommended | Rationale |
|----------|-------------|-----------|
| Env var aliases | A. Dual-read | PRD says introduce new as aliases before removing old |
| Cookie transition | A. Read-old-write-new | PRD says support transition period |
| DB role rename | A. Defer | PRD says out of first wave |
| Rollout constraints | A. Feature-flag gated | PRD says preserve existing behavior |

## TDD Guardrail #82 Note

TDD guardrail #82 does not apply to this issue because it is a **decision gate**, not a code implementation task. Once decisions are confirmed and implementation issue #80 is unblocked, TDD guardrail #82 should be enforced for that implementation work.

## Output

No code changes made. This issue requires product owner decisions before implementation can proceed.

## Recommended Next Step

Contact the product owner via `contact_supervisor` with `reason: "need_decision"` to confirm the four env/cookie compatibility decisions listed above.
