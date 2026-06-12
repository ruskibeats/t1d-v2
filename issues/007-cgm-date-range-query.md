## Parent PRD

`issues/prd.md`

## What to build

Add CGM date-range querying so clients can retrieve imported glucose readings for a specific period.

## TDD tracer bullet

Write one API test showing an authenticated user can query their own CGM entries between two timestamps.

## Acceptance criteria

- [ ] CGM query supports from/to date range.
- [ ] Query returns only the authenticated user's profile data.
- [ ] Cross-user access is rejected.
- [ ] Empty ranges return a valid empty response.
- [ ] Tests verify date-range behavior through the API.

## Blocked by

- Blocked by `issues/006-nightscout-import-idempotent.md`

## User stories addressed

- User story 8
- User story 9
- User story 33
- User story 34
- User story 35
- User story 36
