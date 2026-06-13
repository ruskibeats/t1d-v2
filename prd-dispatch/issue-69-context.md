# Issue #69: T1D Meal Review Safety — Implementation Context

## Overview

This document provides implementation context for **Issue #69: "T1D Meal Review Safety"** in `/root/tld-v2`. The issue requires adding safety metadata enforcement for T1D meal reviews so they cannot become dosing or treatment recommendations.

---

## Issue Requirements

### Primary Goal
Add safety metadata enforcement for T1D meal reviews so reviews cannot become dosing or treatment recommendations.

### TDD Tracer Bullet
Write one API test showing a meal review without safety metadata is rejected or receives safe defaults.

### Acceptance Criteria
- [ ] Meal reviews include safety metadata.
- [ ] Dosing or treatment recommendation content is rejected or normalized to safe educational language.
- [ ] Cross-user access is rejected.
- [ ] Tests verify safety behavior through the API.

### Related Issues
- **Blocks:** `issues/011-t1d-meal-review-create-get.md` (T1D meal review create/retrieve must exist first)
- **Addresses:** User Stories 11, 12, 17, 33, 35, 36, 42 from PRD
- **Guardrail Alignment:** Follows `issues/025-tdd-workflow-guardrails.md` with RED-GREEN-REFACTOR iteration

---

## Existing Safety Infrastructure

### 1. Shared Safety Policy
**File:** `/root/tld-v2/t1d-v2/app/ai/safety_policy.py`
**Purpose:** Single source of truth for banned words, emergency keywords, dosing patterns, treatment patterns.

**Key Components:**
- `DEFAULT_SAFETY_CONFIG`: Emergency keywords (diabetes emergency, mental health crisis, general medical), banned words (insulin, bolus, dose, pump, etc.), dosing patterns (regex for "take X units", "give Y units", etc.), treatment patterns.
- `load_safety_config()`: Loads from defaults + JSON overrides.
- `get_banned_words()`: Returns shared banned word list.

### 2. SafetyScaffold Runtime Class
**File:** `/root/tld-v2/t1d-v2/app/ai/safety.py`
**Purpose:** Runtime veto gate for assistant-facing output.

**Key Methods:**
- `validate(content, context)`: Returns `SafetyReview` dict with:
  - `is_safe`: boolean
  - `blocked_phrases`: list of blocked substrings
  - `risk_level`: "none" | "low" | "moderate" | "high"
  - `emergency_triggered`: bool
  - `disclaimer_required`: bool
  - `reason`: str | None

### 3. SafetyReview Schema
**File:** `/root/tld-v2/t1d-v2/app/schemas/safety.py`
**Purpose:** Pydantic model for safety validation output.

### 4. SafetyMiddleware (Already Exists for Forecast Pipeline)
**File:** `/root/tld-v2/t1d-v2/src/pipeline/safety_middleware.py`
**Purpose:** Multi-validator pipeline (TextSafetyChecker, SchemaValidator, EvidenceValidator, UncertaintyValidator, ConsistencyValidator, ProvenanceValidator).

**Note:** Issue #38 implemented safety middleware for forecast output. This issue requires applying similar safety checks to **meal reviews**.

---

## Existing Meal Review Infrastructure

### 1. T1D Meal Review Routes
**File:** `/root/tld-v2/sparky-bloom/server/routes/t1dMealReviewRoutes.ts`
**Purpose:** Express router for meal review CRUD operations.

**Endpoints:**
- `POST /t1d-meal-reviews`: Create meal review
- `GET /t1d-meal-reviews/:id`: Retrieve meal review by ID

**Key Validation:**
- `t1dProfileId` (required)
- `dataMode` (enum: demo, simulated, nightscout, manual)
- `lifecycleStatus` (enum: draft, saved, discussed, discarded, archived)

### 2. T1D Meal Review Repository
**File:** `/root/tld-v2/sparky-bloom/server/models/t1dMealReviewRepository.ts`
**Purpose:** PostgreSQL database operations for meal reviews.

**Key Functions:**
- `createMealReview(userId, input)`: Creates meal review linked to user's profile.
- `getMealReviewById(reviewId, userId)`: Retrieves review with owner check.
- `getMealReviewsForProfile(profileId, userId)`: Lists reviews for a profile.

**Database Table:** `public.t1d_meal_reviews`

### 3. T1D Profile Repository
**File:** `/root/tld-v2/sparky-bloom/server/models/t1dProfileRepository.ts`
**Purpose:** Manages T1D profiles linked to Sparky users.

**Relationship:**
- Meal reviews are linked to T1D profiles via `t1d_profile_id`.
- T1D profiles are linked to Sparky users via `sparky_user_id`.
- RLS policies ensure users only access their own data.

### 4. RLS Policies
**File:** `/root/tld-v2/sparky-bloom/server/db/rls_policies.sql`

**Policy for `t1d_meal_reviews`:**
```sql
CREATE POLICY t1d_meal_reviews_select_policy ON public.t1d_meal_reviews FOR SELECT TO PUBLIC
USING (has_t1d_profile_access(t1d_profile_id));

CREATE POLICY t1d_meal_reviews_modify_policy ON public.t1d_meal_reviews FOR ALL TO PUBLIC
USING (has_t1d_profile_owner_access(t1d_profile_id))
WITH CHECK (has_t1d_profile_owner_access(t1d_profile_id));
```

**Key Functions:**
- `has_t1d_profile_access(profile_uuid)`: Profile owner OR legend/simulated OR family member with diary access.
- `has_t1d_profile_owner_access(profile_uuid)`: Profile owner only.

---

## TDD Workflow Guardrails

**File:** `/root/tld-v2/issues/025-tdd-workflow-guardrails.md`

**Critical Constraints:**
1. **No batching all tests first:** Write one public-interface test per behavior.
2. **No refactoring while RED:** Only refactor after the active behavior test passes.
3. **Refactor only when GREEN:** Build minimum implementation, then clean up.

**Recommended First Slice:**
Test **safety metadata validation** on POST `/t1d-meal-reviews`. If safety metadata is missing or contains banned content, reject the review with a clear error.

---

## Implementation Strategy

### Phase 1: Public Safety Behavior to Test First

**Goal:** Ensure meal reviews cannot become dosing/treatment recommendations.

**Test-First Approach:**

1. **Create a POST /t1d-meal-reviews test that fails:**
   - Create a meal review with `safetyJson` missing.
   - Expect 400 error: `"safety metadata is required for meal reviews"`.
   - Alternatively, if the field already exists in DB, normalize to safe defaults.

2. **Create a GET /t1d-meal-reviews/:id test that fails:**
   - Retrieve a meal review.
   - Inspect `safety_json` field.
   - Verify it contains required keys (e.g., "content_safety_verified": true, "risk_level": "none").

3. **Test cross-user access rejection:**
   - User A creates a meal review.
   - User B attempts to retrieve it via API.
   - Expect 403/404: "You don't have access to this meal review."

4. **Test dosing content rejection (if applicable to payload):**
   - Create meal review with `normalizedJson` containing banned words.
   - Expect validation error: `"safetyJson must not contain dosing/treatment language"`.

### Phase 2: Implementation

**Changes Required:**

1. **Update `t1dMealReviewRoutes.ts` (TypeScript):**
   - Add safety validation middleware before `t1dMealReviewRepository.createMealReview`.
   - Validate `safetyJson` structure and content.
   - Use existing `SafetyScaffold` from `app/ai/safety` (if available) or replicate dosing/treatment checking.
   - Return 400 with descriptive error if validation fails.

2. **Update `t1dMealReviewRepository.ts` (TypeScript):**
   - Ensure `createMealReview` calls the validation layer.
   - If safety validation happens in routes, this file just persists the validated data.

3. **Update RLS Policies (SQL):**
   - Already exists (`t1d_meal_reviews_modify_policy` enforces owner access).
   - Verify the policy is working via integration test.

### Phase 3: API Contract Updates

**Swagger Documentation:**
- Update `/t1d-meal-reviews POST` spec to require `safetyJson`.
- Document `safetyJson` structure:
  ```typescript
  {
    content_safety_verified: boolean,
    risk_level: "none" | "low" | "moderate" | "high",
    banned_phrases_found?: string[],
    disclaimer_required?: boolean
  }
  ```

---

## Validation Commands

### Unit Tests (Vitest)
```bash
cd /root/tld-v2/sparky-bloom/server

# Run T1D meal review tests
npm test t1dMealReviewRoutes.test.ts

# Run safety middleware tests
npm test test_safety_*.ts

# Run all tests
npm test
```

### Integration Tests
```bash
# Test safety behavior via POST endpoint
npm test -- --run t1dMealReviewRoutes.test.ts

# Test RLS policies via profile access
npm test t1dProfileRoutes.test.ts
```

### Manual API Validation

1. **Test safety metadata requirement:**
   ```bash
   curl -X POST http://localhost:8000/t1d-meal-reviews \
     -H "Content-Type: application/json" \
     -H "Cookie: sparky_session=<valid-cookie>" \
     -d '{
       "t1dProfileId": "<user-profile-id>",
       "safetyJson": {}
     }'
   # Expected: 400, error about missing safety metadata or invalid safetyJson
   ```

2. **Test dosing content rejection:**
   ```bash
   curl -X POST http://localhost:8000/t1d-meal-reviews \
     -H "Content-Type: application/json" \
     -H "Cookie: sparky_session=<valid-cookie>" \
     -d '{
       "t1dProfileId": "<user-profile-id>",
       "safetyJson": { "risk_level": "high", "banned_phrases": ["Take 3 units of insulin"] }
     }'
   # Expected: 400, error about dosing language
   ```

3. **Test cross-user access:**
   ```bash
   curl http://localhost:8000/t1d-meal-reviews/<other-user-review-id> \
     -H "Cookie: sparky_session=<my-cookie>"
   # Expected: 403/404
   ```

---

## Safety Boundaries

From PRD User Story 18:
- **Refuse dosing recommendations:** "Chat must refuse dosing recommendations, insulin adjustment advice, treatment decisions, and emergency medical handling."
- **Meal reviews should not:** Recommend insulin doses, basal rates, correction boluses, pump settings, or emergency treatments.
- **Allowed content:** Educational explanations, risk assessments, monitoring suggestions, historical comparisons.

**Safety Actions:**
1. Reject reviews with `safetyJson.risk_level` = "high" and `banned_phrases` present.
2. Require `content_safety_verified: true` in `safetyJson` for "saved" lifecycle status.
3. Reject if `normalizedJson` contains regex-matched dosing patterns (insulin, units, bolus, etc.).
4. Default to safe educational language if dosing language is detected.

---

## Codebase Location Summary

| Component | Location | Type |
|-----------|----------|------|
| Safety Policy | `/root/tld-v2/t1d-v2/app/ai/safety_policy.py` | Python |
| SafetyScaffold | `/root/tld-v2/t1d-v2/app/ai/safety.py` | Python |
| SafetyReview Schema | `/root/tld-v2/t1d-v2/app/schemas/safety.py` | Python |
| Safety Middleware | `/root/tld-v2/t1d-v2/src/pipeline/safety_middleware.py` | Python |
| Meal Review Routes | `/root/tld-v2/sparky-bloom/server/routes/t1dMealReviewRoutes.ts` | TypeScript |
| Meal Review Repository | `/root/tld-v2/sparky-bloom/server/models/t1dMealReviewRepository.ts` | TypeScript |
| T1D Profile Repository | `/root/tld-v2/sparky-bloom/server/models/t1dProfileRepository.ts` | TypeScript |
| RLS Policies | `/root/tld-v2/sparky-bloom/server/db/rls_policies.sql` | SQL |
| Test File (Template) | `/root/tld-v2/sparky-bloom/server/tests/t1dProfileRoutes.test.ts` | TypeScript |
| Test File (Template) | `/root/tld-v2/t1d-v2/tests/test_safety_policy_dedup.py` | Python |

---

## Next Steps for Planner/Subagent

1. **Read Issue #11** (`issues/011-t1d-meal-review-create-get.md`) to confirm meal review APIs exist.
2. **Examine `t1dMealReviewRoutes.ts`** and `t1dMealReviewRepository.ts` to understand current implementation.
3. **Create a test file:** `/root/tld-v2/sparky-bloom/server/tests/t1dMealReviewSafety.test.ts` following the pattern in `t1dProfileRoutes.test.ts`.
4. **Write one failing test** that checks safety metadata validation on POST `/t1d-meal-reviews`.
5. **Implement validation** in `t1dMealReviewRoutes.ts` using existing `SafetyScaffold` (or replicating its patterns).
6. **Run tests** until green.
7. **Refactor** if needed (only after tests pass).
8. **Document** the new endpoint spec in Swagger.

---

## Key Success Criteria

- [ ] A meal review without `safetyJson` or with invalid `safetyJson` is rejected via API (400 error).
- [ ] A meal review with dosing/treatment language in `safetyJson` or `normalizedJson` is rejected or normalized.
- [ ] Cross-user access to a meal review returns 403/404.
- [ ] All tests verify public API behavior (not internal implementation details).
- [ ] TDD guardrails are followed (one test → one implementation → refactor only when green).

---

## Notes

- The safety policy infrastructure exists in the T1D Companion v2 Python project (`/root/tld-v2/t1d-v2/`) but the meal review API is in the SparkyFitness backend (`/root/tld-v2/sparky-bloom/server/`). May need to align or replicate safety logic between the two.
- The issue mentions "regardless of whether existing safety data is valid" - suggests we need to validate and/or repair existing safety metadata, not just reject new data.
- TDD guardrails explicitly require NOT writing all tests first. Start with **one public API test** for safety metadata validation.