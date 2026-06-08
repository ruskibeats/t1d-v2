# ADR-001: Mobile app stack and typed showcase card contract

Status: Accepted  
Date: 2026-06-02

## Context

T1D Companion v2 has a text-first Python showcase runner that renders terminal cards for meal forecasts, evidence, confidence, what-if scenarios, troubleshooting, situations, check-ins, insights, experiments, and debriefs.

The product needs a mobile app that presents the same logic as a polished, safe, user-facing journey. The app must preserve the educational/simulation boundary, avoid dosing or treatment recommendations, clearly label synthetic/demo data, and support future real-data integrations such as Nightscout.

A native SwiftUI prototype exists under `ios/T1DCompanion/`, but the preferred product direction is a shared cross-platform app.

## Decision

Build the production mobile app as a top-level Expo React Native project at `mobile/` using:

- React Native + TypeScript + Expo
- Expo Router for navigation
- React Native Paper as the base component system
- TanStack Query for server/cache state
- Zustand for local app state
- `react-native-svg` for lightweight custom charts

Keep `ios/T1DCompanion/` as a prototype/reference only, not a production peer implementation.

Python remains the source of truth for:

- meal parsing
- forecast generation
- evidence assembly
- confidence scoring
- safety policy
- card payload generation

React Native owns:

- presentation
- navigation
- local UI state
- drafts/cache
- offline queue status
- mobile workflows
- native-module boundaries

The mobile app consumes a finite, versioned typed card contract, not arbitrary server-driven UI. The first API boundary is:

```http
POST /mobile/companion/run
```

with phased requests:

```ts
type CompanionRunRequest = {
  schemaVersion: '1.0';
  phase: 'preflight' | 'final';
  text: string;
  mode?: 'meal' | 'what_if' | 'troubleshoot' | 'situation' | 'patterns' | 'debrief';
  anchor?: string;
  draftId?: string;
  clarificationAnswers?: ClarificationAnswer[];
};
```

and versioned envelopes:

```ts
type CompanionRunEnvelope = {
  schemaVersion: '1.0';
  runId: string;
  draftId?: string;
  phase: 'preflight' | 'final';
  routeRecommendation:
    | 'forecast_direct'
    | 'parsed_review'
    | 'clarification_required'
    | 'final_cards';
  dataMode: 'synthetic_demo' | 'real_user';
  sourceLabel: string;
  parsedFoods?: ParsedFood[];
  clarificationQuestions?: ClarificationQuestion[];
  cards?: MobileShowcaseCard[];
  safety: SafetyBoundary;
};
```

Card kinds are a discriminated union. Unknown card kinds or unknown medium/high-risk copy keys fail safe and are not rendered as arbitrary backend text.

Safety-sensitive mobile copy uses reviewed copy keys/templates with params, not freeform backend strings. Terminal treatment-adjacent copy must be rewritten into stricter observation-only mobile language before production use.

## Initial product scope

The app is dashboard-first, with Chat as a supporting reasoning layer:

1. Home
2. Patterns
3. Meals
4. Chat

The first excellent journey is the Meal Forecast flow:

```text
Home / Meals
  -> Meal Entry
  -> backend preflight
  -> Parsed Review or Clarification if needed
  -> backend final run
  -> result-first Forecast screen
  -> Save meal review
```

The v1 production meal forecast deck includes the core cards only:

- Forecast summary/chart
- Parsed Foods
- Food Evidence
- Meal Memory
- Confidence
- Safety footer/status

What-if, monitoring, pattern genome, experiments, and debrief remain demo/QA or later production scope until reviewed and polished.

## Data modes and persistence

v1 uses two lanes:

- Demo mode: synthetic legends, local-only resettable persistence, no auth required, persistent demo labeling.
- Real mode: auth-gated, backend canonical persistence, encrypted mobile cache, strict source labeling.

Nightscout is the first real-data integration. Nightscout credentials are submitted once during setup, tested by the backend, stored encrypted server-side, and referenced from mobile by `dataSourceId` only.

Real-mode auth uses email OTP/passwordless authentication for v1. Mobile stores tokens in secure storage.

Offline v1 supports cached read-only state and local drafts/queued submissions only. It does not generate new forecasts offline.

Saving a meal review persists both:

- normalized fields for history, patterns, debriefs, reports, and queries
- the full typed envelope snapshot for replay, audit, schema/copy-policy traceability

## Consequences

### Benefits

- One source of truth for domain/safety logic.
- Shared iOS/Android app codebase.
- Finite card contract improves QA, safety review, migrations, and localization.
- React Native app can move quickly while native Swift/Kotlin modules remain available for future deep platform integrations.
- Demo mode can validate the full product journey before real-data integrations are complete.

### Trade-offs

- Requires backend refactor from terminal strings to typed card DTOs.
- Requires contract tests and schema-version discipline.
- Requires copy-key governance for medium/high-risk text.
- Existing SwiftUI prototype becomes reference-only, so some prototype work must be translated into React Native.
- Real-mode persistence/auth/security work is deferred behind demo vertical slice but must be designed into the architecture.

## First implementation milestone

Build a thin vertical slice:

1. Create `mobile/` Expo app with Expo Router.
2. Add React Native Paper theme, Zustand, TanStack Query, and `react-native-svg`.
3. Add Python `MobileShowcaseEnvelope` / `MobileShowcaseCard` DTOs.
4. Add `POST /mobile/companion/run` with `preflight` and `final` phases for one meal flow.
5. Render result-first forecast screen from typed JSON.
6. Save demo meal review locally and show it in Meals tab.
