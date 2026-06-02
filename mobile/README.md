# T1D Companion Mobile

Production mobile app scaffold for T1D Companion.

Architecture decisions live in:

- `../docs/adr/ADR-001-mobile-react-native-expo-card-contract.md`
- `../docs/mobile-showcase-runner-strategy.md`
- `../docs/mobile-vertical-slice-issues.md`

The existing native SwiftUI app under `../ios/T1DCompanion/` is prototype/reference only.

## Stack

- Expo + React Native + TypeScript
- Expo Router
- React Native Paper
- TanStack Query
- Zustand
- `react-native-svg`
- Expo SecureStore

## Run

```bash
cd mobile
npm install
npm run start
```

Milestone 1 should remain Expo Go-compatible.

## Useful commands

```bash
npm run typecheck
npm run lint
npm run test
```

## App IA

- Home
- Patterns
- Meals
- Chat
- Settings via app chrome/modal

## Development slice

The scaffold currently renders a synthetic demo meal forecast using typed card JSON fixtures. The intended backend boundary is:

```http
POST /mobile/companion/run
```

with `phase: preflight | final` returning a finite, versioned `CompanionRunEnvelope`.

## Safety boundary

Mobile must not render unreviewed treatment-adjacent copy. Medium/high-risk safety text should use reviewed copy keys/templates, and unsupported card kinds must fail safe.
