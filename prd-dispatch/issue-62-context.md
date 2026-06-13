# Issue 62: Nightscout Import Validation
**Context for Issue Implementation**

---

## Issue Summary

**File:** `/root/tld-v2/issues/005-nightscout-import-validation.md`

### Goal
Add request validation for Nightscout/CGM import payloads before any data is persisted. Ensure that invalid payloads are rejected with clear validation errors through the API.

### Parent PRD Reference
`/root/tld-v2/issues/prd.md` - Section "User Stories 4, 7" and "Testing Decisions"

### TDD Guardrail Reference
`/root/tld-v2/issues/025-tdd-workflow-guardrails.md`

### Acceptance Criteria
- [ ] Nightscout import request schema is defined
- [ ] Invalid payloads are rejected before persistence
- [ ] Missing required fields produce clear errors
- [ ] Tests verify validation behavior through the API
- [ ] No duplicate import behavior is required in this slice

### User Stories Addressed
- User Story 4: Connect or import CGM data
- User Story 7: Invalid CGM imports are rejected clearly
- User Story 34: Swagger documents new APIs
- User Story 35: Tests verify public behavior
- User Story 36: TDD implementation through vertical slices

---

## Background & Related Issues

### Related Files

**Nightscout Client (Issue #40)**
- `/root/tld-v2/app/services/nightscout_client.py`
  - `NightscoutClient` class fetches CGM entries and treatments from Nightscout API
  - `fetch_entries()`, `fetch_treatments()`, `fetch_status()` methods
  - `entries_to_cgm_rows()` and `treatments_to_health_metrics()` conversion helpers
  - `load_entries_from_json()` for offline development
  - Returns standardized dicts with `timestamp`, `value_mg_dl`, `value_mmol_l`, `device`, `trend_arrow`, `nightscout_id`

**CGM Entries Storage (Issue #34)**
- `/root/tld-v2/app/services/cgm_entries.py`
  - `CGM_ENTRIES_TABLE_DDL` - schema for `cgm_entries` table
  - `upsert_cgm_entry()` - idempotent insert/update by (user_id, measured_at, source)
  - `upsert_cgm_entries_batch()` - batch upsert helper
  - `get_cgm_entries()`, `get_cgm_entry_count()`, `delete_cgm_entries()` - query helpers

**Existing Tests**
- `/root/tld-v2/tests/test_nightscout_client.py` - tests for NightscoutClient
  - Tests for fetch success/failure, timestamp parsing, direction filtering
  - Tests for conversion helpers and JSON file fallback
  - Integration test for upsert with cgm_entries
- `/root/tld-v2/tests/test_cgm_entries.py` - tests for cgm_entries storage
  - Tests for idempotent upsert, metadata merge, batch operations
  - Tests for time filtering, source filtering, schema DDL

### Dependencies
- Blocked by Issue #3 (T1D profile creation/retrieval) - appears marked as "Blocked by: None" but referenced in PRD
- No existing API routes for Nightscout import exist yet (will be created in this issue)

---

## Nightscout API Contract

### Endpoint
```
POST /api/t1d/cgm/nightscout/import
```

### Request Schema (to be defined)
Based on Nightscout client output, expected fields include:
- `base_url`: Nightscout API base URL (e.g., "http://nightscout:4000/api/v1")
- `days`: Number of days to import (default 90)
- Optional: `skip`, `count` for pagination

### Nightscout Entry Format
Nightscout entries.json contains dicts with:
- `_id`: unique identifier
- `dateString` OR `date`/`mills`: timestamp (milliseconds or ISO format)
- `sgv`: blood glucose value (mg/dL)
- `direction`: trend arrow string (e.g., "Flat", "SingleUp")
- `device`: device identifier

### Nightscout Treatment Format
Nightscout treatments.json contains dicts with:
- `_id`: unique identifier
- `created_at` OR `dateString`: timestamp
- `eventType`: e.g., "Carb Correction", "Bolus"
- `carbs` OR `insulin`: nutritional or treatment value
- `eventGroup`: optional grouping

---

## Existing Nightscout Client Behavior

### Current Capabilities
1. **Fetches data from Nightscout API**
   - `fetch_entries(days=90)` - pulls CGM entries
   - `fetch_treatments(days=90)` - pulls treatments
   - `fetch_status()` - connectivity check

2. **Handles timestamp variations**
   - `dateString` (ISO format)
   - `date` or `mills` (milliseconds since epoch)
   - Automatic conversion to UTC

3. **Filters and normalizes**
   - Skips entries without `sgv` field
   - Converts mg/dL → mmol/L (÷18.018, rounded to 1 decimal)
   - Maps treatments to metric_types: `meal`, `insulin`, `exercise`, `note`

4. **Supports JSON file fallback**
   - `load_entries_from_json(json_path)` for offline development

### Current Validation
- None at the API level
- Client-level validation: checks for `sgv` presence before processing
- No request schema validation before persistence

---

## Testing Strategy & Patterns

### PRD Testing Decisions (from `/root/tld-v2/issues/prd.md`)
1. **Tests should verify public behavior, not implementation details**
2. **TDD workflow**: one public behavior → one failing test → minimal implementation → refactor
3. **Tests should read like a product specification**

### Test Pattern (from existing codebase)

**Test Structure:**
```python
"""Tests for Issue #XXX: [description]."""

import pytest
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock


class TestClassName:
    """Test [behavior] described in one sentence."""

    @pytest.mark.asyncio
    async def test_specific_behavior_description(self):
        """Narrative description of what the test verifies."""
        from app.services.[module] import [function]

        # Given - setup
        mock_session = AsyncMock()
        result_mock = MagicMock()
        result_mock.scalar_one.return_value = 1
        mock_session.execute.return_value = result_mock

        # When - action
        result = await [function](mock_session, ...)

        # Then - assertion
        assert result == expected
```

### Existing Service Test Examples
From `/root/tld-v2/tests/test_cgm_entries.py`:
- Uses `db_session` fixture with mocked `execute`
- Validates SQL contains correct `INSERT ... ON CONFLICT` clause
- Tests metadata merge behavior with `||` operator
- Tests idempotent upsert with same (user_id, measured_at, source)

From `/root/tld-v2/tests/test_nightscout_client.py`:
- Patches `_fetch_json` to avoid network calls
- Verifies timestamp parsing for different formats
- Validates `sgv` filtering (skips None values)
- Tests conversion helper outputs

### Mock Patterns
- Use `unittest.mock.patch` to avoid real HTTP requests
- Mock async session with `AsyncMock()` and `MagicMock()`
- For DB tests: mock `session.execute` and verify SQL is called correctly
- For client tests: mock `_fetch_json` to return fixture data

---

## Implementation Approach

### Step 1: Define Request Schema
**File to create:** `/root/tld-v2/app/schemas/nightscout_import.py`

**Expected schema (pydantic BaseModel):**
```python
from pydantic import BaseModel, Field, HttpUrl
from typing import Optional

class NightscoutImportRequest(BaseModel):
    """Request schema for Nightscout import API."""
    base_url: HttpUrl = Field(..., description="Nightscout API base URL")
    days: int = Field(default=90, ge=1, le=365, description="Days of history to import")
    skip: Optional[int] = Field(default=None, ge=0, description="Number of entries to skip")
    count: Optional[int] = Field(default=None, ge=1, le=1000, description="Entries per page")

    class Config:
        json_schema_extra = {
            "example": {
                "base_url": "http://nightscout.example.com:4000/api/v1",
                "days": 90
            }
        }
```

**Validation rules:**
- `base_url`: required, must be valid HTTP URL
- `days`: optional, default 90, range 1-365
- `skip`: optional, must be >= 0 (used for pagination)
- `count`: optional, used for pagination

### Step 2: Create Validation Service
**File to create:** `/root/tld-v2/app/services/nightscout_import_validator.py`

**Functions:**
```python
from app.schemas.nightscout_import import NightscoutImportRequest
from pydantic import ValidationError

def validate_import_request(request: dict) -> NightscoutImportRequest:
    """Validate Nightscout import request, raise ValidationError if invalid."""
    try:
        return NightscoutImportRequest(**request)
    except ValidationError as e:
        raise ValueError(str(e)) from e
```

### Step 3: Create Import API Handler
**File to create:** `/root/tld-v2/app/routes/t1d_nightscout_routes.py`

**Router function:**
```python
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/t1d", tags=["nightscout-import"])

async def verify_t1d_profile_exists(db: AsyncSession, user_id: int) -> bool:
    # TODO: Implement after Issue #3
    return True

@router.post("/cgm/nightscout/import")
async def import_nightscout_entries(
    request: NightscoutImportRequest,
    session: AsyncSession = Depends(get_db_session)
):
    """Import CGM entries from Nightscout API."""
    # 1. Validate request
    # 2. Fetch from Nightscout
    # 3. Convert to cgm_entries rows
    # 4. Batch upsert
    # 5. Return import summary
```

### Step 4: Write API Validation Test (TDD)
**File:** `/root/tld-v2/tests/test_nightscout_import_validation.py`

**Test cases to implement:**
1. **Valid request passes validation**
   - All required fields present
   - Valid URL format
   - Days within range
   - Response contains validated schema

2. **Missing `base_url` raises clear error**
   - Missing field → error message like "field required"
   - Error is HTTP 422 with JSON response

3. **Invalid URL raises clear error**
   - Non-HTTP scheme → error like "URL scheme not permitted"
   - Malformed URL → validation error

4. **Days out of range raises clear error**
   - `days=-1` → error about min value
   - `days=1000` → error about max value

5. **Negative `skip` raises clear error**
   - `skip=-1` → error about non-negative value

6. **Request ID is returned in response**
   - Validate that the API returns the validated request structure

### Step 5: Add Middleware to Existing API (if applicable)
Based on `/root/tld-v2/plan.md`, routes will be added under `/api/t1d`:
- File: `/root/tld-v2/sparky-bloom/server/routes/t1dNightscoutRoutes.ts` (mobile backend)
- Schema file: `/root/tld-v2/sparky-bloom/server/schemas/t1dCgm.zod.ts`

---

## RLS & Security Considerations

From `/root/tld-v2/issues/prd.md`:
- **RLS policies** must be verified for every T1D table
- **User data cannot leak across profiles**
- **CGM data must be protected from other users**

For Issue #62 (validation only), RLS is not directly tested, but the validation should:
- Accept `base_url` from the request
- Associate imported data with authenticated user (via session/user_id)
- Validate request at API layer before any database mutation

---

## Swagger Documentation

From `/root/tld-v2/issues/prd.md`:
- Tests should verify Swagger documentation for new APIs
- Routes must be documented with descriptions, request/response schemas

For `/api/t1d/cgm/nightscout/import`:
- Use FastAPI automatic schema generation or Zod/Pydantic models
- Document example request/response
- Mark as "Safe to test" - no sensitive data

---

## Test Execution Commands

Run the validation test:
```bash
pytest tests/test_nightscout_import_validation.py -v
```

Run all Nightscout-related tests:
```bash
pytest tests/test_nightscout_client.py tests/test_cgm_entries.py -v
```

Run tests with TDD guardrail check:
```bash
# Check workflow checklist in comments
pytest tests/test_nightscout_import_validation.py -v --tb=short
```

---

## Success Criteria

**Before implementation:**
- No validation exists for Nightscout import requests
- No request schema defined
- Invalid payloads would be accepted or cause cryptic errors

**After implementation:**
- Defined schema rejects invalid requests with clear error messages
- Tests validate validation behavior through the API
- Validation happens before any persistence
- Swagger documents the endpoint
- TDD guardrail checklist is visible in code/comments
- No duplicate import behavior (deferred to Issue #6)

---

## Hard Constraints

1. **Do not modify files** (per task instructions) - only read and document
2. **Tests must be public-interface focused** - not implementation detail tests
3. **RED → GREEN → REFACTOR** - TDD workflow must be visible
4. **No edits until test first** - per TDD guardrails
5. **Validation before persistence** - explicit acceptance criteria
6. **Clear errors for missing fields** - user story requirement

---

## Potential Risks & Edge Cases

### Risk 1: Nightscout URL variations
- LibreLinkUp instances may not use standard endpoint names
- URLs may include trailing slashes or subdomains
- **Mitigation:** Accept flexible base_url parsing in client, validate format in schema

### Risk 2: Missing/invalid timestamps
- Entries without `dateString` but with `date` in milliseconds
- `sgv` may be None or missing
- **Mitigation:** Client already handles these (see `test_fetch_entries_handles_millisecond_timestamps`)

### Risk 3: Large import payloads
- 90 days of CGM data ≈ 12,960 entries
- Network timeouts or memory issues
- **Mitigation:** Not in scope for Issue #62, but should be in pagination design

### Risk 4: Authenticated user association
- Need to know which user owns the imported data
- **Mitigation:** Requires T1D profile (Issue #3), so import will associate with `user_id` from session

---

## Next Steps for Implementation Agent

1. **Read this context file** - understand the full requirement
2. **Create test file** `/root/tld-v2/tests/test_nightscout_import_validation.py`
3. **Write first test** for valid request passing validation
4. **Run test** (should fail → RED)
5. **Define schema** `/root/tld-v2/app/schemas/nightscout_import.py`
6. **Create validator** `/root/tld-v2/app/services/nightscout_import_validator.py`
7. **Make test pass** (→ GREEN)
8. **Add Swagger documentation**
9. **Repeat for remaining test cases** (invalid requests, error messages, etc.)
10. **Refactor only while tests are green** (→ REFACTOR)
11. **Verify TDD guardrail checklist** in comments
12. **Check** all acceptance criteria met
13. **Report completion** to supervisor

---

## Configuration & Dependencies

### Required Dependencies (in pyproject.toml)
```toml
dependencies = [
    "fastapi>=0.100.0",
    "pydantic>=2.0.0",
    "sqlalchemy>=2.0.0",
    "httpx>=0.24.0",  # For async HTTP requests to Nightscout
]
```

### Optional Dependencies
- Testing:
  - `pytest-asyncio>=0.21.0`
  - `httpx>=0.24.0` (for test fixtures)

### Environment Variables (if needed)
- `DATABASE_URL` - for database session
- `NIGHTSCOUT_BASE_URL` - example/override (not required for API validation)

---

## Summary

This issue is the **first slice of the Nightscout import feature** and follows the PRD's TDD guardrails strictly. The implementation should:

1. **Define a request schema** using pydantic for Nightscout import
2. **Create validation logic** that rejects invalid requests before any persistence
3. **Write API-level tests** that verify validation behavior (not implementation)
4. **Document with Swagger** so the public contract is clear
5. **Follow RED→GREEN→REFACTOR** workflow
6. **Focus on public behavior** as specified in the PRD

The validation is a **process guardrail** per Issue #25 (TDD workflow guardrails), ensuring that only well-formed requests proceed to persistence.

**Key files to reference:**
- `/root/tld-v2/app/services/nightscout_client.py` - existing Nightscout client
- `/root/tld-v2/app/services/cgm_entries.py` - persistence layer
- `/root/tld-v2/tests/test_nightscout_client.py` - test pattern
- `/root/tld-v2/tests/test_cgm_entries.py` - service test pattern

**Key PRD references:**
- `/root/tld-v2/issues/prd.md` - User Stories 4, 7, 34-36
- `/root/tld-v2/issues/025-tdd-workflow-guardrails.md` - TDD guardrail checklist