## Parent PRD

`issues/prd.md`

## What to build

Make Nightscout/CGM import idempotent so repeated imports do not duplicate readings.

## TDD tracer bullet

Write one API test showing the same valid Nightscout payload imported twice does not create duplicate CGM entries.

## Acceptance criteria

- [ ] Duplicate CGM readings are detected.
- [ ] Repeated import returns an import summary without duplicating rows.
- [ ] Import result includes normalized count, inserted count, and summary metadata.
- [ ] Profile ownership is enforced.
- [ ] Tests verify idempotency through the public API.

## Blocked by

- Blocked by `issues/005-nightscout-import-validation.md`

## User stories addressed

- User story 4
- User story 5
- User story 6
- User story 8
- User story 33
- User story 35
- User story 36
