# Implementation Context: Issue #73 - Bloom Window CGM Import Integration

**Date:** 2026-06-12
**Issue File:** `issues/016-bloom-window-cgm-import-integration.md`
**Output Location:** `/root/tld-v2/prd-dispatch/issue-73-context.md`

## Executive Summary

Issue #73 requires integrating Bloom window computation with imported CGM data from Nightscout. This means Bloom windows should reflect real glucose summaries (min, max, average, rate-of-change) instead of being generated from synthetic fixtures. The implementation must:

1. Consume imported CGM data (from `t1d_cgm_entries` table)
2. Include glucose average, peak, and rate-of-change in Bloom windows
3. Be deterministic for the same input data
4. Lower confidence when CGM data is missing (rather than inventing certainty)
5. Verify behavior through public computation interfaces (service or API)

**Blocking Issues:**
- `008-cgm-summary-metrics.md` (CGM date-range queries and summaries)
- `015-bloom-window-fixture-computation.md` (Bloom window fixture computation)

**Directly Addresses PRD User Stories:**
- User story 20: Bloom windows computed from food, exercise, sleep, stress, and CGM data
- User story 21: Bloom windows include glucose averages, peaks, rate of change, and confidence
- User story 22: Bloom windows include pigment keys for Sato renderer
- User story 23: Low-data windows marked as low confidence
- User story 24: Deterministic for same input data
- User story 27: Backend API response matches Sato Bloom renderer expectations
- User story 35: Tests verify behavior through public APIs/services
- User story 36: Implement one vertical slice at a time

**TDD Guardrail Alignment:**
- This is **Issue 73** in the ordered sequence, so it should be a pure TDD slice
- Must write one failing public-interface test first
- Implement minimum code to make it pass
- Refactor only after tests are green
- No speculative refactors while behavior is red

---

## Current Implementation State

### 1. CGM Import Infrastructure (Already Exists)

#### Files:
- **Model:** `sparky-bloom/server/models/t1dCgmEntryRepository.ts`
  - `T1DCGMEntry` interface with all required fields
  - `T1DCGMEntryInput` for creating/upserting entries
  - `getCgmEntriesByDateRange(profileId, userId, startDate, endDate)`: Returns `T1DCGMEntry[]`

- **Service:** `sparky-bloom/server/services/t1dNightscoutImportService.ts`
  - `normalizeNightscoutEntries()`: Transforms Nightscout API format → normalized CGM entries
  - `summarizeCgmEntries()`: Computes min, max, avg for a set of entries
  - `ImportNightscoutCgmOptions` interface for import options
  - `ImportNightscoutCgmResult` with summary object including `start`, `end`, `minMgDl`, `maxMgDl`, `avgMgDl`

- **API Routes:** `sparky-bloom/server/integrations/healthData/t1dRoutes.ts`
  - `GET /health-data/t1d/cgm`: Returns `{ profileId, entries }` for a date range
  - `POST /health-data/t1d/nightscout/import`: Imports Nightscout CGM data

- **Schemas:** `sparky-bloom/server/schemas/t1dNightscoutSchema.ts`
  - `ImportNightscoutCgmBodySchema`: Defines import request shape
  - `NightscoutCgmEntrySchema`: Defines incoming Nightscout format

### 2. CGM Summary Route Test (Exists but Incomplete)

**File:** `sparky-bloom/server/tests/t1dCgmSummaryRoutes.test.ts`

**Test Structure:**
```typescript
- Uses mock repositories (t1dProfileRepository, t1dCgmEntryRepository)
- Simulates authenticated user with `req.userId = 'test-user-id'`
- Tests `GET /health-data/t1d/cgm/summary` endpoint
- Expects:
  - `profileId`: string
  - `summary.minMgDl`: number
  - `summary.maxMgDl`: number
  - `summary.avgMgDl`: number
  - `summary.count`: number
  - `summary.start`: ISO timestamp
  - `summary.end`: ISO timestamp
```

**Current State:** Test file exists, but endpoint implementation likely missing (test was failing when run).

### 3. Shared Bloom Types (Definition)

**File:** `sparky-bloom/shared/src/pigments/types.ts`

**Required Interfaces for Bloom Windows:**
```typescript
export type MetabolicPigmentKey =
  | "slowCarb" | "fastSugar" | "fatDelay" | "proteinSteady"
  | "movement" | "recovery" | "stress" | "sleepDebt"
  | "settling" | "baseline" | "unknown";

export type BloomState = "balanced" | "reactive" | "calm";

export interface BloomWindow {
  id: string;
  startHour: number;
  endHour: number;
  label: string;
  value: number;
  confidence: number;
  variability: number;
  intensity: number;
  state: BloomState;
  pigmentKey: MetabolicPigmentKey;
  glucoseAvg?: number;           // TARGET FIELD
  glucosePeak?: number;          // TARGET FIELD
  rateOfChange?: string;         // TARGET FIELD
  dataCompleteness?: number;     // TARGET FIELD
  eventContext?: string;
  classificationReason?: string;
  note?: string;
}
```

**Key Fields for Issue #73:**
- `glucoseAvg` - Derived from CGM entries average
- `glucosePeak` - Derived from max CGM value
- `rateOfChange` - Derived from time-sorted CGM values
- `dataCompleteness` - Proxy for confidence (higher when more CGM data)

### 4. Planned but Incomplete: Bloom Window Service

**Test File Exists:** `sparky-bloom/server/tests/bloomWindowFixtureService.test.ts`

**Test Imports:**
```typescript
import {
  computeBloomWindowsFromFixture,
  type BloomWindowFixtureInput,
  type BloomWindowFixtureResult,
} from '../services/bloomWindowFixtureService.js';
```

**Test Expected Interface:**
```typescript
type BloomWindowFixtureInput = {
  profileId: string;
  startHour: number;
  endHour: number;
  readings: Array<{ hour: number; glucoseMgDl: number; eventType: string; eventLabel?: string }>;
};

type BloomWindowFixtureResult = {
  windows: BloomWindow[];
};
```

**Current State:** Service file (`bloomWindowFixtureService.ts`) does NOT exist in repo. This appears to be a planned file that was added to tests first (common TDD pattern), but implementation has not been written yet.

**CRITICAL:** For Issue #73, we need to adapt this fixture service to consume CGM data from the database instead of fixture readings.

### 5. TDD Workflow Guardrails (PRD Issue 025)

**File:** `issues/025-tdd-workflow-guardrails.md`

**Core Requirements:**
1. Choose **one public behavior** at a time
2. Write **one failing public-interface test**
3. Implement **minimum code to pass**
4. Refactor **only after tests pass**
5. Avoid "write all tests first and all implementation later"
6. Avoid "refactor while active behavior test is red"

**Applying to Issue #73:**
- Priority 1: Implement `computeBloomWindowsFromCGMEntries()` function in `bloomWindowFixtureService.ts`
- Priority 2: Update or create `GET /health-data/t1d/bloom-windows` API route
- Priority 3: Ensure determinism, glucose fields, and confidence handling
- Do NOT add extra features beyond Issue #73 scope

---

## Public Behavior to Test First

### Primary Behavior: Bloom Window Computation from CGM Data

**Test Location:** `sparky-bloom/server/tests/bloomWindowCgmService.test.ts` (new file or addition to existing test suite)

**TDD Tracer Bullet (from Issue #73):**
> "Write one service or API-level test showing Bloom windows include glucose average, peak, and rate-of-change derived from imported CGM data."

**Test Skeleton:**

```typescript
import { describe, it, expect } from 'vitest';
import { computeBloomWindowsFromCGM } from '../services/bloomWindowCgmService.js';

describe('computeBloomWindowsFromCGM', () => {
  it('computes deterministic Bloom windows with glucose stats from CGM entries', () => {
    // This test should FAIL initially (RED)

    const entries = [
      { id: 'e1', measured_at: '2026-06-12T07:00:00Z', value_mg_dl: 95 },
      { id: 'e2', measured_at: '2026-06-12T08:00:00Z', value_mg_dl: 110 },
      { id: 'e3', measured_at: '2026-06-12T09:00:00Z', value_mg_dl: 180 }, // Peak
      { id: 'e4', measured_at: '2026-06-12T10:00:00Z', value_mg_dl: 150 },
      { id: 'e5', measured_at: '2026-06-12T11:00:00Z', value_mg_dl: 120 },
    ];

    const windows = computeBloomWindowsFromCGM(entries, {
      profileId: 'profile-123',
      startHour: 6,
      endHour: 12,
    });

    // Assertions:
    expect(windows).toHaveLength(7); // One window per hour (6-12)
    for (const window of windows) {
      expect(window).toHaveProperty('id');
      expect(window).toHaveProperty('label');
      expect(window).toHaveProperty('value');
      expect(window).toHaveProperty('state');
      expect(window).toHaveProperty('pigmentKey');

      // NEW: These are the key validation points for Issue #73
      expect(window.glucoseAvg).toBeGreaterThan(0);   // Derived from entry average
      expect(window.glucosePeak).toBe(180);           // Derived from entry max
      expect(window.rateOfChange).toMatch(/UP|FLAT|DOWN/); // Derived from time-series

      // Confidence based on data completeness
      expect(window.dataCompleteness).toBeGreaterThan(0.6);
      expect(window.confidence).toBeCloseTo(window.dataCompleteness, 2);
    }
  });

  it('lowers confidence when CGM data is sparse', () => {
    // Sparse data (hours with no readings)
    const sparseEntries = [
      { id: 'e1', measured_at: '2026-06-12T08:00:00Z', value_mg_dl: 120 },
    ];

    const windows = computeBloomWindowsFromCGM(sparseEntries, {
      profileId: 'profile-123',
      startHour: 6,
      endHour: 12,
    });

    // Confidence should be low for windows with missing data
    expect(windows.every(w => w.dataCompleteness < 0.5)).toBe(true);
  });

  it('produces deterministic output for the same input data', () => {
    const entries = [
      { id: 'e1', measured_at: '2026-06-12T07:00:00Z', value_mg_dl: 95 },
      { id: 'e2', measured_at: '2026-06-12T08:00:00Z', value_mg_dl: 110 },
    ];

    const first = computeBloomWindowsFromCGM(entries, { profileId: 'p1', startHour: 6, endHour: 10 });
    const second = computeBloomWindowsFromCGM(entries, { profileId: 'p1', startHour: 6, endHour: 10 });

    expect(first).toEqual(second);
  });
});
```

### Secondary Behavior: Bloom Window API Endpoint

**Test Location:** `sparky-bloom/server/tests/t1dBloomWindowsRoutes.test.ts` (new file)

**TDD Tracer Bullet:**
> "Write one API test showing an authenticated user can request Bloom windows for a date range and receives Sato-compatible windows."

**Test Skeleton:**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';

vi.mock('../../models/t1dProfileRepository.js', () => ({
  default: { getOrCreateProfileForSparkyUser: vi.fn() },
}));

vi.mock('../../models/t1dCgmEntryRepository.js', () => ({
  default: { getCgmEntriesByDateRange: vi.fn() },
}));

// Possibly mock Bloom window service here

import t1dRoutes from '../integrations/healthData/t1dRoutes.js'; // Assuming bloom windows route mounts here

const app = express();
app.use(express.json());
app.use((req, _res, next) => { req.userId = 'test-user'; next(); });
app.use('/health-data', t1dRoutes);

describe('GET /health-data/t1d/bloom-windows', () => {
  it('returns Sato-compatible Bloom windows for a date range with CGM-derived data', async () => {
    // 1. Mock profile and CGM entries
    // 2. Mock Bloom window computation
    // 3. Call API
    // 4. Assert response includes:
    //    - profileId
    //    - windows: Array<BloomWindow>
    //    - Each window matches Sato BloomWindow type from @workspace/shared
    //    - Each window has glucoseAvg, glucosePeak, rateOfChange
  });

  it('enforces profile ownership via RLS through repository calls', async () => {
    // Verify repository called with correct userId
  });
});
```

---

## Likely Files to Create/Modify

### A. Service Layer (Priority 1)

**New File:** `sparky-bloom/server/services/bloomWindowCgmService.ts`

**Purpose:** Compute Bloom windows from CGM database entries

**Required Functions:**

1. `computeBloomWindowsFromCGM(entries, options)`:
   - Input: `Array<T1DCGMEntry>`, `{ profileId, startHour, endHour, granularity: number }`
   - Output: `{ windows: Array<BloomWindow>, confidenceScore: number }`
   - Logic:
     - Sort entries by time
     - Identify peak value (max mg/dL)
     - Compute rate of change (delta between time steps)
     - Map glucose patterns to BloomState (balanced/reactive/calm)
     - Assign MetabolicPigmentKey based on glucose behavior (e.g., fastSugar for spikes)
     - Compute dataCompleteness based on coverage of requested hours
     - Return deterministic BloomWindow objects

2. `getBloomWindowsByDateRange(profileId, userId, startDate, endDate)`:
   - Delegates to repository
   - Calls `computeBloomWindowsFromCGM` with entries from `t1dCgmEntryRepository.getCgmEntriesByDateRange`

**Dependencies:**
- `t1dCgmEntryRepository` (already exists)
- Types from `@workspace/shared` (pigments/types.ts)
- Optional: Rate of change helpers, confidence calculation

### B. API Routes (Priority 2)

**New File:** `sparky-bloom/server/integrations/healthData/bloomWindowRoutes.ts` (or add to existing `t1dRoutes.ts`)

**Route:** `GET /health-data/t1d/bloom-windows?startDate=&endDate=&startHour=&endHour=`

**Handler Logic:**
1. Validate `startDate` and `endDate` query params
2. Get or create T1D profile via `t1dProfileRepository.getOrCreateProfileForSparkyUser`
3. Call `t1dCgmEntryRepository.getCgmEntriesByDateRange` for the date range
4. Call `computeBloomWindowsFromCGM` with entries and requested hour range
5. Return `{ profileId, windows, summary }`

**Swagger Documentation Required:**
```yaml
tags:
  - T1D
summary: Get Bloom windows for a date range
description: |
  Computes metabolically-themed time windows from CGM data.
  Uses glucose averages, peaks, and rate of change to determine state and pigment.
parameters:
  - name: startDate
    in: query
    required: true
    schema: { type: string, format: date-time }
    description: Start of date range to query
  - name: endDate
    in: query
    required: true
    schema: { type: string, format: date-time }
    description: End of date range to query
  - name: startHour
    in: query
    required: true
    schema: { type: integer, minimum: 0, maximum: 23 }
    description: Start hour (0-23) for bloom window granularity
  - name: endHour
    in: query
    required: true
    schema: { type: integer, minimum: 1, maximum: 24 }
    description: End hour (0-24) for bloom window granularity
responses:
  200:
    description: Bloom windows for the requested date range
    content:
      application/json:
        schema:
          type: object
          properties:
            profileId:
              type: string
            windows:
              type: array
              items:
                $ref: '#/components/schemas/BloomWindow'
            summary:
              type: object
              properties:
                totalEntries: number
                glucoseAvg: number
                glucosePeak: number
```

### C. Schema Definitions (Priority 2)

**New File:** `sparky-bloom/server/schemas/bloomWindowSchema.ts`

**Schema:** `BloomWindowRequestSchema`, `BloomWindowResponseSchema`

**Dependencies:** Zod, types from `@workspace/shared`

### D. Modify Existing Files

**No modification needed** for `t1dCgmEntryRepository.ts`, `t1dNightscoutImportService.ts`, or `t1dRoutes.ts` unless we want to consolidate.

Potential addition to `t1dRoutes.ts`:
```typescript
import bloomWindowService from '../services/bloomWindowCgmService.js';

router.get('/t1d/bloom-windows', async (req, res, next) => {
  // Extract query params
  // Validate with BloomWindowRequestSchema
  // Get profile and entries
  // Compute windows
  // Return response
});
```

---

## Validation Commands

### 1. Unit Test Execution

```bash
cd /root/tld-v2/sparky-bloom/server
npm test -- --run bloomWindowCgmService.test.ts
```

Expected output:
- Test suite with 3+ tests
- All tests PASS (GREEN)

### 2. API Test Execution (After route implementation)

```bash
cd /root/tld-v2/sparky-bloom/server
npm test -- --run t1dBloomWindowsRoutes.test.ts
```

Expected output:
- Test suite verifies endpoint exists
- Response matches BloomWindow type from `@workspace/shared`
- Includes glucoseAvg, glucosePeak, rateOfChange fields

### 3. Integration Test (Full flow)

```bash
cd /root/tld-v2/sparky-bloom/server
# Start server (if needed)
npm run server:dev
# In another terminal, run test with database
npm test -- --run t1dBloomWindowsRoutes.test.ts
```

### 4. Type Checking

```bash
cd /root/tld-v2/sparky-bloom
pnpm run validate
```

Expected: No new TypeScript errors from adding BloomWindow-related types.

### 5. Swagger Documentation Generation

```bash
cd /root/tld-v2/sparky-bloom/server
# Ensure bloom window route has @swagger decorators
# Run Swagger generation tool if available
```

---

## Implementation Risks & Constraints

### Risk 1: Rate of Change Calculation Precision
**Risk:** Calculating rate of change from CGM data may produce floating-point inconsistencies or undefined values (e.g., single data point).

**Mitigation:**
- Add fallback: `rateOfChange = 'Flat'` if only 1-2 points
- Normalize to 3-character strings: 'UP', 'DOWN', 'Flat'
- Document precision in type definitions

### Risk 2: Determinism Across Timezones
**Risk:** CGM readings have ISO timestamps with timezone information. Bloom windows computed from these may differ across timezones for same calendar date.

**Constraint:** This is acceptable as per Issue #73 - windows are deterministic for the **same input data**, not necessarily for same calendar date across different zones.

**Mitigation:**
- Normalize all timestamps to UTC in `computeBloomWindowsFromCGM`
- Document in Swagger that windows are timezone-agnostic

### Risk 3: Low Confidence When Data Is Sparse
**Risk:** CGM data may be missing for some hours (e.g., device off, gaps in import). If we mark low confidence without fallback, API may return unreliable data.

**Mitigation (from Issue #73):**
- Lower confidence for sparse windows rather than inventing certainty
- Return `dataCompleteness < 0.5` for windows with < 50% coverage
- Optionally: Use simple arithmetic interpolation for minor gaps, but document as experimental

### Risk 4: Pigment Key Selection Complexity
**Risk:** Determining `pigmentKey` from glucose patterns is heuristic-heavy and may change between implementations.

**Mitigation:**
- Use simple ruleset (documented in code comments):
  - `fastSugar` if glucosePeak > 180 AND time < 2 hours after peak
  - `baseline` if glucoseAvg between 70-140 AND low variability
  - `reactive` if glucoseAvg < 70 OR variability > 20
- Keep logic pure (no side effects)
- Test with edge cases (low values, high variability)

### Risk 5: Blocking on PRD Issues 008 & 015
**Constraint:** Issue #73 is blocked by:
- `008-cgm-summary-metrics.md`: Requires CGM summary endpoint (may already exist in some form)
- `015-bloom-window-fixture-computation.md`: Requires fixture-based Bloom windows (currently WIP)

**Reality Check:**
- CGM summary behavior exists in `t1dNightscoutImportService.summarizeCgmEntries()`
- `008` and `015` are blockers for **this specific integration**, but the critical path for Issue #73 is **CGM data + Bloom window computation**.
- We can implement the service layer without completing `008` and `015` fully, as long as we follow TDD: write the test first, then implement.

---

## Next Steps for Planner/Implementer

### Immediate (Day 1)
1. **Create test file:** `bloomWindowCgmService.test.ts`
2. **Define test cases:**
   - Test 1: Compute windows with glucose stats from CGM entries (baseline)
   - Test 2: Lower confidence for sparse data
   - Test 3: Deterministic output
3. **Run test:** Verify it FAILS (RED)

### Day 2
4. **Implement service:** `bloomWindowCgmService.ts`
   - `computeBloomWindowsFromCGM()` function
   - Glucose stats extraction
   - State & pigment mapping
   - Confidence calculation
5. **Run test:** Verify it PASSES (GREEN)

### Day 3
6. **Create API route:** `GET /health-data/t1d/bloom-windows`
7. **Create test file:** `t1dBloomWindowsRoutes.test.ts`
8. **Run API test:** Verify PASS (GREEN)

### Day 4
9. **Update Swagger docs** (if route-based approach chosen)
10. **Integration test** with database (if feasible)
11. **Review against TDD guardrails:**
    - Did I write ONE failing test first?
    - Did I implement minimum code to pass?
    - Did I refactor only after GREEN?

### Day 5
12. **Run full test suite:** Ensure no regressions
13. **Type check:** `pnpm run validate`
14. **Document implementation** in `bloomWindowCgmService.ts` comments

---

## Key Dependencies to Import

```typescript
// From existing services
import t1dCgmEntryRepository from '../models/t1dCgmEntryRepository.js';
import t1dProfileRepository from '../models/t1dProfileRepository.js';

// From shared types (must be installed from @workspace/shared)
import type {
  BloomWindow,
  MetabolicPigmentKey,
  BloomState,
} from '@workspace/shared/pigments/types.js';

// Schema validation
import { z } from 'zod/v4';

// Utilities
import { normalizeCgmEntriesForBloom } from '../utils/cgmBloomNormalization.js'; // If needed
```

---

## Success Criteria

Before considering Issue #73 complete, the following must be true:

1. **Green Test Coverage:**
   - `bloomWindowCgmService.test.ts` has 3+ passing tests
   - `t1dBloomWindowsRoutes.test.ts` (if route-based) has 2+ passing tests
   - All tests verify `glucoseAvg`, `glucosePeak`, `rateOfChange` fields exist

2. **Behavior Verified:**
   - `computeBloomWindowsFromCGM` consumes imported CGM entries
   - Outputs include glucose stats from data (not invented)
   - Deterministic for same input data
   - Confidence lowered when data is sparse

3. **API/Interface Consistency:**
   - BloomWindow objects match `@workspace/shared` interface
   - `pigmentKey` and `state` are populated with valid values
   - Swagger documents the endpoint (if using routes)

4. **TDD Compliance:**
   - One failing test written before implementation
   - Implementation driven by that single test
   - No speculative refactors during RED/GREEN cycle

5. **No Regressions:**
   - `pnpm run validate` passes
   - Existing CGM import tests still pass
   - Existing route tests still pass

---

## Additional Notes

1. **Reconciliation with Blocking Issues:**
   - Issue #008 asks for CGM summary endpoint. We may create one in `t1dRoutes.ts` if not already present, but Issue #73 focuses on **Bloom window computation**, not summary endpoint.
   - Issue #015 asks for fixture-based Bloom windows. Our implementation should coexist with that, not replace it.

2. **Determinism Implementation:**
   - Use `Date.toISOString()` for timestamps (already deterministic)
   - Use `Math.round()` or `toFixed(1)` for numeric fields
   - Avoid random number generation in computation logic
   - Sort CGM entries by time before processing (already done in `summarizeCgmEntries`)

3. **DataCompleteness vs Confidence:**
   - `dataCompleteness`: Percentage of requested hours covered by CGM data (0.0-1.0)
   - `confidence`: Derived as `dataCompleteness` or slightly higher/lower based on variability
   - Rule of thumb: `confidence = dataCompleteness * 0.9 + 0.1` (give some buffer for quality)

4. **Pigment Key Rules (Draft):**
   ```typescript
   if (glucoseAvg < 70 || glucoseAvg > 180) return 'reactive';
   if (glucosePeak - glucoseAvg > 50) return 'fastSugar';
   if (rateOfChange === 'UP' && glucoseAvg > 140) return 'fastSugar';
   if (variability > 30) return 'stress';
   return 'baseline'; // Default
   ```

5. **Rate of Change Rules:**
   ```typescript
   if (entries.length < 2) return 'Flat';
   const delta = entries[i+1].valueMgDl - entries[i].valueMgDl;
   const pctChange = delta / entries[i].valueMgDl * 100;
   if (pctChange > 15) return 'UP';
   if (pctChange < -15) return 'DOWN';
   return 'Flat';
   ```

---

## Summary for Implementer

**You are implementing Issue #73: Bloom Window CGM Import Integration.**

**What exists:**
- CGM import infrastructure (Nightscout import, CGM entries storage, date-range query)
- CGM summary utilities (min, max, avg computation)
- BloomWindow type definitions in `@workspace/shared`
- Test skeleton for Bloom window service (but service implementation missing)

**What you need to do (TDD: RED → GREEN → REFACTOR):**

1. **Write ONE failing test** in `bloomWindowCgmService.test.ts`:
   - Test that `computeBloomWindowsFromCGM()` includes `glucoseAvg`, `glucosePeak`, `rateOfChange`
   - Verify deterministic output
   - Verify low confidence for sparse data

2. **Implement minimum code** to make that test pass:
   - Create `bloomWindowCgmService.ts`
   - Implement `computeBloomWindowsFromCGM()` function
   - Extract glucose stats from CGM entries
   - Map to BloomState and pigment keys
   - Compute confidence based on data completeness

3. **Run test**: Verify it PASSES

4. **Repeat** for additional behaviors (API endpoint, RLS enforcement, etc.) following TDD guardrails

**Do NOT:**
- Write all tests upfront
- Refactor while tests are red
- Add features beyond Issue #73 scope (e.g., meal review integration, forecast envelopes)
- Modify existing CGM import logic unless necessary for compatibility

**Success:** When `glucoseAvg`, `glucosePeak`, and `rateOfChange` appear in Bloom windows computed from real CGM data, with deterministic output and proper confidence handling, Issue #73 is complete.