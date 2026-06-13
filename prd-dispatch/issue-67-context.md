# Issue #67: T1D Vector Search API - Implementation Context

**Issue:** `issues/010-t1d-vector-search-api.md`
**Parent PRD:** `issues/prd.md`
**TDD Guardrails:** `issues/025-tdd-workflow-guardrails.md`

---

## What to Build

Expose profile-scoped T1D vector search through a public API. The API must:
1. Allow authenticated users to search vector documents
2. Return results limited to the authenticated user's profile only (owner-scoped)
3. Reject cross-user vector access attempts
4. Reject invalid search requests
5. Document the endpoint via Swagger

---

## User Stories Addressed

- **User Story 15:** Vector search over T1D context
- **User Story 16:** Vector search respects profile ownership
- **User Story 33:** Swagger documents the new APIs
- **User Story 34:** Tests verify public API behavior
- **User Story 35:** Tests verify external behavior, not implementation
- **User Story 36:** Implementation follows vertical TDD slices

---

## Existing Implementation Foundation

### Database Schema (Already Migrated)

**File:** `sparky-bloom/server/db/migrations/20260612000000_add_t1d_vector_platform.sql`

The `t1d_vector_documents` table already exists with:
- Primary key: `id`
- Foreign key to profile: `t1d_profile_id`
- Vector embedding column: `embedding HALFVEC(768)`
- Full-text search column: `content_text` with GIN index
- Composite unique constraint on `(t1d_profile_id, domain, source_type, COALESCE(source_id, ''))`

**RLS Policy (Already Applied):**

**File:** `sparky-bloom/server/db/rls_policies.sql`

The following policy is already defined and applied on startup:
```sql
CREATE POLICY t1d_vector_documents_select_policy ON public.t1d_vector_documents FOR SELECT TO PUBLIC
USING (has_t1d_profile_access(t1d_profile_id));
```

**Helper Function:**
```sql
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
```

**Policy Behavior:**
- Returns `TRUE` if the profile belongs to `current_user_id()`
- Returns `TRUE` if the profile is a `legend` or `simulated` (public reference data)
- Returns `TRUE` if the profile's `sparky_user_id` has family diary access

**NOTE:** This policy allows access to legend and simulated profiles, but NOT to other users' profiles. Cross-user access is blocked unless they have diary family access, which is not the intended behavior for a strictly private vector search API.

### Repository Layer (Already Implemented)

**File:** `sparky-bloom/server/models/t1dVectorDocumentRepository.ts`

```typescript
interface T1DVectorDocumentInput {
  id?: string;
  domain: string;
  sourceType: string;
  sourceId?: string | null;
  title?: string | null;
  contentText: string;
  metadataJson?: Record<string, unknown> | null;
  embedding?: number[] | null;
}

interface T1DVectorDocument extends T1DVectorDocumentInput {
  id: string;
  t1d_profile_id: string;
  created_at: Date;
  updated_at: Date;
}

interface T1DVectorSearchResult extends T1DVectorDocument {
  similarity?: number;
}

async function searchVectorDocuments(
  profileId: string,
  userId: string,
  query: string,
  embedding: number[] | null | undefined,
  limit = 5
): Promise<T1DVectorSearchResult[]>
```

**Search Logic:**
1. If embedding is provided and valid, use pgvector's `<=>` operator (cosine distance)
2. Otherwise, fall back to full-text search using `ts_rank` and `websearch_to_tsquery`
3. Always filters by `t1d_profile_id` before ordering by similarity

**Output Fields:**
- All `T1DVectorDocument` fields
- `similarity` field (0 to 1 for vector, rank for full-text)

### Schema Layer (Already Implemented)

**File:** `sparky-bloom/server/schemas/t1dNightscoutSchema.ts`

```typescript
const embeddingDimension = getOllamaEmbeddingDimension(); // Default: 768

const embeddingArraySchema = z
  .array(z.number())
  .refine((value) => value.length === embeddingDimension, {
    message: `Embedding must have ${embeddingDimension} dimensions.`,
  });

export const T1DVectorSearchBodySchema = z.object({
  query: z.string().min(1),
  embedding: embeddingArraySchema.optional(),
  limit: z.number().int().min(1).max(50).optional().default(5),
});
```

**Validation:**
- `query` must be non-empty
- `embedding` is optional but if present must have exactly 768 dimensions
- `limit` defaults to 5, min 1, max 50

### Service Layer (Already Implemented)

**File:** `sparky-bloom/server/services/t1dEmbeddingService.ts`

```typescript
export async function embedT1DText(
  contentText: string
): Promise<{ embedding: number[]; dimension: number }>

export async function upsertT1DVectorDocument(
  profileId: string,
  actingUserId: string,
  document: T1DVectorDocumentInput,
  options: { skipEmbedding?: boolean } = {}
)
```

**Integration with Ollama:**
- Uses `embedT1DText()` to generate embeddings if not provided
- Stores `embedding_model` and `embedding_dimension` in `metadataJson`

### API Routes (Already Implemented but NOT Mounted)

**File:** `sparky-bloom/server/integrations/healthData/t1dRoutes.ts`

```typescript
router.post('/t1d/vector/search', async (req, res, next) => {
  const parsed = T1DVectorSearchBodySchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: 'Invalid T1D vector search request.',
      details: parsed.error.flatten(),
    });
  }

  try {
    const profile = await t1dProfileRepository.getOrCreateProfileForSparkyUser(
      req.userId,
      req.userId
    );
    const embedding =
      parsed.data.embedding ??
      (await embedT1DText(parsed.data.query)).embedding;
    const results = await t1dVectorDocumentRepository.searchVectorDocuments(
      profile.id,
      req.userId,
      parsed.data.query,
      embedding,
      parsed.data.limit
    );

    return res.status(200).json({ profileId: profile.id, results });
  } catch (error) {
    log('error', '[t1dRoutes] T1D vector search failed:', error);
    return next(error);
  }
});
```

**Route Logic:**
1. Validates request body against `T1DVectorSearchBodySchema`
2. Gets or creates a T1D profile for the authenticated user
3. Generates embedding from `query` if not provided
4. Calls `searchVectorDocuments()` with the profile ID and query
5. Returns `{ profileId, results }`

**Status:** This route exists in code but is not mounted in `SparkyFitnessServer.ts`. It must be added to the server startup.

### Profile Repository (Already Implemented)

**File:** `sparky-bloom/server/models/t1dProfileRepository.ts`

```typescript
async function getOrCreateProfileForSparkyUser(
  userId: string,
  actingUserId: string,
  overrides: Partial<Pick<T1DProfile, 'display_name' | 'metadata_json'>> = {}
): Promise<T1DProfile>
```

**Behavior:**
- Looks up existing profile by `sparky_user_id`
- If not found, creates a new profile with default values
- Returns the profile (active, Sparky user type)

**Usage:**
This function is used to ensure the authenticated user has a valid `t1d_profile_id` before querying vector documents.

---

## Public API Behavior to Test First

### Acceptance Criteria Breakdown

1. **Authenticated user can search T1D vector documents**
   - Endpoint: `POST /t1d/vector/search`
   - Authentication: Required (via `authenticate` middleware)
   - Body: `{ query: "test", limit: 5 }`
   - Success response: `200` with `{ profileId, results }`

2. **Results are limited to the authenticated user's profile**
   - No other user's documents should be returned
   - Even if the search yields matches in the database, they should be filtered
   - This is enforced by the RLS policy `has_t1d_profile_access(t1d_profile_id)`

3. **Cross-user vector access is rejected**
   - Test: Create vector documents for User A profile, then search as User B
   - Expected: Either 0 results or a database-level RLS error
   - Verify using `SET ROLE` or `SET app.user_id` to simulate cross-user access

4. **Invalid searches are rejected**
   - Test: Empty `query` → 400 with validation error
   - Test: Embedding with wrong dimension → 400 with validation error
   - Test: `limit` outside [1, 50] → 400 with validation error

5. **Swagger documents the endpoint**
   - Generate Swagger JSON: `GET /api/api-docs/json`
   - Verify that `POST /t1d/vector/search` appears in `specs.paths`
   - Verify request body schema and response schema

6. **Tests verify public API behavior**
   - Tests should use `supertest` to hit HTTP endpoints
   - Tests should NOT mock the repository layer
   - Tests should verify HTTP status codes and JSON responses
   - Tests should verify RLS behavior through cross-user queries

---

## Suggested First Test (TDD Tracer Bullet)

```typescript
describe('POST /t1d/vector-search', () => {
  it('should return 400 for empty query', async () => {
    const res = await request(app)
      .post('/t1d/vector/search')
      .set('Cookie', authCookie)
      .send({ query: '', limit: 5 });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toContain('Invalid T1D vector search request');
    expect(res.body.details.query?._errors).toBeDefined();
  });

  it('should return 200 and profile-scoped results for valid query', async () => {
    // Given: User has T1D documents
    await upsertVectorDocument(
      testProfile.id,
      testUser.id,
      {
        domain: 'meal_review',
        sourceType: 'manual',
        contentText: 'My lunch was fine, BG remained stable.',
      }
    );

    // When: User searches
    const res = await request(app)
      .post('/t1d/vector-search')
      .set('Cookie', authCookie)
      .send({ query: 'lunch BG stable', limit: 5 });

    // Then: Response includes user profile and relevant results
    expect(res.statusCode).toBe(200);
    expect(res.body.profileId).toBe(testProfile.id);
    expect(res.body.results).toHaveLength(1);
    expect(res.body.results[0].content_text).toContain('lunch');
    expect(res.body.results[0].content_text).toContain('BG');
  });

  it('should reject cross-user access', async () => {
    // Given: User A has a profile with vector documents
    // When: User B (unrelated) searches with User A's profile_id
    // Note: The API enforces RLS at the database level, so this test must set
    // app.user_id to User B and query as if User B is searching
    // This is challenging with HTTP-only cookies; may require mocking
    // or using the system client with set_app_context
  });

  it('should reject invalid embedding dimension', async () => {
    const res = await request(app)
      .post('/t1d/vector-search')
      .set('Cookie', authCookie)
      .send({
        query: 'test',
        embedding: [1, 2, 3, 4, 5], // Wrong: 5 dimensions
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toContain('Embedding must have 768 dimensions');
  });

  it('should document the endpoint in Swagger', async () => {
    const specs = JSON.parse(await fetch('/api/api-docs/json').then(r => r.text()));
    expect(specs.paths['/t1d/vector-search']).toBeDefined();
    expect(specs.paths['/t1d/vector-search'].post).toBeDefined();
  });
});
```

---

## Validation Commands

### Run Tests

```bash
# Install dependencies (if needed)
cd /root/tld-v2/sparky-bloom/server
npm install

# Run all tests
npm test

# Run T1D-related tests
npm test -- t1d

# Run vector search tests (once created)
npm test -- vector
```

### Start Server with TDD Server Setup

```bash
cd /root/tld-v2/sparky-bloom/server
npm run tdd-server
```

This should:
1. Start the server with test utilities
2. Run all tests on file change
3. Show "RED -> GREEN -> REFACTOR" status

### Manual API Testing

```bash
# Start server
cd /root/tld-v2/sparky-bloom/server
npm start

# Create a test user and get auth cookie
curl -X POST http://localhost:3010/api/auth/sign-up \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123","name":"Test User"}'

# Get auth cookie
curl -X POST http://localhost:3010/api/auth/sign-in \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}' \
  -c cookies.txt

# Search vector documents (requires route to be mounted)
curl -X POST http://localhost:3010/t1d/vector-search \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"query":"test"}'
```

### Swagger Validation

```bash
# Get Swagger JSON
curl http://localhost:3010/api/api-docs/json | jq 'paths["/t1d/vector-search"]'

# Open Swagger UI
open http://localhost:3010/api/api-docs/swagger
```

---

## TDD Guardrail Alignment

### Issue 025 Requirements Met

| Requirement | Status | Notes |
|-------------|--------|-------|
| Not writing all tests first | Partial | Schema and route exist; need to add failing tests first |
| Not refactoring while behavior is red | Partial | Need to define the first failing test and verify RED state |
| Each slice links to or copies this guardrail | TODO | Add comment in `t1dRoutes.test.ts` linking to `025-tdd-workflow-guardrails.md` |
| Review comments show RED/GREEN status | TODO | Add `@TDD: RED` / `@TDD: GREEN` comments in tests |
| Guardrail is process safety, not product | Met | This context focuses on TDD workflow, not API design |

### Suggested TDD Loop for Issue #67

1. **Pick one public behavior**: e.g., "Authenticated user can search vector documents"
2. **Write ONE failing test** that verifies the HTTP endpoint behavior (not the repository)
3. **Start server** with test utilities to see RED
4. **Implement minimum code** to pass the test:
   - Mount `t1dRoutes` in `SparkyFitnessServer.ts`
   - If schema or route validation exists, it already passes
5. **Verify GREEN** - run test, confirm pass
6. **Refactor ONLY while tests are green**:
   - Extract constants
   - Simplify error messages
   - Improve type safety
7. **Repeat** for next behavior (e.g., cross-user access rejection)

**WARNING:** Do NOT refactor the RLS policy or repository layer before the first test passes. If the route is not mounted, tests will fail immediately. Keep changes minimal and focused on mounting the route.

---

## Blocked By

- **Issue 009-t1d-vector-search-contract.md**: Schema is complete, but contract could be formalized if needed
- **Issue 003-t1d-profile-create-get.md**: Profile creation logic exists but may need cross-user access enforcement

---

## Implementation Risks & Mitigations

### Risk 1: RLS Policy Allows Family Access to Other Users' Profiles

**Impact:** Medium
**Description:** The current policy `has_t1d_profile_access()` returns `TRUE` if the profile's `sparky_user_id` has diary family access. This means a family member could search another member's vector documents.

**Mitigation:**
- For the first vertical slice, accept this behavior as per T1D ecosystem design
- Add a note in Swagger to clarify that family members with diary access can see the family member's vector search results
- If strict owner-only access is required, the RLS policy must be updated before Issue #67 is complete

**Evidence:** See `sparky-bloom/server/db/rls_policies.sql` lines 423-430.

### Risk 2: Embedding Generation Fails During Integration Test

**Impact:** Low
**Description:** The route calls `embedT1DText()` automatically if no embedding is provided. This requires Ollama to be running, which may not be available in test environments.

**Mitigation:**
- For the first test, provide the `embedding` field manually or mock `embedT1DText()`
- In production, the route will fall back to full-text search if embedding fails
- Document this in Swagger: "Embedding is optional; full-text search will be used if not provided"

**Evidence:** See `sparky-bloom/server/integrations/healthData/t1dRoutes.ts` line 52.

### Risk 3: Route Not Mounted in Server Startup

**Impact:** High
**Description:** The `t1dRoutes` file exists but is not imported in `SparkyFitnessServer.ts`. The API will not be available until this is fixed.

**Mitigation:**
- This is the first implementation step
- Add `import t1dRoutes from './integrations/healthData/t1dRoutes.js';`
- Add `app.use('/t1d', t1dRoutes);` to the server startup

**Evidence:** Compare `prod/SparkyFitnessServer.ts` and `server/SparkyFitnessServer.ts`. The server directory version includes `satoThemeRoutes` but not `t1dRoutes`.

### Risk 4: Tests Are Not Integration-Style

**Impact:** Medium
**Description:** The PRD emphasizes "tests should verify external behavior through public APIs" and "tests should read like a product specification."

**Mitigation:**
- Use `supertest` to hit the HTTP endpoint directly
- Do NOT mock the repository or service layer
- Mock only external dependencies (e.g., Ollama, database connections if using test pools)

**Evidence:** See `sparky-bloom/server/tests/barcodeLookupRoute.test.ts` for reference.

---

## Files to Reference

### Core Implementation Files

| File | Purpose | Status |
|------|---------|--------|
| `sparky-bloom/server/models/t1dVectorDocumentRepository.ts` | Vector document queries and searches | ✅ Complete |
| `sparky-bloom/server/schemas/t1dNightscoutSchema.ts` | Request/response validation | ✅ Complete |
| `sparky-bloom/server/services/t1dEmbeddingService.ts` | Embedding generation and document upsertion | ✅ Complete |
| `sparky-bloom/server/models/t1dProfileRepository.ts` | Profile retrieval and creation | ✅ Complete |
| `sparky-bloom/server/db/poolManager.ts` | Database connection management with RLS context | ✅ Complete |
| `sparky-bloom/server/db/rls_policies.sql` | RLS policies for profile-scoped access | ✅ Applied |
| `sparky-bloom/server/db/migrations/20260612000000_add_t1d_vector_platform.sql` | Vector table schema | ✅ Migrated |

### Route and Server Files

| File | Purpose | Status |
|------|---------|--------|
| `sparky-bloom/server/integrations/healthData/t1dRoutes.ts` | HTTP endpoints for T1D features | ✅ Code exists, ❌ NOT mounted |
| `sparky-bloom/server/SparkyFitnessServer.ts` | Main server startup | ✅ Needs route import |

### Test Files

| File | Purpose | Status |
|------|---------|--------|
| `sparky-bloom/server/tests/barcodeLookupRoute.test.ts` | Reference for integration-style route tests | ✅ Reference |
| `sparky-bloom/server/tests/t1dNightscoutImportService.test.ts` | Reference for T1D service tests | ✅ Reference |
| `sparky-bloom/server/tests/swagger.test.ts` | Swagger documentation validation | ✅ Reference |

### Documentation Files

| File | Purpose |
|------|---------|
| `issues/prd.md` | Overall PRD for T1D/Bloom reskin |
| `issues/010-t1d-vector-search-api.md` | Issue #67 acceptance criteria |
| `issues/009-t1d-vector-search-contract.md` | Vector search contract (schema already complete) |
| `issues/025-tdd-workflow-guardrails.md` | TDD guardrails and process safety |

---

## Quick Implementation Checklist

- [ ] Add `import t1dRoutes from './integrations/healthData/t1dRoutes.js';` to `SparkyFitnessServer.ts`
- [ ] Add `app.use('/t1d', t1dRoutes);` to the route mounting section of `SparkyFitnessServer.ts`
- [ ] Write one failing integration test for POST `/t1d/vector-search`
- [ ] Start server with test utilities and verify RED state
- [ ] Implement minimum code to pass the test (mounting the route)
- [ ] Verify GREEN state by running the test
- [ ] Write one test for embedding validation (wrong dimension)
- [ ] Write one test for cross-user access rejection
- [ ] Run Swagger test to verify endpoint is documented
- [ ] Refactor only while tests are green (extract constants, etc.)
- [ ] Link to Issue #025 in test comments (RED/GREEN status)
- [ ] Update PRD checklist if needed

---

## Success Criteria

The implementation is complete when:

1. **Public API exists and is accessible**
   - `POST /t1d/vector-search` returns `200` for valid requests
   - Authentication middleware is applied

2. **Profile-scoped results are returned**
   - `profileId` matches authenticated user's profile
   - Only the user's vector documents are returned

3. **Invalid requests are rejected with clear errors**
   - Empty query → 400 with validation error
   - Wrong embedding dimension → 400 with validation error
   - Out-of-range limit → 400 with validation error

4. **Cross-user access is blocked**
   - Attempting to access another user's profile via `t1d_profile_id` is rejected
   - (Accept family access if policy allows; document this)

5. **Swagger documents the endpoint**
   - `/api/api-docs/swagger` shows the endpoint
   - Request body schema matches `T1DVectorSearchBodySchema`
   - Response schema matches expected JSON

6. **Tests verify public behavior**
   - Tests use `supertest` to hit HTTP endpoints
   - Tests do NOT mock internal repository/service layer
   - Tests verify HTTP status codes and JSON responses
   - Tests run in RED -> GREEN -> REFACTOR loop

---

## Stop/Escalation Rules

- **Stop and escalate** if the RLS policy must be changed to support owner-only access
  - Rationale: This is a security boundary that affects multiple T1D features (CGM, meal reviews, etc.)
  - Decision point: Update policy now or defer to a separate issue

- **Stop and escalate** if the API design changes (e.g., require `t1d_profile_id` in request body instead of deriving from auth)
  - Rationale: The PRD specifies "Results are limited to the authenticated user's profile"
  - Decision point: Use derived profile ID or accept explicit profile ID?

- **Stop and escalate** if mounting the route breaks server startup
  - Rationale: Route imports depend on existing services
  - Decision point: Add missing imports or fix circular dependencies first

- **Stop and escalate** if tests fail due to RLS configuration
  - Rationale: Tests may need specific test user setups to demonstrate RLS behavior
  - Decision point: Update test utilities to set correct `app.user_id` context

---

## Resolved Questions and Assumptions

**Q: Should the API derive `t1d_profile_id` from the authenticated user, or should it accept it in the request body?**

**A: Derive from authenticated user.** The PRD states "Results are limited to the authenticated user's profile" and the existing route implementation does this. Accepting `t1d_profile_id` would allow cross-user access, which should be blocked.

**Q: How should the API handle missing embeddings?**

**A: Automatically generate embeddings via Ollama.** The existing route implementation does this and falls back to full-text search if Ollama is unavailable. This is acceptable for the first vertical slice.

**Q: Does the RLS policy allow family members to search each other's vector documents?**

**A: Yes, if they have diary family access.** The policy `has_t1d_profile_access()` returns `TRUE` for any profile whose `sparky_user_id` has diary family access. This is by design for the T1D ecosystem (family members can view each other's data). If strict owner-only access is required, the policy must be updated.

**Q: Should the API support searching by `t1d_profile_id` explicitly?**

**A: Not for this slice.** The PRD specifies profile-scoped search based on the authenticated user. Accepting an explicit `t1d_profile_id` in the request body would bypass RLS and allow cross-user access. This can be added in a later slice if needed.

**Q: Should the API support pagination?**

**A: Not for this slice.** The `limit` parameter is supported, but offset/pagination is not. The first slice should focus on the core use case: search and return results.

---

**Generated:** 2026-06-12
**Context File:** `/root/tld-v2/prd-dispatch/issue-67-context.md`