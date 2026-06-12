## Parent PRD

`issues/prd.md`

## What to build

Add safety metadata enforcement for T1D meal reviews so reviews cannot become dosing or treatment recommendations.

## TDD tracer bullet

Write one API test showing a meal review without safety metadata is rejected or receives safe defaults.

## Acceptance criteria

- [ ] Meal reviews include safety metadata.
- [ ] Dosing or treatment recommendation content is rejected or normalized to safe educational language.
- [ ] Cross-user access is rejected.
- [ ] Tests verify safety behavior through the API.

## Blocked by

- Blocked by `issues/011-t1d-meal-review-create-get.md`

## User stories addressed

- User story 11
- User story 12
- User story 17
- User story 33
- User story 35
- User story 36
- User story 42
