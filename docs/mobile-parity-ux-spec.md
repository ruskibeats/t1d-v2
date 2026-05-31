# Mobile Parity UX State Spec

Issue: #18 — Mobile Parity UX State Spec  
Status: design/spec only; no implementation in this document.  
See also: [Architecture](ARCHITECTURE.md) and [State Serialization Spec](state_serialization_spec.md).

T1D Companion v2 is currently a text-first terminal prototype. The mobile UI should preserve the same product spine and safety boundary while translating terminal cards into touch-friendly screens, swipeable cards, structured inputs, and resumable state.

> Educational simulator only. The mobile app must not provide insulin dosing, treatment changes, or emergency triage beyond existing safety messaging and care-team escalation language.

## Product Quality Bar

This spec should be read as a premium product target, not a minimum port of terminal text. The mobile app should feel like a first-class, high-trust companion: fast, calm, polished, accessible, privacy-aware, and transparent about uncertainty.

Quality principles:

- **Confidence-first UX:** uncertainty, missing information, data source, and safety status are always visible without making the user feel blamed.
- **One-glance comprehension:** every forecast/result screen should answer: what was logged, what is expected, how uncertain it is, and what evidence supports it.
- **Progressive depth:** default views are simple; detailed evidence, examples, historical matches, and export data are available one tap deeper.
- **Premium interaction design:** use thoughtful microcopy, accessible motion, strong empty states, haptics where helpful, and touch targets suitable for everyday use.
- **Trust and privacy:** reports, exports, notifications, and any future photo input must clearly state what data is used, what is synthetic/demo, and what is shared.
- **Safety by design:** no dosing/treatment UX; all watch windows and what-if flows remain educational observations and care-team discussion prompts.
- **Demo-to-real clarity:** product demos may use synthetic legend data, but mobile UI must label this prominently and never imply real personal history.

## 1. Product Spine To Preserve

Current architecture:

```text
meal text
  → parsed foods
  → food evidence + carb uncertainty
  → simulated profile anchor
  → physiology forecast
  → historical similar-meal context
  → evidence bundle
  → safety validation
  → text-first UX response
```

Mobile must keep the same sequence, but expose each stage as inspectable UI state rather than terminal output.

## 2. Screen Structure

### 2.1 Primary Screens

| Mobile screen | Purpose | Existing terminal source |
|---|---|---|
| Home / Today | Current profile, quick meal entry, routine check-ins, latest debrief | `welcome_card`, `morning_call_card`, `lunch_presser_card`, `evening_roundup_card` |
| Meal Entry | Structured meal capture plus free-text fallback | CLI positional `text`; `detect_intent`; `ParsedFood` |
| Forecast Results | Swipeable pipeline cards for parsed foods, evidence, forecast, history, what-if, monitoring, confidence, pattern genome | `meal_pipeline_section` |
| What-If Planner | Try a possible food/portion/timing and view forecast/risk card | `what_if_card`, `counterfactual_scenarios_card`, `counterfactual_note_card` |
| History / Meal Memory | Similar meals, past outcomes, consistency and evidence counts | Step 4 in `meal_pipeline_section`; `app/services/historical_meal_matcher.py` |
| Insights / Pattern Genome | Recurring traits, trigger foods, confidence, source labeling | `_render_pattern_card`, `insights_card` |
| Experiments | Active experiment cards, observation-only summaries | `app/services/experiment_tracker.py` card concepts |
| Daily Debrief | End-of-day story, evidence, overnight watch, tomorrow watch-outs | `debrief_card`, `generate_daily_debrief` |
| Reports / Export | Clinician/care-team export artifacts | `--export-care-team`, `app/services/care_team_export.py` |
| Profile & Preferences | Anchor/profile selection, units, safety preferences, notifications | `--anchor`, profile snapshot/state serialization |
| Settings / Safety | Educational boundary, data source labels, privacy/export controls | `SafetyScaffold`, architecture safety layer |

### 2.2 Forecast Results Screen Layout

Forecast Results should be a horizontal swipe deck with a persistent top summary:

- Header: meal name/free text, profile anchor, confidence tier, data-source label.
- Swipe cards: one mobile component per existing terminal card.
- Bottom actions: `Edit meal`, `Clarify`, `Try what-if`, `Save`, `Export`, `Start experiment`.
- Safety footer: educational simulator / not medical advice.

## 3. Terminal Card → Mobile Component Mapping

| Existing terminal card/function | Mobile component | Notes |
|---|---|---|
| `welcome_card` | Home intro panel + quick actions | Show examples as tappable chips: meal, what-if, high/low troubleshooting, morning/evening/patterns. |
| CLI free-text prompt | Meal Entry screen | Replace terminal input with structured fields: food item, quantity, unit, optional free text. Keep free-text fallback. |
| `_legend_intro_card` | Demo profile card | Product/demo mode only; clearly label synthetic legend profile. |
| `_legend_meal_stats_card` | Demo 90-day history card | Summary stats + meal-type table; label synthetic/demo data. |
| `_legend_current_cgm_card` | Current CGM snapshot tile | Timestamp, mg/dL, trend arrow, source label. |
| `_legend_question_deck_card` | Demo question carousel/list | Used for showcase/demo flows only. |
| `meal_pipeline_section` Step 1: Parsed Foods | Parsed-food review card | Editable list of parsed foods; confidence indicator if parser uncertainty exists. |
| Step 2: Food Evidence | Evidence confidence card | Per-food match, carbs/fat/sugars, warnings, confidence decomposition, missing-info flags. |
| Step 3: Forecast | Forecast chart card | Embedded line/bar chart from `render_forecast`; show peak, timing, uncertainty range. |
| Step 4: Meal Memory | Similar-meals card | Top matches list, best/worst past result, evidence counts, consistency, data source. |
| Step 5: What-If Scenarios | What-if scenario carousel | Smaller portion/lower-fat/timing/separate-snack scenario cards. No treatment recommendations. |
| Step 6: Monitoring | Monitoring window card | Observation-only watch windows. No dosing or treatment changes. |
| Step 7: Data Quality & Confidence | Confidence detail card | Overall and per-item confidence, forecast uncertainty, safety status, missing data. |
| Step 8: Pattern Genome | Pattern Genome screen/card | Traits with evidence counts, top trigger foods, synthetic/real source label. |
| `what_if_card` | What-If Planner result card | Structured what-if form → forecast card + risk flags + educational disclaimer. |
| `counterfactual_note_card` | Contextual comparison note | Display as secondary insight under forecast/history. |
| `troubleshoot_card("high")` | High troubleshooting screen/card | Possible causes as educational checklist. Remove/avoid medication-device instructions if safety policy requires. |
| `troubleshoot_card("low")` | Low troubleshooting screen/card | Educational checklist + care-plan consult language. |
| `situation_card("heat")` | Situation guide: Heat | Quick guide card with watch items and educational footer. |
| `situation_card("exercise")` | Situation guide: Exercise | Quick guide card; optional activity log linkage. |
| `situation_card("alcohol")` | Situation guide: Alcohol | Quick guide card; strong safety boundary. |
| `situation_card("illness")` | Situation guide: Illness | Quick guide card; safety escalation copy must remain policy-reviewed. |
| `morning_call_card` | Morning check-in card | Home screen module + notification target. |
| `lunch_presser_card` | Lunch check-in card | Midday module; link to Meal Entry. |
| `evening_roundup_card` | Evening roundup card | Evening module; link to Daily Debrief. |
| `insights_card` | Insights overview | Summary entry point into Pattern Genome / History. |
| `clarification_card` | Clarification modal/sheet | Blocking modal before forecast when ambiguity is high; answer persists in state. |
| `debrief_card` | Daily Debrief screen | End-of-day summary; future push notification target. |
| `care_team_export` Markdown | Export preview/share sheet | Read-only report preview; share/download controls. |
| Calibration harness Markdown | Developer QA artifact only | Not user-facing; synthetic regression coverage only. |

## 4. State Model

Mobile state should extend `docs/state_serialization_spec.md` while preserving the canonical serialized fields.

### 4.1 Canonical Prediction State

Persist every forecast/prediction record with:

```python
MobilePredictionState = {
    # Identity
    "scenario": str,
    "anchor_type": str,

    # Stage outputs
    "profile_json": dict,
    "totals": dict,              # carbs_g, fat_g, sugars_g, protein_g when available
    "forecast": dict,            # ForecastResult with evidence fields

    # Evidence/essentials
    "confidence_overall": str,
    "clarification_needed": bool,
    "missing_information_flags": list[str],
    "evidence_items": list[dict],

    # Meta
    "question_mode": str,        # meal | what_if | troubleshoot | situation | debrief | insights
    "safety_rule": dict | str,
    "created_at": str,
    "data_source": str,          # synthetic_legends_demo | real_history | no_history | unknown
}
```

This mirrors `STATE_SERIALIZATION_FIELDS` and adds mobile-required metadata for rendering and resume.

### 4.2 Session State To Persist

| State area | Fields | Why it persists |
|---|---|---|
| User profile / anchor | selected `anchor_type`, profile label, profile snapshot, unit preferences | Forecast continuity and mobile defaults. |
| Meal history | meal text, parsed foods, meal totals, food evidence, missing-info flags, forecast summary, timestamps | History, debrief, similar-meal matching, reports. |
| Active experiments | experiment id, hypothesis, start/end dates, linked meal ids, observation metrics, confidence tier | Experiments screen and future observations. |
| Preferences | units, timezone, notification opt-ins, default meal-entry mode, privacy/export choices | Mobile UX personalization. |
| Draft meal entry | current structured inputs, free text, clarification answers | Resume interrupted meal logging. |
| What-if drafts | candidate food/portion/timing, linked baseline prediction id | Compare and revisit planning scenarios. |
| Debrief state | daily food list, carb totals, generated debrief, read/unread state | Daily Debrief screen and notifications. |
| Export state | generated report metadata, selected date range/profile, share status | Care-team export preview/share. |
| Safety acknowledgement | timestamp/version of educational boundary acknowledgement | Ensures disclaimers are visible and auditable. |

### 4.3 Non-Persistent UI State

Do not persist ephemeral screen-only values unless needed for resume:

- current swipe-card index
- open/closed accordion sections
- transient loading spinners
- temporary chart viewport/zoom
- dismissed local toasts

## 5. Navigation Patterns

### 5.1 Bottom Tab Structure

Recommended primary tabs:

1. **Today** — Home, quick entry, check-ins, latest forecast, debrief entry.
2. **Log Meal** — Structured meal/free-text entry.
3. **History** — Meal memory, similar meals, previous forecasts.
4. **Insights** — Pattern Genome, recurring patterns, experiments.
5. **Reports** — Care-team export packs and share history.

Settings/Profile is accessible from the top-right avatar/gear.

### 5.2 Meal Entry → Forecast Flow

```text
Today / Log Meal
  → Meal Entry form
  → Parsed Food Review
  → Clarification Sheet if needed
  → Forecast Results swipe deck
  → Save / What-if / Start experiment / Export
```

Rules:

- If confidence is low or missing-info flags are present, show the Clarification Sheet before final forecast where feasible.
- Users can continue with uncertainty, but the confidence card must make missing information visible.
- Saved forecasts become History records and feed Daily Debrief.

### 5.3 What-If Flow

```text
Forecast Results or Today
  → What-If Planner
  → Scenario input form
  → What-If result card
  → Optional compare to baseline forecast
```

What-if scenarios are planning/simulation only. They must not recommend medication, dosing, or treatment changes.

### 5.4 History Flow

```text
History tab
  → Meal list / calendar
  → Meal detail
  → Similar meals
  → Forecast replay
  → Export / Start experiment
```

History uses saved `MobilePredictionState` plus historical context from `historical_meal_matcher`.

### 5.5 Experiments Flow

```text
Insights tab
  → Experiments section
  → Active experiment detail
  → Linked meals / observations
  → Summary confidence
```

Experiments are observational only. Language must avoid causation claims unless future evidence supports it.

### 5.6 Daily Debrief Flow

```text
Today tab or notification
  → Daily Debrief screen
  → Evidence/context sections
  → Tomorrow watch-outs
  → Save/share summary
```

Debrief can be triggered manually first; push notification is a future mobile capability.

### 5.7 Reports Flow

```text
Reports tab
  → Select profile/date range/data source
  → Generate care-team export preview
  → Share/download Markdown/PDF in future
```

Reports must label synthetic/demo data and avoid clinical validation claims.

## 6. Mobile Component Guidelines

### 6.1 Cards

- Terminal cards become swipeable cards or vertical stacked cards.
- Each card has: title, confidence/source badge, main content, educational footer when relevant.
- Long cards use accordion sections (`Evidence`, `Details`, `Why this matters`).

### 6.2 Charts

- ASCII forecast output becomes embedded chart components.
- Required chart annotations: baseline, predicted peak, peak time, uncertainty band.
- Chart must include simulator disclaimer when exported/shared.

### 6.3 Structured Inputs

- Terminal free text becomes a hybrid form:
  - food item autocomplete/free text
  - quantity
  - unit selector
  - meal timing
  - optional notes
- Keep free-text input for parity with terminal and LLM parser.

### 6.4 Confidence And Missing Information

- Show confidence as a badge: high / medium / low.
- Show missing-info flags as actionable chips: `missing unit`, `generic portion`, `low match`, `high nutrition variance`.
- Tapping a chip opens a clarification form or explanation sheet.

### 6.5 Safety Copy

- Every forecast, what-if, debrief, report, and situation card includes educational-only framing.
- No medication/dosing/treatment-change calls to action.
- Emergency or high-risk language remains controlled by `SafetyScaffold` and mobile-specific copy review.

## 7. Missing For Mobile

These gaps must be addressed before a production mobile build:

1. **Touch targets and accessibility**
   - Minimum 44x44pt targets.
   - Dynamic type / text scaling.
   - Screen-reader labels for charts and confidence badges.

2. **Offline support**
   - Offline meal drafts.
   - Cached profile/preferences.
   - Clear degraded mode when food DB/LLM/network is unavailable.

3. **Push notifications**
   - Daily Debrief reminder.
   - Optional meal follow-up reminder.
   - Safety-reviewed wording only.

4. **Camera/photo meal input**
   - Future capture route for meal images.
   - Must store photo consent/privacy state.
   - Must still surface uncertainty and require confirmation.

5. **Structured data storage**
   - Mobile-local persistence for drafts, history, experiments, debriefs.
   - Sync conflict rules if backend storage is added.

6. **Export formats**
   - Current export is Markdown.
   - Mobile likely needs preview, share sheet, PDF rendering, and redaction controls.

7. **Authentication and privacy**
   - Not specified in terminal prototype.
   - Mobile needs account/session model and export/share permissions.

8. **Real CGM integration state**
   - Current demo often uses synthetic legends/demo data.
   - Mobile must explicitly label synthetic/demo vs real-history sources.

9. **Error and degraded-state UX**
   - LLM/parser unavailable.
   - Food DB unavailable.
   - Low confidence/no match.
   - Safety block triggered.

10. **Design tokens**
    - Colors for risk/confidence must be accessible and not alarmist.
    - Icons should reinforce, not replace, text labels.

## 8. Open Design Questions

- Should What-If Planner live as a separate tab or only as an action from Forecast Results?
- Should Daily Debrief be generated automatically or only after user confirmation?
- What is the first supported export format on mobile: Markdown preview, PDF, or shareable text?
- Which state is local-only vs synced to backend?
- How should mobile represent synthetic legend/demo data during product demos?
- What is the minimum safe copy review process for situation cards on mobile?

## 9. Non-Goals

- No mobile implementation in this issue.
- No new forecast, parser, food evidence, or safety logic.
- No clinical validation claims.
- No dosing/treatment recommendation UX.
- No backend schema migration in this spec.

## 10. Spec Traceability

| Issue | Feature | Key Source Files | Tests | Status |
|---|---|---|---|---|
| #15 | Food evidence confidence hardening | `app/food/service.py`, `src/pipeline/companion_pipeline.py`, `src/runner.py` | `tests/test_food_evidence_confidence.py` | ✅ Complete |
| #16 | Forecast calibration harness coverage | `src/forecast/calibration_harness.py`, `src/forecast/__init__.py` | `tests/test_calibration_harness.py` | ✅ Complete |
| #18 | Mobile parity UX state spec | `docs/mobile-parity-ux-spec.md`, `docs/ARCHITECTURE.md` | Doc review | ✅ Complete |
| #20 | Next-level showcase runner | `src/cli.py`, `src/companion.py` | `tests/test_showcase_runner.py` | ✅ Complete |
| #30 | Clinician / care-team export pack | `app/services/care_team_export.py`, `src/cli.py` | `tests/test_care_team_export.py` | ✅ Complete |

## 11. Acceptance Checklist

- [x] Screen structure defined.
- [x] State model defined for session persistence.
- [x] Navigation patterns defined.
- [x] Existing terminal cards mapped to mobile UI components.
- [x] Mobile gaps flagged.
- [x] No implementation changes required by this spec.
