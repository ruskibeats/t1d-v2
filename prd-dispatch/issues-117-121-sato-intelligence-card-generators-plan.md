# Issues #117-#121 — Advanced Sato Intelligence Card Generators Plan

Source parent: GitHub issue #109, **PRD: Real-data Sato Intelligence Cards**.
Delegated by: SATO-GOD to SATO3.
Date: 2026-06-16.

## Scope

This document maps implementation seams, generator inputs, suppression gates, action payloads, safety checks, tests, and blockers for the advanced Sato Intelligence Card slices:

- #117 — What-If Card backed by similar historical meals
- #118 — Pattern Drift Card from baseline-vs-recent change
- #119 — Experiment Card from detected behaviour opportunity
- #120 — Doctor Prep Card from appointment plus evidence days
- #121 — Restaurant Card from calendar/menu/pattern scoring

Per SATO-GOD coordination, this plan avoids shared-contract churn until #110 lands. SATO1 owns the canonical Sato Intelligence Card base contract and feed service.

## Contract Review Addendum — 2026-06-16

SATO-GOD reported SATO1/#110 and SATO2/#113-#116 are mostly/fully landed. Reviewed current contracts before implementing any #117-#121 code.

Canonical source observed:

- `sparky-bloom/server/services/satoIntelligenceCardsService.ts`
  - owns current `SatoIntelligenceCard`, `SatoCardProvenance`, `CardRenderDecision`, `SatoIntelligenceCardsResponse`, `SatoCardType`, `SuppressionReason`, `SatoCardAction`, `SatoEvidenceBundle`.
  - currently supports card types:
    - `pattern_insight`
    - `safe_meal`
    - `weekly_digest`
    - `insulin_stock`
  - current public entrypoint: `getSatoIntelligenceCards(userId, client?, options)`.
  - current context loader gathers profile, fingerprints, food entries, CGM summary, insulin inventory, dose events, dismissed card IDs, and AGE availability.
  - current generators are private functions inside the service.
- `sparky-bloom/server/types/sato.ts`
  - re-exports intelligence card types from `satoIntelligenceCardsService.ts` as the apparent source of truth.
- `sparky-bloom/server/routes/t1dSatoRoutes.ts`
  - contains canonical route `/api/t1d/sato/intelligence/cards`.
- `sparky-bloom/server/tests/satoIntelligenceCardsService.test.ts`
  - verifies #113 pattern insight, #114 safe meal, #115 weekly digest, and #116 insulin stock semantics.
- `sparky-bloom/server/tests/satoIntelligenceCards.test.ts`
  - verifies #110 fail-closed/card contract behavior.

Implementation impact for #117-#121:

- Adding #117-#121 generators will require extending the canonical `SatoCardType` union with:
  - `what_if`
  - `pattern_drift`
  - `experiment`
  - `doctor_prep`
  - `restaurant`
- It may also require extending `SuppressionReason` with issue-specific reasons or mapping them to existing canonical reasons.
- Because those are canonical/shared contract edits, SATO3 should ask SATO-GOD before making code changes unless SATO1 explicitly hands off extension ownership.
- Current route should not be changed; new generators should plug into `getSatoIntelligenceCards` once card type extension is approved.
- Current `T1DSafetyValidator` can be used for copy scanning; if needed, a thin issue-local helper should delegate to it and avoid policy changes.

Decision needed before implementation:

1. May SATO3 extend `SatoCardType` and demo marker coverage in `satoIntelligenceCardsService.ts`, or should SATO1 own all canonical type-union changes?
2. Should #117-#121 use issue-specific suppression reasons, or map to the current canonical set (`INSUFFICIENT_DATA`, `LOW_CONFIDENCE`, `NO_GRAPH_MATCH`, `STALE_DATA`, `MISSING_EVIDENCE`, `SAFETY_SUPPRESSED`, `USER_DISMISSED`, `MISSING_DATA`)?
3. Should SATO3 add private generators inside `satoIntelligenceCardsService.ts`, or create separate pure generator modules imported by that service?

## Current Repo Seams

Observed in `/root/tld-v2/sparky-bloom`:

- `server/types/sato.ts`
  - Existing `EmotionalCard` / `SatoCardsResponse` types.
  - Not the #109 `SatoInsightCard` / `CardProvenance` / `CardRenderDecision` contract.
- `server/routes/t1dSatoRoutes.ts`
  - `POST /api/t1d/sato/cards` uses older companion-card flow:
    - `getCompanionDataContext`
    - `companionCardsFromData`
    - `getSatoCards`
  - Do not alter for these issues until #110 lands.
- `server/services/t1dSatoPageDataService.ts`
  - Existing Sato page-data aggregation.
  - Contains companion-card template/demo logic and roadmap/action cards.
  - Not yet the real-data-gated intelligence-card feed.
- `server/services/PatternGenomeExplorer.ts`
  - Pure detector layer for pattern archetypes:
    - `fast_spike`
    - `delayed_rise`
    - `exercise_buffered`
    - `high_fat_late_tail`
    - `overnight_risk`
    - `post_meal_low`
- `server/services/CounterfactualMealSimulator.ts`
  - Pure deterministic what-if simulation primitives.
  - Current implementation is heuristic and must be gated by real similar historical meals before being surfaced as a card.
- `server/services/TemporalPatternMatcher.ts`
  - Temporal motif primitives, using `GraphAdapter`/AGE where available.
- `server/services/GraphAdapter.ts`
  - AGE/relational adapter boundary exists.
- `server/services/T1DSafetyValidator.ts`
  - Current safety authority for dosing, insulin adjustment, treatment, and emergency refusal boundaries.

## Dependency Boundary

Do **not** create or mutate the canonical base card contract here.

Expected #110 dependency, owned by SATO1:

- `SatoInsightCard`
- `CardProvenance`
- `CardRenderDecision`
- feed service/boundary, likely a server-side typed module plus `SatoIntelligenceCardFeed`-style service
- shared suppression reasons
- interaction contract from #112

This plan assumes each generator will later expose a pure function roughly shaped as:

```ts
type GeneratorContext = {
  userId: string;
  now: Date;
  mode: 'demo' | 'product_validation';
  safetyValidator: typeof import('../services/T1DSafetyValidator.js');
};

type GeneratorOutput =
  | { render: true; cardDraft: IssueSpecificDraft; provenanceDraft: IssueSpecificProvenance }
  | { render: false; reason: SuppressionReason; diagnostics?: Record<string, unknown> };
```

The #110 owner should replace `IssueSpecificDraft` with canonical `SatoInsightCard` / `CardRenderDecision` types.

## Shared Rules for #117-#121

All five generators must:

1. Fail closed when required real data is missing.
2. Return no card for low confidence, unsafe copy, stale data, missing evidence, or prior dismissal.
3. Attach deterministic provenance references:
   - SQL query refs
   - entity IDs
   - evidence bundle ID where available
   - graph/subgraph ID where available
   - fingerprint IDs where relevant
4. Include expiry semantics.
5. Use calm, observational Sato language.
6. Avoid dosing, insulin adjustment, or treatment recommendations.
7. Run title/subtitle/body/action copy through `T1DSafetyValidator.checkRefusal` or a thin `CardCopySafetyValidator` wrapper that delegates to it.
8. Use PostgreSQL as canonical truth; GraphAdapter/AGE is supporting relationship evidence, not canonical state.
9. Avoid migrations until #110-#112 finalize persistence/API contracts.

## Proposed Suppression Reasons

Use #110 canonical values once available. Until then, these issue-specific docs map to the #109 prototype reasons:

- `INSUFFICIENT_DATA`
- `LOW_CONFIDENCE`
- `NO_GRAPH_MATCH`
- `STALE_DATA`
- `MISSING_EVIDENCE`
- `SAFETY_SUPPRESSED`
- `USER_DISMISSED`
- `MISSING_SIMULATION_SUPPORT` (#117)
- `NO_BASELINE` (#118)
- `WEAK_SHIFT` (#118)
- `NO_BEHAVIOUR_OPPORTUNITY` (#119)
- `MISSING_APPOINTMENT` (#120)
- `MISSING_MENU` (#121)
- `MISSING_NORMALIZATION` (#121)
- `MISSING_PATTERN_SCORING` (#121)

---

# #117 — What-If Card backed by similar historical meals

## Purpose

Surface an educational what-if prompt only when the backend can ground a small deterministic simulation in similar historical meals or a strong recipe match.

## Candidate Inputs

- `t1d_meal_response_fingerprints`
  - `meal_key`, `food_names`, `carbs_g`, `fat_g`, `protein_g`, `fiber_g`, `delta_mg_dl`, `peak_mg_dl`, `time_to_peak_minutes`, `confidence_tier`, `cgm_points`, `entry_date`
- `food_entries`
  - recent/current meal candidates and food names
- `GraphAdapter` / AGE
  - similar food/meal relationship evidence where available
- `CounterfactualMealSimulator`
  - deterministic simulation primitive
- Optional recipe parser output, if a strong recipe match exists

## Eligibility Gate

Render only when:

- At least 3 similar historical meals exist **or** one strong recipe match has deterministic nutrient/fingerprint support.
- Similarity evidence is numeric and inspectable.
- Simulation result exists and confidence is above #110 threshold.
- At least one provenance entity/fingerprint ID is attached.
- Card copy passes safety validation.

## Suppress When

- no similar meals
- no deterministic simulation support
- low confidence
- stale evidence
- unsafe copy
- user dismissed same/similar card

## Draft Card Shape

- type: `what_if`
- priority: `medium`
- title example: `A grounded what-if is ready`
- subtitle example: `Based on 4 similar meals in your history`
- body example: `Sato can compare this idea against similar meals you have already logged.`
- confidence: from simulator + similarity count
- evidenceCount: similar meal count
- primaryAction:
  - label: `Simulate`
  - action: `simulate_what_if`
  - payload: `{ simulationId, similarMealIds, baselineFood, counterfactualFood? }`
- secondaryActions:
  - `Save experiment`
  - `View similar meals`

## Provenance

- source: `deterministic_pipeline`
- entityIds: similar meal/fingerprint IDs
- queryRefs:
  - `what_if.similar_meals.by_fingerprint`
  - `what_if.simulation.counterfactual`
- fingerprintIds: similar fingerprint IDs
- generatedBy: `WhatIfCardGenerator`

## Tests

- eligible simulation prompt with >=3 similar meals
- no-similar-meals suppression
- missing simulation support suppression
- safety suppression for dosing-adjacent copy
- action payload contains simulation and evidence IDs
- interaction tracking once #112 is available

---

# #118 — Pattern Drift Card from baseline-vs-recent change

## Purpose

Surface a card when a historically stable meal, food family, or meal-response cluster changes in recent data.

## Candidate Inputs

- `t1d_meal_response_fingerprints`
  - baseline window and recent window response stats
- `PatternGenomeExplorer`
  - baseline and recent pattern classification
- `GraphAdapter` / AGE
  - repeated cluster/subgraph relationship support
- `food_entries`
  - repeated food/meal cluster membership

## Eligibility Gate

Render only when:

- Baseline cluster exists with repeated history.
- Recent cluster has enough observations.
- Difference crosses deterministic shift threshold.
- Evidence is not stale.
- Confidence is above #110 threshold.
- Card copy passes safety validation.

Suggested baseline/recent split for first tests:

- baseline: 30–90 days ago
- recent: last 14 days
- activation: baseline count >= 3 and recent count >= 2
- shift threshold: absolute average delta shift >= 30 mg/dL or time-to-peak shift >= 45 min

## Suppress When

- no baseline
- no repeated cluster
- weak shift
- low confidence
- stale data
- missing evidence
- unsafe copy

## Draft Card Shape

- type: `pattern_drift`
- priority: `medium` or `high` if shift is large
- title example: `This meal is acting differently lately`
- subtitle example: `Recent responses differ from your baseline`
- body example: `Sato noticed a change between your usual pattern and recent meals.`
- confidence: drift confidence
- evidenceCount: baseline + recent evidence count
- patternNames: baseline/recent pattern labels
- primaryAction:
  - label: `Compare periods`
  - action: `compare_pattern_periods`
  - payload: `{ clusterId, baselineWindow, recentWindow }`
- secondaryActions:
  - `View evidence`
  - `Dismiss`

## Provenance

- source: `deterministic_pipeline`
- entityIds: baseline/recent fingerprint IDs
- queryRefs:
  - `pattern_drift.baseline_cluster`
  - `pattern_drift.recent_shift`
- fingerprintIds: baseline + recent fingerprint IDs
- subgraphId: optional graph cluster/subgraph ID
- generatedBy: `PatternDriftCardGenerator`

## Tests

- eligible drift from seeded baseline and recent deviation
- no-baseline suppression
- weak-shift suppression
- stale-data suppression
- card action payload includes comparison windows
- detail/open path shows real baseline-vs-recent data once #110/#112 are available

---

# #119 — Experiment Card from detected behaviour opportunity

## Purpose

Suggest a small, non-medical behaviour experiment only when previous patterns reveal a grounded opportunity.

## Candidate Inputs

- #113 Pattern Insight evidence
- #117 What-If simulation evidence
- `PatternGenomeExplorer` outputs
- `TemporalPatternMatcher` outputs
- historical meal timing/activity signals where present

## Eligibility Gate

Render only when:

- Prior pattern or what-if evidence identifies a behaviour opportunity.
- The suggested action is behaviour-only, not dosing/treatment.
- Evidence count and confidence satisfy #110 thresholds.
- The experiment is small and measurable.
- Card copy passes safety validation.

Examples of safe experiment opportunities:

- compare same meal with a walk window
- compare earlier dinner timing
- save a planned comparison for repeated meal
- try a similar lower fast-carb/fiber-balanced option if supported by history

## Suppress When

- no grounded opportunity
- low confidence
- missing evidence
- unsafe or treatment-adjacent copy
- opportunity already dismissed/recently shown

## Draft Card Shape

- type: `experiment`
- priority: `low` or `medium`
- title example: `A small experiment could be worth saving`
- subtitle example: `Based on patterns Sato has seen before`
- body example: `Try comparing this meal with a short walk window on a similar day.`
- confidence: opportunity confidence
- evidenceCount: supporting pattern/simulation evidence count
- primaryAction:
  - label: `Save experiment`
  - action: `save_experiment`
  - payload: `{ opportunityId, evidenceBundleId, experimentKind }`
- secondaryActions:
  - `Remind me`
  - `Not now`

## Provenance

- source: `deterministic_pipeline`
- entityIds: pattern/evidence IDs
- queryRefs:
  - `experiment.behaviour_opportunity`
  - `experiment.safety_check`
- generatedBy: `ExperimentCardGenerator`

## Tests

- eligible experiment from seeded pattern/what-if evidence
- missing-opportunity suppression
- safety suppression for insulin/treatment wording
- lifecycle action payloads for accept/remind/not-now
- dependency test: #119 should not render unless #117/#113-style evidence is present

---

# #120 — Doctor Prep Card from appointment plus evidence days

## Purpose

Offer a doctor-prep brief only when there is an upcoming diabetes-related appointment and enough recent evidence days.

## Candidate Inputs

- calendar/appointment source once available
- recent pattern summaries
- recent meal response fingerprints
- CGM summaries/evidence days
- user profile context

## Eligibility Gate

Render only when:

- Upcoming diabetes-related appointment exists.
- At least 14 days of recent data or enough evidence days exists.
- Pattern summaries are real and inspectable.
- Brief generation/open detail can reference representative evidence days.
- Copy passes safety validation and avoids clinical conclusions.

## Suppress When

- missing appointment
- insufficient recent data
- missing pattern summaries
- unsafe clinical copy
- stale appointment/event

## Draft Card Shape

- type: `doctor_prep`
- priority: `high` when appointment is soon, otherwise `medium`
- title example: `You have enough evidence for a visit brief`
- subtitle example: `Sato found recent days worth bringing up`
- body example: `Prepare a short summary of recent patterns and questions.`
- confidence: evidence completeness score
- evidenceCount: evidence days count
- primaryAction:
  - label: `Build brief`
  - action: `build_doctor_brief`
  - payload: `{ appointmentId, evidenceDayIds, summaryWindowDays: 14 }`
- secondaryActions:
  - `Add a question`
  - `Dismiss`

## Provenance

- source: `deterministic_pipeline`
- entityIds: appointment ID + evidence day/pattern IDs
- queryRefs:
  - `doctor_prep.upcoming_appointment`
  - `doctor_prep.recent_evidence_days`
  - `doctor_prep.pattern_summaries`
- generatedBy: `DoctorPrepCardGenerator`

## Tests

- eligible appointment prep with appointment and >=14 evidence days
- no-appointment suppression
- insufficient-data suppression
- unsafe clinical copy suppression
- action payload contains appointment/evidence IDs
- interaction tracking once #112 lands

---

# #121 — Restaurant Card from calendar/menu/pattern scoring

## Purpose

Surface restaurant meal preparation only when current calendar context, menu ingestion, normalized dishes, and personal pattern scoring are all available.

## Candidate Inputs

- calendar event for upcoming restaurant meal
- menu ingestion output
- normalized menu item entities
- personal pattern scoring from meal history/fingerprints
- GraphAdapter/AGE or relational graph evidence for food/menu relationships

## Eligibility Gate

Render only when:

- Upcoming restaurant/calendar context exists.
- Menu ingestion exists for that restaurant/event.
- At least one normalized menu item exists.
- Personal pattern scoring exists for normalized dishes.
- Card copy avoids unsupported nutrition or dosing claims.
- Confidence is above #110 threshold.

## Suppress When

- missing calendar event
- missing menu
- missing normalized items
- missing personal pattern scoring
- low confidence
- missing graph/evidence references
- unsafe copy

## Draft Card Shape

- type: `restaurant`
- priority: `medium`; `high` if event is soon
- title example: `Sato can scan this menu against your history`
- subtitle example: `Menu options are ready for pattern scoring`
- body example: `View choices that resemble meals you have logged before.`
- confidence: menu/pattern scoring completeness
- evidenceCount: normalized items with scoring
- primaryAction:
  - label: `View options`
  - action: `view_restaurant_options`
  - payload: `{ eventId, menuId, normalizedItemIds }`
- secondaryActions:
  - `Scan menu`
  - `Ignore`

## Provenance

- source: `deterministic_pipeline`
- entityIds: event ID + menu ID + normalized item IDs
- queryRefs:
  - `restaurant.upcoming_event`
  - `restaurant.menu_ingestion`
  - `restaurant.normalized_items`
  - `restaurant.pattern_scoring`
- subgraphId: optional restaurant/menu subgraph ID
- generatedBy: `RestaurantCardGenerator`

## Tests

- eligible restaurant card with event + menu + normalized items + scoring
- missing-menu suppression
- missing-normalization suppression
- missing-pattern-scoring suppression
- action payload includes event/menu/item IDs
- mobile actions after #110/#112/#114 are available

---

## Suggested Test Fixture Strategy

Until #110-#112 land, keep fixtures isolated to unit tests or docs:

- Use in-memory arrays for fingerprints, menu items, appointments, evidence days, and interactions.
- Do not add migrations for calendar/menu/evidence bundles yet.
- If a DB table is required later, document expected minimal shape rather than creating schema here.

Minimal deterministic fixture shapes:

```ts
type SimilarMealFixture = {
  fingerprintId: string;
  mealKey: string;
  foodNames: string[];
  similarity: number;
  deltaMgDl: number;
  peakMgDl?: number;
  timeToPeakMinutes?: number;
  entryDate: string;
};

type DriftClusterFixture = {
  clusterId: string;
  baseline: SimilarMealFixture[];
  recent: SimilarMealFixture[];
};

type BehaviourOpportunityFixture = {
  opportunityId: string;
  kind: 'walk_window' | 'earlier_timing' | 'save_comparison' | 'meal_swap';
  evidenceIds: string[];
  confidence: number;
};

type AppointmentFixture = {
  appointmentId: string;
  startsAt: string;
  specialty: 'endocrinology' | 'diabetes_educator' | 'primary_care';
};

type RestaurantFixture = {
  eventId: string;
  menuId: string;
  restaurantName: string;
  normalizedItems: Array<{ itemId: string; name: string; score: number; evidenceIds: string[] }>;
};
```

## Implementation Order Recommendation

After #110-#112 land:

1. #117 What-If Card
   - Best independent bridge from existing `CounterfactualMealSimulator`.
2. #118 Pattern Drift Card
   - Builds on fingerprints and `PatternGenomeExplorer`.
3. #119 Experiment Card
   - Depends on #117/#113 evidence and should come after a real what-if/pattern insight generator.
4. #120 Doctor Prep Card
   - Requires appointment/calendar seam and 14-day evidence-day definition.
5. #121 Restaurant Card
   - Most dependency-heavy: calendar + menu ingestion + normalization + pattern scoring.

## Open Questions for SATO1/SATO2/SATO-GOD

1. What exact file path will own canonical #110 card types and feed service?
2. What are canonical confidence thresholds per card type?
3. What is the canonical evidence bundle ID source/table?
4. What is the canonical interaction table/API from #112?
5. Will appointment/calendar data be local DB tables, external calendar API, or fixture-only for #120 MVP?
6. Will menu ingestion/normalization for #121 use existing recipe parser outputs, new menu entities, or product/menu atlas tables?
7. Should card safety scanning inspect only title/subtitle/body or action labels/payload strings too?

## Blockers

- #110 base contract/feed service not landed.
- #111 mode boundary not landed.
- #112 interaction lifecycle not landed.
- #113 Pattern Insight generator not landed.
- #114 Safe Meal generator blocks #121.
- #115 Weekly Digest/evidence-day semantics block #120.
- No confirmed calendar/menu/evidence-bundle persistence contract yet.

## Non-Goals for This Planning Slice

- Do not modify `/api/t1d/sato/cards`.
- Do not mutate `server/types/sato.ts` into the #109 card contract.
- Do not add migrations for appointments, menus, normalized menu items, card interactions, or evidence bundles.
- Do not create product-validation fixture cards.
- Do not generate card claims via LLM.
