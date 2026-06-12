## Parent PRD

`issues/prd.md`

## What to build

Implement T1D chat refusal behavior for dosing, insulin adjustment, treatment advice, and emergencies.

## TDD tracer bullet

Write one API test showing chat refuses a dosing advice request with the approved safety language.

## Acceptance criteria

- [ ] Chat refuses dosing recommendations.
- [ ] Chat refuses insulin adjustment advice.
- [ ] Chat refuses treatment decisions.
- [ ] Chat defers emergencies to clinicians or emergency support.
- [ ] Tests verify refusal behavior through the chat API.
- [ ] Existing safe chat behavior is not regressed.

## Blocked by

- Blocked by `issues/020-t1d-chat-safety-boundaries.md`

## User stories addressed

- User story 17
- User story 18
- User story 19
- User story 35
- User story 36
- User story 42
