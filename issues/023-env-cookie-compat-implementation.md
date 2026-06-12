## Parent PRD

`issues/prd.md`

## What to build

Implement Bloom/T1D env var and auth cookie compatibility after the rollout decision is approved.

## TDD tracer bullet

Write one config or API test showing the backend reads old SparkyFitness env vars and new Bloom/T1D aliases safely.

## Acceptance criteria

- [ ] Old SparkyFitness env vars still work.
- [ ] New Bloom/T1D env vars work.
- [ ] Old cookie can be read during transition.
- [ ] New cookie can be written during transition.
- [ ] Sign-out clears both cookie names where applicable.
- [ ] Tests verify compatibility behavior.

## Blocked by

- Blocked by `issues/022-env-cookie-compat-decision.md`

## User stories addressed

- User story 30
- User story 31
- User story 32
- User story 39
- User story 40
- User story 41
