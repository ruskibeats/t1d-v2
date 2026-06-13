# Issue #64: CGM Date-Range Query - Implementation Context

**Issue File:** `/root/tld-v2/issues/007-cgm-date-range-query.md` (renamed from `007-t1d-cgm-date-range-query.md` in the repo)

**Context Type:** Requirements-to-context handoff

**Status:** Ready for planning/subagent

---

## 1. Issue Summary

**What to Build:** Add CGM date-range querying so clients can retrieve imported glucose readings for a specific period.

**TDD Tracer Bullet:** Write one API test showing an authenticated user can query their own CGM entries between two timestamps.

**User Stories Addressed:**
- User story 8: CGM data to be protected from other users.
- User story 9: Query CGM data by date range.
- User story 33: Swagger documentation for new APIs.
- User story 34: Tests to verify external behavior through APIs.
- User story 35: Tests to avoid implementation detail testing.
- User story 36: One public behavior per vertical slice.

**Blocked By:** `issues/006-nightscout-import-idempotent.md`

---

## 2. PRD Alignment

From `/root/tld-v2/issues/prd.md`:

**Core Principles:**
- Reskin implemented through vertical, test-driven slices.
- Functional T1D/Bloom behavior before cosmetic SparkyFitness renaming.
- Tests verify external behavior through public APIs, not implementation details.
- RLS policies verified for every T1D table.
- T1D profile ownership enforced through RLS and authenticated route behavior.
- CGM queries must support date ranges, pagination, and summary responses.

**Testing Decisions:**
> Good tests should verify external behavior, not implementation details. A test should read like a product specification: what the system does, not how it does it.
>
> The TDD workflow:
> 1. Choose one public behavior.
> 2. Write one failing test.
> 3. Implement the minimum code needed to pass.
> 4. Refactor only after the test passes.
> 5. Repeat for the next behavior.

**Modules and Behaviors to Test:**
- CGM date-range queries and summaries.
- Cross-user access denial.

**Out of Scope:**
- Full cosmetic rename in first implementation wave.
- DB role renaming.
- Implementing every endpoint before first vertical slice is stable.

---

## 3. TDD Workflow Guardrails (Issue 025)

From `/root/tld-v2/issues/025-tdd-workflow-guardrails.md`:

**Guardrails:**
- Do NOT write all tests first and implementation later.
- Do NOT refactor while the active behavior test is RED.
- Each implementation issue can link to or copy this guardrail.
- Review comments/checklists must make RED/GREEN/REFACTOR status visible.
- Guardrail is phrased as process safety, not product endpoint.

**User Stories Addressed:**
- User story 37: Do not batch all tests first.
- User story 38: Do not refactor while RED.

**Implication for Issue 64:**
- Write ONE public-interface test first that asserts authenticated user can query their own CGM entries by date range.
- Implement the minimum code to make that test pass (GET /api/health-data/t1d/cgm with startDate and endDate query params).
- Refactor only after test passes.
- Do NOT write additional tests (pagination, summaries) yet.

---

## 4. Existing Implementation

### 4.1 Repository Layer

**File:** `/root/tld-v2/sparky-bloom/server/models/t1dCgmEntryRepository.ts`

**Key Functions:**

```typescript
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

export interface T1DCGMEntry extends T1DCGMEntryInput {
  id: string;
  t1d_profile_id: string;
  created_at: Date;
  updated_at: Date;
}
```

**`getCgmEntriesByDateRange` function (lines 76-89):**
```typescript
async function getCgmEntriesByDateRange(
  profileId: string,
  userId: string,
  startDate: string,
  endDate: string
): Promise<T1DCGMEntry[]> {
  const client = await getClient(userId);
  try {
    const result = await client.query(
      `
      SELECT *
      FROM public.t1d_cgm_entries
      WHERE t1d_profile_id = $1
        AND measured_at >= $2::timestamptz
        AND measured_at < $3::timestamptz
      ORDER BY measured_at ASC
      `,
      [profileId, startDate, endDate]
    );

    return result.rows as T1DCGMEntry[];
  } finally {
    client.release();
  }
}
```

**Already exists!** This function:
- Takes `profileId`, `userId` (for RLS via getClient), and date range strings.
- Returns `T1DCGMEntry[]` ordered by `measured_at ASC`.

**Problem:** This repository function is NOT exported. It's private (`function` keyword, no `export`).

### 4.2 Route Layer

**File:** `/root/tld-v2/sparky-bloom/server/integrations/healthData/t1dRoutes.ts`

**Existing CGM endpoint (lines 65-78):**
```typescript
router.get('/t1d/cgm', async (req, res, next) => {
  const { startDate, endDate } = req.query;

  if (typeof startDate !== 'string' || typeof endDate !== 'string') {
    return res.status(400).json({
      error: 'Missing required query parameters: startDate and endDate.',
    });
  }

  try {
    const profile = await t1dProfileRepository.getOrCreateProfileForSparkyUser(
      req.userId,
      req.userId
    );
    const entries = await t1dCgmEntryRepository.getCgmEntriesByDateRange(
      profile.id,
      req.userId,
      startDate,
      endDate
    );

    return res.status(200).json({ profileId: profile.id, entries });
  } catch (error) {
    log('error', '[t1dRoutes] CGM fetch failed:', error);
    return next(error);
  }
});
```

**Status:** ROUTE EXISTS but untested. Uses unexported `getCgmEntriesByDateRange`.

**Route mounting:** `/root/tld-v2/sparky-bloom/server/integrations/healthData/healthDataRoutes.ts`:
```typescript
app.use('/api/health-data', healthDataRoutes);
```
=> Actual endpoint: `GET /api/health-data/t1d/cgm`

**Response shape:**
```typescript
{
  profileId: string;
  entries: T1DCGMEntry[];
}
```

### 4.3 Database Schema

**Table:** `public.t1d_cgm_entries` (from `/root/tld-v2/sparky-bloom/prod/db_schema_backup.sql`, lines 7530-7555)

```sql
CREATE TABLE IF NOT EXISTS public.t1d_cgm_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    t1d_profile_id UUID NOT NULL REFERENCES public.t1d_profiles(id) ON DELETE CASCADE,
    source TEXT NOT NULL,
    source_entry_id TEXT,
    measured_at TIMESTAMPTZ NOT NULL,
    value_mg_dl DOUBLE PRECISION NOT NULL CHECK (value_mg_dl > 0),
    value_mmol_l DOUBLE PRECISION NOT NULL CHECK (value_mmol_l > 0),
    units TEXT NOT NULL DEFAULT 'mg/dL' CHECK (units IN ('mg/dL', 'mmol/L')),
    trend INTEGER,
    direction TEXT,
    device TEXT,
    raw_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_t1d_cgm_entries_natural_key
    ON public.t1d_cgm_entries(t1d_profile_id, source, measured_at, COALESCE(source_entry_id, ''));

CREATE INDEX IF NOT EXISTS idx_t1d_cgm_entries_profile_time
    ON public.t1d_cgm_entries(t1d_profile_id, measured_at DESC);
```

**RLS Policy:** `t1d_cgm_entries_select_policy` (from `/root/tld-v2/sparky-bloom/prod/SparkyFitnessServer/db/rls_policies.sql`):
```sql
CREATE POLICY t1d_cgm_entries_select_policy ON public.t1d_cgm_entries FOR SELECT TO PUBLIC
USING (has_t1d_profile_access(t1d_profile_id));
```

**Confirmation:** The policy already enforces `has_t1d_profile_access(t1d_profile_id)`, meaning only rows visible via the profile owner's access are returned.

---

## 5. Testing Patterns

### 5.1 Route Test Example

**Reference:** `/root/tld-v2/sparky-bloom/server/tests/satoThemeRoutes.test.ts`

```typescript
import { describe, expect, it } from 'vitest';
// @ts-expect-error TS(7016): Could not find a declaration file for module 'supe... Remove this comment to see the error message
import request from 'supertest';
import express from 'express';
import satoThemeRoutes from '../routes/satoThemeRoutes.js';

const app = express();
app.use('/theme', satoThemeRoutes);

describe('Sato Theme Routes', () => {
  describe('GET /theme/sato', () => {
    it('should return the Sato theme contract', async () => {
      const res = await request(app).get('/theme/sato');

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/json/);

      const body = res.body;
      expect(body.name).toBe('Sato');
      expect(body.version).toBeTypeOf('string');
      expect(body.palette).toBeTypeOf('object');
      expect(body.pigments).toBeTypeOf('object');
      expect(body.surfaces).toBeTypeOf('object');
      expect(body.typography).toBeTypeOf('object');
    });
  });
});
```

**Pattern:**
1. Import `request` from supertest.
2. Import the route module.
3. Create a fresh Express app instance.
4. Mount the route.
5. Call the route with HTTP verb.
6. Assert status, headers, and response body shape.

### 5.2 Authentication Mock Pattern

**Reference:** `/root/tld-v2/sparky-bloom/server/tests/foodPhotoEstimationRoute.test.ts`

```typescript
let authenticateBehavior: 'success' | 'reject' = 'success';

vi.mock('../middleware/authMiddleware.js', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  authenticate: vi.fn((req: any, res: any, next: any) => {
    if (authenticateBehavior === 'reject') {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    req.userId = 'user-123';
    req.authenticatedUserId = 'user-123';
    next();
  }),
}));
```

**Pattern:**
- Mock `authenticate` middleware.
- Set `req.userId` on success to simulate authenticated request.
- Optionally return 401 for access-control tests.

### 5.3 Existing Service Test

**Reference:** `/root/tld-v2/sparky-bloom/server/tests/t1dNightscoutImportService.test.ts`

**Pure helper tests (no repository/db interaction):**
- `normalizeNightscoutEntries` - normalizes Nightscout JSON to T1DCGMEntryInput.
- `parseNightscoutTimestamp` - parses epoch and dateString.
- `buildSparkyHealthRecord` - constructs Sparky health record.
- `summarizeCgmEntries` - computes min/max/avg from entries.

**No repository tests yet** because repository functions are not exported and not tested.

---

## 6. Known Dependencies

### 6.1 Imports Used

From `/root/tld-v2/sparky-bloom/server/integrations/healthData/t1dRoutes.ts`:

```typescript
import express from 'express';
import { log } from '../../config/logging.js';
import t1dCgmEntryRepository from '../../models/t1dCgmEntryRepository.js';
import t1dProfileRepository from '../../models/t1dProfileRepository.js';
import t1dVectorDocumentRepository from '../../models/t1dVectorDocumentRepository.js';
import {
  ImportNightscoutCgmBodySchema,
  T1DVectorSearchBodySchema,
} from '../../schemas/t1dNightscoutSchema.js';
import t1dNightscoutImportService from '../../services/t1dNightscoutImportService.js';
import { embedT1DText } from '../../services/t1dEmbeddingService.js';
```

### 6.2 Directly Used Functions

From `t1dRoutes.ts`:
- `t1dProfileRepository.getOrCreateProfileForSparkyUser(userId, userId)`
- `t1dCgmEntryRepository.getCgmEntriesByDateRange(profileId, userId, startDate, endDate)`

### 6.3 Schemas

From `/root/tld-v2/sparky-bloom/server/schemas/t1dNightscoutSchema.ts`:
- `ImportNightscoutCgmBodySchema`
- `T1DVectorSearchBodySchema`

These are not needed for GET `/t1d/cgm` but may be in the same file.

---

## 7. Public API Contract

### 7.1 Endpoint

**Route:** `GET /api/health-data/t1d/cgm`

**Query Parameters:**
- `startDate` (string, required): ISO 8601 timestamp or `timestamptz` string.
- `endDate` (string, required): ISO 8601 timestamp or `timestamptz` string.

**Authentication:** Bearer token via `authenticate` middleware; `req.userId` injected.

**Expected Response (200):**
```typescript
{
  profileId: string;
  entries: Array<{
    id: string;
    t1d_profile_id: string;
    source: string;
    source_entry_id: string | null;
    measured_at: string; // ISO 8601
    value_mg_dl: number;
    value_mmol_l: number;
    units: 'mg/dL' | 'mmol/L';
    trend: number | null;
    direction: string | null;
    device: string | null;
    raw_json: Record<string, unknown>;
    created_at: string; // ISO 8601
    updated_at: string; // ISO 8601
  }>;
}
```

### 7.2 Validation Behavior

If `startDate` or `endDate` are missing or not strings:
- Status: 400
- Body: `{ error: 'Missing required query parameters: startDate and endDate.' }`

---

## 8. Implementation Constraints

### 8.1 Must-Satisfy Requirements

1. **CGM query supports from/to date range:**
   - Already implemented in `getCgmEntriesByDateRange` (WHERE measured_at >= startDate AND measured_at < endDate).

2. **Query returns only the authenticated user's profile data:**
   - RLS policy `has_t1d_profile_access(t1d_profile_id)` enforced via `t1dProfileRepository.getOrCreateProfileForSparkyUser` and getClient(userId).

3. **Cross-user access is rejected:**
   - Enforced by RLS policy on `t1d_cgm_entries` and `t1d_profiles`.
   - Route already calls `getOrCreateProfileForSparkyUser(req.userId, req.userId)`.

4. **Empty ranges return a valid empty response:**
   - If no entries match the range, `getCgmEntriesByDateRange` returns empty array; route returns `{ profileId, entries: [] }`.

5. **Tests verify date-range behavior through the API:**
   - Need a new route test asserting that GET with valid dates returns matching entries.

### 8.2 Already-Solved

1. **Blocked by 006-idempotent:** Not a blocker for TDD; idempotent import is a prerequisite but not required to write the date-range query test first.

2. **RLS policies:** Already in place; no schema changes needed.

3. **Repository layer:** `getCgmEntriesByDateRange` exists but is private. Minimum change: export it.

### 8.3 Implementation Risks

1. **Unexported repository function:** The core function `getCgmEntriesByDateRange` is not exported. Changing visibility (`function` -> `export async function`) is required.

2. **Missing route test:** Route exists but has no test. The TDD workflow requires a failing test first.

3. **Potential RLS bypass:** Ensure `getClient(userId)` is called and `userId` matches `req.userId`.

4. **Date parsing assumptions:** Route uses raw query parameter strings without timezone conversion. If `startDate`/`endDate` are provided in user timezone, results may be off by one day. Current behavior: treat as `timestamptz` directly.

---

## 9. Recommended Test Approach (Public Behavior First)

**Test File:** `/root/tld-v2/sparky-bloom/server/tests/healthDataRoutes.test.ts` (or `t1dRoutes.test.ts`)

**Expected Test (TDD RED):**

```typescript
import { describe, expect, it, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import t1dRoutes from '../integrations/healthData/t1dRoutes.js';
import t1dProfileRepository from '../../models/t1dProfileRepository.js';
import t1dCgmEntryRepository from '../../models/t1dCgmEntryRepository.js';

vi.mock('../middleware/authMiddleware.js', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  authenticate: vi.fn((req: any, res: any, next: any) => {
    req.userId = 'user-123';
    next();
  }),
}));

vi.mock('../models/t1dProfileRepository.js', () => ({
  getOrCreateProfileForSparkyUser: vi.fn().mockResolvedValue({
    id: 'profile-123',
    sparky_user_id: 'user-123',
  }),
}));

vi.mock('../models/t1dCgmEntryRepository.js', () => ({
  getCgmEntriesByDateRange: vi.fn().mockResolvedValue([]),
}));

let app = express();
app.use(express.json());
app.use('/api/health-data', t1dRoutes);

describe('GET /api/health-data/t1d/cgm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 400 when startDate and endDate are missing', async () => {
    const res = await request(app).get('/api/health-data/t1d/cgm');

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Missing required query parameters: startDate and endDate.');
  });

  it('should return 200 with profileId and entries for valid date range', async () => {
    const startDate = '2026-06-01T00:00:00Z';
    const endDate = '2026-06-30T23:59:59Z';

    await request(app)
      .get('/api/health-data/t1d/cgm')
      .query({ startDate, endDate })
      .expect(200)
      .expect((res) => {
        expect(res.body).toEqual({
          profileId: 'profile-123',
          entries: [],
        });
      });
  });

  it('should return only the authenticated user profile data', async () => {
    const startDate = '2026-06-01T00:00:00Z';
    const endDate = '2026-06-30T23:59:59Z';

    await request(app)
      .get('/api/health-data/t1d/cgm')
      .query({ startDate, endDate })
      .expect(200)
      .expect((res) => {
        expect(res.body.profileId).toBe('profile-123');
        expect(res.body.entries).toEqual([]);
      });
  });
});
```

**Expected Implementation (TDD GREEN):**

1. Export `getCgmEntriesByDateRange` from `t1dCgmEntryRepository.ts`.
2. Ensure route continues to work (it should already).

**Validation Commands:**

```bash
cd /root/tld-v2/sparky-bloom/server
npm test -- healthDataRoutes.test.ts
```

Expected:
- Test file exists.
- Test returns 400 for missing params.
- Test returns 200 with empty entries for valid params.
- All assertions pass.

**Refactor Step:** Only after tests pass, ensure:
- Logging is appropriate.
- Error handling is consistent with other route tests.
- Code is type-safe (export function signatures).

---

## 10. Decision Points for Planner

1. **Should pagination be added now or later?**
   - Issue does not mention pagination explicitly, but PRD says CGM queries "support" pagination.
   - Recommendation: Keep scope narrow. Add pagination as a separate user story or TDD slice after this slice is green.

2. **Should CGM summaries be added now?**
   - Issue mentions "CGM summaries for a date range" as a separate user story (007-cgm-summary-metrics.md).
   - Recommendation: Do not implement summary metrics yet. This issue is strictly about date-range querying.

3. **Should we expose the repository function as public API or keep it private?**
   - Recommendation: Export it for testability and potential future use. The TDD guardrails prioritize public behavior verification.

4. **Should we convert query parameters to user timezone before querying?**
   - Recommendation: Treat as-is for now to match existing route behavior. Add a future issue if timezone conversion is needed.

5. **Should we add Swagger documentation for this endpoint?**
   - Issue 33 mentions Swagger documentation for new APIs. Recommendation: Keep as a follow-up (e.g., after all CGM routes are tested).

---

## 11. Completion Criteria

- [ ] Repository function `getCgmEntriesByDateRange` is exported from `t1dCgmEntryRepository.ts`.
- [ ] New route test file exists (or test added to existing file) with:
  - [ ] Test for missing startDate/endDate (400).
  - [ ] Test for valid date range returning 200 and expected shape.
  - [ ] Test verifying profileId is set correctly.
- [ ] All new tests pass (GREEN).
- [ ] No speculative refactor work (RED state persists until tests pass).
- [ ] Existing route behavior is preserved (no breaking changes).

---

## 12. Next Steps for Planner

1. Create test file `/root/tld-v2/sparky-bloom/server/tests/healthDataRoutes.test.ts` or add to existing test files.
2. Write failing test per TDD tracer bullet.
3. Export `getCgmEntriesByDateRange` from repository.
4. Run tests to confirm pass.
5. Proceed to next TDD slice or issue.