# Issue #60: T1D Profile Create/Get - Implementation Context

## Summary
Implement T1D profile creation and retrieval APIs for authenticated users, following TDD guardrails. The work is based on issue `003-t1d-profile-create-get.md` and is blocked by none.

## Requirement Context

### Issue Requirements (003-t1d-profile-create-get.md)
**What to build:**
- Authenticated user can create a T1D profile
- Authenticated user can retrieve their own T1D profile
- Profile is associated with the authenticated user
- Invalid request bodies are rejected with clear validation errors
- Tests verify public API behavior
- Existing SparkyFitness behavior is not removed

**TDD tracer bullet:**
- Write one API test showing an authenticated user can create a T1D profile and retrieve it by ID

### PRD Context (prd.md)
This issue addresses User Stories:
- **User story 2**: Create or retrieve T1D profile so backend knows how to associate data with the right profile
- **User stories 33-36**: RLS policies, Swagger documentation, integration-style tests, and vertical slice implementation

**Implementation strategy:**
- Vertical TDD slices (one public behavior at a time)
- Functional T1D/Bloom behavior before cosmetic SparkyFitness renaming
- Preserve existing SparkyFitness behavior during transition
- Tests verify public interfaces, not implementation details
- RLS policies must be verified for T1D tables

### TDD Workflow Guardrails (025-tdd-workflow-guardrails.md)
**Required process:**
1. Choose one public behavior
2. Write one failing public-interface test
3. Implement minimum code to pass
4. Refactor only after test passes
5. Repeat for next behavior

**Important constraints:**
- Do NOT write all tests first and implementation later
- Do NOT refactor while the active behavior test is RED
- Review comments/checklists must show RED/GREEN/REFACTOR status
- Guardrail is process safety, not product endpoint

## Existing Codebase Patterns

### Database Schema (Migration 20260612000000_add_t1d_vector_platform.sql)

**t1d_profiles table:**
```sql
CREATE TABLE IF NOT EXISTS public.t1d_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sparky_user_id UUID REFERENCES public."user"(id) ON DELETE CASCADE,
    subject_type TEXT NOT NULL DEFAULT 'sparky_user'
        CHECK (subject_type IN ('sparky_user', 'simulated', 'legend')),
    display_name TEXT NOT NULL,
    legend_key TEXT REFERENCES public.t1d_legends(key) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'archived', 'disabled')),
    metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Key constraints:**
- `sparky_user_id` UNIQUE index with NULL constraint (`idx_t1d_profiles_sparky_user_once`)
- Enforces one profile per user when sparky_user_id is set
- Foreign key cascade delete on user removal

### Repository Layer (t1dProfileRepository.ts)

**Existing repository pattern:**
- Single repository file per entity
- Gets database client from `poolManager.getClient(userId)`
- Uses parameterized queries for security
- Returns typed interfaces with Date fields (not ISO strings)

**Available functions:**
```typescript
interface T1DProfile {
  id: string;
  sparky_user_id: string | null;
  subject_type: T1DProfileSubjectType; // 'sparky_user' | 'simulated' | 'legend'
  display_name: string;
  legend_key: string | null;
  status: string;
  metadata_json: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

// Functions:
getOrCreateProfileForSparkyUser(userId, actingUserId, overrides?): Promise<T1DProfile>
getProfileById(profileId, userId): Promise<T1DProfile | null>
getProfilesForSparkyUser(userId): Promise<T1DProfile[]>
```

**Key patterns:**
- `getOrCreateProfileForSparkyUser` uses INSERT ... ON CONFLICT to create or update
- Requires both `userId` (RLS user context) and `actingUserId` (authenticated user)
- Default display_name: "T1D Profile"
- Default status: "active"

### Auth Pattern

**Middleware:** `server/middleware/authMiddleware.ts`
- Sets `req.authenticatedUserId` (user who sent the request)
- Sets `req.userId` (active context user for RLS)
- Sets `req.activeUserId` (same as `req.userId` when no context switch)
- Validates via Better Auth session check
- Supports API key authentication with caching optimization

**Route decorators:**
```typescript
router.get('/path', authenticate, async (req, res, next) => {
  // req.userId = RLS context user
  // req.authenticatedUserId = original authenticated user
});
```

**Public identity routes:** `server/routes/auth/userProfileRoutes.ts`
- Example of authenticated route patterns
- Shows cookie-based authentication setup
- Uses `authService.getUserProfile(userId)` for profile lookup
- Returns 404 with empty object when profile doesn't exist

### Route Patterns

**Example route structure (foodEntryRoutes.ts):**
```typescript
router.get('/profile/:id', authenticate, async (req, res, next) => {
  try {
    const result = await repo.getById(req.params.id, req.userId);
    if (!result) {
      return res.status(404).json({ error: 'Not found.' });
    }
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

router.post('/profile', authenticate, async (req, res, next) => {
  try {
    const result = await repo.create(req.userId, req.body);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});
```

**Test patterns (goalPresetRoutes.test.ts):**
- Uses `supertest` for HTTP assertions
- Sets `userId` cookie in tests: `set('Cookie', ['userId=testUser'])`
- Mocks services: `vi.mock('../services/goalPresetService')`
- Expects HTTP status codes (200, 201, 400, 404, 409)
- Verifies both body and service calls

### Test Files

**Run command:** `pnpm test` (server package.json)
**Framework:** Vitest with `supertest`
**Test location:** `server/tests/*.test.ts`

**Existing related tests:**
- `t1dNightscoutImportService.test.ts` - Service pure helper tests
- `satoThemeRoutes.test.ts` - Route test with supertest
- `goalPresetRoutes.test.ts` - Complex route test with mocking

## API Design Recommendations

### Endpoint Structure

**Option 1: Separate create/get endpoints (recommended)**
```
POST   /api/health-data/t1d/profile           Create T1D profile
GET    /api/health-data/t1d/profile/:id       Get T1D profile by ID
GET    /api/health-data/t1d/profile           List profiles for user
```

**Option 2: Single endpoint with ID parameter**
```
POST   /api/health-data/t1d/profile           Create T1D profile (auto-assigns ID)
GET    /api/health-data/t1d/profile           Get current user's profile
PUT    /api/health-data/t1d/profile/:id       Update profile
DELETE /api/health-data/t1d/profile/:id       Delete profile
```

**Option 3: Mount under `/api/health-data` (current location)**
```
POST   /api/health-data/t1d/profile           Create T1D profile
GET    /api/health-data/t1d/profile           Get current user's profile
GET    /api/health-data/t1d/profile/:id       Get specific profile (owners-only)
```

**Recommendation:** Option 1 with mocking for now (issue #003 only covers create/get).

### Schema Design

**Create profile request:**
```typescript
interface CreateT1DProfileRequest {
  display_name?: string;
  subject_type?: 'sparky_user' | 'simulated' | 'legend';
  status?: 'active' | 'archived' | 'disabled';
  legend_key?: string;
  metadata_json?: Record<string, unknown>;
}
```

**Response:**
```typescript
interface T1DProfileResponse {
  id: string;
  sparky_user_id: string | null;
  subject_type: 'sparky_user' | 'simulated' | 'legend';
  display_name: string;
  legend_key: string | null;
  status: string;
  metadata_json: Record<string, unknown>;
  created_at: string; // ISO 8601 date string
  updated_at: string;
}
```

**Validation requirements:**
- `display_name`: required, max length 255 (assume based on existing patterns)
- `subject_type`: must be one of allowed values if provided
- `status`: must be one of allowed values if provided
- `metadata_json`: JSON object, no nesting validation needed

### Error Responses

**Validation errors:**
```
Status: 400
Body: {
  error: "Invalid request body",
  details: {
    fields: {
      display_name: ["display_name is required"]
    }
  }
}
```

**Not found:**
```
Status: 404
Body: { error: "T1D profile not found." }
```

**Already exists:**
```
Status: 409
Body: { error: "A T1D profile already exists for this user." }
```

**Unauthorized:**
```
Status: 401
Body: { error: "Authentication required." }
```

## Implementation Plan

### Primary Files to Create/Modify

**New files:**
1. `server/services/t1dProfileService.ts` - Business logic layer
2. `server/routes/t1dProfileRoutes.ts` - Route handlers
3. `server/tests/t1dProfileRoutes.test.ts` - Integration tests
4. `server/schemas/t1dProfileSchema.ts` - Request/response validation (if needed)

**Modify files:**
1. `server/integrations/healthData/t1dRoutes.ts` - Mount profile routes
2. `server/db/poolManager.ts` - May need review for RLS usage patterns

**Reference files:**
- `server/models/t1dProfileRepository.ts` - Existing repository
- `server/routes/auth/userProfileRoutes.ts` - Auth pattern reference
- `server/middleware/authMiddleware.ts` - Auth behavior
- `server/db/migrations/20260612000000_add_t1d_vector_platform.sql` - Schema

### Test-First Approach (TDD Guardrail)

**Phase 1: Create profile endpoint test**
1. Write failing test: POST /api/health-data/t1d/profile
   - Authenticate as user A
   - Send valid profile data
   - Expect 201 with profile ID and ownership
   - Verify `sparky_user_id` matches authenticated user
2. Implement minimal repository call in route handler
3. Make test pass (RED → GREEN)
4. No refactoring yet

**Phase 2: Get profile endpoint test**
1. Write failing test: GET /api/health-data/t1d/profile/:id
   - Authenticate as user A
   - Retrieve profile created in Phase 1
   - Expect 200 with full profile data
   - Verify `sparky_user_id` matches authenticated user
2. Implement get by ID route handler
3. Make test pass
4. No refactoring yet

**Phase 3: Validation tests (within each phase)**
1. Test invalid display_name
2. Test missing required fields
3. Test invalid subject_type
4. Make all validation tests pass

**Phase 4: Refactoring (only after all tests green)**
1. Extract business logic to `t1dProfileService`
2. Consolidate route handlers
3. Add Swagger documentation
4. Ensure no tests fail

### RLS Considerations

**Database-level RLS:**
- Migration file includes RLS constraints
- `sparky_user_id` foreign key enforces user ownership
- `idx_t1d_profiles_sparky_user_once` enforces one profile per user

**Application-level checks:**
- Route handlers must verify `req.userId` matches profile ownership
- Use `t1dProfileRepository.getProfileById(profileId, req.userId)` which already does this
- For create: verify `req.authenticatedUserId` is set (middleware requirement)

### Swagger Documentation

**Use existing patterns:**
- Reference: `server/routes/auth/userProfileRoutes.ts` (Swagger annotations)
- Add tags: `@tags [T1D Health Data]`
- Include request/response schemas
- Document authentication requirement

Example:
```typescript
/**
 * @swagger
 * /health-data/t1d/profile:
 *   post:
 *     summary: Create a T1D profile for the authenticated user
 *     tags: [T1D Health Data]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [display_name]
 *             properties:
 *               display_name:
 *                 type: string
 *                 description: Display name for the T1D profile
 *               subject_type:
 *                 type: string
 *                 enum: [sparky_user, simulated, legend]
 *     responses:
 *       201:
 *         description: Profile created successfully
 *       400:
 *         description: Invalid request body
 *       401:
 *         description: Authentication required
 */
```

## Blocking Issues

**None - can start immediately**

**Depends on:** None
**Blocked by:** None

## Success Criteria

From issue #60:
- [ ] Authenticated user can create a T1D profile
- [ ] Authenticated user can retrieve their own T1D profile
- [ ] Profile is associated with the authenticated user
- [ ] Invalid request bodies are rejected with clear validation errors
- [ ] Tests verify public API behavior (integration-style, not unit tests)
- [ ] Existing SparkyFitness behavior is not removed

From PRD:
- [ ] TDD workflow followed (one behavior, one test, minimal implementation, refactor only when green)
- [ ] Integration-style tests verify public behavior, not implementation
- [ ] RLS policies verified for T1D tables (ownership enforcement)

## Technical Notes

### Repository Usage
- `poolManager.getClient(userId)` is the standard way to get a DB client
- Returns `pg.Client` with automatic connection release
- Must call `client.release()` in finally block
- Repository functions already handle this

### User Context
- `req.userId` = RLS user (may be different from authenticated user due to context switching)
- `req.authenticatedUserId` = original authenticated user
- For profile creation: `sparky_user_id` should match `req.authenticatedUserId`
- For profile retrieval: verify `req.userId` matches profile `sparky_user_id`

### Date Handling
- Repository returns `Date` objects (PostgreSQL native type)
- Route handlers should convert to ISO strings for JSON responses
- Use `toISOString()` for consistent format

### Unique Constraint Handling
- Database enforces one profile per user
- Application should catch 409 conflict and return friendly message
- Use `subject_type = 'legend'` for reference profiles without user ownership

## Alternative Considerations

### Direct repository calls in routes
**Pros:** Faster iteration (no extra service layer)
**Cons:** Business logic duplication, harder to test in isolation

**Decision:** Start with direct calls for minimal implementation, extract to service later if refactoring reveals repeated logic.

### Separate schema file or inline validation
**Pros:** Type safety, clear validation rules
**Cons:** Additional file, possible duplication with repository interface

**Decision:** Keep validation simple in routes first. If complex validation emerges, extract to Zod schema.

### Mount routes at root vs /api/health-data
**Pros:** Root path is shorter
**Cons:** Potential name collision with existing SparkyFitness profiles, less clear naming

**Decision:** Mount under `/api/health-data` to match existing T1D routes (t1dRoutes.ts already uses this prefix).

## Risks and Mitigations

**Risk:** RLS policies may be too loose, allowing cross-user access
**Mitigation:** Test with multiple user accounts, verify ownership enforcement

**Risk:** Display name might conflict with existing SparkyFitness profiles
**Mitigation:** Use unique suffix or ensure database layer handles name collisions gracefully

**Risk:** TDD guardrails may be violated (refactoring too early, writing all tests first)
**Mitigation:** Explicit RED-GREEN-REFACTOR checklist in test comments, follow issue #025 process

## Next Steps for Planner/Implementation Agent

1. Review this context document
2. Choose endpoint structure (recommendation: separate POST and GET)
3. Create `server/tests/t1dProfileRoutes.test.ts` with failing tests for:
   - POST create (success case)
   - POST create (validation errors)
   - GET retrieve (success case)
   - GET retrieve (not found)
4. Create `server/routes/t1dProfileRoutes.ts` with minimal handlers
5. Mount routes in `server/integrations/healthData/t1dRoutes.ts`
6. Run tests and fix implementation until all pass
7. Only refactor after GREEN, following issue #025 guardrails
8. Add Swagger documentation
9. Verify RLS enforcement with test
10. Ensure existing SparkyFitness behavior is not affected