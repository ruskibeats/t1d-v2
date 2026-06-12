## Parent PRD

`issues/prd.md`

## What to build

Add T1D forecast envelope creation/retrieval so users can save predicted glucose ranges and assumptions.

## TDD tracer bullet

Write one API test showing an authenticated user can create and retrieve their own forecast envelope.

## Acceptance criteria

- [ ] Authenticated user can create a forecast envelope.
- [ ] Authenticated user can retrieve their own forecast envelope.
- [ ] Forecast envelope is linked to the authenticated user's T1D profile.
- [ ] Invalid payloads are rejected.
- [ ] Tests verify public API behavior.

## Blocked by

- Blocked by `issues/003-t1d-profile-create-get.md`

## User stories addressed

- User story 13
- User story 14
- User story 15
- User story 33
- User story 35
- User story 36
