## Parent PRD

`issues/prd.md`

## What to build

Add CGM summary metrics for a date range so clients can understand min, max, average, and time-in-range-style glucose behavior.

## TDD tracer bullet

Write one API test showing a CGM summary is computed for a date range from imported readings.

## Acceptance criteria

- [ ] Summary endpoint returns min, max, average, and count.
- [ ] Summary endpoint includes time-in-range metadata where available.
- [ ] Summary endpoint enforces profile ownership.
- [ ] Tests verify summary behavior through the API.
- [ ] Bloom windows depend on this CGM import/query behavior specifically.

## Blocked by

- Blocked by `issues/007-cgm-date-range-query.md`

## User stories addressed

- User story 8
- User story 9
- User story 10
- User story 20
- User story 33
- User story 35
- User story 36
