## Parent PRD

`issues/prd.md`

## What to build

Decide the exact T1D chat safety boundaries before implementing chat changes.

## Decision needed

Approve refusal language, emergency deferral language, and whether chat may retrieve CGM/meal-review context in the first slice.

## Acceptance criteria

- [ ] Dosing advice boundary is explicit.
- [ ] Insulin adjustment boundary is explicit.
- [ ] Treatment decision boundary is explicit.
- [ ] Emergency deferral language is explicit.
- [ ] Context retrieval policy is explicit.
- [ ] Implementation issue is unblocked only after decision is made.

## Blocked by

- Blocked by `issues/010-t1d-vector-search-api.md`
- Blocked by `issues/012-t1d-meal-review-safety.md`

## User stories addressed

- User story 17
- User story 18
- User story 19
- User story 34
- User story 42
