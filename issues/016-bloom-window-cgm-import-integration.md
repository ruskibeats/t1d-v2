## Parent PRD

`issues/prd.md`

## What to build

Integrate Bloom window computation with imported CGM data specifically, so Bloom windows reflect real CGM summaries from Nightscout/CGM import.

## TDD tracer bullet

Write one service or API-level test showing Bloom windows include glucose average, peak, and rate-of-change derived from imported CGM data.

## Acceptance criteria

- [ ] Bloom computation consumes imported CGM data.
- [ ] Bloom windows include glucose average, peak, and rate-of-change when CGM data exists.
- [ ] Bloom windows remain deterministic for the same imported CGM data.
- [ ] Missing CGM data lowers confidence rather than inventing certainty.
- [ ] Tests verify behavior through public computation interfaces.

## Blocked by

- Blocked by `issues/008-cgm-summary-metrics.md`
- Blocked by `issues/015-bloom-window-fixture-computation.md`

## User stories addressed

- User story 20
- User story 21
- User story 22
- User story 23
- User story 24
- User story 27
- User story 35
- User story 36
