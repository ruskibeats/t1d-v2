# Mobile App Vertical-Slice Issue Drafts

Source: `docs/mobile-parity-ux-spec.md`.

These issues translate the mobile parity design into independently grab-able, test-runnable slices. They intentionally avoid clinical/dosing UX and keep synthetic/demo labeling visible wherever demo data is used.

## Recommended priority order

1. Mobile card serialization contract
2. Mobile shell and navigation skeleton
3. Meal entry and clarification flow
4. Forecast result swipe deck
5. History / Meal Memory screen
6. What-If Planner screen
7. Insights / Pattern Genome screen
8. Daily Debrief screen
9. Reports / Care-Team Export screen
10. Profile, preferences, and safety settings
11. Offline drafts and degraded-state UX
12. Accessibility and premium interaction polish

---

## Issue: Define mobile card serialization contract

Labels: `mobile`, `architecture`, `api`, `product-quality`

### What to build

Define the JSON payload shape the mobile UI will consume for all companion cards.

This should turn current text-first cards into stable, mobile-ready data contracts with explicit card identity, display metadata, source labels, confidence, safety framing, and component payloads.

### Acceptance criteria

- [ ] A documented card schema exists for mobile surfaces.
- [ ] Schema includes stable `id`, `kind`, `title`, `data`, `source_label`, and `safety_label` fields.
- [ ] Confidence-aware cards include `confidence` and `missing_information_flags` when applicable.
- [ ] Forecast cards expose chart-ready data, not ASCII-only output.
- [ ] Schema covers at least meal evidence, forecast, meal memory, counterfactuals, confidence, pattern genome, experiment, clarification, debrief, and report preview cards.
- [ ] Tests or schema examples verify representative serialized payloads.

### Blocked by

None, but should coordinate with structured Card Model work.

---

## Issue: Build mobile shell and navigation skeleton

Labels: `mobile`, `ux`, `product-quality`

### What to build

Create the mobile app shell/navigation design or implementation scaffold for the primary tabs defined in the mobile parity spec: Today, Log Meal, History, Insights, Reports, plus Profile/Settings access.

This issue should establish navigation structure without implementing full screen logic.

### Acceptance criteria

- [ ] Primary navigation contains Today, Log Meal, History, Insights, and Reports.
- [ ] Profile/Settings is reachable from a persistent top-level affordance.
- [ ] Empty/loading/error states exist for each primary screen.
- [ ] Educational simulator safety boundary is visible in appropriate global context.
- [ ] Synthetic/demo data is visually distinguishable from real history when shown.
- [ ] Navigation can deep-link to Forecast Result, Meal Detail, Daily Debrief, and Report Preview placeholders.

### Blocked by

Mobile framework/project decision if no mobile app scaffold exists yet.

---

## Issue: Build mobile Meal Entry and Clarification flow

Labels: `mobile`, `meal-entry`, `ux`, `product-quality`

### What to build

Build the mobile meal entry experience with structured inputs and free-text fallback, plus clarification prompts when confidence or missing-information flags require follow-up.

### Acceptance criteria

- [ ] User can enter meal via structured fields: food item, quantity, unit, meal timing, optional notes.
- [ ] User can enter meal via free text for parity with terminal/LLM parser.
- [ ] Parsed foods are shown on a review screen before forecast.
- [ ] Missing unit/generic portion/low similarity/high variance flags are surfaced as understandable chips.
- [ ] Clarification sheet/modal can ask for a missing portion or unit and persist the answer in draft state.
- [ ] User can continue with uncertainty, but confidence status remains visible.
- [ ] No dosing/treatment recommendations appear.

### Blocked by

- Mobile card serialization contract, if implementing against real payloads.

---

## Issue: Build Forecast Result swipe deck

Labels: `mobile`, `forecast`, `ux`, `product-quality`

### What to build

Build the mobile Forecast Results screen as a swipeable or vertically stacked card deck mapped from the existing terminal meal pipeline.

### Acceptance criteria

- [ ] Header shows meal name/free text, profile anchor, confidence tier, and data-source label.
- [ ] Deck includes Parsed Foods, Food Evidence, Forecast Chart, Meal Memory, What-If Scenarios, Monitoring, Data Quality/Confidence, and Pattern Genome when data exists.
- [ ] Forecast chart shows baseline, predicted peak, peak time, and uncertainty range.
- [ ] Bottom actions include Edit meal, Clarify, Try what-if, Save, Export, and Start experiment when available.
- [ ] Educational simulator footer is visible.
- [ ] Screen handles low confidence/no match/safety-blocked states cleanly.

### Blocked by

- Mobile card serialization contract.
- Meal Entry flow for end-to-end path.

---

## Issue: Build mobile History / Meal Memory screen

Labels: `mobile`, `history`, `meal-memory`, `product-quality`

### What to build

Build the mobile history experience for saved meal forecasts, similar meal context, past outcomes, consistency, evidence counts, and source labels.

### Acceptance criteria

- [ ] User can browse saved meals by list or calendar-style grouping.
- [ ] Meal detail shows original meal input, parsed foods, totals, forecast summary, and confidence.
- [ ] Similar meals section shows top matches, best/worst past result, evidence counts, and consistency tier.
- [ ] Synthetic/demo vs real-history source is clearly labeled.
- [ ] User can replay a forecast from history.
- [ ] User can start a what-if, experiment, or report export from a meal detail where applicable.

### Blocked by

- Persisted mobile prediction state.
- Forecast Result swipe deck.

---

## Issue: Build mobile What-If Planner screen

Labels: `mobile`, `what-if`, `ux`, `product-quality`

### What to build

Build a mobile What-If Planner that lets users simulate alternative foods, portions, timing, or meal splits using the existing what-if/counterfactual concepts.

### Acceptance criteria

- [ ] User can start what-if from Today or an existing Forecast Result.
- [ ] User can enter alternative food/portion/timing inputs.
- [ ] Result card compares scenario peak/timing against baseline when available.
- [ ] Scenario carousel supports smaller portion, lower-fat alternative, different timing, and split meal when payloads exist.
- [ ] All language is simulation-only and avoids medication/dosing/treatment recommendations.
- [ ] User can save or discard what-if draft.

### Blocked by

- Forecast Result swipe deck.
- Mobile card serialization contract.

---

## Issue: Build mobile Insights / Pattern Genome screen

Labels: `mobile`, `insights`, `pattern-genome`, `product-quality`

### What to build

Build a mobile Insights screen that surfaces recurring patterns, Pattern Genome traits, trigger foods, confidence, evidence counts, and source labels.

### Acceptance criteria

- [ ] Pattern traits are displayed with label, explanation, confidence, and evidence count.
- [ ] Top trigger/frequent foods are shown with counts/frequency.
- [ ] Synthetic/demo data is clearly labeled when applicable.
- [ ] Low-evidence states explain what data is missing.
- [ ] Screen links to relevant meal history examples where available.
- [ ] No causation or clinical validation claims are made.

### Blocked by

- Persisted meal history or demo data source.
- Mobile card serialization contract.

---

## Issue: Build mobile Daily Debrief screen and notification target

Labels: `mobile`, `debrief`, `notifications`, `product-quality`

### What to build

Build the Daily Debrief mobile screen and define it as a future push-notification destination.

### Acceptance criteria

- [ ] Debrief screen shows meals logged, top driver, evidence/context, confidence, overnight watch, tomorrow watch-outs, and notable patterns where available.
- [ ] Empty/no-data state is calm and useful.
- [ ] User can manually generate/view a debrief.
- [ ] Notification copy is safety-reviewed and simulation-only.
- [ ] Read/unread or viewed state is persisted.
- [ ] Debrief can link back to specific meals/history entries.

### Blocked by

- Persisted meal history.
- Notification infrastructure for push delivery; manual screen can be built first.

---

## Issue: Build mobile Reports / Care-Team Export preview

Labels: `mobile`, `reports`, `export`, `product-quality`, `privacy`

### What to build

Build a mobile report preview/share flow for clinician/care-team export packs.

### Acceptance criteria

- [ ] User can select profile/date range/data source for report generation.
- [ ] Preview shows overview, meals, recurring patterns, uncertainty/evidence quality, example meals, and questions for care team.
- [ ] Synthetic/demo data is clearly labeled.
- [ ] Report contains no dosing/treatment recommendation language.
- [ ] User can share/download Markdown or platform-native share text where supported.
- [ ] Privacy/redaction affordance exists before sharing.

### Blocked by

- Existing care-team export service is available.
- Mobile share/export capability decision.

---

## Issue: Build mobile Profile, Preferences, and Safety Settings

Labels: `mobile`, `settings`, `privacy`, `safety`, `product-quality`

### What to build

Build settings for profile anchor selection, units/timezone, notification preferences, privacy/export controls, and educational safety acknowledgement.

### Acceptance criteria

- [ ] User can view/change selected profile anchor.
- [ ] User can set unit/timezone and default meal-entry preferences.
- [ ] User can manage notification opt-ins for debrief/follow-up reminders.
- [ ] User can view educational simulator boundary and acknowledge it.
- [ ] User can manage export/share privacy preferences.
- [ ] Settings state persists across sessions.

### Blocked by

Mobile persistence decision.

---

## Issue: Add offline drafts and degraded-state UX

Labels: `mobile`, `offline`, `resilience`, `product-quality`

### What to build

Add mobile UX for offline meal drafts and degraded states when parser/LLM, food DB, network, or safety validation is unavailable.

### Acceptance criteria

- [ ] Meal drafts can be created/edited offline.
- [ ] User sees clear degraded-state messaging for unavailable LLM/parser, food DB, network, and safety block.
- [ ] Cached profile/preferences remain available offline.
- [ ] Drafts can resume after app restart.
- [ ] App never silently presents stale or fallback data as real/current.
- [ ] Synthetic/demo and real data labels remain visible in degraded mode.

### Blocked by

Mobile persistence layer.

---

## Issue: Add mobile accessibility and premium interaction polish pass

Labels: `mobile`, `accessibility`, `ux`, `product-quality`

### What to build

Apply a premium UX/accessibility pass across the mobile app: touch targets, dynamic type, screen-reader labels, chart accessibility, empty states, haptics, and visual design tokens.

### Acceptance criteria

- [ ] All interactive targets meet at least 44x44pt sizing.
- [ ] Dynamic type/text scaling is supported for core screens.
- [ ] Charts have screen-reader summaries and non-color-only indicators.
- [ ] Confidence/risk colors pass accessibility contrast and include text labels.
- [ ] Empty states exist for Today, History, Insights, Debrief, Reports, and Experiments.
- [ ] Motion/haptics are subtle, optional, and not required to understand the UI.
- [ ] Safety/disclaimer copy remains readable and non-alarmist.

### Blocked by

Core mobile screens should exist first.
