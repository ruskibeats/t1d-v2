## Parent PRD

`issues/prd.md`

## What to build

Add an implementation-process guardrail issue for the backend reskin: every T1D/Bloom/Sato slice should follow a small red-green-refactor loop instead of batching all tests first or doing speculative refactors while behavior is still red.

## TDD tracer bullet

Add or update project documentation/checklists so an agent starting any `001-024` PRD issue can see the required workflow: pick one public behavior, write one failing public-interface test, implement the minimum code to pass, then refactor only while tests are green.

## Acceptance criteria

- [ ] The PRD issue workflow explicitly says not to write all tests first and implementation later.
- [ ] The workflow explicitly says not to refactor while the active behavior test is red.
- [ ] Each implementation issue can link to or copy this guardrail.
- [ ] Review comments/checklists make RED/GREEN/REFACTOR status visible.
- [ ] The guardrail is phrased as process safety, not as a product endpoint.

## Blocked by

None - applies to every implementation slice.

## User stories addressed

- User story 37
- User story 38
