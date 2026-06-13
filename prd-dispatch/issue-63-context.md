# Issue #63: Nightscout Import Idempotency - Implementation Context

## Issue Summary

**Issue:** `006-nightscout-import-idempotent.md`
**Parent PRD:** `issues/prd.md`
**Blocked by:** `issues/005-nightscout-import-validation.md`

**Goal:** Make Nightscout/CGM import idempotent so repeated imports do not duplicate readings.

**User Stories Addressed:**
- User story 4: Connect or import CGM data
- User story 5: Import Nightscout CGM data
- User story 6: Nightscout imports should be idempotent
- User story 8: CGM data protected from other users
- User story 33: RLS policies verified for every T1D table
- User story 35: Tests verify public behavior through APIs
- User story 36: Implement one vertical slice at a time

## TDD Guardrail Alignment

From `issues/025-tdd-workflow-guardrails.md`:
- **RED phase:** Write one API test showing the same valid Nightscout payload imported twice does not create duplicate CGM entries.
- **GREEN phase:** Implement the minimum code needed to pass.
- **REFACTOR phase:** Refactor only after tests are green.
- **Constraint:** Do not write all tests first and implementation later. Do not refactor while the active behavior test is red.

## Current Implementation Status

### Existing Idempotency Infrastructure

The codebase already has idempotency built into the `cgm_entries` table and `upsert_cgm_entry()` function:

**File:** `/root/tld-v2/app/services/cgm_entries.py`

**Table Schema (lines 18-36):**
```sql
CREATE TABLE IF NOT EXISTS cgm_entries (
    id              SERIAL PRIMARY KEY,
    user_id         INT NOT NULL REFERENCES tbl_users(id),
    measured_at     TIMESTAMPTZ NOT NULL,
    value_mg_dl     FLOAT NOT NULL,
    value_mmol_l    FLOAT,
    units           TEXT DEFAULT 'mg/dL',
    source          TEXT NOT NULL DEFAULT 'nightscout',  -- 'nightscout' | 'manual' | 'import'
    device          TEXT,
    nightscout_id   TEXT,  -- stable Nightscout event id for dedup
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, measured_at, source)
);
```

**Key Idempotency Mechanism:**
- **Unique constraint:** `UNIQUE(user_id, measured_at, source)` ensures no duplicates for the same user at the same time from the same source.
- **ON CONFLICT clause:** The `upsert_cgm_entry()` function uses PostgreSQL's `ON CONFLICT` to update existing rows instead of inserting duplicates.
- **Metadata merge:** When re-importing, metadata is merged using `||` operator, not replaced.

**Upsert Function (lines 39-78):**
```python
async def upsert_cgm_entry(
    session,
    *,
    user_id: int,
    measured_at: datetime,
    value_mg_dl: float,
    value_mmol_l: float | None = None,
    units: str = "mg/dL",
    source: str = "nightscout",
    device: str | None = None,
    nightscout_id: str | None = None,
    metadict | None = None,
) -> int:
    """Insert or update a CGM entry. Idempotent on (user_id, measured_at, source)."""
    # ... implementation uses ON CONFLICT to update instead of duplicate
```

### Nightscout Client

**File:** `/root/tld-v2/app/services/nightscout_client.py`

**Key Functions:**
- `fetch_entries(days=90)` - Fetches CGM entries from Nightscout API
- `fetch_treatments(days=90)` - Fetches treatments from Nightscout API
- `entries_to_cgm_rows(entries)` - Converts Nightscout entries to cgm_entries-compatible rows
- `treatments_to_health_metrics(treatments)` - Converts treatments to health_metrics rows

**Data Structure:**
Each entry includes:
- `timestamp`: datetime
- `value_mg_dl`: int
- `value_mmol_l`: float (converted from mg/dL)
- `device`: str
- `trend_arrow`: str
- `nightscout_id`: str (original _id for dedup)

### Import Flow

**File:** `/root/tld-v2/src/build_legends.py`

The `_sync_cgm_for_tom()` function (lines 560-595) demonstrates the current import flow:

```python
async def _sync_cgm_for_tom() -> None:
    """Sync CGM data from Nightscout for Tom's real legend."""
    from app.services.nightscout_client import NightscoutClient, entries_to_cgm_rows
    from app.services.cgm_entries import upsert_cgm_entries_batch, ensure_cgm_entries_table

    client = NightscoutClient(base_url, timeout=30)

    async with db_manager.get_session() as session:
        await ensure_cgm_entries_table(session)

        entries = client.fetch_entries(days=90)
        rows = entries_to_cgm_rows(entries)
        if rows:
            cgm_ids = await upsert_cgm_entries_batch(session, user_id, rows)
            await session.commit()
```

**Current Behavior:**
- Fetches entries from Nightscout
- Converts to cgm_entries rows
- Calls `upsert_cgm_entries_batch()` which iterates and calls `upsert_cgm_entry()` for each row
- Each `upsert_cgm_entry()` call is idempotent due to the UNIQUE constraint

## What Needs to Be Done

### 1. Public API Layer

**Missing:** There is no public API endpoint for Nightscout import. The import is currently only available through:
- CLI script: `src/build_legends.py --sync-cgm`
- Direct service calls in tests

**Required:** Create a public API endpoint that:
- Accepts Nightscout connection configuration (base_url, etc.)
- Accepts optional date range parameters
- Returns an import summary with:
  - `normalized_count`: Total entries after filtering
  - `inserted_count`: New entries created
  - `updated_count`: Existing entries updated
  - `skipped_count`: Duplicate entries skipped
  - `errors`: List of any errors encountered

### 2. Import Summary Response

**Required:** Define a response schema for import results:

```python
{
    "success": bool,
    "normalized_count": int,
    "inserted_count": int,
    "updated_count": int,
    "skipped_count": int,
    "errors": list[str],
    "nightscout_id": str | None,  # For single import
    "nightscout_ids": list[str] | None,  # For batch import
    "imported_at": datetime,
}
```

### 3. Idempotency Verification Test

**TDD Tracer Bullet:** Write one API test showing the same valid Nightscout payload imported twice does not create duplicate CGM entries.

**Test Structure:**
```python
@pytest.mark.asyncio
async def test_import_same_payload_twice_no_duplicates():
    """Same Nightscout payload imported twice should not create duplicate CGM entries."""
    # Setup: Create user, configure Nightscout client
    # First import: Should insert 10 entries
    # Second import: Should update 10 entries (no new inserts)
    # Verify: Total count = 10, not 20
```

### 4. Profile Ownership Enforcement

**Required:** Ensure the API enforces profile ownership:
- User can only import CGM data for their own profile
- Use authenticated user context from request
- Return 403 Forbidden if user tries to access another user's data

### 5. Validation Integration

**Blocked by:** `issues/005-nightscout-import-validation.md`

The import API should integrate with validation logic to:
- Validate Nightscout connection
- Validate date ranges
- Validate payload format
- Return clear error messages for invalid configurations

## Likely Files to Modify

### New Files to Create

1. **`/root/tld-v2/app/routes/t1d_import_routes.py`**
   - Public API endpoints for Nightscout import
   - GET/POST endpoints for import configuration and execution
   - Integration with authentication middleware

2. **`/root/tld-v2/app/schemas/t1d_import_schema.py`**
   - Request/response schemas for import API
   - Pydantic models for validation

3. **`/root/tld-v2/tests/test_t1d_import_routes.py`**
   - Integration tests for the import API
   - Idempotency verification tests
   - Profile ownership tests

### Existing Files to Reference

1. **`/root/tld-v2/app/services/cgm_entries.py`**
   - Already has idempotent upsert logic
   - `upsert_cgm_entries_batch()` can be reused
   - `get_cgm_entry_count()` for verification

2. **`/root/tld-v2/app/services/nightscout_client.py`**
   - NightscoutClient for fetching data
   - Conversion helpers for data transformation

3. **`/root/tld-v2/tests/test_cgm_entries.py`**
   - Test patterns for service layer
   - Mock patterns for database operations

4. **`/root/tld-v2/src/build_legends.py`**
   - Example of how to use NightscoutClient and cgm_entries
   - Reference implementation for import flow

## Validation Commands

### Run Existing Tests

```bash
# Test CGM entries service (already has idempotency tests)
pytest tests/test_cgm_entries.py -v

# Test Nightscout client
pytest tests/test_nightscout_client.py -v
```

### Run New Tests (after implementation)

```bash
# Test import routes
pytest tests/test_t1d_import_routes.py -v

# Test idempotency specifically
pytest tests/test_t1d_import_routes.py::TestImportIdempotency -v

# Test profile ownership
pytest tests/test_t1d_import_routes.py::TestProfileOwnership -v
```

### Manual Validation

```bash
# Run the build_legends sync to verify current behavior
python3 src/build_legends.py --include-real --sync-cgm

# Check database for duplicates
psql $DATABASE_URL -c "SELECT user_id, measured_at, source, COUNT(*) FROM cgm_entries GROUP BY user_id, measured_at, source HAVING COUNT(*) > 1;"
```

## Implementation Approach

### Step 1: Define API Schema (RED)

Create the request/response schemas with validation:
- Import request: base_url, days, profile_id (optional)
- Import response: success, counts, errors

### Step 2: Write Failing Test (RED)

Write the idempotency test that:
1. Imports a set of entries
2. Verifies count = N
3. Imports the same entries again
4. Verifies count still = N (not 2N)

### Step 3: Implement Minimum Code (GREEN)

Create the import route handler that:
1. Validates input
2. Fetches entries from Nightscout
3. Calls `upsert_cgm_entries_batch()`
4. Counts inserted vs updated entries
5. Returns summary

### Step 4: Refactor (REFACTOR)

- Extract import logic into a service function
- Add error handling
- Add logging
- Optimize batch operations

### Step 5: Add Profile Ownership (GREEN)

- Use authenticated user context
- Verify user owns the profile
- Return 403 if not owned

### Step 6: Add Validation Integration (GREEN)

- Integrate with validation logic from issue #5
- Return clear error messages

## Success Criteria

From issue #63 acceptance criteria:

- [ ] Duplicate CGM readings are detected
- [ ] Repeated import returns an import summary without duplicating rows
- [ ] Import result includes normalized count, inserted count, and summary metadata
- [ ] Profile ownership is enforced
- [ ] Tests verify idempotency through the public API

## Risks and Constraints

1. **No Existing API Layer:** This is a new feature, so no existing API patterns to follow. Need to design from scratch.

2. **Profile Ownership:** Need to ensure the API uses authenticated user context and enforces ownership.

3. **Validation Integration:** Must wait for issue #5 (validation) to be completed.

4. **TDD Workflow:** Must follow the RED-GREEN-REFACTOR cycle strictly.

5. **Public Behavior Focus:** Tests must verify external behavior through the API, not internal implementation details.

## Dependencies

- **Issue #5:** Nightscout import validation (blocked by)
- **Existing:** `cgm_entries` table with idempotent upsert
- **Existing:** `NightscoutClient` for fetching data
- **Existing:** `upsert_cgm_entries_batch()` for batch operations

## Next Steps for Implementation Agent

1. **Read this context file** to understand the current state and requirements.

2. **Create the API schema** (`app/schemas/t1d_import_schema.py`) with request/response models.

3. **Write the idempotency test** (`tests/test_t1d_import_routes.py`) following the TDD tracer bullet.

4. **Implement the import route** (`app/routes/t1d_import_routes.py`) with minimum code to pass the test.

5. **Refactor** the implementation while keeping tests green.

6. **Add profile ownership enforcement** to the route.

7. **Integrate with validation** from issue #5 when available.

8. **Verify all acceptance criteria** are met.

9. **Run the full test suite** to ensure no regressions.

## Example Test Structure

```python
class TestImportIdempotency:
    """Test that importing the same Nightscout payload twice does not duplicate entries."""

    @pytest.mark.asyncio
    async def test_import_same_payload_twice_no_duplicates(self, authenticated_client, mock_nightscout):
        """Same Nightscout payload imported twice should not create duplicate CGM entries."""
        # Setup: Mock Nightscout to return 10 entries
        # First import: Should insert 10 entries
        response1 = await authenticated_client.post("/api/v1/t1d/import", json={
            "base_url": "http://nightscout.example/api/v1",
            "days": 7,
        })
        assert response1.status_code == 200
        data1 = response1.json()
        assert data1["inserted_count"] == 10
        assert data1["updated_count"] == 0

        # Second import: Should update 10 entries (no new inserts)
        response2 = await authenticated_client.post("/api/v1/t1d/import", json={
            "base_url": "http://nightscout.example/api/v1",
            "days": 7,
        })
        assert response2.status_code == 200
        data2 = response2.json()
        assert data2["inserted_count"] == 0
        assert data2["updated_count"] == 10

        # Verify: Total count = 10, not 20
        response3 = await authenticated_client.get("/api/v1/t1d/cgm-entries?days=7")
        assert response3.status_code == 200
        entries = response3.json()
        assert len(entries) == 10
```

## Notes

- The idempotency is already implemented at the database level via the UNIQUE constraint.
- The main work is to expose this behavior through a public API and verify it with tests.
- The import flow should be simple: fetch → convert → upsert → summarize.
- Error handling should be clear and helpful for users.
- Logging should track import progress and any issues encountered.