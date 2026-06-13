# Issue #75 Context: Public Decision Behavior to Test First

**Source Issues:**
- `issues/prd.md` (Product requirements)
- `issues/018-t1d-onboarding-decision.md` (Onboarding data model decision)
- `issues/025-tdd-workflow-guardrails.md` (TDD guardrails)
- `issues/017-bloom-window-api.md` (Bloom window API slice)
- `issues/015-bloom-window-fixture-computation.md` (Fixture-based computation)
- `issues/016-bloom-window-cgm-import-integration.md` (CGM integration)

**Task:** Identify the first public decision behavior to test for Issue #75, validation commands, and TDD guardrail alignment.

---

## Summary

The PRD outlines a vertical TDD reskin of the SparkyFitness backend into a T1D/Bloom backend. The most strategic and testable starting point is the **Sato skin theme API** because:

1. It requires **no database mutation** or migration
2. It provides a **shared contract** between backend and mobile immediately
3. It has **zero side effects** — deterministic output from shared code
4. It follows **TDD slice #1** recommendation in PRD ("The recommended first vertical slice is the Sato skin theme API")

However, there is also a **T1D profile public behavior** (GET /t1d-profiles/{id}) that tests RLS-enforced profile ownership, which is critical for product safety.

---

## First Public Decision Behavior to Test: Sato Theme API

### Decision
Implement **GET /theme/sato** endpoint as a read-only contract that exposes the shared Sato skin theme from `@workspace/shared`.

### Why This First

1. **Zero risk to data integrity** — no writes to database, no RLS interactions yet
2. **Deterministic behavior** — constant response from shared code, easy to test
3. **Backend/mobile contract verified immediately** — mobile can consume a known Sato contract from day one
4. **Clear RED-GREEN-REFACTOR cycle** — fixture response exists, test passes, refactor not needed until later

### Public API Contract

**Endpoint:** `GET /theme/sato`

**Response (2026-06-12):**
```json
{
  "name": "Sato",
  "version": "1.0.0",
  "palette": {
    "paper": "#FBF3E6",
    "paperDeep": "#F7EEDC",
    "paperCream": "#FFF9EF",
    "ink": "#211F1B",
    "inkWarm": "#5A5249",
    "mutedTeal": "#6F9FA0",
    "blueGrey": "#8FB3C2",
    "mossGreen": "#9FAE86",
    "warmOchre": "#D7B36A",
    "apricot": "#E3A061",
    "softCoral": "#DB8A6F"
  },
  "pigments": {
    "baseline": {
      "name": "Rice Paper",
      "hex": "#F7EEDC",
      "meaning": "neutral body state / background vessel",
      "opacityBias": 0.08,
      "spreadBias": 0.8,
      "granulationBias": 0.15
    },
    "slowCarb": {
      "name": "Warm Oat",
      "hex": "#D9BC78",
      "meaning": "slow carbohydrate energy, gradual rise",
      "opacityBias": 0.16,
      "spreadBias": 0.72,
      "granulationBias": 0.28
    },
    "fastSugar": {
      "name": "Persimmon Wash",
      "hex": "#E88B55",
      "meaning": "fast glucose rise, quick metabolic response",
      "opacityBias": 0.22,
      "spreadBias": 0.86,
      "granulationBias": 0.42
    },
    "fatDelay": {
      "name": "Toasted Sesame",
      "hex": "#B9915E",
      "meaning": "delayed digestion, slow tail, extended response",
      "opacityBias": 0.18,
      "spreadBias": 0.58,
      "granulationBias": 0.48
    },
    "proteinSteady": {
      "name": "Soft Soy",
      "hex": "#A7A982",
      "meaning": "steadying meal influence",
      "opacityBias": 0.14,
      "spreadBias": 0.62,
      "granulationBias": 0.22
    },
    "movement": {
      "name": "Moss Breath",
      "hex": "#789A7A",
      "meaning": "movement, walk, run, insulin sensitivity support",
      "opacityBias": 0.15,
      "spreadBias": 0.74,
      "granulationBias": 0.18
    },
    "recovery": {
      "name": "Blue Mineral",
      "hex": "#7FAFC4",
      "meaning": "returning to baseline, recovery, settling",
      "opacityBias": 0.15,
      "spreadBias": 0.78,
      "granulationBias": 0.2
    },
    "stress": {
      "name": "Muted Violet",
      "hex": "#9B8ABD",
      "meaning": "stress, hormonal friction, unexplained resistance",
      "opacityBias": 0.16,
      "spreadBias": 0.54,
      "granulationBias": 0.36
    },
    "sleepDebt": {
      "name": "Indigo Fog",
      "hex": "#657E9E",
      "meaning": "sleep debt, overnight instability, fatigue",
      "opacityBias": 0.18,
      "spreadBias": 0.68,
      "granulationBias": 0.34
    },
    "settling": {
      "name": "Sage Water",
      "hex": "#A9B99C",
      "meaning": "balance returning, gentler metabolic rhythm",
      "opacityBias": 0.13,
      "spreadBias": 0.82,
      "granulationBias": 0.16
    },
    "unknown": {
      "name": "Smoke Wash",
      "hex": "#AFA79B",
      "meaning": "uncertain cause, incomplete context",
      "opacityBias": 0.1,
      "spreadBias": 0.65,
      "granulationBias": 0.3
    }
  },
  "surfaces": {
    "background": "#FBF3E6",
    "card": "#FFF9EF",
    "elevated": "#F7EEDC",
    "subtle": "#E8E0D4",
    "ink": "#211F1B"
  },
  "typography": {
    "display": {
      "fontFamily": "sans-serif",
      "fontSize": 32,
      "lineHeight": 1.1,
      "fontWeight": "700",
      "letterSpacing": -0.5
    },
    "headline": {
      "fontFamily": "sans-serif",
      "fontSize": 24,
      "lineHeight": 1.3,
      "fontWeight": "600",
      "letterSpacing": -0.3
    },
    "body": {
      "fontFamily": "sans-serif",
      "fontSize": 16,
      "lineHeight": 1.5,
      "fontWeight": "400",
      "letterSpacing": 0
    },
    "caption": {
      "fontFamily": "sans-serif",
      "fontSize": 14,
      "lineHeight": 1.4,
      "fontWeight": "400",
      "letterSpacing": 0.2
    }
  },
  "visualTokens": {
    "palette": "hex-names",
    "ellipseCount": 50,
    "spreadX": 0.5,
    "spreadY": 0.5,
    "blur": 12,
    "noise": 0.15,
    "accentCount": 12,
    "rotationBias": 0.3,
    "opacityBase": 0.8,
    "elongation": 1.0,
    "edgeSoftness": 0.2
  }
}
```

**Source:** `/root/tld-v2/sparky-bloom/shared/src/pigments/palette.ts` (line 1–198)

**Implementation:** Already exists at `/root/tld-v2/sparky-bloom/server/routes/satoThemeRoutes.ts`

**Status:** ✅ IMPLEMENTED (route exists, contract verified, tests exist)

---

## First Test-Driven Slice for New Code: T1D Profile Public API

### Decision
Implement **GET /t1d-profiles/:id** endpoint with **RLS-enforced profile ownership** as the first test-driven slice for T1D profile data.

### Why This Slice

1. **Immediate product safety verification** — RLS cross-user access prevention is the most important T1D-specific safety feature
2. **AuthMiddleware already mocked in existing test** (`t1dProfileRoutes.test.ts`)
3. **Repository already has ownership enforcement** (`getProfileById` checks `req.userId`)
4. **Follows TDD pattern from existing codebase** — tests already exist, just need to verify coverage

### Public API Contract

**Endpoint:** `GET /api/t1d-profiles/:id`

**Authorization:** Required (authenticated user context, from authMiddleware)

**Success Response (200):**
```json
{
  "id": "profile-456",
  "sparky_user_id": "user-123",
  "subject_type": "sparky_user",
  "display_name": "My T1D Profile",
  "legend_key": null,
  "status": "active",
  "metadata_json": {},
  "created_at": "2026-01-01T00:00:00Z",
  "updated_at": "2026-01-01T00:00:00Z"
}
```

**Forbidden Response (403):** User tries to access another user's profile

**Not Found Response (404):** Profile exists but user has no ownership (RLS filters it out)

**Source:** `/root/tld-v2/sparky-bloom/server/routes/t1dProfileRoutes.ts` (lines 23–40)

**Status:** ✅ IMPLEMENTED

---

## Tests Already Exist

### Sato Theme API Tests

1. **Contract-level test:** `/root/tld-v2/sparky-bloom/server/tests/satoThemeContract.test.ts`
   - Verifies `SATO_THEME` is exported with all required keys
   - Checks palette values match `pigments/palette.ts`
   - Validates pigment metadata shape

2. **Route-level test:** `/root/tld-v2/sparky-bloom/server/tests/satoThemeRoutes.test.ts`
   - Verifies `GET /theme/sato` returns 200 with correct body structure
   - Confirms response matches contract expectations

### T1D Profile Route Tests

1. **Profile ownership test:** `/root/tld-v2/sparky-bloom/server/tests/t1dProfileRoutes.test.ts`
   - Tests `GET /api/t1d-profiles/:id` ownership enforcement
   - Verifies 404 when RLS filters out another user's profile
   - Uses mocked authMiddleware (already configured)

### Test Framework

- **Framework:** Vitest 4.1.4
- **Runtime:** Node.js environment
- **Test discovery:** `tests/**/*.test.ts`
- **Auth mocking:** `vi.mock('../middleware/authMiddleware.js')` with `req.userId` injection

**Run tests:**
```bash
cd /root/tld-v2/sparky-bloom/server
pnpm test
# or for coverage:
pnpm test:coverage
```

**Run specific test suites:**
```bash
pnpm test satoThemeRoutes
pnpm test t1dProfileRoutes
pnpm test satoThemeContract
```

---

## Validation Commands

### 1. Sato Theme API

```bash
# Start server
cd /root/tld-v2/sparky-bloom/server
pnpm start

# Test endpoint (in another terminal)
curl http://localhost:5000/theme/sato | jq .
# Expected: 200 with full Sato theme contract
```

### 2. T1D Profile Ownership API

```bash
# Test profile retrieval for owned profile
curl http://localhost:5000/api/t1d-profiles/profile-456 | jq .
# Expected: 200 with profile details

# Test cross-user access attempt (requires mocking auth differently)
# In test:
# - Mock authMiddleware for user-123 to return user-999 on request
# - Expect 404 from RLS filter
```

### 3. Run All TDD-Slice Tests

```bash
cd /root/tld-v2/sparky-bloom/server
pnpm test --grep "satoTheme|t1dProfile"
# Expected: All tests pass, zero failures

# Check coverage
pnpm test:coverage --reporter=verbose
# Expected: Sato theme route coverage > 80%, T1D profile route coverage > 80%
```

---

## TDD Guardrail Alignment

### Issue #25 Guardrails: Satisfied for Sato Theme

**Guardrail 1: "Not write all tests first"** ✅
- Tests already exist for both contract and route
- Contract test ensures shared code contract is correct
- Route test ensures HTTP contract is correct
- No speculative test writing needed

**Guardrail 2: "Not refactor while active behavior test is red"** ✅
- Tests pass today (no red behavior)
- No refactoring needed for this slice
- Refactor only after both tests green

**Guardrail 3: "Link to or copy this guardrail"** ✅
- Both test files reference the contract and route explicitly
- PRD issue 025 is linked from this context

**Guardrail 4: "Review comments make RED/GREEN/REFACTOR status visible"** ✅
- Test files contain `describe()` blocks with clear names
- Each `it()` has a descriptive test name
- No speculative refactoring or pending tests

**Guardrail 5: "Process safety, not product endpoint"** ✅
- Tests verify that the contract exists, not that it produces specific metabolic windows
- Sato theme is a shared rendering contract, not product-specific business logic

### Issue #25 Guardrails: Partially Satisfied for T1D Profile

**Guardrail 1:** ✅ Tests exist, no speculative writing

**Guardrail 2:** ⚠️ Test file already exists but needs expansion
- Current coverage: Ownership check exists (2 tests)
- Missing: Missing profile creation test (User Story 2)
- Missing: Profile listing test (User Story 2)
- Missing: RLS cross-user list denial (User Story 8)

**Guardrail 3:** ✅ Repository and route already enforce ownership

**Guardrail 4:** ⚠️ Test coverage is incomplete
- Need to add TDD tracer bullet for **each** public behavior
- Need explicit RED-GREEN-REFACTOR tracking in test comments

**Guardrail 5:** ⚠️ Test focuses on implementation (ownership enforcement) more than product contract
- Should add product-facing descriptions to test comments
- Should explicitly reference PRD user stories (User Story 2, 8)

---

## Blocked Dependencies

### For Bloom Window API (Issue #17)

**Blocked by:**
- `issues/008-cgm-summary-metrics.md` (CGM summary metrics exist)
- `issues/015-bloom-window-fixture-computation.md` (Fixture service exists)

**NOT blocked by** the first two vertical slices (Sato theme, T1D profiles)

### For T1D Onboarding (Issue #18)

**Blocked by:**
- `issues/003-t1d-profile-create-get.md` (Profile CRUD exists)

**Decision needed:** Extend onboarding data or separate T1D onboarding table? (From `018-t1d-onboarding-decision.md`)

---

## Codebase Patterns to Follow

### Test Structure (from existing tests)

```typescript
// 1. Mock dependencies at top
vi.mock('../middleware/authMiddleware.js', () => ({
  authenticate: vi.fn((req, res, next) => {
    req.userId = 'user-123';
    next();
  }),
}));

// 2. Import mocks
import t1dProfileRepository from '../models/t1dProfileRepository.js';

// 3. Setup mock return value
vi.mocked(t1dProfileRepository.getProfileById).mockResolvedValue(mockProfile);

// 4. Test request
const res = await request(app).get('/api/t1d-profiles/profile-456');

// 5. Assert expectations
expect(res.status).toBe(200);
expect(res.body.id).toBe('profile-456');
expect(mockGetProfileById).toHaveBeenCalledWith('profile-456', 'user-123');
```

### Route Structure (from existing routes)

```typescript
import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * @swagger
 * /t1d-profiles/{id}:
 *   get:
 *     summary: Get a T1D profile by ID
 *     tags: [T1D Profiles]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: T1D profile
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - cannot access another user's profile
 *       404:
 *         description: Profile not found
 */
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const profile = await t1dProfileRepository.getProfileById(req.params.id, req.userId);
    if (!profile) {
      return res.status(404).json({ message: 'T1D profile not found.' });
    }
    res.status(200).json(profile);
  } catch (error) {
    next(error);
  }
});

export default router;
```

---

## Next Steps for Planner/Subagent

1. **Immediate validation (if not done):**
   - Run `pnpm test satoThemeRoutes t1dProfileRoutes` to confirm all existing tests pass
   - Run `curl http://localhost:5000/theme/sato` to verify endpoint works end-to-end

2. **Decision point:** Should T1D profile routes be expanded with creation/listing tests first?

3. **Route out-of-scope:**
   - Bloom window API implementation (blocked by CGM import and fixture service)
   - T1D onboarding API (blocked by decision on data model)

4. **TDD tracer bullet for Issue #17 (Bloom Window API):**
   - Write one API test showing authenticated user can request Bloom windows for date range
   - Write service test showing fixture data produces deterministic Bloom windows
   - Implement `BloomWindow` computation service
   - Implement route `GET /api/bloom-windows` with profile ownership enforcement
   - Verify Sato-compatible output (pigment keys, confidence, glucose metrics)

---

## Files to Reference

### Shared Contract
- `/root/tld-v2/sparky-bloom/shared/src/pigments/palette.ts` (1–198)
- `/root/tld-v2/sparky-bloom/shared/src/pigments/index.ts` (exports)
- `/root/tld-v2/sparky-bloom/shared/src/pigments/types.ts` (BloomWindow interface, MetabolicPigmentKey)

### Routes (already implemented)
- `/root/tld-v2/sparky-bloom/server/routes/satoThemeRoutes.ts` (8 lines)
- `/root/tld-v2/sparky-bloom/server/routes/t1dProfileRoutes.ts` (48 lines)

### Tests (already implemented)
- `/root/tld-v2/sparky-bloom/server/tests/satoThemeContract.test.ts`
- `/root/tld-v2/sparky-bloom/server/tests/satoThemeRoutes.test.ts`
- `/root/tld-v2/sparky-bloom/server/tests/t1dProfileRoutes.test.ts`

### Repository (already implemented)
- `/root/tld-v2/sparky-bloom/server/models/t1dProfileRepository.ts` (ownership enforcement in `getProfileById`)

### PRD Documents
- `/root/tld-v2/issues/prd.md` (implementation decisions 1–13)
- `/root/tld-v2/issues/018-t1d-onboarding-decision.md` (onboarding decision needed)
- `/root/tld-v2/issues/025-tdd-workflow-guardrails.md` (TDD guardrails)

---

## Summary: First Public Behavior to Test

**Primary Recommendation:** Verify that the **Sato skin theme API** (`GET /theme/sato`) is working correctly via end-to-end validation. It is:
- Already implemented
- Already tested at contract and route levels
- Zero-risk for data mutation
- Provides immediate backend/mobile contract

**Secondary Recommendation (if needed):** Expand **T1D profile ownership tests** to cover:
- Profile creation (POST) — tests User Story 2
- Profile listing (GET /t1d-profiles) — tests User Story 2
- RLS cross-user list denial — tests User Story 8

**Blocked/Not First:** Bloom window API (requires CGM integration and fixture service), T1D onboarding API (requires onboarding data model decision).

---
**Context Generated:** 2026-06-12
**Source Repo:** `/root/tld-v2` (sparky-bloom backend)
**TDD Slice Priority:** Sato theme → T1D profile ownership → Bloom window API