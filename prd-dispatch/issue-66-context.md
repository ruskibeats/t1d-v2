# Implementation Context: Issue #66 - T1D Vector Search Contract

## Issue Summary

**Issue:** `issues/009-t1d-vector-search-contract.md`

**What to build:** Define the T1D vector search request/response contract so vector search can be profile-scoped and testable.

**Acceptance criteria:**
- [x] Vector search schema is defined (T1DVectorSearchBodySchema exists)
- [x] Query input is validated (T1DVectorSearchBodySchema)
- [x] Response shape is documented (T1DVectorSearchBody and T1DVectorSearchResult)
- [x] Profile ownership is part of the contract (profile-scoped search)
- [x] Tests verify schema behavior without requiring full vector infrastructure

**Blocked by:** `issues/003-t1d-profile-create-get.md`

**User stories addressed:**
- User story 15: As a person with T1D, I want vector search over my T1D context, so that chat and analysis can retrieve relevant historical notes.
- User story 16: As a person with T1D, I want vector search to respect profile ownership, so that private context is not exposed to other users.
- User story 34: As a developer, I want Swagger to document the new T1D, Bloom, and skin theme APIs.
- User story 35: As a developer, I want tests to be integration-style and public-interface focused.
- User story 36: As a developer, I want to implement one vertical slice at a time.

**TDD tracer bullet:** Write one test showing the vector search schema accepts a profile-scoped query and rejects invalid input.

---

## Architecture Overview

### Current State

The backend already has partial T1D vector search infrastructure in place:

1. **Database schema:** `t1d_vector_documents` table (vector search platform) with:
   - Profile-scoped constraint (`t1d_profile_id`)
   - Vector index using `HALFVEC(768)` with HNSW (m=16, ef_construction=64)
   - GIN indexes for content FTS and metadata
   - Unique natural key on (t1d_profile_id, domain, source_type, source_id)
   - 4 seed documents in legend and simulated profiles

2. **Repository layer:** `t1dVectorDocumentRepository.ts` provides:
   - `upsertVectorDocument()`: Upserts documents with embedding
   - `searchVectorDocuments()`: Profile-scoped similarity search (vector OR FTS fallback)

3. **Schema layer:** `T1DVectorSearchBodySchema` defined in `t1dNightscoutSchema.ts`:
   - `query`: string (required)
   - `embedding`: number[] (optional, size must match `embeddingDimension` from Ollama)
   - `limit`: int (1-50, default 5)

4. **Service layer:**
   - `embeddingService.ts`: Ollama embedding wrapper with retry, dimension validation
   - `t1dEmbeddingService.ts`: T1D-specific embedding wrapper (calls embedT1DText)

5. **Route layer:**
   - `POST /t1d/vector/search` in `t1dRoutes.ts` (mounted at `/health_data/`)
   - Automatically gets profile via `getOrCreateProfileForSparkyUser()`
   - Calls `embedT1DText()` if no embedding provided
   - Calls `searchVectorDocuments()` with profile-scoped query

6. **Current test coverage:**
   - `embeddingService.test.ts`: Ollama embedding mocks (mocks fetch, verifies endpoint, validates dimension)
   - `t1dNightscoutImportService.test.ts`: Pure helpers for Nightscout normalization
   - No integration-style test for `/t1d/vector/search` endpoint

---

## Public Behavior to Test First

### Primary Public Interface: `POST /health_data/t1d/vector/search`

**Request:**
```typescript
// T1DVectorSearchBody
{
  query: string;              // required search query
  embedding?: number[];       // optional, must match embeddingDimension (768)
  limit?: number;             // 1-50, default 5
}
```

**Response:**
```typescript
// Response shape (not fully validated in current code)
{
  profileId: string;
  results: T1DVectorSearchResult[];
}

// T1DVectorSearchResult (extends T1DVectorDocument)
{
  id: string;
  t1d_profile_id: string;
  domain: string;
  source_type: string;
  source_id?: string | null;
  title?: string | null;
  content_text: string;
  metadata_json: Record<string, unknown>;
  embedding: number[] | null;
  similarity?: number;        // cosine similarity or FTS ts_rank
  created_at: Date;
  updated_at: Date;
}
```

**Required behavior to test:**

1. **Schema validation:**
   - Accepts valid query + optional embedding + optional limit
   - Rejects missing `query`
   - Rejects `embedding` with wrong dimension
   - Rejects `limit` outside 1-50 range

2. **Profile scoping:**
   - Query only searches documents owned by the authenticated user's T1D profile
   - Other users' vector documents are not visible
   - Profile exists; if not, `getOrCreateProfileForSparkyUser()` is called

3. **Embedding usage:**
   - If embedding provided, uses it directly (no additional embedding)
   - If embedding missing, calls `embedT1DText(query)` to generate embedding
   - Validates that embedding matches Ollama `embeddingDimension`

4. **Response shape:**
   - Returns `profileId` matching the profile used
   - Returns `results` array sorted by similarity (vector OR FTS fallback)
   - `results` items include `similarity` field

5. **Error handling:**
   - 400 on invalid input (schema validation)
   - 500 on internal service errors (repository, embedding, profile lookup)

---

## Implementation Validation

### Validation Commands

Run the test suite to verify public behavior:

```bash
cd /root/tld-v2/sparky-bloom/server
pnpm test

# Run specifically the new vector search test file when it exists
pnpm test vector-search.test.ts
```

To test manually before automated tests:

```bash
# Set up test environment (requires Ollama running with nomic-embed-text)
# Test with curl (authenticated request)
curl -X POST http://localhost:3000/health_data/t1d/vector/search \
  -H "Content-Type: application/json" \
  -H "Cookie: <authenticated_cookie>" \
  -d '{
    "query": "overnight glucose stability pattern",
    "embedding": [0.1, 0.2, 0.3, 0.4],
    "limit": 5
  }'

# Expected: 200 with profileId and results array
```

### Database Setup

Ensure the `t1d_vector_documents` table exists:

```sql
-- Run the migration
psql -U <user> -d sparkyfitness -f db/migrations/20260612000000_add_t1d_vector_platform.sql

-- Verify vector extension
SELECT * FROM pg_extension WHERE extname = 'vector';

-- Check seed documents (for testing)
SELECT id, t1d_profile_id, domain, title, content_text
FROM public.t1d_vector_documents;
```

### Test Data Seeds

Seed data exists in migration for testing:

| ID | profile_id | domain | source_type | title | content_text |
|----|-----------|--------|-------------|-------|--------------|
| 55555555... | legend (11111111...) | legend | profile_summary | Tom Batchelor... | Tom Batchelor... |
| 66666666... | simulation (22222222...) | simulation | profile_summary | Simulated adaptive... | Simulated adaptive... |
| 77777777... | simulation (33333333...) | simulation | profile_summary | Simulated low-carb... | Simulated low-carb... |
| 88888888... | simulation (44444444...) | simulation | profile_summary | Simulated overnight... | Simulated overnight... |

---

## TDD Guardrail Alignment

### Guardrails from `issues/025-tdd-workflow-guardrails.md`

1. **Not write all tests first and implementation later:**
   - Current state: Schema exists, repository exists, route exists
   - Gap: No integration-style test for endpoint behavior
   - Action: Write ONE test showing vector search schema behavior, then implement needed validation/refactoring

2. **Not refactor while active behavior test is RED:**
   - Start with a failing test (e.g., expecting 200 with profile-scoped results, but currently schema/implementation may not enforce all constraints)
   - Only refactor after test passes

3. **Each implementation issue links to guardrail:**
   - This test links to issue #66 and indirectly to issue #025

4. **Tests verify public behavior:**
   - Use integration-style test (HTTP request via `supertest`, `req.body` validation)
   - Verify response shape, not internal repository calls

5. **RED/GREEN/REFACTOR visibility:**
   - Test name: `should accept valid query and optional embedding with profile scoping`
   - If missing embedding validation → RED
   - Add validation to schema or service → GREEN
   - Refactor only if needed to make test cleaner (not to change behavior)

---

## Implementation Risks & Unknowns

### Knowns

- Schema: `T1DVectorSearchBodySchema` is defined and validates
- Embedding dimension: 768 (nomic-embed-text)
- Repository: `searchVectorDocuments()` is profile-scoped (WHERE t1d_profile_id = $1)
- Route: `POST /health_data/t1d/vector/search` exists and uses schema
- Profiles: `getOrCreateProfileForSparkyUser()` auto-creates if missing

### Unknowns

1. **Response schema validation:**
   - The route currently returns raw `results.rows` from repository
   - Need to define a response schema and validate shape before returning
   - Potential gap: `T1DVectorSearchResult` type may not match repository response exactly

2. **Profile ownership enforcement:**
   - Repository is already profile-scoped, but need to ensure:
     - Only the authenticated user's profile is accessible
     - Simulated profiles (no sparky_user_id) are test-only data
   - Need to clarify which profiles a user can search (only `sparky_user_id` profiles, not legends/simulated)

3. **Embedding fallback order:**
   - Route calls `embedT1DText()` if `embedding` missing
   - Need to verify that `embedT1DText()` calls Ollama successfully in test environment
   - May need to mock Ollama in integration test to avoid external dependency

4. **Duplicate query handling:**
   - `embedding <=>` operator is used for similarity
   - Need to ensure normalization and case-insensitivity work as expected

5. **Swagger documentation:**
   - Issue #34 mentions Swagger should document new APIs
   - Need to add `/health_data/t1d/vector/search` endpoint to Swagger config

---

## Recommended Next Steps

### 1. Write First Failing Test (Integration-Style)

Create `tests/t1dVectorSearchContract.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import request from 'supertest';
import express from 'express';
import healthDataRoutes from '../../integrations/healthData/healthDataRoutes.js';

const app = express();
app.use('/health_data', healthDataRoutes);

describe('T1D Vector Search Contract', () => {
  it('should accept valid query and optional embedding with profile scoping', async () => {
    const res = await request(app)
      .post('/t1d/vector/search')
      .set('Cookie', '<authenticated_cookie>')
      .send({
        query: 'overnight glucose stability',
        embedding: [0.1, 0.2, 0.3, 0.4],
        limit: 5,
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('profileId');
    expect(res.body).toHaveProperty('results');
    expect(Array.isArray(res.body.results)).toBe(true);
    // Verify results are profile-scoped (same profileId)
    expect(res.body.results.every((r: any) => r.t1d_profile_id === res.body.profileId)).toBe(true);
  });

  it('should reject missing query', async () => {
    const res = await request(app)
      .post('/t1d/vector/search')
      .set('Cookie', '<authenticated_cookie>')
      .send({
        embedding: [0.1, 0.2, 0.3, 0.4],
      });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('should reject embedding with wrong dimension', async () => {
    const res = await request(app)
      .post('/t1d/vector/search')
      .set('Cookie', '<authenticated_cookie>')
      .send({
        query: 'overnight glucose stability',
        embedding: [0.1, 0.2, 0.3, 0.4, 0.5], // 5 dims, expected 768
      });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
    expect(res.body.error).toContain('dimension');
  });

  it('should reject limit outside range', async () => {
    const res = await request(app)
      .post('/t1d/vector/search')
      .set('Cookie', '<authenticated_cookie>')
      .send({
        query: 'overnight glucose stability',
        limit: 100,
      });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });
});
```

### 2. Implement Missing Validation

If test fails, add validation to:

- `T1DVectorSearchBodySchema`: Ensure `embedding` dimension is validated
- Route handler: Ensure `profileId` is enforced and only user's profile is used
- Response transformation: Ensure response shape matches contract

### 3. Refactor if Needed

Only refactor if tests are green and code can be improved without changing behavior:
- Extract response transformation to separate function
- Add Swagger documentation for endpoint

### 4. Verify Profile Ownership

Ensure that `searchVectorDocuments()` only returns documents from the authenticated user's profile:
- `getOrCreateProfileForSparkyUser()` ensures profile exists
- Repository WHERE clause enforces `t1d_profile_id = ?`

---

## Files and Lines of Interest

### Source Files

| File | Lines | Purpose |
|------|-------|---------|
| `server/schemas/t1dNightscoutSchema.ts` | L1-35 | T1DVectorSearchBodySchema, embedding validation |
| `server/models/t1dVectorDocumentRepository.ts` | L1-123 | searchVectorDocuments(), upsertVectorDocument() |
| `server/services/embeddingService.ts` | L1-87 | Ollama embedding wrapper |
| `server/services/t1dEmbeddingService.ts` | L1-30 | T1D-specific embedding wrapper |
| `server/integrations/healthData/t1dRoutes.ts` | L1-107 | POST /t1d/vector/search route |
| `server/integrations/healthData/healthDataRoutes.ts` | L1-73 | Mounts t1dRoutes at /health_data |

### Migration Files

| File | Lines | Purpose |
|------|-------|---------|
| `db/migrations/20260612000000_add_t1d_vector_platform.sql` | L1-184 | Creates t1d_vector_documents table, indexes, seed data |

### Test Files (Existing)

| File | Lines | Purpose |
|------|-------|---------|
| `tests/embeddingService.test.ts` | L1-76 | Ollama embedding mocks (can be reused) |
| `tests/t1dNightscoutImportService.test.ts` | L1-66 | Pure helper tests (reference pattern) |
| `tests/satoThemeContract.test.ts` | L1-79 | Public contract tests (integration-style) |

### Test File to Create

| File | Purpose |
|------|---------|
| `tests/t1dVectorSearchContract.test.ts` | Integration-style test for POST /t1d/vector/search |

---

## Summary

The vector search contract is partially implemented. Schema validation exists, repository is profile-scoped, and the route exists. The missing piece is an integration-style test that validates:

1. Schema behavior (valid/invalid input)
2. Profile scoping (only user's documents)
3. Response shape (200 with profileId and results)

Follow TDD: write one failing test → implement missing validation → refactor if needed → verify with integration test.

Use existing patterns from `satoThemeContract.test.ts` (public behavior verification, no internal details) and `embeddingService.test.ts` (mock-based testing) as reference.