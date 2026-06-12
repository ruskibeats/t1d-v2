## Parent PRD

`issues/prd.md`

## What to build

Add request validation for Nightscout/CGM import payloads before any data is persisted.

## TDD tracer bullet

Write one API test showing an invalid Nightscout payload is rejected with a clear validation error.

## Acceptance criteria

- [ ] Nightscout import request schema is defined.
- [ ] Invalid payloads are rejected before persistence.
- [ ] Missing required fields produce clear errors.
- [ ] Tests verify validation behavior through the API.
- [ ] No duplicate import behavior is required in this slice.

## Blocked by

- Blocked by `issues/003-t1d-profile-create-get.md`

## User stories addressed

- User story 4
- User story 7
- User story 34
- User story 35
- User story 36
