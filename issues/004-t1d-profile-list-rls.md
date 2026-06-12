## Parent PRD

`issues/prd.md`

## What to build

Add T1D profile listing and cross-user access protection so profile ownership is verifiable through public APIs.

## TDD tracer bullet

Write one API test showing one authenticated user cannot retrieve another user's T1D profile.

## Acceptance criteria

- [ ] Authenticated user can list their own T1D profiles.
- [ ] Cross-user profile access is rejected.
- [ ] Unauthenticated requests are rejected.
- [ ] RLS or equivalent ownership enforcement is verified.
- [ ] Tests verify owner-only behavior through public APIs.

## Blocked by

- Blocked by `issues/003-t1d-profile-create-get.md`

## User stories addressed

- User story 2
- User story 8
- User story 33
- User story 34
- User story 35
- User story 36
