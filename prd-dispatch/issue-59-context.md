# Issue #59 / `issues/002-sato-theme-api.md` implementation context

## Scope read

- GitHub #59 is open and matches local `issues/002-sato-theme-api.md`: expose Sato skin theme through a public backend API; test one API call; include theme name, version, palette, pigments, surfaces, typography; document in Swagger; no DB mutation and no SparkyFitness rename (`issues/002-sato-theme-api.md:7-20`).
- Blocker is #58 / `issues/001-sato-shared-theme-contract.md`: shared Sato contract must exist outside mobile-only code, centralize palette, include pigment metadata, surfaces, typography, and be backend-importable without React Native Skia (`issues/001-sato-shared-theme-contract.md:7-20`).
- #82 / `issues/025-tdd-workflow-guardrails.md` applies: do not batch tests first; use one failing public-interface test, minimal implementation, then refactor only while green (`issues/025-tdd-workflow-guardrails.md:7-19`).
- PRD backs this exact ordering: shared Sato contract first, then public theme API; tests verify external behavior; Swagger documents new APIs; Sato theme API is the recommended first low-risk slice requiring no DB mutation (`issues/prd.md:15-26`, `issues/prd.md:90-98`, `issues/prd.md:100-116`, `issues/prd.md:152-166`).

## Important repo topology / likely target

There are two backend-ish areas:

1. Root Python `t1d-companion` app:
   - `pyproject.toml` has no FastAPI/OpenAPI dependency; runtime dependencies are pydantic/httpx/sqlalchemy/asyncpg/PyYAML and pytest only for dev (`pyproject.toml:7-21`).
   - README describes a text-first CLI simulator, not an HTTP server (`README.md:27-57`, `README.md:74-87`).
   - No active route/API/swagger files were found in root Python; only an archived FastAPI Garmin microservice exists under `sparky-bloom/prod/SparkyFitnessGarmin/`.
2. `sparky-bloom/` monorepo appears to be the SparkyFitness/Bloom server surface:
   - pnpm workspace includes `shared`, `mobile`, `server` (`sparky-bloom/pnpm-workspace.yaml:1-4`).
   - root package scripts include `server:typecheck`, `shared:typecheck`, `validate` (`sparky-bloom/package.json:6-14`).
   - server depends on `@workspace/shared`, Express, swagger-jsdoc, swagger-ui-express, redoc, zod, vitest, supertest (`sparky-bloom/server/package.json:23-59`, `sparky-bloom/server/package.json:76-80`).

Given the request explicitly asks for server route/API/Swagger patterns and #58 is a shared backend/mobile contract, the implementation target is most likely `sparky-bloom/shared` + `sparky-bloom/server`, not the root Python CLI. If the planner chooses root Python instead, first ask for approval because it requires creating a new API framework/server surface.

## Existing Sato/shared context

- Mobile/prototype Sato pigment keys and metadata already exist in `sato-bloom/src/features/bloom/pigmentSystem.ts`: 11 keys (`slowCarb`, `fastSugar`, `fatDelay`, `proteinSteady`, `movement`, `recovery`, `stress`, `sleepDebt`, `settling`, `baseline`, `unknown`) and fields `name`, `hex`, `meaning`, `opacityBias`, `spreadBias`, `granulationBias` (`sato-bloom/src/features/bloom/pigmentSystem.ts:12-34`, values at `:36-124`).
- Prototype palette exists in `sato-bloom/src/features/bloom/bloomColors.ts`: watercolor stains, vessel neutrals, ink/labels, paper colors, plus deprecated aliases (`sato-bloom/src/features/bloom/bloomColors.ts:1-40`).
- Mobile theme surfaces exist in `mobile/src/theme/theme.ts`: `surface`, `onSurface`, `surfaceContainerLowest/Low/.../Highest`, `outline`, etc. (`mobile/src/theme/theme.ts:3-30`).
- `sparky-bloom/shared` already exports pigments from `./pigments/index.ts` (`sparky-bloom/shared/src/index.ts:84-86`), and `sparky-bloom/shared/src/pigments/palette.ts` duplicates the canonical SATO pigment registry with comments saying both server and mobile source pigments from it (`sparky-bloom/shared/src/pigments/palette.ts:1-16`, values at `:17-105`). `PigmentDef` type has the required metadata fields (`sparky-bloom/shared/src/pigments/types.ts:22-30`).
- Current shared code has pigments/conditions but no discovered full `SATO_THEME` contract with `name`, `version`, `palette`, `surfaces`, and `typography`; that is #58’s job.

## Existing server/API/Swagger patterns

- Main Express app is `sparky-bloom/server/SparkyFitnessServer.ts`; it imports route modules, creates `const app = express()`, disables ETags, uses global JSON parsing and auth middleware, then mounts routes (`sparky-bloom/server/SparkyFitnessServer.ts:1-12`, `:83-87`, `:107-111`, `:368-383`, `:388-447`).
- Public route allow-list currently includes `/api/auth/settings`, `/api/auth/mfa-factors`, `/api/health`, `/api/version`, `/api/uploads`, `/uploads`, `/api/ping`; anything else passes through `authenticate` (`sparky-bloom/server/SparkyFitnessServer.ts:352-383`). If the theme endpoint is intended to be unauthenticated, add its `/api/...` prefix here.
- Swagger docs are served at `/api/api-docs/swagger`, JSON at `/api/api-docs/json`, and Redoc at `/api/api-docs/redoc` (`sparky-bloom/server/SparkyFitnessServer.ts:448-460`). API docs themselves are public only when `SPARKY_FITNESS_PUBLIC_API_DOCS=true` (`sparky-bloom/server/SparkyFitnessServer.ts:352-366`).
- Swagger generator scans only `server/routes/**/*.ts`, `server/models/**/*.ts`, and `SparkyFitnessServer.ts` (plus JS builds), not `server/integrations/**` (`sparky-bloom/server/config/swagger.ts:6-14`). Put a new theme route under `sparky-bloom/server/routes/` unless you also update scan paths.
- Existing JSDoc route docs use paths without `/api` because `servers: [{ url: '/api' }]` supplies that prefix (`sparky-bloom/server/config/swagger.ts:28-32`). Example: mounted `/api/version` route documents `/version/current` (`sparky-bloom/server/routes/versionRoutes.ts:4-23`); mounted `/api/health` route documents `/health` (`sparky-bloom/server/routes/healthRoutes.ts:4-26`).
- `swagger.test.ts` checks generated spec shape, valid `$ref`s, and that every JSDoc `@swagger` path is prefixed by the Express mount path after stripping `/api` (`sparky-bloom/server/tests/swagger.test.ts:140-235`). This will fail if, for example, a route mounted at `/api/theme` documents `/api/theme/sato` instead of `/theme/sato`.
- Existing route tests typically build a small Express app, mount the route, use `supertest`, and mock dependencies as needed (`sparky-bloom/server/tests/globalSettingsRoutes.test.ts:1-22`, `sparky-bloom/server/tests/foodRoutesV2.test.ts:1-68`).
- Existing T1D routes use `req.userId` and zod validation for DB-backed routes under `/api/health-data/t1d/...`, but #59 should not need DB/user context (`sparky-bloom/server/integrations/healthData/healthDataRoutes.ts:1-12`; `sparky-bloom/server/integrations/healthData/t1dRoutes.ts:15-37`, `:51-77`, `:79-110`).

## Dependency on #58

Do not implement #59 by copying colors/pigments into the route. #59 should wait until #58 provides a shared, server-importable theme export, likely from `@workspace/shared` (for example `SATO_THEME`, exact name/path TBD by #58). #59’s implementation should be a thin API layer that imports that contract and returns it unchanged/deterministically.

If #58 lands as a different shape, adjust tests to the #58 public contract, but #59 acceptance still requires the response to include:

- theme name (`Sato`) and version
- palette
- pigment metadata with all required fields
- surfaces
- typography metadata

## Likely files for #59

After #58 lands:

- `sparky-bloom/server/routes/satoThemeRoutes.ts` (new): Express router, `GET /sato`, imports shared theme, returns JSON; include `@swagger` JSDoc for `/theme/sato` (or final mounted path).
- `sparky-bloom/server/SparkyFitnessServer.ts`: import and mount route, likely `app.use('/api/theme', satoThemeRoutes)`; if unauthenticated/public, add `/api/theme` to `publicRoutes`.
- `sparky-bloom/server/tests/satoThemeRoutes.test.ts` (new): supertest API behavior test.
- `sparky-bloom/server/tests/swagger.test.ts`: should pass unchanged if JSDoc path aligns; add direct assertion for path only if desired, but preserve one-public-behavior TDD discipline.
- Possibly `sparky-bloom/server/config/swagger.ts`: only if adding a global `Sato/Bloom` tag or schemas; inline schema in route JSDoc avoids touching the huge config.
- #58-owned files likely include `sparky-bloom/shared/src/theme/...` and `sparky-bloom/shared/src/index.ts`; #59 should consume them, not redesign them.

## Public API behavior to test after #58 lands

Preferred endpoint shape, unless #58/planner decides otherwise:

- `GET /api/theme/sato`
- no request body
- no database access/mutation
- likely unauthenticated (because issue says public backend API and clients need theme tokens before rendering); if kept authenticated, call out that product decision explicitly.
- `200 application/json`
- response deep-equals or at least structurally mirrors the shared theme export.
- response includes:
  - `name` equal to `Sato` (or exact #58 contract value)
  - `version` present and stable
  - `palette` object with Sato palette tokens
  - `pigments` object containing the 11 canonical keys and each value has `name`, `hex`, `meaning`, `opacityBias`, `spreadBias`, `granulationBias`
  - `surfaces` object
  - `typography` object/metadata
- determinism: two GETs should return the same JSON (or one test can compare to imported `SATO_THEME`).
- Swagger: generated OpenAPI has `/theme/sato` path (with server URL `/api`) and a documented `200` JSON response.

## Validation commands

From repo root:

```bash
cd sparky-bloom && pnpm --filter @workspace/shared typecheck
cd sparky-bloom && pnpm --filter sparky-bloom-server test -- satoThemeRoutes.test.ts
cd sparky-bloom && pnpm --filter sparky-bloom-server test -- swagger.test.ts
cd sparky-bloom && pnpm --filter sparky-bloom-server typecheck
```

Optional broader check if the slice touches shared exports used by mobile/server:

```bash
cd sparky-bloom && pnpm validate
```

Root Python `pytest -q` is only relevant if the implementation intentionally targets the root Python app, which currently has no HTTP/Swagger surface.

## Risks / implementation notes

- #58 is a hard blocker. Implementing #59 first would either duplicate theme data or invent a contract.
- Swagger path mismatch is easy: document `/theme/sato`, not `/api/theme/sato`, when mounting at `/api/theme`.
- Swagger scan paths miss `server/integrations/**`; keep the route in `server/routes/`.
- If the endpoint is meant to be public/unauthenticated, it must be added to `publicRoutes`; otherwise global auth middleware will protect it.
- Avoid importing anything from React Native/mobile/Skia in server. Use `@workspace/shared` only.
- Do not add DB/repository calls; acceptance explicitly says no mutation, and a static theme endpoint should not require `req.userId`.
- Do not rename SparkyFitness branding/config as part of this slice.
- Preserve #82: one public API test first, minimal route/mount/doc work to pass, refactor only when green.

## Implementation-ready meta-prompt for next agent

Goal: Implement GitHub #59 after #58 has landed by exposing the shared Sato theme contract through a documented public backend endpoint.

Context/evidence:
- #59 requires a deterministic theme API response with name, version, palette, pigments, surfaces, typography, Swagger docs, tests, no DB mutation, no Sparky rename (`issues/002-sato-theme-api.md:7-20`).
- #58 must first provide the shared backend/mobile theme contract outside mobile-only code (`issues/001-sato-shared-theme-contract.md:7-20`). Use that export; do not duplicate tokens.
- The likely server target is `sparky-bloom/server` Express, not root Python, because root Python has no API/Swagger dependencies while `sparky-bloom/server` has Express, swagger-jsdoc, supertest, and imports `@workspace/shared`.
- Route docs should follow existing Express/JSDoc patterns: mounted `/api/version` documents `/version/current`; Swagger `servers.url` is `/api`; path alignment is enforced by `server/tests/swagger.test.ts`.

Success criteria:
- `GET /api/theme/sato` (or a clearly chosen equivalent) returns the #58 shared theme contract as JSON and is deterministic.
- Response includes name/version/palette/pigments/surfaces/typography; pigment definitions expose `name`, `hex`, `meaning`, `opacityBias`, `spreadBias`, `granulationBias`.
- Endpoint requires no DB and performs no mutation.
- Endpoint is documented in Swagger and `swagger.test.ts` passes.
- A public-interface route test fails first, then passes.
- No SparkyFitness branding/config rename.

Hard constraints:
- Preserve #82 TDD guardrail: one failing public-interface API test, minimal implementation, refactor only while green.
- Do not import mobile-only/React Native Skia code into server.
- Do not invent/copy the theme contract if #58 has not landed; stop and report blocker.
- Do not create DB migrations or mutate persistence for this endpoint.

Suggested approach:
1. Verify #58 export name/path and run its tests/typecheck.
2. Add `satoThemeRoutes.test.ts` using Express + supertest. Mount the new router at `/theme` and assert `GET /theme/sato` returns the shared theme structure.
3. Implement `server/routes/satoThemeRoutes.ts` as a thin router importing the shared theme and returning it from `GET /sato`; add `@swagger` JSDoc for `/theme/sato` with a 200 JSON schema.
4. Mount in `SparkyFitnessServer.ts` at `/api/theme`; add `/api/theme` to `publicRoutes` if unauthenticated/public behavior is intended.
5. Run targeted tests/typecheck; fix only issues needed for this slice.

Validation:
- `cd sparky-bloom && pnpm --filter sparky-bloom-server test -- satoThemeRoutes.test.ts`
- `cd sparky-bloom && pnpm --filter sparky-bloom-server test -- swagger.test.ts`
- `cd sparky-bloom && pnpm --filter sparky-bloom-server typecheck`
- `cd sparky-bloom && pnpm --filter @workspace/shared typecheck`

Stop/escalation rules:
- Stop if #58 did not land or does not expose a backend-importable theme object.
- Ask for a product/API decision if endpoint path or unauthenticated/public access is disputed. Preferred default: `GET /api/theme/sato`, public/unauthenticated.
- Stop after the #59 vertical slice is green; do not broaden into T1D/Bloom endpoints or branding rename.

Resolved assumptions:
- #59 belongs in `sparky-bloom/server` because that is the active Express/Swagger server in this repo tree.
- The route should return the exact shared theme contract from #58, not a transformed copy, unless #58 exposes a non-serializable object.
- Public API means clients can fetch theme tokens without DB/user state; authentication only if explicitly required by maintainer decision.
