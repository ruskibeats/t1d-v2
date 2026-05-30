# Ubiquitous Language — T1D Companion v2

## Profiles

| Term | Definition | Aliases to avoid |
|------|------------|------------------|
| **Legend** | A simulated T1D user with a name, age, diagnosis duration, anchor type, 90-day food history, current CGM reading, and characteristic questions | Sim user, synthetic user, test user |
| **Anchor type** | A named physiological profile category (e.g. `high_fat_delayed`, `dawn_phenomenon`) that determines calibration constants and typical meal response patterns | Profile type, anchor, profile |
| **Profile config** | The concrete numeric parameters for an anchor type: basal glucose, carb ratio, insulin sensitivity, fat delay hours, exercise drop factor | Patient config, profile parameters |

## Meal pipeline

| Term | Definition | Aliases to avoid |
|------|------------|------------------|
| **Parsed food** | A single food item extracted from free-text meal input, carrying `item`, `quantity`, `unit`, and `search_terms` | Food item, detected food |
| **Food candidate** | A possible database match for a parsed food, with nutrition per 100g and a match score | Product match, DB result |
| **Food evidence** | The selected best-match candidate with computed macros, confidence, warnings, carb range, and decomposed uncertainty fields | Nutrition result, food lookup |
| **Meal totals** | Aggregated macros across all foods in a meal, plus total carb range, confidence, top carb contributor, absorption profile, and uncertainty items | Meal summary, meal result |
| **Carb range** | A `(low, high)` tuple representing uncertainty in the estimated total carbs | Carb uncertainty band |

## Forecast

| Term | Definition | Aliases to avoid |
|------|------------|------------------|
| **Forecast result** | The full output of the physiology model: peak glucose, time-to-peak, baseline, forecast points, nighttime points, uncertainty band, top drivers, evidence fields | Prediction, forecast output |
| **Uncertainty band** | A low/point/high forecast triplet induced by carb-estimation uncertainty, with peak and time ranges | Uncertainty range, confidence band |
| **Absorption profile** | A label (`fast`, `delayed`, `mixed`, `standard`) describing the expected glucose rise shape based on meal sugar/fat composition | Absorption type, rise pattern |
| **Physiology model** | The 3-compartment gut + insulin + glucose mass-balance compartment model | Body simulator, forecast model |

## Context & history

| Term | Definition | Aliases to avoid |
|------|------------|------------------|
| **Historical meal summary** | Aggregated statistics from similar meals in the user's food history: count, avg peak delta, avg peak time, range, observations | Similar meals, historical context |
| **Response band** | The observed min–max range of peak glucose rise for similar historical meals | Peak range, historical range |

## Safety

| Term | Definition | Aliases to avoid |
|------|------------|------------------|
| **Safety scaffold** | The emergency keyword, dosing-pattern, and treatment-pattern validator. The final veto gate before any output reaches the user. | Safety gate, guardrail, content filter |
| **Banned word** | A term the companion must never output (e.g. "insulin", "bolus", "dose", "inject") | Blocked term, forbidden word |
| **Dosing pattern** | A regex pattern matching insulin-unit language (e.g. "take 3 units") | Dosing regex, medication pattern |

## UI / Cards

| Term | Definition | Aliases to avoid |
|------|------------|------------------|
| **Card** | A single piece of companion output shown on one press of Enter. Cards form a progressive narrative. | Screen, state, section |
| **Showcase** | The press-Enter walkthrough of a random legend's profile, history, CGM, question, and answer | Demo, walkthrough, tour |
| **Intent** | The classified purpose of user input: meal, what-if, troubleshoot high, troubleshoot low, situation, morning call, lunch presser, evening roundup, insights | Question type, command type |

## Relationships

- A **Legend** has one **Anchor type** and one **Profile config**.
- A **Legend** has 90 days of **Food entries** (breakfast, morning snack, lunch, afternoon snack, dinner, evening snack).
- A **Legend** has a **Current CGM reading**.
- A **Legend** has several characteristic **Questions** mapped to **Intents**.
- A **Parsed food** is produced from user text by the parser (LLM or deterministic).
- A **Parsed food** produces zero or more **Food candidates** from the database.
- **Food evidence** is computed from the top-ranked **Food candidate**.
- Multiple **Food evidence** items are combined into **Meal totals**.
- **Meal totals** are fed to the **Forecast engine** → **Forecast result**.
- **Forecast result** + **Historical meal summary** are combined into an **Evidence bundle**.
- **Evidence bundle** passes through the **Safety scaffold** before becoming a **Card**.

## Flagged ambiguities

- "Anchor" was used to mean both the **anchor type** string and the CLI `--anchor` argument — these are resolved (both refer to the same thing).
- "Profile" was used to mean both the **anchor type** (high-level category) and the **profile config** (numeric parameters). These are now distinct: `anchor type` = category, `profile config` = numbers.
- "Forecast" was used to mean both the **forecast result** (full output) and the forecast **card** (UI presentation). These are now distinct: `forecast result` = data, `card` = UI.
- "Sim user" was deprecated in favour of **Legend** — legends are more than just simulation parameters; they have names, backstories, and questions.
