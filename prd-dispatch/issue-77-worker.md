# Issue #77 / `issues/020-t1d-chat-safety-boundaries.md` — Worker Artifact

## Scope

This issue is a **decision gate**, not a code implementation task. It requires product owner approval of exact T1D chat safety boundaries before any chat safety implementation can proceed.

## Current State

The existing chat system (`sparky-bloom/server/services/chatService.ts`) is a generic nutrition/wellness AI assistant with no T1D-specific safety guardrails:

- System prompt identifies Sparky as "an AI nutrition and wellness coach"
- No refusal language for dosing, insulin adjustment, or treatment advice
- No emergency deferral language
- No CGM/meal-review context retrieval policy
- No explicit safety boundaries for T1D-specific medical topics

## Decisions Required

The following four decisions must be made by the product owner before implementation can begin:

### Decision 1: Dosing Advice Boundary

**Question:** What exact language should the chat system use when refusing dosing advice?

**Options:**
- A) Hard refusal: "I cannot provide dosing advice. Please consult your healthcare provider."
- B) Soft refusal with education: "I can share general information about how dosing works, but I cannot recommend specific doses. Please consult your healthcare provider for personalized advice."
- C) Contextual refusal: "Based on your question, this appears to be a dosing decision. I'm not able to help with that — please consult your healthcare provider."

**Recommendation:** Option A (hard refusal) for first slice. Simplest, safest, easiest to implement and test.

### Decision 2: Insulin Adjustment Boundary

**Question:** What exact language should the chat system use when refusing insulin adjustment advice?

**Options:**
- A) Hard refusal: "I cannot provide insulin adjustment advice. Please consult your healthcare provider."
- B) Soft refusal with education: "I can explain how insulin adjustments work in general, but I cannot recommend specific changes to your regimen."
- C) Contextual refusal: "This appears to involve insulin adjustment. I'm not able to help with that — please consult your healthcare provider."

**Recommendation:** Option A (hard refusal) for first slice. Consistent with dosing boundary.

### Decision 3: Treatment Decision Boundary

**Question:** What exact language should the chat system use when refusing treatment decisions (e.g., medication changes, therapy choices)?

**Options:**
- A) Hard refusal: "I cannot provide treatment advice. Please consult your healthcare provider."
- B) Broad refusal: "I cannot provide medical advice, including treatment decisions, medication changes, or therapy choices. Please consult your healthcare provider."
- C) Categorized refusal: Different language for medication vs. lifestyle vs. emergency treatment decisions.

**Recommendation:** Option B (broad refusal) for first slice. Covers all treatment decisions with a single clear message.

### Decision 4: Emergency Deferral Language

**Question:** What exact language should the chat system use when a user describes an emergency situation (e.g., severe hypoglycemia, DKA symptoms)?

**Options:**
- A) Simple deferral: "This sounds like a medical emergency. Please contact your healthcare provider or call emergency services immediately."
- B) Detailed deferral: "I'm an AI assistant and cannot handle medical emergencies. If you're experiencing severe symptoms, please call emergency services (911) or go to the nearest emergency room immediately. For non-urgent questions, contact your healthcare provider."
- C) Categorized deferral: Different language for hypoglycemia vs. hyperglycemia vs. DKA vs. other emergencies.

**Recommendation:** Option B (detailed deferral) for first slice. Most protective, covers all emergency scenarios.

### Decision 5: Context Retrieval Policy

**Question:** Should the chat system retrieve CGM/meal-review context in the first slice?

**Options:**
- A) No context retrieval in first slice — chat is purely conversational with safety boundaries only.
- B) Read-only context retrieval — chat can reference CGM/meal-review data but cannot make recommendations based on it.
- C) Full context retrieval — chat can reference and analyze CGM/meal-review data with appropriate safety boundaries.

**Recommendation:** Option A (no context retrieval) for first slice. Simplest, safest. Context retrieval can be added in a follow-up issue after safety boundaries are proven.

## Acceptance Criteria

- [ ] Dosing advice boundary is explicit (Decision 1)
- [ ] Insulin adjustment boundary is explicit (Decision 2)
- [ ] Treatment decision boundary is explicit (Decision 3)
- [ ] Emergency deferral language is explicit (Decision 4)
- [ ] Context retrieval policy is explicit (Decision 5)
- [ ] Implementation issue is unblocked only after all decisions are made

## TDD Guardrail #82 Note

TDD guardrail #82 does not apply to this issue because it is a **decision gate**, not a code implementation task. Once decisions are confirmed and an implementation issue is created, TDD guardrail #82 should be enforced for that implementation work.

## Blocked By

- Blocked by `issues/010-t1d-vector-search-api.md` (#67) — vector search should exist before chat context retrieval
- Blocked by `issues/012-t1d-meal-review-safety.md` (#69) — meal review safety should be defined before chat safety

## User Stories Addressed

- User story 17: Chat understands CGM and meal-review context when available
- User story 18: Chat refuses dosing, insulin adjustment, and treatment advice
- User story 19: Chat defers emergencies to clinicians or emergency support
- User story 34: Safety boundaries are explicit and tested
- User story 42: Chat safety is enforced at the system prompt level

## Output

No code changes made. This issue requires product owner decisions before implementation can proceed.

## Recommended Next Step

Contact the product owner via `contact_supervisor` with `reason: "need_decision"` to confirm the five chat safety boundary decisions listed above. Once confirmed, create a new implementation issue (`026-t1d-chat-safety-implementation.md` or similar) with specific code changes scoped to the confirmed decisions.
