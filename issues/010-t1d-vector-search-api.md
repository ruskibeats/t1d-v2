## Parent PRD

`issues/prd.md`

## What to build

Expose profile-scoped T1D vector search through a public API.

## TDD tracer bullet

Write one API test showing a user can search vector documents and only receives documents owned by their profile.

## Acceptance criteria

- [ ] Authenticated user can search T1D vector documents.
- [ ] Results are limited to the authenticated user's profile.
- [ ] Cross-user vector access is rejected.
- [ ] Invalid searches are rejected.
- [ ] Swagger documents the endpoint.
- [ ] Tests verify public API behavior.

## Blocked by

- Blocked by `issues/009-t1d-vector-search-contract.md`

## User stories addressed

- User story 15
- User story 16
- User story 17
- User story 33
- User story 34
- User story 35
- User story 36
