# Issue #71 — T1D Forecast Envelope Provenance

## Issue Summary

Add provenance metadata to T1D forecast envelopes so users know where predictions came from. This addresses User Stories 13 (save forecast envelopes with safety boundaries), 14 (envelopes include provenance), 15 (vector search over T1D context), 16 (vector search respects profile ownership), 33 (RLS-protected cross-user access), 35 (tests verify API behavior), and 36 (one vertical slice at a time).

**Issue file:** `issues/014-t1d-forecast-envelope-provenance.md`
**Blocked by:** `issues/013-t1d-forecast-envelope-create-get.md` (which creates/gets envelopes)
**TDD tracer bullet:** Write one API test showing a forecast envelope includes provenance metadata when saved.

## Acceptance Criteria

- [ ] Forecast envelope includes provenance metadata.
- [ ] Provenance distinguishes simulation, model, manual, or imported context where available.
- [ ] Cross-user access is rejected.
- [ ] Tests verify provenance behavior through the API.

## Related Issues & Dependencies

- **Blocker:** `013-t1d-forecast-envelope-create-get.md` — first establishes create/get envelope APIs.
  - Needs T1D profile API (`003-t1d-profile-create-get.md`) to associate envelopes with profiles.
  - Needs vector search API (`009-t1d-vector-search-contract.md` / `010-t1d-vector-search-api.md`) for provenance source types.
- **Follow-on:** `015-bloom-window-fixture-computation.md` — Bloom windows compute provenance for visualization.
- **Guardrail:** `025-tdd-workflow-guardrails.md` — enforce RED/GREEN/REFACTOR loop for this slice.
- **PRD constraints:** Tests must verify external API behavior, not implementation details. Provenance is a user-facing signal (who/where/how the envelope was created), not an implementation detail.

## High-Level Solution Approach

1. **Extend the forecast envelope schema** to include provenance fields:
   - `source_type` (enum): `simulation`, `model`, `manual`, `imported_cgm`, `nightscout`
   - `source_id` (string): reference to origin (e.g., Legend ID, model name, user note ID)
   - `created_at` (ISO timestamp) — implicit but useful for debugging
   - `confidence` (float, 0-1) — if available, mapped to `graph_confidence` from graph engine

2. **Incorporate existing provenance patterns** from `src/graph/engine.py` and `tests/test_graph_provenance.py`:
   - `provenance_json`: JSON field `{source, context, metadata}`
   - `confidence_components_json`: JSON field `{tier, base_score, flags}`
   - Default provenance when not provided: `"simulator_output"` (via `resolve_provenance`)

3. **API behavior:**
   - `POST /api/t1d/forecast-envelopes`:
     - Accepts envelope payload with optional `provenance` object.
     - Defaults to `source_type: "manual"` if not provided.
     - Validates `source_type` against allowed enum values.
     - Stores `provenance_json` and `confidence_components_json` in DB if available.
   - `GET /api/t1d/forecast-envelopes/:id`:
     - Returns the complete envelope including provenance fields.
     - Validates ownership via RLS (blocked on `004-t1d-profile-list-rls.md`).

4. **Cross-user access protection:**
   - Uses existing T1D profile RLS from `004-t1d-profile-list-rls.md`.
   - Tests must verify that a user cannot retrieve another user's envelope.

## Existing Code Patterns

### Provenance in Forecast Model (`t1d-v2/src/forecast/model.py`)

The `ForecastResult` dataclass already includes evidence/provenance fields:
- `top_drivers: list[str]`
- `historical_similarity_score: float | None`
- `profile_assumptions: dict[str, Any]`
- `missing_information_flags: list[str]`
- `evidence_items: list[dict]`

These fields are populated by the forecast engine (e.g., via graph queries). They represent the *model's* provenance but need to be persisted into envelope records.

### Provenance in Graph Engine (`src/graph/engine.py`)

The graph engine has helper functions for provenance and confidence:
- `_resolve_provenance(row)`: extracts `provenance_json` from a DB row, defaults to `"simulator_output"` if missing.
- `_resolve_hop_confidence(row)`: computes `confidence_tier` ("direct_derived", "inferred", "simulated") from `confidence` and `confidence_components_json`.

Pattern used in tests (`tests/test_graph_provenance.py`):
```python
prov_json = json.loads(params["prov"])
assert prov_json["source"] == "synthetic_legend"
```

This pattern should be mirrored in envelope creation: JSON-encode provenance and confidence components.

### Test Pattern (Issue #13 template)

From `013-t1d-forecast-envelope-create-get.md`, expected test structure:
- Use a test database fixture (conftest) that sets up:
  - An authenticated user.
  - A T1D profile owned by that user.
- Write an API test using `httpx` or similar to:
  1. Create a forecast envelope with a payload that includes `provenance`.
  2. Retrieve it and assert the `provenance` fields are present and correctly set.
- Verify cross-user access is blocked by:
  1. Trying to retrieve envelope owned by another user.
  2. Asserting HTTP 403 Forbidden (or 404 Not Found, depending on RLS).

### Schema Pattern (from existing issues)

Based on `009-t1d-vector-search-contract.md`:
- Define Zod schema for `ProvenanceInput`:
  ```ts
  source_type: z.enum(['simulation', 'model', 'manual', 'imported_cgm', 'nightscout']),
  source_id?: z.string(),
  notes?: z.string().optional()
  ```
- Use Zod in FastAPI route validation to reject invalid values.

## First Public Behavior to Test

The minimal public behavior that validates this issue is:

**Test: Create forecast envelope with provenance metadata**

1. Setup: authenticated user with T1D profile created via `GET /api/t1d/profiles`.
2. Action: `POST /api/t1d/forecast-envelopes` with payload:
   - `profile_id: <my_profile_id>`
   - `baseline_mg_dl: 100`
   - `peak_mg_dl: 150`
   - `peak_time_minutes: 90`
   - `forecast_points: [...]`
   - `provenance`: `{ source_type: "manual", notes: "My manual entry" }`
3. Assertion:
   - Response is 201 Created with envelope including `provenance` fields:
     ```json
     {
       "source_type": "manual",
       "source_id": null,
       "notes": "My manual entry",
       "created_at": "<ISO timestamp>"
     }
     ```

**Test: Retrieve envelope and verify provenance persisted**

1. Action: `GET /api/t1d/forecast-envelopes/<id>`
2. Assertion: Response includes `provenance` with same values as sent.

**Test: Cross-user access is blocked**

1. Setup: user A creates envelope. user B attempts to GET it.
2. Assertion: HTTP 403 Forbidden (or 404 if RLS hides it).

## Validation Commands

1. Run provenance-specific test suite:
   ```bash
   pytest tests/test_forecast_envelope_provenance.py -v
   ```

2. Run API contract tests (via `sparky-bloom/test_e2e/...` if exists):
   ```bash
   cd sparky-bloom && pnpm test:e2e:api
   ```

3. Integration check: verify RLS on `t1d_forecast_envelopes` table blocks cross-user access:
   ```sql
   SET ROLE <other_user>;
   SELECT * FROM t1d_forecast_envelopes WHERE id = <envelope_id>;
   -- Expect error or empty result.
   SET ROLE <current_user>;
   ```

4. Swagger documentation check: verify `POST /api/t1d/forecast-envelopes` and `GET /api/t1d/forecast-envelopes` are documented with `ProvenanceInput` and response schema.

## TDD Guardrail Alignment

From `025-tdd-workflow-guardrails.md`:

- ✅ "Not to write all tests first and all implementation later":
  - Implement provenance schema and one create-retrieve test first.
  - Then add cross-user access test and guardrails.
- ✅ "Not to refactor while the active behavior test is red":
  - Only refactor after provenance persistence, API shape, and RLS are verified green.
- ✅ "One public behavior, one failing test, minimal code, then refactor":
  - Step 1: Define schema + `POST` handler that stores provenance.
  - Step 2: Write failing test for provenance persistence.
  - Step 3: Implement DB insert with `provenance_json` and `confidence_components_json`.
  - Step 4: Update `GET` to include provenance in response.
  - Step 5: Write failing cross-user test.
  - Step 6: Verify RLS policy or middleware blocks access.
  - Step 7: Refactor only after all tests pass.
- ✅ "Tests verify public behavior through APIs":
  - Use HTTP clients (httpx) against the FastAPI routes, not direct DB calls.
- ✅ "Red/Green/Refactor status visible":
  - Comment each test with `# RED` / `# GREEN` / `# REFACTOR`.

## Implementation Risks

1. **Schema migration:** Adding provenance columns to an existing envelope table is low-risk if done via `ALTER TABLE`. Need to ensure `provenance_json` and `confidence_components_json` are nullable to avoid breaking existing inserts.

2. **RLS correctness:** If `004-t1d-profile-list-rls.md` has not been implemented, envelope access might not be profile-scoped. Need to verify that all envelope queries include profile ID and RLS policy.

3. **Backward compatibility:** Existing clients that create envelopes without provenance must not break. Use `defaults` in the DB and API:
   - DB: `provenance_json DEFAULT '{"source_type":"manual"}'`
   - API: If `provenance` is not present, set `source_type: "manual"` server-side.

4. **Vector search integration:** Envelopes might be used for vector search (Issue #15). Provenance values must be indexed for search if needed. For this issue, just include provenance in envelope records; vector index handling is a later concern.

## Success Criteria

- [ ] `POST /api/t1d/forecast-envelopes` accepts and stores provenance metadata.
- [ ] `GET /api/t1d/forecast-envelopes/:id` returns provenance with saved values.
- [ ] Provenance distinguishes at least one of: `simulation`, `model`, `manual`, or `imported_cgm`.
- [ ] Cross-user access returns 403 (or 404) and the envelope is not visible.
- [ ] All provenance tests pass.
- [ ] Swagger documents the new provenance fields.
- [ ] No existing tests fail due to schema changes.
- [ ] FastAPI route errors clearly explain missing or invalid provenance data.

## Suggested Next Steps (for planner)

1. Complete Issue #13 (create/get envelope APIs) first.
2. Add provenance fields to the envelope schema in `t1d-v2/src` or `sparky-bloom/server/schemas/`.
3. Implement `POST` handler with Zod validation and DB insertion using JSON encoding.
4. Implement `GET` handler to include provenance in the response.
5. Add provenance tests to `tests/test_forecast_envelope_provenance.py`.
6. Add cross-user access test after verifying RLS is in place.
7. Run full test suite to ensure no regressions.
8. Update Swagger documentation.