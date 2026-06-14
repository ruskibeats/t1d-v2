# T1D Food Graph - Ubiquitous Language Glossary

**Version:** 1.0
**Date:** 2026-06-14
**Scope:** MemGraphRAG-style food/recipe knowledge graph for T1D management

---

## Core Concepts

### Graph / Knowledge Graph
> A semantic network that represents food/recipe relationships as nodes (entities) and edges (relationships). Used to reason about nutrition and glucose response patterns.

**Relations:**
- **Property Graph**: Graph with typed edges and properties (implemented via Apache AGE)
- **MemGraphRAG Graph**: Graph layer with schema → facts → passage hierarchy (inspired by MemGraphRAG)

**Examples:**
- `(:FoodItem)-[:HAS_CARBS]->(:NutrientFact)`
- `(:Meal)-[:ATE]->(:FoodItem)`

---

## Entities

### FoodItem
> A specific food or food variant with a unique identifier (barcode, OpenFoodFacts code, or canonical name).

**Attributes:**
- `name`: Human-readable name (e.g., "oatmeal rolled grains")
- `canonical_name`: Normalized name for matching (e.g., "oatmeal")
- `off_code`: OpenFoodFacts product code
- `barcode`: Product barcode
- `category`: Food category (e.g., "grains", "fruit")
- `source_tier`: Trust level of source (see Trust Hierarchy)

**Examples:**
- "banana medium" → FoodItem: `banana-200g`
- "sourdough bread 30g slice" → FoodItem: `sourdough-bread-slice`

---

### Recipe
> A structured set of ingredients and instructions for preparing a meal. Can be user-created or external (from recipe databases).

**Attributes:**
- `name`: Recipe name (e.g., "Spaghetti bolognese")
- `author_id`: User who created the recipe
- `servings`: Number of servings
- `ingredients`: JSONB array of `{food_item_id, grams, portion_label}`
- `method`: Step-by-step instructions
- `nutrition_overview`: Aggregated nutrition totals

**Examples:**
- User's homemade chili recipe
- Scraped recipe from online source

---

### MealEvent
> A logged meal consumed by a user at a specific time. Links foods consumed in a single eating occasion.

**Attributes:**
- `user_id`: User who ate the meal
- `meal_id`: Recipe used (or NULL for custom entry)
- `custom_name`: Custom meal name if not using a recipe
- `eaten_at`: Timestamp of meal consumption
- `total_carbs_g`: Total carbohydrates consumed
- `recorded_by`: 'user', 'simulator', or 'manual'

**Examples:**
- "Breakfast at 8:30am on June 14, 2026"

---

### Portion
> A standardized measurement of food quantity (e.g., "1 slice", "200g", "medium").

**Attributes:**
- `food_item_id`: Food this portion belongs to
- `label`: Human-readable label (e.g., "1 slice", "medium banana")
- `quantity`: Numeric amount (e.g., 30.0 for 30g)
- `unit`: Unit of measurement (e.g., "g", "slice", "cup")
- `is_default`: Whether this is the recommended/default portion

**Examples:**
- Portion: "1 slice" of bread = 30g carbs
- Portion: "medium" banana = 105g carbs

---

### NutrientFact
> An atomic nutrition value extracted from a source (label, database, or measurement).

**Attributes:**
- `food_item_id`: Food this fact belongs to
- `nutrient_type`: Nutrient type (carbs, protein, fat, fiber, calories)
- `value_numeric`: Numeric value (e.g., 27.5 for 27.5g)
- `value_unit`: Unit (e.g., "g", "mg/dL", "kcal")
- `percent_dv`: Percent of Daily Value
- `source`: Source system (openfoodfacts, usda, manufacturer)
- `override_by_user_id`: User who manually set this value

**Examples:**
- Carbs: 27g per 100g (Open Food Facts)
- Protein: 4g per serving (USDA)

---

### GuidelineStatement
> A diabetes management rule or guideline (from NICE, ADA, etc.) that applies to food/meal decisions.

**Attributes:**
- `guideline_type`: Type of guideline (carb_counting, spike_timing, etc.)
- `title`: Brief summary
- `content_text`: Full guideline text
- `source`: Authority (nices, ada, diabetes_uk)
- `trust_tier`: Trust level
- `valid_from`: When this guideline applies
- `valid_to`: When this guideline no longer applies

**Examples:**
- "Carb counting: Focus on total carbohydrate grams on the label"
- "1 CP (carbohydrate portion) = 10g carbs"

---

## Relationships

### ATE
> User → MealEvent relationship. Indicates a user consumed a meal at a specific time.

**Attributes:**
- `confidence`: Confidence score (0.0-1.0)
- `timestamp`: When the meal was eaten

**Example:**
```
(:User {id: "user-123"})-[:ATE]->(:MealEvent {id: "meal-456"})
```

---

### CONTAINS
> Recipe → FoodItem relationship. Indicates a recipe includes a specific ingredient.

**Attributes:**
- `grams`: Weight of ingredient in grams
- `portion_label`: Human-readable portion description

**Example:**
```
(:Recipe {name: "MyChilli"})-[:CONTAINS]->(:FoodItem {name: "kidney beans"})
```

---

### DERIVED_FROM
> Portion → Recipe relationship. Indicates a portion size is derived from a recipe's serving definition.

**Attributes:**
- `label`: Portion label (e.g., "1 slice")

**Example:**
```
(:Portion {label: "1 slice"})-[:DERIVED_FROM]->(:Recipe {name: "Sourdough"})
```

---

### HAS_NUTRIENT
> FoodItem → NutrientFact relationship. Links a food to its nutrition values.

**Attributes:**
- None (flattened in NutrientFact table)

**Example:**
```
(:FoodItem {name: "oatmeal"})-[:HAS_NUTRIENT]->(:NutrientFact {carbs: 27g})
```

---

### SUPPORTED_BY
> Passage → FactClaim relationship. Links supporting evidence to a factual claim.

**Attributes:**
- `weight`: Relevance/importance of source
- `source_type`: Type of source (food_entry, fingerprint, openfoodfacts, etc.)

**Example:**
```
(:Passage {content: "Oatmeal has 27g carbs per 100g"})-[:SUPPORTED_BY]->(:FactClaim {carbs: 27g})
```

---

### SIMILAR_TO
> FoodItem → FoodItem relationship. Indicates two foods are nutritionally similar.

**Attributes:**
- `similarity_score`: Numeric similarity (0.0-1.0)

**Example:**
```
(:FoodItem {name: "white rice"})-[:SIMILAR_TO]->(:FoodItem {name: "brown rice"})
```

---

## MemGraphRAG Layer

### SourceDocument
> Original source document (label, manufacturer, user recipe) that serves as evidence for facts.

**Attributes:**
- `doc_type`: Type of document (openfoodfacts, manufacturer_label, user_recipe, cgm_observation)
- `source_uri`: URL or identifier for source
- `title`: Document title
- `content_text`: Full document content (for passages)
- `trust_tier`: Source trust level

**Examples:**
- "Open Food Facts record for banana 200g"
- "User manual label for cereal box"

---

### SourcePassage
> Chunked text passage from a source document, optionally with embedding.

**Attributes:**
- `passage_type`: Type of passage (nutrition_fact, ingredient_list, cgm_observation)
- `content_text`: Passage text
- `embedding`: Vector embedding (halfvec 768)
- `trust_tier`: Trust level of passage

**Examples:**
- "Nutrition per 100g: Carbs 27g, Protein 4g"
- "User logged 8:30am breakfast with oatmeal"

---

### FactClaim
> Atomic, conflict-aware fact extracted from passages.

**Attributes:**
- `claim_type`: Type of claim (nutrition_per_100g, glycemic_response, etc.)
- `subject_type`: Entity type (FoodItem, Recipe, MealEvent)
- `subject_id`: Entity identifier
- `subject_label`: Human-readable label
- `predicate`: Relationship being asserted (has_carbs, produced_spike, etc.)
- `value_numeric`: Numeric value
- `confidence`: Confidence score (0.0-1.0)
- `confidence_tier`: confidence level (low, medium, high)
- `trust_tier`: Source trust level
- `valid_from`: When this fact applies
- `valid_to`: When this fact no longer applies

**Examples:**
- (FoodItem: banana, has_carbs_per_100g, 20g)
- (MealEvent: breakfast 8:30am, produced_delta_mg_dl, 25)

---

### Conflict
> Explicit record of conflicting facts that cannot be automatically resolved.

**Attributes:**
- `conflict_type`: Type of conflict (value_mismatch, granularity_mismatch, source_trust_mismatch, temporal_mismatch, recipe_version)
- `resolution`: Resolution decision (keep_both, prefer_a, prefer_b, merged, requires_review)
- `resolution_note`: Human-readable explanation of resolution

**Examples:**
- **Value Mismatch**: Oatmeal carbs listed as 27g vs 33g from different sources
- **Source Trust Mismatch**: User measured 30g carbs vs database says 20g

---

## Measurement Concepts

### Carbs / Carbohydrates
> Total carbohydrate content in food, measured in grams (g).

**Relation:**
- `has_carbs_per_100g`: Carbs per 100g of food
- `has_carbs`: Carbs per serving or portion
- `produced_delta_mg_dl`: Carbs' effect on blood glucose (in mg/dL increase)

**Examples:**
- "Oatmeal has 27g carbs per 100g"
- "This meal produced 25mg/dL glucose spike"

---

### GI / Glycemic Index
> How quickly a food raises blood glucose levels. Represented as Low/Medium/High categories.

**Attributes:**
- `gi_category`: Category (rapid_acting, low_gi, medium_gi, high_gi)

**Examples:**
- "White rice: medium GI"
- "Sweet potato: low GI"

---

### CP / Carbohydrate Portion
> A unit of carbohydrate measurement where 1 CP = 10g carbs. Used in diabetes management for dosing insulin.

**Attributes:**
- `has_cp`: Number of CPs in a food

**Examples:**
- "1 slice bread = 3 CPs"
- "This meal requires 8 CPs for insulin dosing"

---

## Data Quality Concepts

### Trust Hierarchy
> Ordered ranking of source trust levels from most to least reliable.

**Levels (from highest to lowest):**
1. `official_database` (USDA, official diabetes guidelines)
2. `manufacturer_barcode` (manufacturer label)
3. `openfoodfacts` (Open Food Facts database)
4. `structured_user_recipe` (user-organized recipes)
5. `scraped_recipe` (web-scraped recipes)
6. `user_note` (user's manual entry)

**Usage:**
```typescript
function getPreferredTier(tierA: string, tierB: string): string {
  return rank(tierA) < rank(tierB) ? tierA : tierB;
}
```

---

### Confidence Tier
> Level of confidence in a fact, based on data quality and sample size.

**Levels:**
- `high`: High confidence (≥3+ measurements, official source, clinically validated)
- `medium`: Medium confidence (1-2 measurements, reasonably reliable source)
- `low`: Low confidence (single measurement, user note, experimental)

**Derived from:**
- Sample size of measurements
- Source trust level
- Data consistency across sources

---

### Uncertainty
> Measure of how confident we are in the provided answer, accounting for data gaps and conflicts.

**Components:**
- `level`: low / medium / high
- `reasons`: Reasons reducing confidence (limited data, conflicts, etc.)
- `dataGaps`: Missing data that would improve accuracy

**Examples:**
- `level: low`, `reasons: ["Only 1 food diary entry matched this food"]`
- `level: high`, `reasons: ["3 conflicting carb values detected"]`

---

## System Concepts

### AGE (Apache AGE)
> Apache AGE extension for PostgreSQL that provides property graph capabilities and Cypher-like querying.

**Purpose:**
- Query food relationships with graph patterns
- Support complex multi-hop traversals
- Alternative to deep SQL recursive CTEs

**Usage:**
```cypher
MATCH (f:FoodItem {name: "oatmeal"})-[e]-(related)
RETURN f.id, type(e) as edge_type, related.id as related_id
```

---

### Graph Sync
> Background process that populates Apache AGE property graph from canonical PostgreSQL tables.

**Components:**
- `syncAgeGraph()`: Main sync function
- `syncSourceDocuments()`: Sync source documents as vertices
- `syncFactClaims()`: Sync fact claims and source edges
- `syncFoodEntries()`: Sync user meal events
- `syncMealResponseFingerprints()`: Sync CGM-backed meal fingerprints

**Non-fatal behavior:**
- If AGE unavailable, logs "skipped" status
- Individual vertex/edge failures don't block entire sync
- Errors recorded in `t1d_graph_sync_log`

---

### Seed Graph Data
> Process of initializing the graph from existing relational data without new user input.

**Sources:**
- Food entries → Source documents, passages, fact claims
- Meal response fingerprints → CGM observation passages and claims

**Benefits:**
- Builds graph from historical data
- Improves query accuracy over time
- Creates baseline knowledge for new users

---

## Query Concepts

### Natural Language Query
> User's conversational question about food/recipes (e.g., "Why does pizza spike me?").

**Processing:**
1. Extract food name using NER or heuristics
2. Map to canonical FoodItem
3. Aggregate facts from multiple sources
4. Build explanatory answer
5. Detect and report conflicts
6. Compute uncertainty

---

### Multi-Hop Query
> Graph traversal that follows multiple relationships to find patterns.

**Examples:**
- User → MealEvent → FoodItem → NutrientFact
- Meal → Contains → Ingredient → HAS_NUTRIENT → Carbs
- Food → SIMILAR_TO → Alternative Food → HAS_NUTRIENT → Alternative Carbs

**Implemented via:**
- SQL recursive CTEs for native graph
- Apache AGE Cypher queries for graph DB
- Service layer aggregation for MemGraphRAG facts

---

### Fact Trace
> Explicit chain of evidence linking query answer back to source documents.

**Format:**
```json
{
  "query": "Why does pizza spike me?",
  "answer": "**Pizza** — typical serving: 30g carbs...",
  "facts": [
    {
      "id": "entry:abc-123",
      "subjectLabel": "Pizza slice",
      "predicate": "per_serving_nutrition",
      "valueText": "30g carbs, 12g protein",
      "confidenceTier": "medium",
      "sources": ["Entry log from 8:30am"]
    }
  ],
  "sources": [...],
  "conflicts": [...],
  "policyNote": "Educational only — not medical advice"
}
```

---

## Conflict Resolution Concepts

### Value Mismatch
> Two facts assert the same attribute with different numeric values (>30% difference).

**Example:**
- Claim A: Oatmeal = 27g carbs (user note)
- Claim B: Oatmeal = 33g carbs (CGM measurement)
- Difference: 22% (27 vs 33)

**Resolution:** Default "keep_both", user compares

---

### Granularity Mismatch
> Facts differ because they use different measurement units (per-100g vs per-serving).

**Example:**
- Claim A: 27g carbs per 100g (per-100g)
- Claim B: 30g carbs per serving (per-serving)
- Not a direct contradiction

**Resolution:** Normalize units, keep both

---

### Source Trust Mismatch
> Facts differ due to different source trust levels.

**Example:**
- Claim A: 20g carbs (official_database, USDA)
- Claim B: 30g carbs (user_note, user logged)
- User may be measuring different portion

**Resolution:** Prefer official, flag user measurement

---

### Temporal Mismatch
> Facts differ because guidance or values changed over time.

**Example:**
- Claim A: Valid from 2020-2025
- Claim B: Valid from 2025-2030
- Old guideline superseded by new

**Resolution:** Track valid_from/valid_to, surface as temporal conflict

---

## Ambiguities and Terminology Conflicts

### `food_name` vs `canonical_name`
> **Conflict:** Two fields used for food identification
- `food_name`: Human-readable name as user logs it (e.g., "oatmeal rolled grains")
- `canonical_name`: Normalized name for matching (e.g., "oatmeal")

**Resolution:** Use `canonical_name` for database lookups, `food_name` for display

---

### `recipe` vs `meal`
> **Conflict:** Terms for eating occasions

**Resolution:**
- `recipe`: Structured set of ingredients and instructions
- `meal`: Logged eating occasion with timestamp

---

### `eaten_at` vs `logged_at`
> **Conflict:** When did user consume meal vs when was it logged

**Resolution:**
- `eaten_at`: Timestamp of actual consumption
- `logged_at`: Timestamp of data entry (when user logged in app)

---

### `spike` vs `glucose_spike`
> **Conflict:** Informal vs formal term

**Resolution:**
- Use `glucose_spike` for database fields and technical queries
- Use `spike` in user-facing answers and natural language queries

---

## Consistency Guidelines

### When to Use Each Term

**Graph Terms:**
- Use `FoodItem` when referring to database entities
- Use `food item` when talking to users
- Use `vertex` when implementing AGE queries

**Measurement Terms:**
- Use `carbs` in user-facing text (familiar)
- Use `carbohydrates` in formal documentation
- Use `carbs_g` in database fields

**Time Terms:**
- Use `timestamp` for timestamps
- Use `ate_at` for meal consumption
- Use `logged_at` for data entry time

**Quality Terms:**
- Use `trust_tier` for database enum
- Use `confidence_tier` for data confidence
- Use `uncertainty` for answer quality metric

---

## Domain Rules

### Rule 1: Never Use Averaged Nutrition as Primary Fact
> Never average nutrition values across sources as the "truth." Instead, present all sources and let user decide.

**Example:**
```json
// Bad
{
  "answer": "Oatmeal has 30g carbs per serving"
}

// Good
{
  "facts": [
    {"value": "27g carbs", "source": "User log"},
    {"value": "33g carbs", "source": "CGM measurement"}
  ],
  "uncertainty": {"level": "high", "reasons": ["Discrepancy between sources"]}
}
```

### Rule 2: Always Show Provenance for Every Fact
> Every fact must link back to its source document or measurement.

**Example:**
```json
{
  "facts": [{
    "id": "claim:abc-123",
    "subjectLabel": "Oatmeal",
    "predicate": "has_carbs",
    "valueText": "30g carbs",
    "sources": [
      {
        "id": "doc:off-456",
        "title": "Open Food Facts record",
        "trustTier": "openfoodfacts"
      }
    ]
  }]
}
```

### Rule 3: Conflict Must Be Surface Above Answer
> When conflicts exist, highlight them before giving a final answer.

**Example:**
```
Answer: Based on your data, oatmeal has about 30g carbs per serving.

⚠️ Conflict detected: Sources report 27g vs 33g carbs.
   See conflict details below for resolution options.
```

### Rule 4: Confidence Tier Labels Must Be Consistent
> Use exact enum values in code and display names in UI.

**Enforcement:**
- Code: `confidence_tier: 'high' | 'medium' | 'low'`
- UI labels: "High confidence" | "Medium confidence" | "Low confidence"
- Never mix or use synonyms

---

## Evolution History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-06-14 | Initial glossary from food graph implementation |

---

## Related Documentation

- [Graph API Reference](./server/docs/graph-api-reference.md)
- [Graph Architecture](./server/docs/graph-architecture.md)
- [MemGraphRAG Paper](https://arxiv.org/pdf/2606.00610)