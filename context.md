# Implementation Context: Issue #74 - Bloom Window Public API

## Issue Overview
Expose Bloom windows through a public API so clients can render Sato-compatible metabolic patterns.

**Blocked by:** `issues/016-bloom-window-cgm-import-integration.md`

**Acceptance criteria:**
- [ ] Bloom window API supports a date range.
- [ ] API returns Sato-compatible window objects.
- [ ] API enforces profile ownership.
- [ ] Swagger documents the endpoint.
- [ ] Tests verify public API behavior.

**User stories addressed:**
- User story 20 (Bloom windows from food/exercise/sleep/CGM)
- User story 21 (Bloom windows include glucose averages, peaks, rate of change)
- User story 22 (Bloom windows include pigment keys)
- User story 23 (Low-data windows marked low confidence)
- User story 24 (Bloom windows deterministic for same input)
- User story 27 (Bloom API response matches Sato Bloom renderer)
- User story 28 (Bloom API endpoint is public)

**TDD tracer bullet:** Write one API test showing an authenticated user can request Bloom windows for a date range and receives Sato-compatible windows.

## Public API Endpoint Shape

### Current Implementation (Issue #72-#73)
- **Route:** `GET /health-data/t1d/bloom-windows` in `server/integrations/healthData/t1dRoutes.ts`
- **Module:**
  ```typescript
  router.get('/t1d/bloom-windows', async (req, res, next) => {
    const { startDate, endDate, startHour, endHour } = req.query;
    // Validation: startDate and endDate are required query params
    // startHour defaults to 6 if not provided
    // endHour defaults to 22 if not provided
    // Validates hour range: startHour (0-23), endHour (1-24), startHour < endHour
    // Fetches CGM entries for authenticated user's profile
    // Calls computeBloomWindowsFromCGM() with profileId, startHour, endHour, entries
    // Returns profileId, windows, summary with totalEntries, glucoseAvg, glucosePeak
  });
  ```

### Public API Contract (OpenAPI/Swagger)
- **Path:** `/health-data/t1d/bloom-windows`
- **Method:** `GET`
- **Tags:** `[T1D]`
- **Security:** `cookieAuth: []`
- **Parameters:**
  - `startDate` (query, string, required) - ISO 8601 date-time
  - `endDate` (query, string, required) - ISO 8601 date-time
  - `startHour` (query, number, optional, default: 6) - 0-23
  - `endHour` (query, number, optional, default: 22) - 1-24
- **Response 200:**
  - **Body shape:**
    ```typescript
    {
      profileId: string;
      windows: BloomWindow[];
      summary: {
        totalEntries: number;
        glucoseAvg: number | null;
        glucosePeak: number | null;
      };
    }
    ```
  - **Swagger schema includes:**
    - `#/components/schemas/BloomWindow` (from shared `@workspace/shared/src/pigments/types.ts`)
    - `profileId` (UUID)
    - `windows` (array of `BloomWindow`)
    - `summary` (object with `totalEntries`, `glucoseAvg`, `glucosePeak`)

**Note:** The endpoint already exists and is functionally implemented. This issue is about writing the TDD tracer bullet test and potentially exposing a route in a clearer location or documenting it as a public API endpoint.

## Bloom Window Object Shape (Sato-Compatible)

From `shared/src/pigments/types.ts`:
```typescript
export interface BloomWindow {
  id: string;
  startHour: number;
  endHour: number;
  label: string;
  value: number; // 0..1 normalized glucose
  confidence: number; // 0..1
  variability: number;
  intensity: number;
  state: "balanced" | "reactive" | "calm";
  pigmentKey: "slowCarb" | "fastSugar" | "fatDelay" | "proteinSteady" | "movement" | "recovery" | "stress" | "sleepDebt" | "settling" | "baseline" | "unknown";
  glucoseAvg?: number; // mg/dL
  glucosePeak?: number; // mg/dL
  rateOfChange?: string; // e.g., "FLAT", "UP", "rising (fast)"
  dataCompleteness?: number;
  eventContext?: string;
  classificationReason?: string;
  note?: string;
}
```

## Bloom Window Computation Services

### 1. CGM-Driven (Issue #73)
- **File:** `server/services/bloomWindowCgmService.ts`
- **Function:** `computeBloomWindowsFromCGM(input: CgmBloomWindowInput): CgmBloomWindowResult`
- **Deterministic:** Yes, same CGM entries always produce the same windows.
- **Pure computation:** No DB, no HTTP, no side effects.
- **Inputs:**
  ```typescript
  interface CgmBloomWindowInput {
    profileId: string;
    startHour: number;
    endHour: number;
    entries: T1DCGMEntry[]; // from t1dCgmEntryRepository
  }
  ```
- **Outputs:**
  ```typescript
  interface CgmBloomWindowResult {
    profileId: string;
    windows: BloomWindow[];
  }
  ```
- **Logic:**
  - Sorts entries by `measuredAt` for deterministic processing
  - Uses date from first entry as base for hour extraction
  - Splits range into 2-hour windows (configurable)
  - For each window:
    - Computes glucose stats (avg, peak, min, count)
    - Computes rate of change string
    - Calculates data completeness
    - Derives variability (peak - min) / avg
    - Derives BloomState (balanced, reactive, calm)
    - Derives MetabolicPigmentKey from glucose and rate of change
    - Calculates confidence (dataCompleteness * 0.7 + overallDensity * 0.2 + 0.1)
    - Calculates intensity (glucose distance from ideal 70-140)
  - Always includes all required `BloomWindow` fields
  - Low-data windows get low confidence and `glucoseAvg/glucosePeak` are `null`
  - Event context string format: `cgm:N` or `no-data`

### 2. Fixture-Driven (Issue #72)
- **File:** `server/services/bloomWindowFixtureService.ts`
- **Function:** `computeBloomWindowsFromFixture(input: BloomWindowFixtureInput): BloomWindowFixtureResult`
- **Deterministic:** Yes, same fixture input always produces the same windows.
- **Pure computation:** No DB, no HTTP, no side effects.
- **Inputs:**
  ```typescript
  interface BloomWindowFixtureInput {
    profileId: string;
    startHour: number;
    endHour: number;
    readings: CgmReadingFixture[];
  }
  ```
- **Readings structure:**
  ```typescript
  interface CgmReadingFixture {
    hour: number;
    glucoseMgDl: number;
    eventType: 'fasting' | 'meal' | 'peak' | 'exercise' | 'rest' | 'sleep';
    eventLabel?: string;
  }
  ```
- **Outputs:**
  ```typescript
  interface BloomWindowFixtureResult {
    profileId: string;
    windowCount: number;
    windows: ComputedBloomWindow[];
  }
  ```
- **Logic:**
  - Sorts readings by hour
  - Splits range into 2-hour windows at event boundaries
  - Computes glucose stats (avg, peak, min)
  - Derives pigment key from dominant event type (exercise → movement, meal → fastSugar/slowCarb based on avg glucose, sleep → sleepDebt, etc.)
  - Computes variability from peak - min / avg
  - Derives BloomState
  - Calculates confidence from reading density and coverage
  - Calculates intensity from glucose deviation from 70-140
  - Always includes all required `BloomWindow` fields

## T1D CGM Entry Repository

- **File:** `server/models/t1dCgmEntryRepository.ts`
- **Interface:**
  ```typescript
  export interface T1DCGMEntry {
    id: string;
    t1d_profile_id: string;
    source: string;
    sourceEntryId?: string | null;
    measuredAt: Date;
    valueMgDl: number;
    valueMmolL: number;
    units?: 'mg/dL' | 'mmol/L';
    trend?: number | null;
    direction?: string | null;
    device?: string | null;
    rawJson?: Record<string, unknown> | null;
    created_at: Date;
    updated_at: Date;
  }

  export interface T1DCGMEntryInput {
    source: string;
    sourceEntryId?: string | null;
    measuredAt: Date;
    valueMgDl: number;
    valueMmolL: number;
    units?: 'mg/dL' | 'mmol/L';
    trend?: number | null;
    direction?: string | null;
    device?: string | null;
    rawJson?: Record<string, unknown> | null;
  }
  ```
- **Key functions:**
  - `getCgmEntriesByDateRange(profileId: string, userId: string, startDate: string, endDate: string): Promise<T1DCGMEntry[]>` - Returns CGM entries for a profile, scoped to userId (RLS)

## Authentication & Profile Ownership

### Auth Middleware
- **File:** `server/middleware/authMiddleware.ts`
- **Function:** `authenticate(req, res, next)`
- **Mechanisms:**
  1. **Better Auth session:** Reads from session cookie or Authorization Bearer token (mapped to session cookie)
  2. **API key:** Supports x-api-key header (with cache to avoid per-request rate-limit ticks)
- **Identity context:**
  - `req.authenticatedUserId`: Actual logged-in user (from Better Auth)
  - `req.userId`: Active context user (defaults to `req.authenticatedUserId`, but can be overridden via `sparky_active_user_id` or `bloom_active_user_id` cookie for family access)
  - `req.user`: Full user object (includes role)
- **Profile ownership enforced at repository level:**
  - `t1dProfileRepository.getOrCreateProfileForSparkyUser(req.userId, req.userId, ...)` - Uses `req.userId` as both `sparky_user_id` and `subject_type` (`sparky_user` or `simulated` or `legend`)
  - `t1dCgmEntryRepository.getCgmEntriesByDateRange(profileId, req.userId, ...)` - Queries with `userId` in WHERE clause, relying on RLS to ensure user owns the profile

### T1D Profile Repository
- **File:** `server/models/t1dProfileRepository.ts` (not read yet, but pattern used)
- **Pattern:**
  ```typescript
  router.get('/', authenticate, async (req, res, next) => {
    const profiles = await t1dProfileRepository.getProfilesForSparkyUser(req.userId);
    res.status(200).json(profiles);
  });
  ```
- **Profile ownership:**
  - `getOrCreateProfileForSparkyUser(sparkyUserId, actingUserId, options)` - Uses `actingUserId` for RLS context
  - `getProfileById(id, userId)` - Returns profile if `t1d_profile_id = $1` AND RLS allows `userId` to access it

## Validation Commands & Schemas

### Nightscout CGM Import Schema (Relevant for Bloom data)
- **File:** `server/schemas/t1dNightscoutSchema.ts`
- **Key schemas:**
  ```typescript
  export const NightscoutCgmEntrySchema = z.object({
    _id: z.string().optional(),
    sgv: z.union([z.number(), z.string()]),
    date: z.union([z.number(), z.string()]).optional(),
    dateString: z.string().optional(),
    direction: z.string().optional(),
    trend: z.union([z.number(), z.string()]).optional(),
    type: z.string().optional(),
    device: z.string().optional(),
  }).passthrough()
    .refine(entry => entry.date !== undefined || entry.dateString !== undefined, { message: 'Entry must have either date or dateString.' })
    .refine(entry => entry.sgv !== undefined && (typeof entry.sgv === 'string' ? parseFloat(entry.sgv) > 0 : entry.sgv > 0), { message: 'Entry sgv must be a positive number.' });

  export const NightscoutImportRequestSchema = z.object({
    baseUrl: z.string().url().min(1),
    days: z.number().int().min(1).max(365).default(90),
    skip: z.number().int().min(0).optional(),
    count: z.number().int().min(1).optional(),
    entries: z.array(NightscoutCgmEntrySchema).min(1),
  });
  ```
- **Usage in routes:** `t1dRoutes.ts` validates `ImportNightscoutCgmBodySchema` and `NightscoutImportRequestSchema` for import endpoints
- **Pattern for new validation:** Use `zod/v4` schemas with `.safeParse(req.body)` and return 400 with details if validation fails

### Current Route Validation Pattern (from `/health-data/t1d/bloom-windows`)
- **File:** `server/integrations/healthData/t1dRoutes.ts`
- **Validation:**
  ```typescript
  const { startDate, endDate, startHour, endHour } = req.query;
  if (typeof startDate !== 'string' || typeof endDate !== 'string') {
    return res.status(400).json({
      error: 'Missing required query parameters: startDate and endDate.',
    });
  }
  const startHourNum = typeof startHour === 'string' ? parseInt(startHour, 10) : 6;
  const endHourNum = typeof endHour === 'string' ? parseInt(endHour, 10) : 22;
  if (
    isNaN(startHourNum) ||
    isNaN(endHourNum) ||
    startHourNum < 0 ||
    startHourNum > 23 ||
    endHourNum < 1 ||
    endHourNum > 24 ||
    startHourNum >= endHourNum
  ) {
    return res.status(400).json({
      error: 'Invalid hour range: startHour (0-23) and endHour (1-24) required, startHour < endHour.',
    });
  }
  ```

### Swagger Documentation Pattern (Sato Theme Route)
- **File:** `server/routes/satoThemeRoutes.ts`
- **Pattern:**
  ```typescript
  /**
   * @swagger
   * /theme/sato:
   *   get:
   *     summary: Get the Sato skin theme contract
   *     tags: [Theme]
   *     responses:
   *       200:
   *         description: The Sato skin theme contract including palette, pigments, surfaces, and typography.
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 name:
   *                   type: string
   *                   example: Sato
   *                 version:
   *                   type: string
   *                 palette:
   *                   type: object
   *                 pigments:
   *                   type: object
   *                 surfaces:
   *                   type: object
   *                 typography:
   *                   type: object
   */
  router.get('/sato', (_req, res) => {
    res.json(SATO_THEME);
  });
  ```
- **Swagger configuration:** Uses `express-openapi` or similar library (path should be verified)
- **Tags:** Use meaningful tags like `[T1D]`, `[Theme]`, `[Profile]`, `[CGM]`

## Existing Tests (Patterns)

### T1D Routes Integration Tests
- **File:** `server/tests/t1dBloomWindowsRoutes.test.ts`
- **Pattern:**
  ```typescript
  // 1. Mock dependencies
  vi.mock('../models/t1dProfileRepository.js', () => ({
    default: {
      getOrCreateProfileForSparkyUser: vi.fn().mockResolvedValue({
        id: 'profile-123',
        sparky_user_id: 'test-user-id',
        subject_type: 'real',
      }),
    },
  }));

  vi.mock('../models/t1dCgmEntryRepository.js', () => ({
    default: {
      getCgmEntriesByDateRange: vi.fn().mockResolvedValue([...mockEntries]),
    },
  }));

  vi.mock('../services/bloomWindowCgmService.js', () => ({
    computeBloomWindowsFromCGM: vi.fn().mockReturnValue({
      profileId: 'profile-123',
      windows: [...mockWindows],
    }),
  }));

  // 2. Create Express app with route
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.userId = 'test-user-id';
    next();
  });
  app.use('/health-data', t1dRoutes);

  // 3. Write tests
  it('returns Sato-compatible Bloom windows for a date range with CGM-derived data', async () => {
    const res = await request(app)
      .get('/health-data/t1d/bloom-windows')
      .query({
        startDate: '2026-06-12T00:00:00.000Z',
        endDate: '2026-06-12T23:59:59.000Z',
        startHour: 6,
        endHour: 12,
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('profileId', 'profile-123');
    expect(res.body).toHaveProperty('windows');
    expect(Array.isArray(res.body.windows)).toBe(true);
    expect(res.body.windows.length).toBeGreaterThan(0);

    // Verify each window matches BloomWindow shape
    for (const window of res.body.windows) {
      expect(window).toHaveProperty('id');
      expect(window).toHaveProperty('startHour');
      expect(window).toHaveProperty('endHour');
      expect(window).toHaveProperty('label');
      expect(window).toHaveProperty('value');
      expect(window).toHaveProperty('confidence');
      expect(window).toHaveProperty('state');
      expect(window).toHaveProperty('pigmentKey');
      // CGM-specific fields
      expect(window).toHaveProperty('glucoseAvg');
      expect(window).toHaveProperty('glucosePeak');
      expect(window).toHaveProperty('rateOfChange');
      expect(window).toHaveProperty('dataCompleteness');
    }
  });
  ```

### Service Tests
- **File:** `server/tests/bloomWindowCgmService.test.ts`
- **Pattern:** Tests computeBloomWindowsFromCGM() directly with plain fixtures, without HTTP layer
- **Behavior verified:**
  - Computes windows with glucose stats from CGM entries
  - Every window has required BloomWindow fields
  - At least one window has `glucoseAvg/glucosePeak` from CGM data
  - Glucose stats are within input range
  - Rate of change is valid string
  - Data completeness reflects input density
  - Sparse data yields low confidence
  - Deterministic: same input → same output

### Nightscout Import Validation Tests
- **File:** `server/tests/t1dNightscoutImportValidation.test.ts`
- **Pattern:** Uses `NightscoutImportRequestSchema.safeParse(req.body)` to validate at API level, returns 400 with details if invalid
- **Behavior verified:**
  - Valid requests pass schema
  - Invalid requests return 400 with clear error details (using `parsed.error.flatten()`)
  - Missing required fields are caught
  - Invalid field values are caught

### TDD Guardrail Compliance (Issue #25)
- **TDD workflow for new features:**
  1. Choose one public behavior (e.g., "authenticated user can request Bloom windows for a date range")
  2. Write one failing public-interface test
  3. Implement the minimum code needed to pass
  4. Refactor only after the test passes
- **Review rule:** Tests should verify external behavior through APIs and services, not internal implementation details

## Dependencies & Imports

### Server Dependencies
- `express`: Routing and middleware
- `@workspace/shared`: Shared types (BloomWindow, MetabolicPigmentKey, BloomState) - NO CHANGE NEEDED
- `zod/v4`: Schema validation
- `better-auth`: Authentication (via `auth` module)
- `better-call`: Cookie serialization
- `vitest`: Testing framework

### Key Imports in Existing Route
```typescript
import express from 'express';
import t1dProfileRepository from '../../models/t1dProfileRepository.js';
import t1dCgmEntryRepository from '../../models/t1dCgmEntryRepository.js';
import t1dProfileRoutes from '../../routes/t1dProfileRoutes.js';
import t1dForecastEnvelopeRoutes from '../../routes/t1dForecastEnvelopeRoutes.js';
import { ImportNightscoutCgmBodySchema, NightscoutImportRequestSchema, T1DVectorSearchBodySchema } from '../../schemas/t1dNightscoutSchema.js';
import t1dNightscoutImportService from '../../services/t1dNightscoutImportService.js';
import { embedT1DText } from '../../services/t1dEmbeddingService.js';
import { computeBloomWindowsFromCGM } from '../../services/bloomWindowCgmService.js';
```

### Shared Types (Required for BloomWindow)
From `@workspace/shared/src/pigments/types.ts`:
- `export type MetabolicPigmentKey = "slowCarb" | "fastSugar" | "fatDelay" | "proteinSteady" | "movement" | "recovery" | "stress" | "sleepDebt" | "settling" | "baseline" | "unknown"`
- `export type BloomState = "balanced" | "reactive" | "calm"`
- `export interface BloomWindow { ... }`
- `export interface PigmentDef { ... }` (used for Sato theme API)
- `export type BloomCondition = "calm" | "clear" | "foggy" | "reactive" | "heavy" | "restored" | "charged"`

**Important:** The `BloomWindow` interface is ALREADY defined in `shared/src/pigments/types.ts`. The route returns this exact interface. No new shared types are needed for this issue.

## Mobile App Data Shape (Reference)

From `sato-bloom/src/features/bloom/bloomSampleData.ts`:
- **File:** `sato-bloom/src/features/bloom/bloomTypes.ts`
- **Local type definition:**
  ```typescript
  export type BloomWindow = {
    id: string;
    startHour: number;
    endHour: number;
    label: string;
    value: number;
    confidence: number;
    variability: number;
    intensity: number;
    state: "balanced" | "reactive" | "calm";
    pigmentKey: MetabolicPigmentKey; // Import from pigmentSystem.ts
    glucoseAvg?: number;
    glucosePeak?: number;
    rateOfChange?: string;
    dataCompleteness?: number;
    eventContext?: string;
    classificationReason?: string;
    note?: string;
  };
  ```
- **Mobile expects:** Same shape as shared `BloomWindow`, but `pigmentKey` is optional in mobile local type (should be REQUIRED per shared contract)
- **Sample data:** `todayBloomWindows` array uses all required fields including `pigmentKey`, `state`, `glucoseAvg`, etc.

## Authentication Decision

### Current Auth: Authenticated Only
- **Pattern:** All T1D routes use `authenticate` middleware
- **Behavior:** Returns 401 with `error: 'Authentication required.'` if no valid identity found
- **Decision:** Keep authentication on Bloom window endpoint for privacy and security:
  - Bloom windows contain sensitive glucose data
  - API must enforce profile ownership via RLS
  - Only authenticated users can access CGM data

### Profile Ownership Decision
- **Pattern:** Use `t1dProfileRepository.getOrCreateProfileForSparkyUser(req.userId, req.userId, options)` with `actingUserId = req.userId`
- **Decision:** Keep existing pattern:
  - `sparky_user_id` = `req.userId` (authenticated user)
  - `subject_type` = `sparky_user` or `simulated` or `legend` depending on options
  - CGM entries are scoped to profile, and repository queries use `userId` in WHERE clause, relying on RLS

## Key Constraints & Risks

### Constraints
1. **Deterministic:** Bloom window computation must be deterministic for the same input data (PRD requirement)
2. **Data completeness:** Low-data windows must receive low confidence (PRD requirement)
3. **Profile ownership:** API must enforce that the authenticated user owns the profile and CGM entries
4. **TDD guardrail:** Implement one public behavior, one failing test, one minimal implementation, then refactor (PRD requirement)
5. **No cosmetic rename:** Backend should not rename routes/schemas until behavior is stable

### Risks
1. **Profile ownership bug:** If `req.userId` is not set correctly or RLS policies are misconfigured, users could access other users' Bloom windows
2. **Input validation:** Missing or invalid query parameters could lead to crashes or unexpected behavior
3. **Date range handling:** Invalid date ranges could cause unexpected behavior (e.g., startHour >= endHour)
4. **CGM data sparsity:** Windows with no CGM data should still return valid `BloomWindow` objects with low confidence

## Validation Commands

### Local validation commands (to run on CI/CD or before commit):
1. **Type check:**
   ```bash
   cd /root/tld-v2/sparky-bloom && pnpm server:typecheck
   ```

2. **Run Bloom window route tests:**
   ```bash
   cd /root/tld-v2/sparky-bloom && pnpm test server/tests/t1dBloomWindowsRoutes.test.ts
   ```

3. **Run Bloom window service tests:**
   ```bash
   cd /root/tld-v2/sparky-bloom && pnpm test server/tests/bloomWindowCgmService.test.ts
   ```

4. **Run Bloom window fixture tests:**
   ```bash
   cd /root/tld-v2/sparky-bloom && pnpm test server/tests/bloomWindowFixtureService.test.ts
   ```

5. **Run all T1D-related tests:**
   ```bash
   cd /root/tld-v2/sparky-bloom && pnpm test -t T1D
   ```

6. **Run specific issue tests:**
   ```bash
   cd /root/tld-v2/sparky-bloom && pnpm test -t "Issue #74"
   ```

### Validation checks to verify before completion:
1. **Public API test exists:**
   - One integration test showing an authenticated user can request Bloom windows for a date range
   - Returns Sato-compatible window objects

2. **Swagger documentation:**
   - Endpoint `GET /health-data/t1d/bloom-windows` has Swagger comment with summary, tags, parameters, responses
   - Response 200 schema references `#/components/schemas/BloomWindow`

3. **Profile ownership enforced:**
   - Test verifies `t1dProfileRepository.getOrCreateProfileForSparkyUser` and `t1dCgmEntryRepository.getCgmEntriesByDateRange` are called with correct userId
   - Route does not return data for another user's profile

4. **Date range validation:**
   - Missing `startDate` or `endDate` returns 400
   - Invalid `startHour`/`endHour` returns 400 with clear error message

5. **BloomWindow shape matches Sato:**
   - Every returned window includes all required fields: `id`, `startHour`, `endHour`, `label`, `value`, `confidence`, `variability`, `intensity`, `state`, `pigmentKey`
   - CGM-specific fields: `glucoseAvg`, `glucosePeak`, `rateOfChange`, `dataCompleteness`, `eventContext`, `classificationReason`

6. **Deterministic computation:**
   - Service tests verify same input → same output
   - Route tests do not depend on random data

7. **Low-confidence windows:**
   - Test verifies sparse CGM data yields windows with confidence < 0.5
   - Windows with no data have `eventContext: 'no-data'`

## Next Steps for Implementation

### Immediate (next agent's responsibility):
1. **Add Swagger documentation to `/health-data/t1d/bloom-windows`:**
   - Add JSDoc comment with `@swagger` tags
   - Document parameters: `startDate`, `endDate`, `startHour`, `endHour`
   - Document response 200 schema including `#/components/schemas/BloomWindow`

2. **Write TDD tracer bullet test:**
   - Create or update `server/tests/t1dBloomWindowsRoutes.test.ts` with one test showing:
     - Authenticated user requests Bloom windows for a date range
     - Response contains Sato-compatible window objects
     - Profile ownership is enforced

3. **Verify existing tests still pass:**
   - Run all Bloom window tests
   - Fix any regressions

### Optional (future issues):
1. **Expose route at clearer location:**
   - Consider creating `/api/bloom/windows` route that mounts `/health-data/t1d/bloom-windows`
   - Or document `/health-data/t1d/bloom-windows` as the canonical public API endpoint

2. **Add OpenAPI spec file:**
   - Extract Swagger comments into a standalone `openapi.yaml` or `swagger.yaml`
   - Generate API documentation via OpenAPI tools

3. **Add unit tests for service computation logic:**
   - Existing service tests already cover computation logic
   - May add more edge-case tests (e.g., all-zero entries, very high variability)

## Files Modified (Planned, Not to Edit in This Step)

No files should be modified in this requirements-to-context phase. The next agent will implement the TDD tracer bullet test and Swagger documentation.

---

**Context gathered from:**
- `/root/tld-v2/issues/017-bloom-window-api.md`
- `/root/tld-v2/issues/prd.md`
- `/root/tld-v2/issues/025-tdd-workflow-guardrails.md`
- `/root/tld-v2/sparky-bloom/server/routes/satoThemeRoutes.ts`
- `/root/tld-v2/sparky-bloom/server/services/bloomWindowCgmService.ts`
- `/root/tld-v2/sparky-bloom/server/services/bloomWindowFixtureService.ts`
- `/root/tld-v2/sparky-bloom/server/tests/bloomWindowCgmService.test.ts`
- `/root/tld-v2/sparky-bloom/server/tests/bloomWindowFixtureService.test.ts`
- `/root/tld-v2/sparky-bloom/server/tests/t1dBloomWindowsRoutes.test.ts`
- `/root/tld-v2/sparky-bloom/server/tests/t1dCgmSummaryRoutes.test.ts`
- `/root/tld-v2/sparky-bloom/server/tests/t1dNightscoutImportRoutes.test.ts`
- `/root/tld-v2/sparky-bloom/server/tests/t1dNightscoutImportValidation.test.ts`
- `/root/tld-v2/sparky-bloom/server/middleware/authMiddleware.ts`
- `/root/tld-v2/sparky-bloom/server/models/t1dCgmEntryRepository.ts`
- `/root/tld-v2/sparky-bloom/server/models/t1dProfileRepository.ts` (reference only)
- `/root/tld-v2/sparky-bloom/server/routes/t1dProfileRoutes.ts` (reference only)
- `/root/tld-v2/sparky-bloom/server/integrations/healthData/t1dRoutes.ts`
- `/root/tld-v2/sparky-bloom/server/schemas/t1dNightscoutSchema.ts`
- `/root/tld-v2/sparky-bloom/package.json`
- `/root/tld-v2/sparky-bloom/shared/src/pigments/types.ts`
- `/root/tld-v2/sato-bloom/src/features/bloom/bloomTypes.ts`
- `/root/tld-v2/sato-bloom/src/features/bloom/bloomSampleData.ts`
- `/root/tld-v2/issues/015-bloom-window-fixture-computation.md`
- `/root/tld-v2/issues/026-sato-bloom-shared-contract-integration.md`