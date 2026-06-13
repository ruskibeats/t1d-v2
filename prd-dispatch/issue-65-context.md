# Issue #65: CGM Summary Metrics - Implementation Context

**Issue File:** `/root/tld-v2/issues/008-cgm-summary-metrics.md`

**Context Type:** Requirements-to-context handoff

**Status:** Ready for planning/subagent

---

## 1. Issue Summary

**What to Build:** Add CGM summary metrics for a date range so clients can understand min, max, average, and time-in-range-style glucose behavior.

**TDD Tracer Bullet:** Write one API test showing a CGM summary is computed for a date range from imported readings.

**User Stories Addressed:**
- User story 8: CGM data to be protected from other users.
- User story 9: Query CGM data by date range.
- User story 10: See CGM summaries for a date range.
- User story 20: Bloom windows computed from CGM data.
- User story 33: Swagger documentation for new APIs.
- User story 34: Tests to verify external behavior through APIs.
- User story 35: Tests to avoid implementation detail testing.
- User story 36: One public behavior per vertical slice.

**Blocked By:** `issues/007-cgm-date-range-query.md`

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
- CGM summary metrics (min, max, average).
- Profile ownership enforcement for summaries.
- Tests verify summary behavior through the API.

**Out of Scope:**
- Full cosmetic rename in first implementation wave.
- DB role renaming.
- Implementing every endpoint before first vertical slice is stable.
- Bloom window computation (addressed in separate issue #015).

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

**Implication for Issue 65:**
- Write ONE public-interface test first that asserts authenticated user can get CGM summary metrics for a date range.
- Implement the minimum code to make that test pass (GET /health-data/t1d/cgm/summary with startDate and endDate).
- Refactor only after test passes.
- Do NOT write additional tests (pagination, time-in-range specifics) yet.

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

**Status:** Exists but not exported. Also not used for summary computation yet.

### 4.2 Service Layer

**File:** `/root/tld-v2/sparky-bloom/server/services/t1dNightscoutImportService.ts`

**Existing `summarizeCgmEntries` function (lines 258-273):**
```typescript
export function summarizeCgmEntries(entries: NormalizedT1DCGMEntry[]) {
  const values = entries.map((entry) => entry.valueMgDl);
  const minMgDl = Math.min(...values);
  const maxMgDl = Math.max(...values);
  const avgMgDl = values.reduce((sum, value) => sum + value, 0) / values.length;
  const sortedByTime = [...entries].sort(
    (left, right) => left.measuredAt.getTime() - right.measuredAt.getTime()
  );

  return {
    start: sortedByTime[0].measuredAt.toISOString(),
    end: sortedByTime[sortedByTime.length - 1].measuredAt.toISOString(),
    minMgDl: Number(minMgDl.toFixed(1)),
    maxMgDl: Number(maxMgDl.toFixed(1)),
    avgMgDl: Number(avgMgDl.toFixed(1)),
  };
}
```

**Status:** EXISTS but private. Computes min/max/avg for imported CGM entries. Already used by Nightscout import service.

**Note:** This function takes `NormalizedT1DCGMEntry[]` (with `valueMgDl`). To reuse it, we need:
- Either convert `T1DCGMEntry[]` to `NormalizedT1DCGMEntry[]`.
- Or create a new summary function that works directly with `T1DCGMEntry[]`.

### 4.3 Route Layer

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

**Status:** Route exists but is untested. Currently only returns raw entries, not summaries.

**Route mounting:** `/root/tld-v2/sparky-bloom/server/integrations/healthData/healthDataRoutes.ts`:
```typescript
app.use('/api/health-data', healthDataRoutes);
```
=> Actual endpoint: `GET /api/health-data/t1d/cgm`

### 4.4 Database Schema

**Table:** `public.t1d_cgm_entries` (from `/root/tld-v2/sparky-bloom/prod/db_schema_backup.sql`)

**Columns relevant to summary:**
- `t1d_profile_id`: Owner profile.
- `measured_at`: Timestamp for time range.
- `value_mg_dl`: Glucose value in mg/dL (primary metric).
- `value_mmol_l`: Glucose value in mmol/L.
- `units`: Measurement unit.

**RLS Policy:** `t1d_cgm_entries_select_policy` (from `/root/tld-v2/sparky-bloom/prod/SparkyFitnessServer/db/rls_policies.sql`):
```sql
CREATE POLICY t1d_cgm_entries_select_policy ON public.t1d_cgm_entries FOR SELECT TO PUBLIC
USING (has_t1d_profile_access(t1d_profile_id));
```

**Confirmation:** Already enforces `has_t1d_profile_access(t1d_profile_id)`.

---

## 5. Testing Patterns

### 5.1 Route Test Example

**Reference:** `/root/tld-v2/sparky-bloom/server/tests/satoThemeRoutes.test.ts`

```typescript
import { describe, expect, it } from 'vitest';
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

**Reference:** `/root/tld-v2/sparky-bloom/server/tests/t1dCgmSummaryRoutes.test.ts` (existing test file)

```typescript
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';

vi.mock('../../models/t1dProfileRepository.js', () => ({
  default: {
    getOrCreateProfileForSparkyUser: vi.fn(),
  },
}));

vi.mock('../../models/t1dCgmEntryRepository.js', () => ({
  default: {
    getCgmEntriesByDateRange: vi.fn(),
  },
}));

import t1dProfileRepository from '../../models/t1dProfileRepository.js';
import t1dCgmEntryRepository from '../../models/t1dCgmEntryRepository.js';
import t1dRoutes from '../integrations/healthData/t1dRoutes.js';

const app = express();
app.use(express.json());

app.use((req, _res, next) => {
  req.userId = 'test-user-id';
  next();
});

app.use('/health-data', t1dRoutes);

describe('GET /health-data/t1d/cgm/summary', () => {
  it('should return CGM summary metrics for a date range', async () => {
    const mockProfile = { id: 'profile-uuid-1' };
    const mockEntries = [
      {
        id: 'entry-1',
        t1d_profile_id: 'profile-uuid-1',
        source: 'Nightscout',
        measured_at: new Date('2026-06-12T07:30:00.000Z'),
        value_mg_dl: 90,
        value_mmol_l: 5.0,
        units: 'mg/dL',
        trend: null,
        direction: 'Flat',
        device: 'DexcomG7',
        raw_json: {},
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: 'entry-2',
        t1d_profile_id: 'profile-uuid-1',
        source: 'Nightscout',
        measured_at: new Date('2026-06-12T08:30:00.000Z'),
        value_mg_dl: 150,
        value_mmol_l: 8.3,
        units: 'mg/dL',
        trend: null,
        direction: 'FortyFiveUp',
        device: 'DexcomG7',
        raw_json: {},
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: 'entry-3',
        t1d_profile_id: 'profile-uuid-1',
        source: 'Nightscout',
        measured_at: new Date('2026-06-12T09:30:00.000Z'),
        value_mg_dl: 120,
        value_mmol_l: 6.7,
        units: 'mg/dL',
        trend: null,
        direction: 'Flat',
        device: 'DexcomG7',
        raw_json: {},
        created_at: new Date(),
        updated_at: new Date(),
      },
    ];

    vi.mocked(t1dProfileRepository.getOrCreateProfileForSparkyUser).mockResolvedValue(
      mockProfile as any
    );
    vi.mocked(t1dCgmEntryRepository.getCgmEntriesByDateRange).mockResolvedValue(
      mockEntries as any
    );

    const res = await request(app)
      .get('/health-data/t1d/cgm/summary')
      .query({
        startDate: '2026-06-12T00:00:00.000Z',
        endDate: '2026-06-12T23:59:59.999Z',
      });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/json/);

    const body = res.body;
    expect(body.profileId).toBe('profile-uuid-1');
    expect(body.summary).toBeDefined();
    expect(body.summary.minMgDl).toBe(90);
    expect(body.summary.maxMgDl).toBe(150);
    expect(body.summary.avgMgDl).toBe(120);
    expect(body.summary.count).toBe(3);
    expect(body.summary.start).toBe('2026-06-12T07:30:00.000Z');
    expect(body.summary.end).toBe('2026-06-12T09:30:00.000Z');
  });
});
```

**Existing Test Pattern:**
- Pre-mocks repository modules.
- Creates mock entries with full `T1DCGMEntry` shape.
- Calls route endpoint.
- Asserts summary fields: minMgDl, maxMgDl, avgMgDl, count, start, end.

**Note:** This test exists but is not implemented in the route yet. It shows the expected contract.

### 5.3 Existing Route Test Reference

**File:** `/root/tld-v2/sparky-bloom/server/tests/t1dCgmDateRange.test.ts`

**Pattern:**
- Mocks auth middleware.
- Mocks repository functions.
- Tests missing params behavior.
- Tests successful date-range query.

**Key Pattern:**
```typescript
app.use('/api/health-data', t1dRoutes);
```

---

## 6. Known Dependencies

### 6.1 Imports Used

From `/root/tld-v2/sparky-bloom/server/integrations/healthData/t1dRoutes.ts`:

```typescript
import express from 'express';
import { log } from '../../config/logging.js';
import t1dCgmEntryRepository from '../../models/t1dCgmEntryRepository.js';
import t1dProfileRepository from '../../models/t1dProfileRepository.js';
```

### 6.2 Directly Used Functions

From `t1dRoutes.ts`:
- `t1dProfileRepository.getOrCreateProfileForSparkyUser(userId, userId)`
- `t1dCgmEntryRepository.getCgmEntriesByDateRange(profileId, userId, startDate, endDate)`

### 6.3 Existing Service Function

From `t1dNightscoutImportService.ts`:
- `summarizeCgmEntries(entries: NormalizedT1DCGMEntry[])` - NOT exported.

---

## 7. Public API Contract

### 7.1 Endpoint

**Route:** `GET /health-data/t1d/cgm/summary`

**Query Parameters:**
- `startDate` (string, required): ISO 8601 timestamp or `timestamptz` string.
- `endDate` (string, required): ISO 8601 timestamp or `timestamptz` string.

**Authentication:** Bearer token via `authenticate` middleware; `req.userId` injected.

**Expected Response (200):**
```typescript
{
  profileId: string;
  summary: {
    start: string;          // ISO 8601 timestamp of first entry
    end: string;            // ISO 8601 timestamp of last entry
    minMgDl: number;        // Minimum value_mg_dl in range
    maxMgDl: number;        // Maximum value_mg_dl in range
    avgMgDl: number;        // Average value_mg_dl in range
    count: number;          // Number of entries in range
    minMmolL?: number;      // Optional min value_mmol_l
    maxMmolL?: number;      // Optional max value_mmol_l
    avgMmolL?: number;      // Optional avg value_mmol_l
  };
}
```

### 7.2 Validation Behavior

If `startDate` or `endDate` are missing or not strings:
- Status: 400
- Body: `{ error: 'Missing required query parameters: startDate and endDate.' }`

---

## 8. Implementation Constraints

### 8.1 Must-Satisfy Requirements

1. **Summary endpoint returns min, max, average, and count:**
   - Need to implement HTTP endpoint that:
     - Fetches entries via `getCgmEntriesByDateRange`.
     - Computes summary using `summarizeCgmEntries` (or new implementation).
     - Returns summary in response.

2. **Summary endpoint includes time-in-range metadata where available:**
   - Issue says "time-in-range-style glucose behavior."
   - Current `summarizeCgmEntries` does NOT compute time-in-range.
   - PRD Issue 65 AC says: "Summary endpoint includes time-in-range metadata where available."
   - Recommendation: Implement time-in-range as part of this slice if straightforward; otherwise, note as future enhancement.
   - Time-in-range thresholds: Typically 70-180 mg/dL (or 3.9-10 mmol/L).

3. **Summary endpoint enforces profile ownership:**
   - Route should already enforce this via:
     - `t1dProfileRepository.getOrCreateProfileForSparkyUser(req.userId, req.userId)` to get profile.
     - RLS policy on `t1d_cgm_entries` via `getCgmEntriesByDateRange`.

4. **Tests verify summary behavior through the API:**
   - Need a route test that:
     - Provides mock entries with varying glucose values.
     - Calls `/health-data/t1d/cgm/summary`.
     - Asserts summary fields (min, max, avg, count).

5. **Bloom windows depend on this CGM import/query behavior specifically:**
   - PRD AC says "Bloom windows depend on this CGM import/query behavior specifically."
   - This is a cross-reference; implementation is about summary metrics.

### 8.2 Already-Solved

1. **Date-range query:** Already implemented in GET `/t1d/cgm` (issue 007).
2. **Repository function exists:** `getCgmEntriesByDateRange` exists but is private.
3. **Summary computation exists:** `summarizeCgmEntries` exists but is private.

### 8.3 Implementation Risks

1. **Existing test file exists but route does not:** Test file `/root/tld-v2/sparky-bloom/server/tests/t1dCgmSummaryRoutes.test.ts` exists with assertions but no route implementation.
2. **Private function signatures:** Need to either:
   - Export `summarizeCgmEntries` from service or create new public function.
   - Or copy implementation into route handler.
3. **Time-in-range computation:** Not currently implemented. May need conditional logic or future enhancement.
4. **Units handling:** Summary currently only returns mg/dL metrics. PRD says "time-in-range-style," which implies threshold-based calculation. May need mmol/L thresholds for international users.

---

## 9. Recommended Test Approach (Public Behavior First)

**Test File:** `/root/tld-v2/sparky-bloom/server/tests/t1dCgmSummaryRoutes.test.ts` (existing file)

**Expected Test (TDD RED):**

```typescript
import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import express from 'express';

vi.mock('../../models/t1dProfileRepository.js', () => ({
  default: {
    getOrCreateProfileForSparkyUser: vi.fn(),
  },
}));

vi.mock('../../models/t1dCgmEntryRepository.js', () => ({
  default: {
    getCgmEntriesByDateRange: vi.fn(),
  },
}));

import t1dProfileRepository from '../../models/t1dProfileRepository.js';
import t1dCgmEntryRepository from '../../models/t1dCgmEntryRepository.js';
import t1dRoutes from '../integrations/healthData/t1dRoutes.js';

const app = express();
app.use(express.json());

app.use((req, _res, next) => {
  req.userId = 'test-user-id';
  next();
});

app.use('/health-data', t1dRoutes);

describe('GET /health-data/t1d/cgm/summary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 400 when startDate and endDate are missing', async () => {
    const res = await request(app).get('/health-data/t1d/cgm/summary');

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Missing required query parameters: startDate and endDate.');
  });

  it('should return CGM summary metrics for a date range with mock entries', async () => {
    const mockProfile = { id: 'profile-uuid-1' };
    const mockEntries = [
      {
        id: 'entry-1',
        t1d_profile_id: 'profile-uuid-1',
        source: 'Nightscout',
        measured_at: new Date('2026-06-12T07:30:00.000Z'),
        value_mg_dl: 90,
        value_mmol_l: 5.0,
        units: 'mg/dL',
        trend: null,
        direction: 'Flat',
        device: 'DexcomG7',
        raw_json: {},
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: 'entry-2',
        t1d_profile_id: 'profile-uuid-1',
        source: 'Nightscout',
        measured_at: new Date('2026-06-12T08:30:00.000Z'),
        value_mg_dl: 150,
        value_mmol_l: 8.3,
        units: 'mg/dL',
        trend: null,
        direction: 'FortyFiveUp',
        device: 'DexcomG7',
        raw_json: {},
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: 'entry-3',
        t1d_profile_id: 'profile-uuid-1',
        source: 'Nightscout',
        measured_at: new Date('2026-06-12T09:30:00.000Z'),
        value_mg_dl: 120,
        value_mmol_l: 6.7,
        units: 'mg/dL',
        trend: null,
        direction: 'Flat',
        device: 'DexcomG7',
        raw_json: {},
        created_at: new Date(),
        updated_at: new Date(),
      },
    ];

    vi.mocked(t1dProfileRepository.getOrCreateProfileForSparkyUser).mockResolvedValue(
      mockProfile as any
    );
    vi.mocked(t1dCgmEntryRepository.getCgmEntriesByDateRange).mockResolvedValue(
      mockEntries as any
    );

    const res = await request(app)
      .get('/health-data/t1d/cgm/summary')
      .query({
        startDate: '2026-06-12T00:00:00.000Z',
        endDate: '2026-06-12T23:59:59.999Z',
      });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/json/);

    const body = res.body;
    expect(body.profileId).toBe('profile-uuid-1');
    expect(body.summary).toBeDefined();
    expect(body.summary.minMgDl).toBe(90);
    expect(body.summary.maxMgDl).toBe(150);
    expect(body.summary.avgMgDl).toBe(120);
    expect(body.summary.count).toBe(3);
    expect(body.summary.start).toBe('2026-06-12T07:30:00.000Z');
    expect(body.summary.end).toBe('2026-06-12T09:30:00.000Z');
  });

  it('should return count of entries in summary', async () => {
    const mockProfile = { id: 'profile-uuid-2' };
    const mockEntries = [];

    vi.mocked(t1dProfileRepository.getOrCreateProfileForSparkyUser).mockResolvedValue(
      mockProfile as any
    );
    vi.mocked(t1dCgmEntryRepository.getCgmEntriesByDateRange).mockResolvedValue(
      mockEntries as any
    );

    const res = await request(app)
      .get('/health-data/t1d/cgm/summary')
      .query({
        startDate: '2026-06-01T00:00:00.000Z',
        endDate: '2026-06-30T23:59:59.999Z',
      });

    expect(res.status).toBe(200);
    expect(res.body.summary.count).toBe(0);
  });
});
```

**Expected Implementation (TDD GREEN):**

1. **Add new route handler in `t1dRoutes.ts`:**
   ```typescript
   router.get('/t1d/cgm/summary', async (req, res, next) => {
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

       // Compute summary
       const summary = {
         start: entries.length > 0
           ? entries[0].measuredAt.toISOString()
           : null,
         end: entries.length > 0
           ? entries[entries.length - 1].measuredAt.toISOString()
           : null,
         minMgDl: entries.length > 0
           ? Math.min(...entries.map(e => e.valueMgDl))
           : null,
         maxMgDl: entries.length > 0
           ? Math.max(...entries.map(e => e.valueMgDl))
           : null,
         avgMgDl: entries.length > 0
           ? entries.reduce((sum, e) => sum + e.valueMgDl, 0) / entries.length
           : null,
         count: entries.length,
         minMmolL: entries.length > 0
           ? Math.min(...entries.map(e => e.valueMmolL))
           : null,
         maxMmolL: entries.length > 0
           ? Math.max(...entries.map(e => e.valueMmolL))
           : null,
         avgMmolL: entries.length > 0
           ? entries.reduce((sum, e) => sum + e.valueMmolL, 0) / entries.length
           : null,
       };

       return res.status(200).json({ profileId: profile.id, summary });
     } catch (error) {
       log('error', '[t1dRoutes] CGM summary failed:', error);
       return next(error);
     }
   });
   ```

2. **Optionally export or reuse `summarizeCgmEntries` from service** if it fits the contract better.

3. **Remove or update existing test file** if it contains assertions that don't match new contract.

**Validation Commands:**

```bash
cd /root/tld-v2/sparky-bloom/server
npm test -- t1dCgmSummaryRoutes.test.ts
```

Expected:
- Test file exists.
- Test returns 400 for missing params.
- Test returns 200 with summary shape for valid params.
- All assertions pass.

**Refactor Step:** Only after tests pass, ensure:
- Logging is appropriate.
- Error handling is consistent with other route handlers.
- Code is type-safe (add TypeScript interfaces for summary object).
- Edge cases handled (empty entries).

---

## 10. Decision Points for Planner

1. **Should we add time-in-range calculation now?**
   - Issue AC says: "Summary endpoint includes time-in-range metadata where available."
   - Time-in-range is not currently implemented.
   - Thresholds: 70-180 mg/dL (3.9-10 mmol/L).
   - Recommendation: Keep scope narrow. Add time-in-range as a future user story or TDD slice after this slice is green.

2. **Should we add unit conversion for summary?**
   - Current summary only returns mg/dL metrics in test expectations.
   - PRD mentions time-in-range-style, which implies threshold-based calculation.
   - Recommendation: Only include mg/dL metrics initially; add mmol/L as future enhancement.

3. **Should we add Swagger documentation for this endpoint?**
   - Issue 33 mentions Swagger documentation for new APIs.
   - Recommendation: Keep as a follow-up (e.g., after all CGM routes are tested).

4. **Should we handle empty entry sets gracefully?**
   - Test expects `summary.count = 0` when no entries exist.
   - Summary fields like `start`, `end`, `minMgDl`, `maxMgDl`, `avgMgDl` should be null or 0.
   - Recommendation: Return null for undefined metrics when count = 0.

5. **Should we add pagination to summary endpoint?**
   - Not mentioned in issue AC.
   - PRD says CGM queries "support" pagination, but not summary.
   - Recommendation: Keep scope narrow; add pagination as separate TDD slice.

---

## 11. Completion Criteria

- [ ] New route handler `GET /health-data/t1d/cgm/summary` exists in `t1dRoutes.ts`.
- [ ] Route validates `startDate` and `endDate` query parameters.
- [ ] Route fetches entries via `getCgmEntriesByDateRange`.
- [ ] Route computes summary metrics (min, max, avg, count).
- [ ] Route returns summary shape: `{ profileId, summary: { start, end, minMgDl, maxMgDl, avgMgDl, count, minMmolL?, maxMmolL?, avgMmolL? } }`.
- [ ] Route enforces profile ownership via RLS.
- [ ] Route handles empty entry sets gracefully (count = 0, metrics = null/undefined).
- [ ] Test file `t1dCgmSummaryRoutes.test.ts` exists and passes:
  - [ ] Test for missing params (400).
  - [ ] Test for valid date range with mock entries (200).
  - [ ] Test for empty entry set (200, count = 0).
- [ ] All new tests pass (GREEN).
- [ ] No speculative refactor work (RED state persists until tests pass).
- [ ] Existing route behavior is preserved (no breaking changes to `/t1d/cgm`).

---

## 12. Next Steps for Planner

1. **Create/Update route handler** in `t1dRoutes.ts` for `GET /t1d/cgm/summary`.
2. **Write failing test** in `t1dCgmSummaryRoutes.test.ts` per TDD tracer bullet.
3. **Implement minimum code** to make test pass:
   - Fetch entries via `getCgmEntriesByDateRange`.
   - Compute summary metrics manually in route handler (or extract/reuse `summarizeCgmEntries`).
4. **Run tests** to confirm pass (GREEN).
5. **Proceed to next TDD slice or issue.**