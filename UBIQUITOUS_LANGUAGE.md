# Ubiquitous Language

## T1D Domain

| Term | Definition | Aliases to avoid |
| ---- | ---------- | ---------------- |
| **T1D Profile** | A user's Type 1 Diabetes configuration including anchor type and insulin parameters | Profile, T1D config |
| **Anchor Type** | The physiological pattern classification (Foot2Floor, Well-controlled, High-fat delayed, etc.) | Pattern, profile type |
| **Forecast** | A glucose prediction curve showing expected rise/fall after a meal | Prediction, projection |
| **CGM Entry** | A continuous glucose monitor reading with value, timestamp, and trend | Glucose reading, blood sugar |
| **Meal Review** | A saved record combining parsed foods, evidence, forecast, and safety metadata | Meal log, entry |
| **Bloom Window** | A time-segmented metabolic state with pigment, intensity, and confidence | Metabolic phase, segment |
| **Sato** | The emotional presentation layer that transforms raw data into narrated experience | Chat, assistant, AI |
| **Companion Card** | A typed UI state representing a step in the meal forecast pipeline | Card, screen, view |
| **Food Evidence** | Nutrition fact assembly with confidence, uncertainty, and provenance | Nutrition facts, macros |
| **Nightscout Import** | The process of syncing external CGM data into the platform | CGM sync, import |

## Architecture

| Term | Definition | Aliases to avoid |
| ---- | ---------- | ---------------- |
| **FactExtractor** | Module extracting facts from food graph without LLM calls | Fact extractor, parser |
| **GraphAdapter** | Interface abstracting Apache AGE and relational queries | Graph service, repository |
| **Safety Validator** | Module checking chat responses against dosing/insulin keywords | Safety filter, guardrail |
| **Sato Page** | Backend endpoint serving emotional greeting layer state | Chat page, Sato endpoint |
| **Parser Abstraction** | Interface for LLM-independent food parsing and claim generation | LLM parser, nutrition parser |

## Relationships

- A **T1D Profile** owns many **CGM Entries**, **Meal Reviews**, and **Forecasts**
- A **Meal Review** contains one or more **Food Evidence** items and belongs to one **T1D Profile**
- A **Forecast** is generated from **Food Evidence** and a **T1D Profile**
- A **Bloom Window** represents a slice of time within a **Forecast**
- **Sato** renders **Companion Cards** composed of **Bloom Window** data

## Example dialogue

> **Dev:** "When a **T1D Profile** with **Foot2Floor** anchor type eats a meal, what **Food Evidence** do we need for the **Forecast**?"
> 
> **Domain expert:** "We need the carbs, fat, protein, and fiber with confidence bands. The **FactExtractor** pulls these from the food graph, then the bloom engine computes the **Bloom Windows** showing how glucose will respond. **Sato** takes those windows and presents them as **Companion Cards**."

> **Dev:** "How does the **Nightscout Import** relate to **CGM Entries**?"
> 
> **Domain expert:** "The import process transforms external Nightscout readings into our **CGM Entry** model. It's idempotent — same readings re-imported don't create duplicates — and respects the **GraphAdapter** for storage."

## Flagged ambiguities

- "profile" was used for both **T1D Profile** and general user profile — these are distinct: **T1D Profile** specifically contains anchor type and insulin parameters for glucose prediction, while general profile might include fitness or nutrition preferences
- "prediction" was used interchangeably with **Forecast** — but **Forecast** specifically implies a time-segmented glucose curve, not a single number