# Next-Level Feature Backlog: T1D Companion v2

## Research Basis

This review is based on the current PRD (#20), architecture docs, ubiquitous language, legend dataset, graph engine, historical meal matcher, forecast pipeline, evidence bundle, food evidence layer, safety system, and CLI showcase runner.

The current PRD is strong for demonstrating existing capabilities, but it is mainly a showcase/packaging PRD. It does not yet fully exploit the richer strategic assets already present in the codebase:

- 12 simulated legends with anchor profiles, current CGM, characteristic questions, and ~500 meals each.
- A graph engine capable of linking meals, glucose spikes, high-fat delayed peaks, sleep, and next-day glucose.
- Historical meal matching with similarity, confidence, consistency, best past outcome, and what-changed notes.
- Food evidence with item-level nutrition, identity confidence, portion uncertainty, nutrition variance, carb ranges, and top uncertainty reasons.
- Forecast outputs with uncertainty bands, top drivers, missing information flags, and profile assumptions.
- A strict LLM parser and evidence bundle that can support an AI narrator/explainer.
- A safety scaffold and shared safety policy.

The missing opportunity is not “more cards.” It is turning the app into a learning companion that compounds personal data into increasingly useful, trusted, non-dosing insights.

---

## Strategic Product Thesis

T1D Companion can become valuable by owning the space between raw CGM data and clinical advice:

> “Explain my diabetes patterns in plain language, using my own history, without telling me what insulin to take.”

The defensible wedge is personalized evidence: meals, glucose responses, timing, sleep/activity context, uncertainty, and repeatable AI summaries grounded in historical patterns.

---

## 10 Credible High-Value Features / Enhancements

### 1. Personal Pattern Genome

**Concept**  
Generate a user-specific pattern profile from 30/60/90-day history: breakfast spike tendency, high-fat delay tendency, exercise sensitivity, overnight risk, variability profile, and repeat trigger foods.

**Why it matters**  
This turns the app from one-off meal forecast into a personalized metabolic map. Users do not just ask “what happens if I eat pizza?” They learn “pizza behaves like this for me, especially after low-activity days.”

**Architecture leverage**
- Legend anchors
- `food_history`
- `historical_meal_matcher`
- graph edges
- calibration registry
- insights card

**MVP behavior**
- Print a “Pattern Genome” card for each legend/user.
- Include 5–8 traits with confidence labels.
- Distinguish synthetic/demo vs real evidence.

**Acceptance criteria**
- Produces traits from meal history and graph-derived context.
- Each trait has evidence count, confidence, and plain-language explanation.
- No treatment or dosing recommendation language.

---

### 2. Meal Memory: “What Happened Last Time?”

**Concept**  
When a user enters a meal, the app retrieves the closest historical meals and narrates what happened last time: typical rise, timing, variance, best outcome, worst outcome, and what was different.

**Why it matters**  
This is the core consumer value loop. People with T1D repeatedly ask, “Why did this same meal behave differently?” The current historical matcher already contains most of the primitives.

**Architecture leverage**
- `historical_context_for_meal`
- `similarity_reason`
- `what_changed_note`
- `best_past_outcome`
- graph `find_similar_meals_with_better_outcomes`

**MVP behavior**
- Add a dedicated “Meal Memory” card after forecast.
- Show top 3 similar meals, not just aggregate stats.
- Explain similarity and differences.

**Acceptance criteria**
- Shows matched meal examples with timestamps/meal names.
- Includes confidence and evidence count.
- Clearly labels synthetic/demo data where applicable.

---

### 3. Counterfactual Meal Coach

**Concept**  
Offer non-dosing food/behavior counterfactuals: smaller portion, earlier/later timing, lower-fat alternative, add walk context, split dessert into separate snack — all phrased as educational simulations.

**Why it matters**  
The app becomes actionable without giving medical advice. It helps users explore choices rather than calculate insulin.

**Architecture leverage**
- what-if card
- forecast engine
- uncertainty bands
- food evidence top driver
- similar better meals

**MVP behavior**
- For a meal forecast, generate 2–3 alternative scenarios.
- Compare peak, timing, and uncertainty side-by-side.

**Acceptance criteria**
- Produces at least two food/timing alternatives.
- Uses forecast deltas and historical examples when available.
- Avoids dosing, correction, bolus, basal, and medication language.

---

### 4. Data Quality & Confidence Explainer

**Concept**  
A visible “trust meter” for every answer: food identity confidence, portion uncertainty, history confidence, forecast uncertainty, missing info, and safety boundary.

**Why it matters**  
A diabetes AI must be trustworthy by showing uncertainty. The app already computes much of this but does not yet turn it into a premium UX primitive.

**Architecture leverage**
- `FoodEvidence.identity_confidence`
- `portion_uncertainty_pct`
- `nutrition_variance_pct`
- `top_uncertainty_reason`
- `confidence_overall`
- `missing_information_flags`
- evidence bundle

**MVP behavior**
- Add a “Why I’m confident / not confident” card.
- Show a simple confidence ladder: Food, Portion, History, Forecast, Safety.

**Acceptance criteria**
- Every forecast has a confidence explainer.
- Low-confidence answers ask for clarification instead of over-answering.
- Tests cover ambiguous meals and missing portions.

---

### 5. Clarifying Question Loop

**Concept**  
When food/portion uncertainty is high, the app asks one targeted follow-up question before forecasting: “Was that one slice or a whole pizza?” / “Regular Coke or Diet Coke?”

**Why it matters**  
This is a major quality upgrade. Many bad glucose predictions come from bad input. Asking one good question is more valuable than producing a precise-looking forecast from weak evidence.

**Architecture leverage**
- LLM parser
- food evidence uncertainty
- evidence bundle `clarification_answer`
- strict AI mode

**MVP behavior**
- Detect high uncertainty.
- Emit a clarification card.
- Accept the answer and rerun evidence/forecast.

**Acceptance criteria**
- At least 5 ambiguity triggers: pizza portion, drink sugar/diet, fries size, cereal bowl size, dessert portion.
- Clarification changes carb range and confidence.
- Non-interactive test path can simulate clarification response.

---

### 6. Daily Debrief / “Glucose Story of the Day”

**Concept**  
Generate an end-of-day AI summary: meals logged, biggest drivers, unusual spikes/lows, best stable window, likely high-fat delays, overnight watch items, and tomorrow’s watch-outs.

**Why it matters**  
Daily reflection creates retention. Users return because the app explains their day in human terms.

**Architecture leverage**
- evening roundup card
- graph links meal→glucose and meal→sleep
- insights engine
- safety scaffold
- legends’ daily/90-day data

**MVP behavior**
- Upgrade evening roundup from static text to evidence-backed narrative.
- Include “most useful observation today.”

**Acceptance criteria**
- Uses actual logged meals/context where available.
- Includes evidence counts and disclaimers.
- No treatment adjustment language.

---

### 7. Habit Experiment Tracker

**Concept**  
Let users define small experiments: “walk 10 minutes after lunch,” “lower-fat pizza,” “earlier dinner,” “same breakfast for 5 days.” The app tracks outcomes and summarizes whether the experiment seemed associated with better stability.

**Why it matters**  
This is a consumer health growth loop. It encourages behavior learning without medication advice.

**Architecture leverage**
- graph engine edges
- historical matcher
- insights card
- evidence bundle
- profile anchors

**MVP behavior**
- Add experiment metadata to events.
- Compare before/after matched meals.
- Summarize in a weekly experiment card.

**Acceptance criteria**
- Supports creating/listing/completing one experiment type.
- Compares matched outcomes with confidence.
- Uses association language, not causation.

---

### 8. Legend Theater / Synthetic Cohort Explorer

**Concept**  
Turn the 12 legends into an interactive product demo and education mode: compare how the same meal behaves across different anchor profiles.

**Why it matters**  
This is perfect for demos, onboarding, education, and sales. It shows personalization instantly: same meal, different person, different story.

**Architecture leverage**
- 12 legends
- anchor profiles
- forecast stage
- CLI showcase
- renderer

**MVP behavior**
- Choose a meal and run it across all 12 legends.
- Show compact comparison table: baseline, peak, peak time, risk flags, confidence.

**Acceptance criteria**
- `--compare-legends "pizza and salad"` or equivalent exists.
- Output ranks profiles by predicted peak or delay.
- Makes synthetic/demo status explicit.

---

### 9. Safety-Aware AI Narrator

**Concept**  
Add a narrator LLM step that converts the evidence bundle into a warm, concise explanation, then runs safety validation before display.

**Why it matters**  
The app should feel like an AI companion, not a deterministic report. Strict evidence grounding and safety validation can make the AI voice useful without becoming unsafe.

**Architecture leverage**
- `make_evidence_bundle`
- `t1d_llm_context`
- strict LLM parser/client
- `SafetyScaffold`
- shared safety policy

**MVP behavior**
- Pass evidence bundle to narrator prompt.
- Validate response with safety scaffold.
- If unsafe, show blocked/error card rather than fallback text.

**Acceptance criteria**
- Narrator output references evidence fields.
- Safety violations block output.
- Test with unsafe mocked narrator response.

---

### 10. Clinician / Care-Team Export Pack

**Concept**  
Generate a shareable PDF/Markdown weekly summary: top patterns, representative meals, uncertainty notes, graph-derived observations, safety disclaimers, and questions to discuss with care team.

**Why it matters**  
This creates a bridge from personal AI companion to clinical conversation. It is valuable without giving medical advice.

**Architecture leverage**
- renderer markdown mode
- insights engine
- historical matcher
- graph provenance
- safety policy
- legend dataset/demo reports

**MVP behavior**
- `python3 -m src.cli --weekly-report --legend 1 --format markdown`
- Generates a report artifact.

**Acceptance criteria**
- Includes 5–7 sections: overview, meals, recurring patterns, uncertainty, examples, questions for clinician, disclaimer.
- Labels synthetic/demo data.
- No dosing/treatment recommendations.

---

## Missing From Current PRD #20

The current PRD focuses on showcasing existing features. To reach a stronger product vision, it should explicitly add:

1. A feature that uses 90-day history as a first-class product asset.
2. A confidence/trust layer across all outputs.
3. A clarification loop before weak forecasts.
4. A comparative legend/profile mode.
5. A narrator LLM grounded in evidence bundles.
6. A daily/weekly retention loop.
7. A care-team export/reporting path.
8. A habit experiment loop for user engagement.
9. Strong graph provenance and evidence labels.
10. Product metrics for demo quality and user value.

---

## Recommended Prioritization

### P0 — Make the demo unlock the product story
1. Legend Theater / Synthetic Cohort Explorer
2. Meal Memory: “What Happened Last Time?”
3. Data Quality & Confidence Explainer
4. Safety-Aware AI Narrator

### P1 — Make the app sticky
5. Daily Debrief
6. Clarifying Question Loop
7. Counterfactual Meal Coach

### P2 — Build defensibility and clinical-adjacent value
8. Personal Pattern Genome
9. Habit Experiment Tracker
10. Clinician / Care-Team Export Pack

---

## Recommendation

Do not position the app as a forecasting calculator. Position it as:

> A personal diabetes pattern companion that explains your own glucose history in plain language, simulates meal scenarios, and helps you prepare better questions for yourself and your care team.

That is the path from demo tool to venture-scale product.
