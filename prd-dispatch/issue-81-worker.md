# Issue #81 / `issues/024-branding-docs-final-rename.md` — Worker Artifact

## Status: DECISION GATE — Implementation blocked pending product owner decisions

## Scope

Decide the final branding/documentation rename scope after functional T1D/Bloom behavior is stable. This is a **decision gate**, not a code implementation task.

## Product Owner Decisions Required

### 1. Final Brand Name
- **Current:** `SparkyFitness`
- **Options:** `Bloom`, `Sato`, `SparkyBloom`, `T1D Companion`, or keep `SparkyFitness`
- **Impact:** Affects all user-facing strings, Swagger title, email templates, package names, repo references

### 2. Swagger/Docs Rename Scope
- **Current:** `'SparkyFitness API'` title in `sparky-bloom/server/config/swagger.ts`
- **Options:** Full rename, alias (dual-name), or versioned transition
- **Impact:** `sparky-bloom/server/config/swagger.ts`, Redoc/Swagger UI pages, API documentation

### 3. Email Subject/From Language
- **Current:** `'SparkyFitness Password Reset'` from `'noreply@sparkyfitness.com'`
- **Options:** Full rename to new brand, or keep current during transition
- **Impact:** Email templates, SMTP configuration, `sparky-bloom/server/services/emailService.ts`

### 4. DB Role Rename
- **Current:** `sparky_fitness` role in PostgreSQL
- **PRD User Story 39:** *"I want database role rename to be deferred until there is a dedicated migration plan."*
- **PRD lists as out of scope for initial wave**
- **Recommendation: DEFER** — requires dedicated migration plan, not a cosmetic rename

## Blocker Chain

Issue #81 is blocked by:
- `issues/002-sato-theme-api.md` (#59) — ✅ Complete
- `issues/003-t1d-profile-create-get.md` (#60) — ✅ Complete
- `issues/006-nightscout-import-idempotent.md` (#63) — ✅ Complete
- `issues/017-bloom-window-api.md` (#74) — 🔄 In progress
- `issues/023-env-cookie-compat-implementation.md` (#80) — ✅ Complete

## Acceptance Criteria (Decision Gate)

- [ ] Final brand name is confirmed by product owner
- [ ] Swagger/docs rename scope is confirmed
- [ ] Email subject/from language is confirmed
- [ ] DB role rename is either scoped or deferred
- [ ] Cosmetic rename is explicitly separated from functional T1D/Bloom behavior
- [ ] Implementation issue is unblocked only after all decisions are made

## TDD Guardrail #82 Note

TDD guardrail #82 does **not** apply to this issue because it is a **decision gate**, not a code implementation task. Once decisions are confirmed and an implementation issue is created, TDD guardrail #82 **must** be enforced for that implementation work.

## What Was NOT Done (by design)

No code changes were made. This issue requires product owner decisions before any implementation can proceed. The following files would be affected once decisions are confirmed:

- `sparky-bloom/server/config/swagger.ts` — API title
- `sparky-bloom/server/services/emailService.ts` — email templates
- `sparky-bloom/package.json` — package name/description
- `sparky-bloom/server/SparkyFitnessServer.ts` — server name references
- Database migration files — if DB role rename is approved

## Recommended Next Step

Contact the product owner via `contact_supervisor` with `reason: "need_decision"` to confirm the four branding decisions listed above. Once confirmed, create a new implementation issue (`025-branding-rename-implementation.md`) with specific code changes scoped to the confirmed decisions.
