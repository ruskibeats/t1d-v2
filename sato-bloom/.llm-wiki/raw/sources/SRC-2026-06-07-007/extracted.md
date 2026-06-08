# Ubiquitous Language — T1D Companion v2

## State Bloom (Visual System)

The State Bloom is the end-to-end visual system that transforms health metrics into a living watercolor cloud visualization on mobile. It is built with Skia rendering and driven by five health dimensions.

### Core concepts

| Term | Definition | Aliases to avoid |
|------|------------|------------------|
| **State Bloom** | The end-to-end visual system that transforms health metrics into a living watercolor cloud. Comprises the pigment model, bloom engine (Skia renderer), Bloom Card UI, and haptic feedback. | Bloom system, cloud visualizer |
| **Bloom** | The watercolor cloud visualization itself — the layered, translucent petal structure rendered on the Skia canvas. | Orb, cloud, visualization |
| **Bloom Card** | The pressable UI card that contains the State Bloom visualization. Includes the Skia canvas, profile eyebrow, title, subtitle, and pigment legend. Triggers haptic feedback on press. | Orb card, state card |
| **Health Dimension** | One of five normalized (0–1) inputs that shape the State Bloom: Time in Range, Variability, Activity, Consistency, and Feeling. Each dimension maps to a pigment color and angular position in the bloom. | Input, metric, signal |
| **Pigment** | A colored, semi-transparent layer in the State Bloom derived from a single health dimension. Each pigment has a primary color, a secondary color, an angular position, and an intensity. Rendered as clusters of translucent oval petals that overlap to form the bloom. | Drop, stain, blob |
| **Core** | The dense center of the State Bloom where all five pigments overlap and blend into a unified color representing the combined state. Rendered as semi-transparent oval washes. | Heart, nucleus, center |
| **Petal** | A single translucent oval rendered by Skia that forms part of a pigment cluster. Each pigment produces multiple petals across three concentric rings. | Oval, blob, shape |
| **Profile** | A named metabolic archetype that configures the State Bloom with a specific color palette and pre-set health dimension values. Current profiles: Balanced (green), Spike (blue), Calm (orange). Each profile maps to a distinct visual identity across the bloom, tab accent, and card. | Tab, preset, mode |
| **Bloom engine** | The Skia-based renderer that composes the bloom from pigments. Responsible for generating petal geometry, center wash, glow, texture overlay, and paper base. | Renderer, canvas, Skia renderer |
| **Palette** | The set of primary and secondary colors assigned to pigments for a given profile. Each profile defines one palette with five color pairs (one per health dimension). | Color scheme, theme |

### State Bloom relationships

- The **State Bloom** processes five **Health Dimensions** to produce a **Bloom** rendered by the **Bloom engine** inside a **Bloom Card**.
- Each **Health Dimension** produces one **Pigment** with a **Palette** derived from the active **Profile**.
- Each **Pigment** is rendered as multiple translucent **Petals** arranged in concentric rings around the **Core**.
- A **Profile** determines the **Palette** and the default **Health Dimension** values.
- The **Bloom Card** is tappable and responds with haptics and visual press feedback.
- There are three **Profiles**: Balanced, Spike, and Calm. Profile name appears on the card eyebrow, e.g. "Balanced state bloom".
- Pigments overlap in the **Core** to form a blended color that represents the user's combined metabolic state.

### Flagged ambiguities (State Bloom)

- "Bloom" was used to mean both the **State Bloom** (whole system) and the **Bloom** (the cloud visual). Resolved: "State Bloom" = system, "Bloom" = the watercolor cloud itself.
- "Orb" was used in early variable names (`orbPanel`, `orbCopy`) but refers to the **Bloom Card**. Code names should migrate toward "bloom" terminology.
- "Profile" has two meanings resolved by context: In the **meal/forecast domain**, it is a **Legend**'s anchor type and numeric profile config. In the **State Bloom**, it is a named metabolic archetype (Balanced/Spike/Calm) that sets the palette and default metrics. The term is intentionally shared — both describe a person's characteristic metabolic pattern.

---

## Profiles (Meal/Forecast Domain)

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

- The **State Bloom** processes five **Health Dimensions** to produce a **Bloom** rendered inside a **Bloom Card**.
- Each **Health Dimension** produces one **Pigment**; overlapping **Petals** form the **Core**.

## Flagged ambiguities

- "Anchor" was used to mean both the **anchor type** string and the CLI `--anchor` argument — these are resolved (both refer to the same thing).
- "Profile" was used to mean both the **anchor type** (high-level category) and the **profile config** (numeric parameters). These are now distinct: `anchor type` = category, `profile config` = numbers. In the State Bloom context, "Profile" also refers to a named metabolic archetype (Balanced/Spike/Calm). Context disambiguates.
- "Forecast" was used to mean both the **forecast result** (full output) and the forecast **card** (UI presentation). These are now distinct: `forecast result` = data, `card` = UI.
- "Sim user" was deprecated in favour of **Legend** — legends are more than just simulation parameters; they have names, backstories, and questions.
- "Bloom" was used ambiguously between the system and the visual. Now: **State Bloom** = system, **Bloom** = watercolor cloud.
- "Orb" was deprecated in favour of **Bloom Card** — legacy code variable names still contain `orb` but should migrate.
