## Parent PRD

`issues/prd.md`

## What to build

Create the shared Sato skin theme contract used by backend and mobile. This slice defines the palette, pigment metadata, surfaces, typography metadata, and visual-token vocabulary without adding React Native Skia dependencies to the backend.

## TDD tracer bullet

Write one test that verifies the shared Sato theme object exports the expected palette, pigment, surface, and typography keys.

## Acceptance criteria

- [ ] Shared Sato theme contract exists outside mobile-only code.
- [ ] Sato palette values are centralized.
- [ ] Pigment metadata includes name, hex, meaning, opacity bias, spread bias, and granulation bias.
- [ ] Surface colors and typography metadata are included.
- [ ] Backend can import the shared theme without pulling in React Native Skia.
- [ ] Tests verify the public theme contract.

## Blocked by

None - can start immediately

## User stories addressed

- User story 25
- User story 26
- User story 28
- User story 29
- User story 35
- User story 36
