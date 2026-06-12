## Parent PRD

`issues/prd.md`

## What to build

Add authenticated T1D profile creation/retrieval so a user can create or fetch the profile that owns their T1D data.

## TDD tracer bullet

Write one API test showing an authenticated user can create a T1D profile and retrieve it by ID.

## Acceptance criteria

- [ ] Authenticated user can create a T1D profile.
- [ ] Authenticated user can retrieve their own T1D profile.
- [ ] Profile is associated with the authenticated user.
- [ ] Invalid request bodies are rejected with clear validation errors.
- [ ] Tests verify public API behavior.
- [ ] Existing SparkyFitness behavior is not removed.

## Blocked by

None - can start immediately

## User stories addressed

- User story 2
- User story 8
- User story 33
- User story 35
- User story 36
