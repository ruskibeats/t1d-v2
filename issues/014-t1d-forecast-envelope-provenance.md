## Parent PRD

`issues/prd.md`

## What to build

Add provenance metadata to T1D forecast envelopes so users know where predictions came from.

## TDD tracer bullet

Write one API test showing a forecast envelope includes provenance metadata when saved.

## Acceptance criteria

- [ ] Forecast envelope includes provenance metadata.
- [ ] Provenance distinguishes simulation, model, manual, or imported context where available.
- [ ] Cross-user access is rejected.
- [ ] Tests verify provenance behavior through the API.

## Blocked by

- Blocked by `issues/013-t1d-forecast-envelope-create-get.md`

## User stories addressed

- User story 13
- User story 14
- User story 17
- User story 33
- User story 35
- User story 36
