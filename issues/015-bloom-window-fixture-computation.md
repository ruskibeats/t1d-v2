## Parent PRD

`issues/prd.md`

## What to build

Create the Bloom window computation service using deterministic fixture data so the backend can produce Sato-compatible metabolic windows.

## TDD tracer bullet

Write one service test showing a fixed fixture set produces deterministic Bloom windows with pigment keys and confidence.

## Acceptance criteria

- [ ] Bloom window service exists behind a simple interface.
- [ ] Fixture input produces deterministic output.
- [ ] Each window includes label, value, confidence, variability, intensity, state, and pigment key.
- [ ] Low-data windows receive low confidence.
- [ ] Tests verify service behavior, not internal implementation details.

## Blocked by

- Blocked by `issues/001-sato-shared-theme-contract.md`

## User stories addressed

- User story 20
- User story 21
- User story 22
- User story 23
- User story 24
- User story 28
- User story 35
- User story 36
