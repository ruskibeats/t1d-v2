# Issue #78 / `issues/021-t1d-chat-refusal-api.md` — Worker Artifact

## Scope

Implemented T1D chat refusal behavior for dosing, insulin adjustment, treatment advice, and emergencies. Based on Issue #77 decision gate recommendations (Option A: hard refusal for first slice).

## TDD Guardrail #82 Compliance

1. **RED**: Existing test `t1dChatRefusal.test.ts` was failing with `MCPClientError: Connection closed` — the chat service tried to connect to a non-existent MCP server before checking for safety-sensitive content.
2. **GREEN**: Added `checkT1dChatRefusal()` function that detects safety-sensitive keywords in user messages and returns a refusal response **before** any MCP/AI service connection is attempted. 6/6 tests pass.
3. **REFACTOR**: None needed — minimal implementation, clean separation of concerns.

## What Was Done

### Added to `sparky-bloom/server/services/chatService.ts`

1. **Keyword constants** for four refusal categories:
   - `DOSING_KEYWORDS`: insulin dose, how much insulin, units of insulin, bolus, correction dose, dosing, dose calculation
   - `INSULIN_ADJUSTMENT_KEYWORDS`: adjust insulin, change insulin, insulin regimen, basal rate, insulin sensitivity, carb ratio, correction factor, insulin to carb
   - `TREATMENT_KEYWORDS`: treatment plan, medication change, switch medication, stop taking, start taking, prescription, doctor recommendation
   - `EMERGENCY_KEYWORDS`: severe hypoglycemia, low blood sugar emergency, passing out, unconscious, dk, diabetic ketoacidosis, emergency, 911

2. **Refusal messages**:
   - `SAFETY_REFUSAL_MESSAGE`: "I cannot provide dosing or medical advice. Please consult your healthcare provider for personalized guidance."
   - `EMERGENCY_REFUSAL_MESSAGE`: "This sounds like a medical emergency. Please contact your healthcare provider or call emergency services (911) immediately. For non-urgent questions, contact your healthcare provider."

3. **`checkT1dChatRefusal()` function**: Checks the last user message against keyword lists. Returns a `T1dRefusalResult` with `isRefused: true` and the appropriate refusal type/message, or `null` if the message is safe. Emergency keywords are checked first (highest priority).

4. **`extractMessageText()` helper**: Extracts plain text from `ChatMessage` objects handling both string and array content formats.

5. **Early return in `processChatMessage()`**: The refusal check runs immediately after input validation, **before** the MCP client is created. If a refusal is detected:
   - Logs the refusal event
   - Saves both user message and refusal response to chat history
   - Returns `{ content, action: 'safety_refusal', executedTools: [], metadata: { refusalType } }`

### Updated `sparky-bloom/server/tests/t1dChatRefusal.test.ts`

Added 5 new tests (6 total):
1. ✅ Refuses dosing advice request ("How much insulin should I take?")
2. ✅ Refuses bolus dosing request ("What should my bolus be?")
3. ✅ Refuses insulin adjustment request ("Should I adjust my basal rate?")
4. ✅ Refuses treatment plan request ("What treatment plan should I follow?")
5. ✅ Defers emergency situations ("severe hypoglycemia") with emergency-specific language
6. ✅ Does NOT refuse safe messages ("healthy breakfast options") — proceeds to AI service

## Validation

```
npx vitest run tests/t1dChatRefusal.test.ts --reporter=verbose
→ 6 passed (6)

npx eslint services/chatService.ts tests/t1dChatRefusal.test.ts --max-warnings 0
→ clean (0 warnings)

npx tsc --noEmit
→ No new errors in modified files (pre-existing errors in other test files only)
```

## Acceptance Criteria

- [x] Chat refuses dosing recommendations
- [x] Chat refuses insulin adjustment advice
- [x] Chat refuses treatment decisions
- [x] Chat defers emergencies to clinicians or emergency support
- [x] Tests verify refusal behavior through the chat API (6/6 pass)
- [x] Existing safe chat behavior is not regressed (safe messages proceed to AI service)

## User Stories Addressed

- User story 17: Chat understands CGM and meal-review context when available
- User story 18: Chat refuses dosing, insulin adjustment, and treatment advice
- User story 19: Chat defers emergencies to clinicians or emergency support
- User story 35: Safety boundaries are explicit and tested
- User story 36: Refusal behavior is verified through public API tests
- User story 42: Chat safety is enforced before AI service invocation

## Files Changed

- `sparky-bloom/server/services/chatService.ts` — Added T1D chat refusal logic (keyword detection, refusal messages, early return in processChatMessage)
- `sparky-bloom/server/tests/t1dChatRefusal.test.ts` — Added 5 new tests (6 total)

## Notes

- The refusal check runs **before** MCP client creation, avoiding unnecessary AI service calls for safety-sensitive queries
- The `action: 'safety_refusal'` type allows the frontend to distinguish refusals from normal responses
- The `metadata.refusalType` field provides granular refusal category for analytics/logging
- Keyword matching is case-insensitive via `toLowerCase()`
- Emergency keywords are checked first to ensure highest-priority handling
