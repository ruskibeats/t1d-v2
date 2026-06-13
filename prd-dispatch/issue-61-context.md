# Issue #61: T1D Profile List and RLS Context

**Issue File:** `issues/004-t1d-profile-list-rls.md`
**Parent PRD:** `issues/prd.md`
**TDD Guardrails:** `issues/025-tdd-workflow-guardrails.md`
**Previous Issue:** `issues/003-t1d-profile-create-get.md`

---

## Issue Summary

Add T1D profile listing and cross-user access protection so profile ownership is verifiable through public APIs.

### What to Build
- Authenticated user can list their own T1D profiles
- Cross-user profile access is rejected
- Unauthenticated requests are rejected
- RLS or equivalent ownership enforcement is verified
- Tests verify owner-only behavior through public APIs

### TDD Tracer Bullet
Write one API test showing one authenticated user cannot retrieve another user's T1D profile.

### Blocked By
- Blocked by `issues/003-t1d-profile-create-get.md`

### User Stories Addressed
- User story 2: Create/retrieve T1D profile
- User story 8: CGM data protected from other users
- User story 33: RLS policies verified for every T1D table
- User story 34: Swagger documents new APIs
- User story 35: Tests verify public behavior
- User story 36: Implement one vertical slice at a time

---

## PRD Context

### Strategic Direction
The backend is being reskinned from SparkyFitness (wellness/nutrition) to T1D/Bloom (glucose, CGM, meal reviews, forecast envelopes). The first vertical slices should expose real behavior through public APIs rather than cosmetic renaming.

### Implementation Decisions
- T1D profile ownership must be enforced through RLS and authenticated route behavior
- T1D API routes must use the authenticated user context to associate data with the correct profile
- RLS policies must be verified for every T1D table
- Tests should verify public behavior through APIs and services where appropriate
- Refactoring should happen only after each vertical slice is green

### Testing Decisions
- Good tests verify external behavior, not implementation details
- TDD workflow: one public behavior → one failing test → minimal implementation → refactor
- Tests should avoid mocking internal collaborators unless the public interface cannot reasonably be exercised
- Tests should not depend on private functions, private methods, or internal data structures

---

## TDD Guardrails

### Workflow Requirements
1. Choose one public behavior
2. Write one failing test
3. Implement the minimum code needed to pass
4. Refactor only after the test passes
5. Repeat for the next behavior

### Prohibited Patterns
- Do NOT write all tests first and all implementation later
- Do NOT refactor while the active behavior test is red
- Do NOT write speculative refactors before behavior is green

### Review Requirements
- Review comments/checklists must make RED/GREEN/REFACTOR status visible
- The guardrail is phrased as process safety, not as a product endpoint

---

## Existing Implementation

### Database Schema

**Table:** `public.t1d_profiles`

```sql
CREATE TABLE IF NOT EXISTS public.t1d_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sparky_user_id UUID REFERENCES public."user"(id) ON DELETE CASCADE,
    subject_type TEXT NOT NULL DEFAULT 'sparky_user' CHECK (subject_type IN ('sparky_user', 'simulated', 'legend')),
    display_name TEXT NOT NULL,
    legend_key TEXT REFERENCES public.t1d_legends(key) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'disabled')),
    metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_t1d_profiles_sparky_user_once
    ON public.t1d_profiles(sparky_user_id)
    WHERE sparky_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_t1d_profiles_subject_type
    ON public.t1d_profiles(subject_type, status);
```

**Key Fields:**
- `id`: UUID primary key
- `sparky_user_id`: Foreign key to `public.user`, nullable (for legends/simulated users)
- `subject_type`: 'sparky_user' | 'simulated' | 'legend'
- `display_name`: User-facing name
- `legend_key`: Optional reference to T1D legend
- `status`: 'active' | 'archived' | 'disabled'
- `metadata_json`: JSONB for extensibility

### Repository Layer

**File:** `server/models/t1dProfileRepository.ts`

**Existing Functions:**
```typescript
// Get or create profile for a Sparky user (used in issue #003)
async function getOrCreateProfileForSparkyUser(
  userId: string,
  actingUserId: string,
  overrides?: Partial<Pick<T1DProfile, 'display_name' | 'metadata_json'>>
): Promise<T1DProfile>

// Get single profile by ID (used in issue #003)
async function getProfileById(
  profileId: string,
  userId: string
): Promise<T1DProfile | null>

// Get ALL profiles for a Sparky user (NEW - needed for issue #004)
async function getProfilesForSparkyUser(userId: string): Promise<T1DProfile[]>
```

**Repository Pattern:**
- Uses `getClient(userId)` to establish connection with RLS context
- Returns `T1DProfile[]` array
- Orders by `created_at DESC` (newest first)
- No pagination in current implementation

### RLS Policies

**File:** `prod/SparkyFitnessServer/db/rls_policies.sql`

**Existing T1D Profile Policies (lines 424-433):**

```sql
-- SELECT policy: Allow access to own profiles, legends, simulated users, or profiles with diary access
CREATE POLICY t1d_profiles_select_policy ON public.t1d_profiles FOR SELECT TO PUBLIC
USING (
  sparky_user_id = current_user_id()
  OR subject_type IN ('legend', 'simulated')
  OR (
    sparky_user_id IS NOT NULL
    AND has_diary_access(sparky_user_id)
  )
);

-- MODIFY policy: Only owner can modify (or legends/simulated with admin access)
CREATE POLICY t1d_profiles_modify_policy ON public.t1d_profiles FOR ALL TO PUBLIC
USING (sparky_user_id = current_user_id())
WITH CHECK (
  sparky_user_id = current_user_id()
  OR (
    sparky_user_id IS NULL
    AND subject_type IN ('legend', 'simulated')
    AND can_modify_t1d_reference_data()
  )
);
```

**Helper Functions:**
```sql
-- Check if user has diary access (own or family)
CREATE OR REPLACE FUNCTION has_diary_access(owner_uuid uuid) RETURNS bool
LANGUAGE sql STABLE
AS $function$
  SELECT authenticated_user_id() = owner_uuid OR has_family_access(owner_uuid, 'can_manage_diary');
$function$;

-- Check if user has T1D profile access (owner, legend, simulated, or diary access)
CREATE OR REPLACE FUNCTION has_t1d_profile_access(profile_uuid uuid) RETURNS bool
LANGUAGE sql STABLE
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.t1d_profiles p
    WHERE p.id = profile_uuid
      AND (
        p.sparky_user_id = current_user_id()
        OR p.subject_type IN ('legend', 'simulated')
        OR (
          p.sparky_user_id IS NOT NULL
          AND has_diary_access(p.sparky_user_id)
        )
      )
  );
$function$;

-- Check if user is the owner of a T1D profile
CREATE OR REPLACE FUNCTION has_t1d_profile_owner_access(profile_uuid uuid) RETURNS bool
LANGUAGE sql STABLE
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.t1d_profiles p
    WHERE p.id = profile_uuid
      AND p.sparky_user_id = current_user_id()
  );
$function$;
```

**RLS Context:**
- `app.user_id`: Used by RLS to determine whose data is being accessed
- `app.authenticated_user_id`: The actual logged-in user
- `current_user_id()`: Returns `app.user_id`
- `authenticated_user_id()`: Returns `app.authenticated_user_id`

### Route Layer

**Current State:**
- No T1D profile routes exist yet
- Sato theme route exists at `/api/theme/sato` (example of public API pattern)
- Other T1D-related routes will be added in subsequent issues

**Sato Theme Route Example:**
```typescript
// File: server/routes/satoThemeRoutes.ts
router.get('/sato', (_req, res) => {
  res.json(SATO_THEME);
});
```

**Pattern to Follow:**
- Use `authenticate` middleware to extract `req.userId`
- Use `req.userId` as the acting user for repository calls
- Return 401 for unauthenticated requests
- Return 403 for unauthorized access
- Use Swagger for API documentation

### Test Layer

**Existing Test Patterns:**

**File:** `server/tests/satoThemeRoutes.test.ts`

```typescript
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
      // ... assertions
    });
  });
});
```

**Meal Routes Test Pattern (authenticated):**

**File:** `server/tests/mealRoutes.test.ts`

```typescript
import { vi, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import express from 'express';
import mealRoutes from '../routes/mealRoutes.js';
import mealService from '../services/mealService.js';
import errorHandler from '../middleware/errorHandler.js';
import { v4 as uuidv4 } from 'uuid';

// Mock middleware and service
vi.mock('../services/mealService');
vi.mock('../middleware/authMiddleware', () => ({
  authenticate: vi.fn((req, res, next) => {
    req.userId = 'testUserId';
    next();
  }),
  authenticateToken: vi.fn((req, res, next) => {
    req.userId = 'testUserId';
    next();
  }),
  authorizeAccess: vi.fn(() => (req: any, res: any, next: any) => {
    next();
  }),
}));

const app = express();
app.use(express.json());
app.use('/meals', mealRoutes);
app.use(errorHandler);

describe('Meal Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /meals', () => {
    it('should return all meals for the user', async () => {
      const meals = [{ id: uuidv4(), name: 'Meal 1' }];
      mealService.getMeals.mockResolvedValue(meals);
      const res = await request(app).get('/meals');
      expect(res.statusCode).toEqual(200);
      expect(res.body).toEqual(meals);
      expect(mealService.getMeals).toHaveBeenCalledWith('testUserId', undefined, undefined);
    });
  });
});
```

**Key Test Patterns:**
- Use `supertest` for HTTP requests
- Mock `authMiddleware.authenticate` to set `req.userId`
- Mock services to avoid database dependencies
- Use `describe` blocks for route groups
- Use `it` blocks for individual behaviors
- Assert HTTP status codes, response bodies, and service calls

---

## Public Behavior to Test First

### Primary Behavior (Issue #004)

**Test: List own T1D profiles**
- Endpoint: `GET /api/t1d-profiles`
- Authenticated user can list their own T1D profiles
- Returns array of profiles ordered by `created_at DESC`
- Includes all profile fields (id, sparky_user_id, subject_type, display_name, legend_key, status, metadata_json, created_at, updated_at)

**Test: Cross-user access denial**
- Endpoint: `GET /api/t1d-profiles/:id`
- Authenticated user cannot retrieve another user's T1D profile
- Returns 403 Forbidden
- RLS policy `has_t1d_profile_owner_access` should enforce this

**Test: Unauthenticated access denial**
- Endpoint: `GET /api/t1d-profiles`
- Unauthenticated requests are rejected
- Returns 401 Unauthorized

### Secondary Behavior (Issue #003 - already implemented)

**Test: Create T1D profile**
- Endpoint: `POST /api/t1d-profiles`
- Authenticated user can create a T1D profile
- Profile is associated with the authenticated user
- Invalid request bodies are rejected with clear validation errors

**Test: Retrieve T1D profile by ID**
- Endpoint: `GET /api/t1d-profiles/:id`
- Authenticated user can retrieve their own T1D profile
- Returns 404 if profile not found
- Returns 403 if user tries to access another user's profile

---

## Validation Commands

### Run Tests
```bash
cd /root/tld-v2/sparky-bloom/server
npm test -- t1dProfileRoutes.test.ts
```

### Run Specific Test Suite
```bash
npm test -- --run tests/t1dProfileRoutes.test.ts
```

### Run All Tests
```bash
npm test
```

### Check RLS Policies
```bash
psql -U postgres -d sparky_fitness -c "SELECT policyname, tablename, permissive, roles, cmd, qual, with_check FROM pg_policies WHERE tablename = 't1d_profiles';"
```

### Verify RLS is Enabled
```bash
psql -U postgres -d sparky_fitness -c "SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 't1d_profiles';"
```

### Test API Endpoints
```bash
# List profiles (should fail without auth)
curl -X GET http://localhost:3010/api/t1d-profiles

# List profiles (should succeed with auth)
curl -X GET http://localhost:3010/api/t1d-profiles \
  -H "Cookie: sparky-auth=<valid-cookie>"

# Get specific profile (should fail without auth)
curl -X GET http://localhost:3010/api/t1d-profiles/<profile-id>

# Get specific profile (should succeed with auth)
curl -X GET http://localhost:3010/api/t1d-profiles/<profile-id> \
  -H "Cookie: sparky-auth=<valid-cookie>"
```

---

## Implementation Approach

### Step 1: Create T1D Profile Routes
**File:** `server/routes/t1dProfileRoutes.ts`

```typescript
import express from 'express';
import { authenticate } from '../middleware/authMiddleware.js';
import t1dProfileRepository from '../models/t1dProfileRepository.js';

const router = express.Router();

/**
 * @swagger
 * /t1d-profiles:
 *   get:
 *     summary: List T1D profiles for the authenticated user
 *     tags: [T1D Profiles]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of T1D profiles
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/T1DProfile'
 *       401:
 *         description: Unauthorized
 */
router.get('/', authenticate, async (req, res, next) => {
  try {
    const profiles = await t1dProfileRepository.getProfilesForSparkyUser(req.userId);
    res.status(200).json(profiles);
  } catch (error) {
    next(error);
  }
});

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
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/T1DProfile'
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

### Step 2: Register Routes in Main Server
**File:** `server/SparkyFitnessServer.ts`

Add import and route registration:
```typescript
import t1dProfileRoutes from './routes/t1dProfileRoutes.js';

// ... in app setup
app.use('/api/t1d-profiles', t1dProfileRoutes);
```

### Step 3: Create Test Suite
**File:** `server/tests/t1dProfileRoutes.test.ts`

```typescript
import { vi, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import express from 'express';
import t1dProfileRoutes from '../routes/t1dProfileRoutes.js';
import t1dProfileRepository from '../models/t1dProfileRepository.js';
import errorHandler from '../middleware/errorHandler.js';
import { v4 as uuidv4 } from 'uuid';

// Mock middleware and repository
vi.mock('../models/t1dProfileRepository');
vi.mock('../middleware/authMiddleware', () => ({
  authenticate: vi.fn((req, res, next) => {
    req.userId = 'testUserId';
    next();
  }),
  authenticateToken: vi.fn((req, res, next) => {
    req.userId = 'testUserId';
    next();
  }),
  authorizeAccess: vi.fn(() => (req: any, res: any, next: any) => {
    next();
  }),
}));

const app = express();
app.use(express.json());
app.use('/api/t1d-profiles', t1dProfileRoutes);
app.use(errorHandler);

describe('T1D Profile Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/t1d-profiles', () => {
    it('should return all profiles for the authenticated user', async () => {
      const profiles = [
        {
          id: uuidv4(),
          sparky_user_id: 'testUserId',
          subject_type: 'sparky_user',
          display_name: 'My T1D Profile',
          legend_key: null,
          status: 'active',
          metadata_json: {},
          created_at: new Date(),
          updated_at: new Date(),
        },
      ];
      t1dProfileRepository.getProfilesForSparkyUser.mockResolvedValue(profiles);

      const res = await request(app).get('/api/t1d-profiles');
      expect(res.statusCode).toEqual(200);
      expect(res.body).toEqual(profiles);
      expect(t1dProfileRepository.getProfilesForSparkyUser).toHaveBeenCalledWith('testUserId');
    });

    it('should return 401 for unauthenticated requests', async () => {
      const res = await request(app).get('/api/t1d-profiles');
      expect(res.statusCode).toEqual(401);
    });
  });

  describe('GET /api/t1d-profiles/:id', () => {
    it('should return a profile if the user owns it', async () => {
      const profileId = uuidv4();
      const profile = {
        id: profileId,
        sparky_user_id: 'testUserId',
        subject_type: 'sparky_user',
        display_name: 'My T1D Profile',
        legend_key: null,
        status: 'active',
        metadata_json: {},
        created_at: new Date(),
        updated_at: new Date(),
      };
      t1dProfileRepository.getProfileById.mockResolvedValue(profile);

      const res = await request(app).get(`/api/t1d-profiles/${profileId}`);
      expect(res.statusCode).toEqual(200);
      expect(res.body).toEqual(profile);
      expect(t1dProfileRepository.getProfileById).toHaveBeenCalledWith(profileId, 'testUserId');
    });

    it('should return 403 if the user tries to access another user\'s profile', async () => {
      const profileId = uuidv4();
      t1dProfileRepository.getProfileById.mockResolvedValue(null); // Profile exists but belongs to another user

      const res = await request(app).get(`/api/t1d-profiles/${profileId}`);
      expect(res.statusCode).toEqual(403);
      expect(res.body).toHaveProperty('message');
    });

    it('should return 404 if the profile does not exist', async () => {
      const profileId = uuidv4();
      t1dProfileRepository.getProfileById.mockResolvedValue(null);

      const res = await request(app).get(`/api/t1d-profiles/${profileId}`);
      expect(res.statusCode).toEqual(404);
      expect(res.body).toHaveProperty('message');
    });

    it('should return 401 for unauthenticated requests', async () => {
      const profileId = uuidv4();
      const res = await request(app).get(`/api/t1d-profiles/${profileId}`);
      expect(res.statusCode).toEqual(401);
    });
  });
});
```

### Step 4: Verify RLS Enforcement

The existing RLS policy `t1d_profiles_select_policy` already enforces:
- Users can only see their own profiles (`sparky_user_id = current_user_id()`)
- Legends and simulated users are accessible to all
- Users with diary access can see profiles of users they have access to

The repository function `getProfileById` passes `req.userId` to `getClient(userId)`, which sets the RLS context. This ensures that even if the repository query returns a profile, RLS will filter out profiles that don't belong to the authenticated user.

---

## Risks and Constraints

### RLS Enforcement
- The existing RLS policy allows access to profiles with diary access (family sharing)
- This is intentional per PRD: "T1D profile ownership must be enforced through RLS and authenticated route behavior"
- Tests should verify that users with family access can see profiles they have access to

### Repository Limitations
- `getProfilesForSparkyUser` does not support pagination
- Future issues may need to add pagination, filtering, and sorting
- For now, return all profiles for the user

### Test Dependencies
- Tests mock the repository to avoid database dependencies
- This is acceptable per TDD guardrails: "Tests should avoid mocking internal collaborators unless the public interface cannot reasonably be exercised"
- The repository is a pure data access layer, so mocking is appropriate

### Swagger Documentation
- Routes should include Swagger annotations for API documentation
- This is required per PRD: "Swagger should document new T1D, Bloom, and skin theme APIs"
- Use existing Swagger patterns from other routes

---

## Success Criteria

### Must Have
- [ ] Authenticated user can list their own T1D profiles via `GET /api/t1d-profiles`
- [ ] Authenticated user can retrieve their own T1D profile via `GET /api/t1d-profiles/:id`
- [ ] Cross-user profile access is rejected with 403 Forbidden
- [ ] Unauthenticated requests are rejected with 401 Unauthorized
- [ ] RLS policy `t1d_profiles_select_policy` enforces ownership
- [ ] Tests verify public API behavior (not implementation details)
- [ ] Swagger documentation is added for new endpoints

### Should Have
- [ ] Tests follow TDD guardrails (one behavior, one test, one implementation)
- [ ] Error messages are clear and helpful
- [ ] Repository functions are reused from issue #003
- [ ] Code follows existing patterns in the codebase

### Nice to Have
- [ ] Pagination support in `getProfilesForSparkyUser`
- [ ] Filtering by status or subject_type
- [ ] Sorting options
- [ ] Integration tests with real database

---

## Next Steps

1. **Create routes file** (`server/routes/t1dProfileRoutes.ts`)
2. **Register routes** in `SparkyFitnessServer.ts`
3. **Create test file** (`server/tests/t1dProfileRoutes.test.ts`)
4. **Run tests** to verify RED state
5. **Implement minimal code** to make tests pass
6. **Verify RLS enforcement** with database queries
7. **Refactor** only after tests are green
8. **Update Swagger** with new endpoints
9. **Review** against TDD guardrails

---

## Related Files

### Models
- `server/models/t1dProfileRepository.ts` - Repository functions (already implemented)

### Routes
- `server/routes/satoThemeRoutes.ts` - Example of public API pattern
- `server/routes/preferenceRoutes.ts` - Example of authenticated route pattern
- `server/routes/exercisePresetEntryRoutes.ts` - Example of route with validation

### Tests
- `server/tests/satoThemeRoutes.test.ts` - Example of route test pattern
- `server/tests/mealRoutes.test.ts` - Example of authenticated route test pattern

### Database
- `prod/SparkyFitnessServer/db/rls_policies.sql` - RLS policies (already implemented)
- `prod/db_schema_backup.sql` - Database schema

### Configuration
- `server/SparkyFitnessServer.ts` - Main server file (route registration)
- `server/middleware/authMiddleware.ts` - Authentication middleware

---

## Notes

- The repository layer already has the necessary functions (`getProfilesForSparkyUser` and `getProfileById`)
- RLS policies are already in place and will enforce ownership
- No database migrations are needed
- No new dependencies are required
- The implementation should follow the existing patterns in the codebase