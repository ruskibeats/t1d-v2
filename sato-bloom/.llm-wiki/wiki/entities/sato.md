---
type: entity
created: 2026-06-07
updated: 2026-06-07
sources: [[[sources/SRC-2026-06-07-001]]]
---

# Sato

T1D Companion mobile visualization layer — watercolor state bloom rendering for diabetes health metrics using React Native Skia

## Overview

Sato is a React Native/Expo mobile application that transforms Type 1 Diabetes health data into a living watercolor cloud visualization called the "State Bloom." The app maps five health dimensions (time in range, variability, activity, consistency, feeling) into colored, semi-transparent petal clusters that overlap to form a unified bloom representing the user's metabolic state.

## Key Features

- Watercolor-style rendering using `@shopify/react-native-skia`
- Five-layer scene composition: atmosphere, body, accents, ground, texture overlay  
- Profile-based color palettes: Balanced (green), Spike (blue), Calm (orange)
- Haptic feedback integration via `expo-haptics`
- Deterministic visual generation using seeded pseudo-random functions

## Architecture

- `App.tsx` — Main application component with profile switching
- `src/types/artifact.ts` — Core type definitions (ArtifactFeatures, VisualToken, RenderScene)
- `src/features/normalize.ts` — Biometric feature extraction from health events
- `src/renderers/sceneBuilder.ts` — Scene composition engine
- `src/grammar/mapper.ts` — Grammar mapping features to visual tokens

## Links

- [[sources/SRC-2026-06-07-001]]
- [[state-bloom]]
- [[watercolor-state-orb]]
- [[pattern-genome]]
