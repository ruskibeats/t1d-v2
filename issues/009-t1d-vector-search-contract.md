## Parent PRD

`issues/prd.md`

## What to build

Define the T1D vector search request/response contract so vector search can be profile-scoped and testable.

## TDD tracer bullet

Write one test showing the vector search schema accepts a profile-scoped query and rejects invalid input.

## Acceptance criteria

- [ ] Vector search schema is defined.
- [ ] Query input is validated.
- [ ] Response shape is documented.
- [ ] Profile ownership is part of the contract.
- [ ] Tests verify schema behavior without requiring full vector infrastructure.

## Blocked by

- Blocked by `issues/003-t1d-profile-create-get.md`

## User stories addressed

- User story 15
- User story 16
- User story 34
- User story 35
- User story 36
