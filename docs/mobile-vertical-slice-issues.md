# Mobile Vertical Slice Issue Drafts

Source decisions:

- `docs/adr/ADR-001-mobile-react-native-expo-card-contract.md`
- `docs/mobile-showcase-runner-strategy.md`
- Issue #18 mobile parity spec
- Grill decisions from the mobile planning session

## Proposed issue sequence

### 1. [MOBILE] Scaffold Expo app shell with 4-tab navigation

**Labels:** `mobile`, `ux`, `P1`

#### What to build

Create the production React Native/Expo app under `mobile/` with the agreed app shell:

- Home
- Patterns
- Meals
- Chat
- Settings reachable outside the bottom tabs

The shell should use demo/static data only and should not attempt backend integration yet.

#### Acceptance criteria

- `mobile/` contains a runnable Expo + TypeScript app.
- App starts in Expo Go.
- Bottom tabs exist for Home, Patterns, Meals, and Chat.
- Settings is reachable from the app chrome.
- SwiftUI prototype remains clearly separate from the production app.
- Basic smoke command is documented in `mobile/README.md`.

#### Blocked by

None.

---

### 2. [MOBILE API] Define typed mobile showcase envelope and card schemas

**Labels:** `mobile`, `architecture`, `runner`, `P1`

#### What to build

Define finite, versioned Python schemas for the mobile card contract used by the React Native app.

The contract should cover the v1 core meal forecast cards:

- forecast
- parsed foods
- food evidence
- meal memory
- confidence
- safety status/footer

#### Acceptance criteria

- Schema includes `schemaVersion`, `runId`, `phase`, `routeRecommendation`, `dataMode`, `sourceLabel`, `cards`, and `safety`.
- Card kinds are finite/enumerated.
- Unknown/future card handling expectations are documented.
- Demo vs real data mode is represented.
- Unit tests validate serialization for at least one complete meal forecast envelope.

#### Blocked by

None.

---

### 3. [MOBILE API] Add `/mobile/companion/run` preflight/final endpoint for one meal flow

**Labels:** `mobile`, `runner`, `pipeline`, `P1`

#### What to build

Add a mobile orchestration endpoint that runs the existing companion pipeline for a meal forecast and returns typed mobile envelopes.

The endpoint should support:

- `phase: preflight`
- `phase: final`
- synthetic/demo mode
- one happy-path meal input such as `2 slices pepperoni pizza`

#### Acceptance criteria

- `POST /mobile/companion/run` accepts a typed request.
- Preflight response returns parsed foods and a route recommendation.
- Final response returns the core v1 card envelope.
- Response does not require React Native-specific assumptions.
- Existing CLI behavior remains unchanged.
- Tests cover preflight and final response shapes.

#### Blocked by

- Issue 2 in this draft.
- Exact clarification thresholds may depend on #39, but this endpoint can start with conservative/static route recommendations.

---

### 4. [SAFETY] Create mobile safety copy keys for core forecast cards

**Labels:** `mobile`, `safety`, `trust`, `P1`

#### What to build

Create the reviewed-copy boundary for mobile safety-sensitive text in the core meal forecast flow.

This should replace treatment-adjacent terminal copy with observation-only mobile copy keys/templates.

#### Acceptance criteria

- Core forecast cards use copy keys or approved text for safety-sensitive messaging.
- Treatment-adjacent phrases from terminal cards are not emitted directly to mobile for v1 production cards.
- Copy entries include risk tier and copy-policy/version metadata.
- Unknown medium/high-risk copy keys have a documented fail-safe behavior.
- Tests or fixtures demonstrate at least one medium-risk copy ref resolving safely.

#### Blocked by

- May align with #38 SafetyMiddleware.

---

### 5. [MOBILE] Implement typed card renderer with fail-safe fallback

**Labels:** `mobile`, `renderer`, `safety`, `P1`

#### What to build

Implement the React Native card renderer for finite mobile card kinds and safe fallback behavior.

The renderer should support the v1 core forecast cards and refuse unsupported card kinds safely.

#### Acceptance criteria

- Renderer maps supported `card.kind` values to explicit components.
- Unknown card kinds render an explicit unsupported/update-required card.
- Unknown medium/high-risk copy keys do not render arbitrary backend text.
- Core renderer components have basic tests or snapshot coverage.
- Demo fixtures can be rendered without backend access.

#### Blocked by

- Issue 1 in this draft.
- Issue 2 in this draft.
- Issue 4 in this draft for safety-copy behavior.

---

### 6. [MOBILE] Build hybrid meal entry with backend-recommended adaptive routing

**Labels:** `mobile`, `food`, `ux`, `P1`

#### What to build

Build the mobile meal entry flow for the first happy path.

The flow should be free-text primary with optional meal context, then use backend preflight to decide whether to show direct forecast, parsed review, or clarification.

#### Acceptance criteria

- User can enter a meal from the mobile app.
- App calls preflight endpoint.
- High-confidence response can proceed directly to forecast.
- Medium/low-confidence response can show parsed review or clarification UI.
- User can continue with uncertainty where the backend allows it.
- Loading and error states are visible and non-blocking.

#### Blocked by

- Issue 1 in this draft.
- Issue 3 in this draft.
- May align with #39 uncertainty-driven clarification.

---

### 7. [MOBILE] Build result-first Forecast screen for core meal deck

**Labels:** `mobile`, `forecast`, `evidence`, `trust`, `P1`

#### What to build

Build the result-first forecast screen that renders the core v1 card deck from typed JSON.

The screen should show the forecast outcome first, then progressively disclose parsed foods, food evidence, meal memory, confidence, and safety context.

#### Acceptance criteria

- Forecast headline and chart/summary appear before detailed evidence.
- Parsed Foods, Food Evidence, Meal Memory, Confidence, and Safety sections render from typed cards.
- Data source and demo/real labels are visible.
- Confidence and uncertainty are visible without treatment recommendations.
- User has contextual primary CTA based on result state.
- Screen works with synthetic demo envelope fixture.

#### Blocked by

- Issue 5 in this draft.
- Issue 6 in this draft.

---

### 8. [MOBILE] Save demo meal review locally and show it in Meals tab

**Labels:** `mobile`, `history`, `P1`

#### What to build

Implement demo-mode save behavior for the first meal forecast vertical slice.

Saving should persist a local demo meal review containing normalized fields plus the envelope snapshot, then show the saved item in the Meals tab.

#### Acceptance criteria

- User can tap `Save meal review` after a generated forecast.
- Saved demo review appears in the Meals tab.
- Saved record includes normalized summary fields and full envelope snapshot.
- Demo saved data is clearly labelled synthetic/demo.
- User can clear/reset demo saved data.
- No real-data backend persistence is required for this issue.

#### Blocked by

- Issue 7 in this draft.

---

### 9. [MOBILE] Wire Chat follow-up from a saved forecast context

**Labels:** `mobile`, `ai`, `ux`, `P2`

#### What to build

Add the first contextual Chat handoff from a saved/generated forecast.

This should not be a blank-slate chat-first workflow. It should start from a meal review and carry forecast/evidence context into Chat.

#### Acceptance criteria

- Forecast screen has a secondary `Discuss with AI` action after save or from saved review.
- Chat opens with context from the selected meal review.
- Chat displays evidence/source badges.
- Chat response remains education-only and does not render unreviewed safety-sensitive copy.
- Missing/unsupported chat response cards fail safe.

#### Blocked by

- Issue 8 in this draft.
- Safety-copy behavior from Issue 4.

---

### 10. [REAL MODE] Add Nightscout data-source setup shell

**Labels:** `mobile`, `cgm`, `real-legend`, `P2`

#### What to build

Add the mobile settings flow for connecting a Nightscout source in real mode.

This issue is only the mobile setup shell and connection status flow; backend credential storage may be separate if not already ready.

#### Acceptance criteria

- Settings includes Data Sources → Nightscout.
- User can enter Nightscout URL and optional token.
- App can submit credentials once to backend setup/test endpoint when available.
- Mobile stores only returned `dataSourceId`, redacted source label, and status.
- Disconnect/delete action is represented in UI.
- Demo mode and real mode remain visually distinct.

#### Blocked by

- #40 Nightscout API client/import work.
- Backend credential-storage endpoint/design.
- Auth for real mode.

---

### 11. [REAL MODE] Add backend canonical save API for real meal reviews

**Labels:** `mobile`, `history`, `architecture`, `P2`

#### What to build

Add backend persistence for real-mode saved meal reviews.

Real-mode saving should persist both normalized fields and full envelope snapshot server-side, while mobile keeps an encrypted cached copy.

#### Acceptance criteria

- Backend can create, list, fetch, and delete real-mode meal reviews.
- Saved record contains normalized fields and envelope snapshot.
- Records include schema/copy/data-source metadata.
- Demo-mode local persistence remains separate.
- Tests cover create/list/fetch/delete for saved meal reviews.

#### Blocked by

- Real-mode auth decision/implementation.
- Issue 2 in this draft.
- Issue 8 in this draft for local/demo save shape.
