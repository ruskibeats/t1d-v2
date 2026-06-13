# Mobile Integration Review: #69 T1D Meal Review Safety

**Reviewer:** T1D-bot3
**Date:** 2026-06-12
**Scope:** Mobile-frontend integration review of #69 T1D meal review safety (backend complete)

---

## 1. Backend Implementation Status

**✅ #69 COMPLETE** — All acceptance criteria met.

### Safety enforcement implemented in `sparky-bloom/server/routes/t1dMealReviewRoutes.ts`:

| Safety Feature | Mechanism | Status |
|---------------|-----------|--------|
| Safety metadata required | `validateSafetyJson()` — requires `safetyJson` with `content_safety_verified: true` and valid `risk_level` | ✅ |
| Dosing language rejection | Banned words + regex patterns for dosing/treatment phrases | ✅ |
| Cross-user access | Repository-level owner check via `getMealReviewById(reviewId, userId)` | ✅ |
| Swagger documentation | `@swagger` JSDoc on route handler | ✅ |

### Banned words checked server-side:
- `insulin`, `bolus`, `injection`, `dose`, `deliver`, `pump`, `basal`, `temp basal`, `tbr`, `smb`, `microbolus`, `correction`

### Dosing patterns checked server-side:
- `take X units`, `give X units`, `inject X units`, `X units of insulin`, `pre-bolus`, `split bolus`, `extended bolus`, `square wave`

### Treatment patterns checked server-side:
- `change treatment`, `stop insulin`, `discontinue medication`, `increase basal`, `decrease basal`

### Validation results:
- **7/7 tests passing** (t1dMealReviewSafety.test.ts)
- ESLint clean, typecheck clean

---

## 2. Does mobile code consume the meal review API?

**❌ NO — sato-bloom has no meal review feature at all.**

```bash
$ grep -rn "mealReview\|meal_review\|meal-review\|t1dMeal" /root/tld-v2/sato-bloom/src/
# No results

$ grep -rn "safety\|refusal\|dosing\|insulin" /root/tld-v2/sato-bloom/src/ --include="*.ts" --include="*.tsx" | grep -v node_modules
# Only references in pigment definitions ("insulin sensitivity support") and sample data ("Heavy meal")
# No meal review UI, no safety warning display, no API call patterns
```

The meal review feature exists **server-side only** at this point. sato-bloom doesn't have:
- A meal review creation form/screen
- A meal review detail view
- Safety warning display components
- Refusal message handling UI
- Any API call patterns for the meal review endpoints

---

## 3. What mobile needs when building meal review UI

Since the backend safety enforcement is already in place, the mobile app needs to handle these API interactions:

### 3.1 Creating a meal review (POST)

The mobile app must include `safetyJson` in every POST request:

```typescript
// Required request shape
{
  t1dProfileId: string;
  dataMode: "demo" | "real";
  lifecycleStatus: "draft" | "saved";
  normalizedJson: Record<string, unknown>;  // Must NOT contain dosing language
  safetyJson: {
    content_safety_verified: boolean;
    risk_level: "none" | "low" | "moderate" | "high";
    blocked_phrases?: string[];
    disclaimer_required?: boolean;
  };
}
```

### 3.2 Handling rejection responses (400)

When mobile sends content with dosing/treatment language, the API returns:

```json
{
  "error": "Meal review content contains dosing/treatment language and cannot be saved: ..."
}
```

Mobile should:
- Display this error message to the user in a non-alarming way
- NOT modify or re-submit the user's medical language — this is a safety boundary
- Educate the user that meal reviews are educational, not treatment recommendations

### 3.3 Displaying safety metadata in responses (GET)

The API response includes:

```json
{
  "id": "review-789",
  "safety_json": {
    "content_safety_verified": true,
    "risk_level": "none",
    "blocked_phrases": [],
    "disclaimer_required": false
  }
}
```

Mobile should:
- Show a disclaimer when `disclaimer_required: true`
- Surface the `risk_level` visually (e.g., color-coded badge)
- Use `blocked_phrases` to show proactive feedback about content that was flagged

### 3.4 Cross-user access (403/404)

- Cross-user access returns 404 ("Meal review not found") — no info leakage
- Mobile should handle this gracefully (e.g., "This review is not available")

---

## 4. API Response Shape Comparison

| Field | API Response (GET) | Mobile Needs | Status |
|-------|-------------------|--------------|--------|
| `id` | `string` | Unique identifier | ✅ Available |
| `safety_json.content_safety_verified` | `boolean` | Should display badge/icon | ✅ Available |
| `safety_json.risk_level` | `"none"\|"low"\|"moderate"\|"high"` | Color-coded display | ✅ Available |
| `safety_json.disclaimer_required` | `boolean` | Show/hide disclaimer | ✅ Available |
| `safety_json.blocked_phrases` | `string[]` | Proactive feedback | ✅ Available |
| `normalized_json` | `Record<string, unknown>` | Content rendering | ✅ Available |

**No rendering incompatibilities.** The API response is clean and well-structured for mobile consumption.

---

## 5. Recommendations

### Immediate (none required)
- No changes needed to #69 — server-side safety enforcement is robust and complete.
- sato-bloom just doesn't have the meal review feature built yet.

### When building mobile meal review UI
1. **Always include `safetyJson`** in POST requests — the API will reject without it
2. **Display API rejection messages verbatim** — they are designed by the safety policy, not placeholder errors
3. **Check `disclaimer_required` flag** on GET responses and show medical disclaimer when true
4. **Surface `risk_level` visually** — consider color mapping: `none`=green, `low`=yellow, `moderate`=orange, `high`=red
5. **Show `blocked_phrases` as feedback** — helps users understand what language triggered the safety filter

### Not blocked by anything
- The meal review API is available at `POST /api/t1d-meal-reviews` and `GET /api/t1d-meal-reviews/:id`
- Auth required (user must be authenticated)
- Profile ownership enforced

---

## References

- `sparky-bloom/server/routes/t1dMealReviewRoutes.ts` — Safety validation + route handlers
- `sparky-bloom/server/models/t1dMealReviewRepository.ts` — Owner-scoped queries
- `sparky-bloom/server/tests/t1dMealReviewSafety.test.ts` — 7 safety tests (all passing)
- `sparky-bloom/server/db/rls_policies.sql` — RLS policies for meal reviews
- `issues/012-t1d-meal-review-safety.md` — Issue #69 spec
- `sato-bloom/src/` — No meal review code exists yet
