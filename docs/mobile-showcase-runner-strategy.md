# Mobile Showcase Runner Strategy

Architecture decision: [`ADR-001: Mobile app stack and typed showcase card contract`](adr/ADR-001-mobile-react-native-expo-card-contract.md).

Source inputs:

- Issue #18: Mobile Parity UX State Spec
- `DESIGN.md`
- Showcase runner code in `src/cli.py` and `src/companion.py`
- Stitch-generated screens: **Home - Observations**, **Patterns - Health Knowledge Graph**, **Meal Review - Historical Evidence**, **Hoot & Holla - AI Graph Reasoning**
- Existing SwiftUI prototype in `ios/T1DCompanion/T1DCompanion`
- Recommended product stack: React Native + TypeScript + Expo, with Swift/Kotlin native modules behind interfaces when needed

## Executive take

This is not a simple text-to-mobile port. The terminal runner currently emits **strings**; the mobile app needs **structured card state**. The UI can reuse every existing card concept, but each terminal card must become a typed mobile state with title, summary, evidence, safety copy, confidence, primary actions, secondary actions, and provenance.

The right product shape is:

```text
Showcase runner logic
  -> typed card payloads / mobile DTOs
  -> React Native cards and screens
  -> optional Swift/Kotlin native modules for platform-deep integrations
  -> saved user journey state
```

Not:

```text
terminal text
  -> pasted into a mobile screen
```

## Product information architecture

The Stitch mocks define a clearer million-user mobile IA than the earlier 5-tab spec. Use four primary tabs and keep Settings/Profile as top-bar affordances.

| Tab | Job | Existing terminal source | Stitch screen |
|---|---|---|---|
| Home | One-glance current state, observations, quick log | `welcome_card`, `_legend_current_cgm_card`, `morning_call_card`, `lunch_presser_card`, `evening_roundup_card` | Home - Observations |
| Patterns | Knowledge graph, recurring patterns, confidence, sources | `insights_card`, `pattern_genome`, `_render_pattern_card` | Patterns - Health Knowledge Graph |
| Meals | Meal entry, meal review, historical evidence, forecast replay | CLI meal text, `meal_pipeline_section`, Step 4 meal memory | Meal Review - Historical Evidence |
| Chat | Natural-language reasoning over graph and cards | `question_to_cards`, troubleshooting, situations, debrief, what-if | Hoot & Holla - AI Graph Reasoning |

Settings remains reachable from every top app bar. Reports/export are flows from Meals/Forecast, not a permanent tab until usage justifies it.

## Complete mobile journey

### 0. First run / demo boundary

**User sees**:

- Product identity: T1D Companion
- Educational simulator boundary
- Data source selector: synthetic demo, Nightscout, real CGM placeholder
- Privacy and export expectations

**Must state**:

> Educational simulator only. No dosing, treatment changes, or emergency instructions.

**State created**:

```json
{
  "safety_acknowledged_at": "timestamp",
  "selected_profile_anchor": "well_controlled",
  "data_source_mode": "synthetic_legends_demo",
  "units": "mg/dL"
}
```

### 1. Home - Observations

Maps to Stitch **Home - Observations**.

**Purpose**: replace terminal welcome + current CGM + question deck with a calm dashboard.

**Primary modules**:

1. Current glucose hero
   - mg/dL
   - trend arrow
   - measured time
   - source pill
2. Time-in-range gauge
   - TIR percent
   - range legend
3. Top observations
   - steady trend
   - pattern alert
   - exercise effect
4. Quick forecast CTA
   - Quick Log
   - View Trends
5. Floating action button
   - opens meal logging / chat composer depending context

**Terminal mapping**:

| Terminal | Mobile |
|---|---|
| `welcome_card` examples | top observations + quick actions |
| `_legend_intro_card` | profile chip / demo banner |
| `_legend_current_cgm_card` | glucose hero |
| `_legend_question_deck_card` | tappable quick prompts |
| `morning_call_card` | morning observation card |
| `lunch_presser_card` | midday observation card |
| `evening_roundup_card` | evening observation card |

**Acceptance**:

- User can understand current state in under 5 seconds.
- Demo/synthetic data is clearly labelled.
- No card recommends an intervention.

### 2. Meal logging

**Entry points**:

- Home FAB
- Home `Quick Log`
- Meals tab
- Chat prompt with meal intent

**Flow**:

```text
Meal prompt / structured form
  -> Parsed Food Review
  -> Clarification Sheet if needed
  -> Forecast deck
  -> Save / What-if / Export / Discuss with AI
```

**Meal Entry UI**:

- Meal type picker: breakfast/lunch/dinner/snack/what-if
- Free text field: “2 slices pepperoni pizza”
- Optional structured rows: food, quantity, unit
- Notes
- Parser/source indicator
- Safety boundary block

**Terminal mapping**:

| Terminal | Mobile |
|---|---|
| CLI positional `text` | meal free-text field |
| `detect_intent` | route to meal/what-if/chat mode |
| `ParsedFood` | parsed-food review rows |
| `clarification_card` | bottom sheet with required answer |

### 3. Forecast deck - the showcase runner as mobile cards

This is the critical port. `meal_pipeline_section` becomes a SwiftUI deck. The user should swipe horizontally through the pipeline, while a persistent header always shows meal, confidence, source, and safety boundary.

```text
Persistent header
  Meal: pizza and salad
  Anchor/profile: Foot2Floor / synthetic demo
  Confidence: medium
  Source: synthetic legends demo

Swipe deck
  1 Parsed Foods
  2 Food Evidence
  3 Forecast
  4 Meal Memory
  5 What-If Scenarios
  6 Monitoring
  7 Confidence
  8 Pattern Genome when available

Action rail
  Edit meal | Clarify | What-if | Save | Export | Discuss
```

#### Card 1: Parsed Foods

**Terminal**: Step 1 in `meal_pipeline_section`

**Mobile**:

- Editable food rows
- Quantity/unit controls
- Parser pill: deterministic / LLM / unknown
- “Looks right” action
- “Edit rows” action

**State**:

```json
{
  "type": "parsed_foods",
  "profile_label": "Foot2Floor | Parser: deterministic",
  "foods": [{"item": "pizza", "quantity": 2, "unit": "slices", "confidence": "medium"}]
}
```

#### Card 2: Food Evidence

**Terminal**: Step 2 Food Evidence

**Mobile**:

- Per-food macro cards: carbs, fat, sugars, protein when available
- Warnings with amber treatment
- Top uncertainty reason
- Evidence source badge

**From Stitch Meal Review**:

- Macro grid: carbs / fat / protein
- Visual progress bars
- Graph-backed evidence badge

#### Card 3: Forecast

**Terminal**: Step 3 Forecast + ASCII chart

**Mobile**:

- Glucose curve or simplified bar/sparkline until chart data is richer
- Baseline, peak, peak time
- Uncertainty band
- Absorption tag: fast/delayed/mixed/standard
- Top driver

**Safety**:

- “Expected shape” not “recommended action”.
- Avoid dose/treatment copy.

#### Card 4: Meal Memory / Historical Evidence

**Terminal**: Step 4 Meal Memory

**Mobile**: Stitch **Meal Review - Historical Evidence**.

- Similar meal count
- Last/typical glucose rise
- Peak and time-to-peak
- Best/worst prior outcomes
- Top matches list
- Evidence count: food-only vs CGM-backed
- Provenance: synthetic, partial history, rich history

**Example copy**:

> Last time you ate this, your glucose rose +120 mg/dL and peaked at 220 mg/dL after 140 minutes.

For safety, this must be framed as observation, not advice.

#### Card 5: What-If Scenarios

**Terminal**: `counterfactual_scenarios_card`, `what_if_card`, `counterfactual_note_card`

**Mobile**:

- Scenario carousel
- Compare to baseline forecast
- Smaller portion / lower-fat / timing / separate snack simulations
- Explicit “simulation only” label

**Important correction**: current terminal `what_if_card` says “Consider smaller portion or split over time.” Mobile copy should soften this to:

> Scenario to discuss or compare: smaller portion / split timing. Educational simulation only.

#### Card 6: Monitoring

**Terminal**: Step 6 Monitoring

**Mobile**:

- Watch window chip: early, peak, delayed
- Risk flags converted to neutral observations
- No clinical instructions

**Copy pattern**:

- Good: “High-fat meals may peak later for you; compare CGM trend over the next 3–4 hours.”
- Avoid: “Do X to correct.”

#### Card 7: Data Quality & Confidence

**Terminal**: `confidence_card`

**Mobile**:

- Overall confidence pill
- Identity / portion / nutrition / timing progress rows
- Missing information flags
- Forecast uncertainty range
- Historical consistency
- Safety gate status

**Default question answered**:

> What might be wrong about this forecast?

#### Card 8: Pattern Genome

**Terminal**: `_render_pattern_card`, `pattern_genome`

**Mobile**:

- Trait list
- Evidence count
- Confidence
- Top trigger foods
- Source label
- Link to Patterns tab

### 4. Meals - Historical Evidence

Maps to Stitch **Meal Review - Historical Evidence**.

**Purpose**: make the saved forecast replayable and evidence-backed.

**Screen sections**:

1. Meal header
   - time
   - meal title
   - source/provenance
2. Macro grid
   - carbs/fat/protein/sugars
3. Graph-backed evidence
   - similar historical curve
   - peak annotation
   - evidence badge
4. Actions
   - Discuss with AI
   - Save as Note
   - Export
   - Start experiment

**Terminal source**:

- `meal_pipeline_section` Step 2 and Step 4
- historical meal matcher output
- care-team export Markdown

### 5. Patterns - Health Knowledge Graph

Maps to Stitch **Patterns - Health Knowledge Graph**.

**Purpose**: turn `insights_card` and `pattern_genome` into a professional pattern feed.

**Screen sections**:

1. Filter chips: All / Good / Watch / Lows
2. Weekly hero insight
3. Source status cards
   - Primary Source
   - Connected App
4. Recent pattern feed
   - Post-lunch rise
   - Overnight lows
   - Exercise link
5. Knowledge graph illustration / drill-down

**Terminal mapping**:

| Terminal | Mobile |
|---|---|
| `insights_card` | pattern feed summary |
| `_render_pattern_card` | trait cards |
| `experiment_card` | experiment cards under Patterns |
| `_legend_meal_stats_card` | weekly/90-day summary |

**Safety copy**:

- Use “linked to”, “associated with”, “appears to”, not “caused by” unless medically validated.

### 6. Chat - Hoot & Holla / AI Graph Reasoning

Maps to Stitch **Hoot & Holla - AI Graph Reasoning**.

**Purpose**: a natural-language front door for the same card engine.

**User can ask**:

- “Why was I high at 6pm yesterday?”
- “Can I have a banana after dinner?”
- “Why am I going low?”
- “Show pizza days.”
- “Debrief my day.”

**Routing**:

```text
Chat text
  -> detect_intent
  -> question_to_cards
  -> typed mobile response cards
```

**Response format**:

- Plain-language answer
- Evidence badges
- Linked source cards
- Quick actions: View Graph, Compare Days, Log Follow-up, Export

**Critical boundary**:

Chat cannot become treatment advice. It may explain evidence and suggest care-team discussion.

### 7. Troubleshooting and situation flows

These should live primarily in Chat and secondarily as cards from Home/Patterns.

| Terminal card | Mobile treatment |
|---|---|
| `troubleshoot_card("high")` | Chat answer + expandable checklist |
| `troubleshoot_card("low")` | Chat answer + safety-forward checklist |
| `situation_card("exercise")` | Situation guide + linked activity context |
| `situation_card("alcohol")` | Strong safety boundary + overnight observation copy |
| `situation_card("illness")` | Care-team escalation language; no emergency triage engine |
| `situation_card("heat")` | Sensor reliability/hydration observation copy |

## Typed mobile card contract

The missing piece is a bridge from terminal strings to mobile state.

```ts
type MobileCardKind =
  | 'welcome'
  | 'legendIntro'
  | 'currentCGM'
  | 'parsedFoods'
  | 'foodEvidence'
  | 'forecast'
  | 'mealMemory'
  | 'whatIfScenarios'
  | 'monitoring'
  | 'confidence'
  | 'patternGenome'
  | 'troubleshoot'
  | 'situation'
  | 'checkIn'
  | 'insights'
  | 'clarification'
  | 'debrief'
  | 'experiment'
  | 'exportPreview';

type MobileShowcaseCard = {
  id: string;
  kind: MobileCardKind;
  title: string;
  subtitle?: string;
  summary: string;
  confidenceTier?: 'high' | 'medium' | 'low' | 'unknown';
  source: 'real_cgm' | 'nightscout' | 'food_proxy' | 'synthetic_legend' | 'unknown';
  safetyFooter: string;
  payload: Record<string, unknown>;
  primaryActions: MobileAction[];
  secondaryActions: MobileAction[];
};
```

Backend/Python equivalent should be emitted before rendering terminal text. Terminal renderer can consume the same DTO and turn it into strings; React Native consumes it as cards. Swift/Kotlin adapters are only needed for platform-deep modules.

## Implementation strategy

### Phase 1 — React Native app shell

- Create an Expo + React Native + TypeScript app shell with Home / Patterns / Meals / Chat tabs.
- Keep Settings as top-bar sheet/navigation link.
- Treat the existing SwiftUI views as reference/prototype screens, not the default product stack.
- Define shared design tokens, navigation routes, API client, and card renderer package boundaries.

### Phase 2 — Typed card bridge

- Add Python DTOs for mobile cards.
- Refactor `meal_pipeline_section` to build typed card data first.
- Render terminal text from typed cards to preserve CLI behavior.
- Add API endpoint returning `MobileShowcaseCard[]`.

### Phase 3 — Forecast deck

- Build a React Native `ForecastDeckScreen` using pager/swipe navigation.
- Implement cards for parsed foods, evidence, forecast, meal memory, what-if, monitoring, confidence, pattern genome.
- Add action rail.

### Phase 4 — Stitch visual language

- Apply Material-derived palette from Stitch to React Native design tokens.
- Add bento cards, macro grid, graph-backed evidence card, confidence bars.
- Add chat bubbles and evidence badges.

### Phase 5 — Persistence and reports

- Persist `MobilePredictionState`.
- Add Meals history detail.
- Add export preview/share sheet.
- Add debrief state.

## Open decisions to resolve

1. **Branding**: Is the chat assistant permanently named “Hoot & Holla”, or is that a prototype name?
2. **Tabs**: Adopt the Stitch 4-tab IA (Home, Patterns, Meals, Chat) or keep Issue #18’s 5-tab IA (Today, Log Meal, History, Insights, Reports)? Recommendation: adopt 4 tabs.
3. **Reports**: Should reports be a top-level tab for clinical workflows, or a contextual action from Meals/Forecast?
4. **What-if language**: Current terminal card contains suggestion-like copy. Should mobile strictly rephrase all what-if output as comparison-only?
5. **Real data readiness**: Which sources are live now: Nightscout, Dexcom, Apple Health, Garmin? UI should not claim integrations that are placeholders.
6. **Graph claims**: Can the backend currently provide graph edges/confidence, or should graph wording remain demo-only until implemented?

## Definition of done

- Every showcase runner card type has a SwiftUI screen/card.
- Every SwiftUI card renders from typed state, not parsed terminal strings.
- Home, Patterns, Meals, Chat match the Stitch product journey.
- Forecast deck preserves all 7/8 pipeline steps.
- Safety footer appears on every forecast, what-if, troubleshoot, situation, debrief, and chat answer.
- Demo data is always labelled.
- No dosing/treatment recommendation is introduced.
- Accessibility: 44pt+ touch targets, Dynamic Type, VoiceOver labels, reduce-motion support, AAA target contrast where practical.
