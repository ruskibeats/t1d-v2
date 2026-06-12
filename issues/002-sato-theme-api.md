## Parent PRD

`issues/prd.md`

## What to build

Expose the Sato skin theme through a public backend API so clients can receive the official theme contract.

## TDD tracer bullet

Write one API test that calls the theme endpoint and asserts the response contains the Sato theme name, version, palette, pigments, surfaces, and typography metadata.

## Acceptance criteria

- [ ] Theme endpoint returns a deterministic Sato theme response.
- [ ] Response includes palette, pigment metadata, surfaces, and typography metadata.
- [ ] Endpoint is documented in Swagger.
- [ ] Tests verify the public API response.
- [ ] No database mutation is required.
- [ ] No SparkyFitness branding rename is required.

## Blocked by

- Blocked by `issues/001-sato-shared-theme-contract.md`

## User stories addressed

- User story 25
- User story 26
- User story 28
- User story 34
- User story 35
- User story 36
