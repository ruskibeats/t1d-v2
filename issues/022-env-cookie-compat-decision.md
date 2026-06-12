## Parent PRD

`issues/prd.md`

## What to build

Decide the Bloom/T1D env var and auth cookie compatibility strategy before implementation.

## Decision needed

Approve env var aliases, cookie transition behavior, and rollout constraints.

## Acceptance criteria

- [ ] Old SparkyFitness env vars remain supported during transition.
- [ ] New Bloom/T1D env vars are defined.
- [ ] Old and new cookie behavior is defined.
- [ ] DB role rename is explicitly deferred or scoped.
- [ ] Rollout constraints are documented.
- [ ] Implementation issue is unblocked only after decision is made.

## Blocked by

- Blocked by `issues/003-t1d-profile-create-get.md`

## User stories addressed

- User story 30
- User story 31
- User story 32
- User story 39
- User story 40
- User story 41
