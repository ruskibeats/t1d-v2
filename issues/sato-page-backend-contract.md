# Sato Page Backend Contract

**Date**: 2026-06-14
**Target**: BOT2 frontend dashboard at `http://192.168.0.92:3005/`
**Purpose**: Surface T1D food graph foundation: AGE sync, food queries, recipe parsing, companion cards, provenance tracking
**Audience**: Backend service layer for frontend consumption
**Educational Only**: All responses are for educational purposes only, not dosing/treatment guidance.

---

## Overview

The Sato page surfaces the T1D food graph foundation with these backend capabilities:
1. **AGE graph sync status** — Verify Apache AGE extension and graph synchronization state
2. **Graph-backed food queries** — Query food graph with AGE traversal for nutritional relationships
3. **Recipe parsing** — Parse recipe data into MemGraphRAG seedable format
4. **Sato companion cards** — Generate Sparky's companion card JSON from parsed recipes
5. **Food Atlas integration** — Query existing food atlas data with provenance and uncertainty tracking

**Important Safety Note**: All food data, nutrition facts, and companion card content are for educational purposes only. They should **not** be used for dosing or treatment decisions. Users must consult with healthcare providers for medical advice.

---

## Authentication

**All endpoints require authentication** via JWT token in `Authorization: Bearer <token>` header.

**Auth Middleware**: `authenticate` middleware from `server/middleware/authMiddleware.ts`

**User Context**: All requests include the authenticated user's `userId` in `req.userId`

---

## Phase 1: AGE Graph Sync Status

### GET /api/t1d/food-graph/age-status

**Purpose**: Check AGE extension availability and synchronization state

**Auth Required**: Yes

**Request Body**: None

**Response (200 OK)**:
```json
{
  "ageAvailable": true,
  "graphExists": true,
  "vertexLabel": "_ag_label_vertex",
  "edgeLabel": "_ag_label_edge",
  "vertices": 462,
  "edges": 84,
  "lastSyncAt": "2026-06-14T12:34:56.789Z",
  "lastSyncStatus": "success",
  "metadata": {
    "pg_version": "18.0",
    "age_version": "1.7.0",
    "t1d_food_graph_table": "t1d_food_graph",
    "t1d_age_graph_metadata_table": "t1d_age_graph_metadata"
  }
}
```

**Response Fields**:
- `ageAvailable`: Boolean — True if Apache AGE extension is loaded
- `graphExists`: Boolean — True if `t1d_food_graph` table exists
- `vertexLabel`: String — AGE vertex label name (e.g., `"_ag_label_vertex"`)
- `edgeLabel`: String — AGE edge label name (e.g., `"_ag_label_edge"`)
- `vertices`: Number — Total vertices in graph
- `edges`: Number — Total edges in graph
- `lastSyncAt`: ISO8601 timestamp — Last successful synchronization time
- `lastSyncStatus`: String — Status of last sync (`"success"` | `"partial"` | `"failed"`)
- `metadata`: Object — Additional configuration details

**Error States**:

| Status | Code | Description |
|--------|------|-------------|
| 500 | AGE extension not loaded | Apache AGE not configured, need DB image with AGE support |
| 500 | Graph table missing | `t1d_food_graph` table doesn't exist, run migration |

**Loading/Empty States**:

- `ageAvailable: false` — Show "AGE extension not available" message, suggest contacting admin
- `vertices: 0` / `edges: 0` — Show "Graph is empty, sync pending" message
- `graphExists: false` — Show "Food graph not initialized" message

---

## Phase 2: Graph-Backed Food Query

### POST /api/t1d/food-graph/query

**Purpose**: Query food graph with AGE traversal for nutritional relationships

**Auth Required**: Yes

**Request Body**:
```json
{
  "foodName": "Chicken Caesar salad",
  "profileId": "3aec2f72-4232-49a6-923a-f0140f61debe",
  "partial": true
}
```

**Request Fields**:
- `foodName` (string, required): Food name to query
- `profileId` (string, required): T1D profile ID for user context
- `partial` (boolean, optional): If `true`, use partial search (faster, less accurate)

**Response (200 OK)**:
```json
{
  "answer": "Chicken Caesar salad is a salad featuring chicken, romaine lettuce, croutons, and parmesan cheese, typically served with Caesar dressing.",
  "facts": [
    {
      "claimType": "nutrition_per_food_item",
      "subjectType": "FoodItem",
      "subjectLabel": "Chicken Caesar salad",
      "predicate": "has_nutrition",
      "valueNumeric": 450,
      "valueText": "450 kcal, 28g protein, 42g carbs, 18g fat",
      "valueUnit": "kcal",
      "confidence": 0.5,
      "confidenceTier": "medium",
      "trustTier": "ingredient_estimation",
      "granularity": "per_portion",
      "metadata": {
        "sourceType": "Food Atlas",
        "nutritionSource": "ingredient_estimation",
        "uncertaintyScore": 0.4
      }
    },
    {
      "claimType": "food_relationship",
      "subjectType": "FoodItem",
      "subjectLabel": "Chicken Caesar salad",
      "predicate": "contains",
      "valueText": "chicken breast, romaine lettuce, croutons, parmesan cheese",
      "confidence": 0.9,
      "confidenceTier": "high",
      "trustTier": "ingredient_estimation",
      "granularity": "list",
      "metadata": {
        "sourceType": "Food Atlas"
      }
    }
  ],
  "sources": [
    {
      "sourceType": "Food Atlas",
      "docId": "food-abc123",
      "title": "Chicken Caesar Salad",
      "nutritionSource": "ingredient_estimation",
      "url": null
    }
  ],
  "conflicts": [],
  "uncertainty": 0.4,
  "meta": {
    "query": "Chicken Caesar salad",
    "profileId": "3aec2f72-4232-49a6-923a-f0140f61debe",
    "partial": true,
    "graphUsed": true,
    "ageAvailable": true,
    "effectiveCarbsEnabled": false
  }
}
```

**Response Fields**:

**answer** (string): Natural language answer to user's query

**facts[]** (array): List of nutritional and relationship claims
- `claimType` (string): Type of claim (`"nutrition_per_food_item"` | `"food_relationship"` | `"conflicting_claim"`)
- `subjectType` (string): Type of subject (`"FoodItem"` | `"FoodCollection"` | `"Ingredient"`)
- `subjectLabel` (string): Display name of subject
- `predicate` (string): Predicate describing the claim (`"has_nutrition"` | `"contains"` | `"compatible_with"`)
- `valueNumeric` (number, optional): Numerical value (e.g., calories, protein)
- `valueText` (string): Human-readable value text (e.g., `"450 kcal"`)
- `valueUnit` (string, optional): Unit for numerical value (`"kcal"` | `"g"` | `"mg"`)
- `confidence` (number, 0-1): Overall confidence score
- `confidenceTier` (string): Confidence level (`"high"` | `"medium"` | `"low"`)
- `trustTier` (string): Trust tier based on nutrition source (`"page_provided"` | `"ingredient_estimation"` | `"manual_override"`)
- `granularity` (string): Granularity of the claim (`"per_portion"` | `"per_100g"` | `"per_serving"` | `"list"`)
- `metadata` (object, optional): Additional metadata

**sources[]** (array): Source documents for the facts
- `sourceType` (string): Type of source (`"Food Atlas"` | `"Recipe Database"` | `"Manual Entry"`)
- `docId` (string, optional): Document ID for provenance
- `title` (string, optional): Source title
- `nutritionSource` (string): Nutrition source (`"page_provided"` | `"ingredient_estimation"` | `"unknown"`)
- `url` (string, optional): Source URL if available

**conflicts[]** (array): Conflicting claims (currently unused, reserved for future)

**uncertainty** (number, 0-1): Overall uncertainty score

**meta** (object): Query metadata
- `query` (string): Original query text
- `profileId` (string): User's T1D profile ID
- `partial` (boolean): Whether partial search was used
- `graphUsed` (boolean): Whether AGE traversal returned results
- `ageAvailable` (boolean): Whether AGE extension is available
- `effectiveCarbsEnabled` (boolean): Whether effective carbs tracking is enabled

**Error States**:

| Status | Code | Description |
|--------|------|-------------|
| 400 | Missing required fields | `foodName` or `profileId` missing |
| 404 | Food not found | No matching food found in Food Atlas |
| 500 | AGE extension error | AGE traversal failed |

**Loading States**:
- Slow queries (>2s): Show loading spinner with "Searching food graph..." message
- AGE unavailability: Show "Graph traversal not available" message, fall back to relational query

**Empty States**:
- No facts returned: Show "No nutrition data available for this food"
- No sources returned: Show "Data sources not available"

---

## Phase 3: Recipe Parser

### GET /api/t1d/recipe/parser/template

**Purpose**: Get template for recipe parser input

**Auth Required**: Yes

**Request Body**: None

**Response (200 OK)**:
```json
{
  "name": "Example Recipe",
  "description": "Example recipe with nutrition breakdown",
  "ingredients": [
    {
      "name": "Chicken Breast",
      "quantity": "6 oz",
      "unit": "oz",
      "nutrition": {
        "calories": 150,
        "protein": 28,
        "carbs": 0,
        "fat": 3
      }
    }
  ],
  "cookingMethod": "Grilled",
  "servings": 2,
  "prepTime": "20 minutes",
  "cookTime": "30 minutes",
  "totalTime": "50 minutes",
  "sourceUrl": "https://example.com/example-recipe",
  "sourceTitle": "Example Recipe",
  "originalNutritionSource": "page_provided"
}
```

**Response Fields**:
- `name` (string): Recipe name (required)
- `description` (string): Recipe description (optional)
- `ingredients[]`: List of ingredients with optional nutrition
  - `name` (string): Ingredient name (required)
  - `quantity` (string): Quantity (required, e.g., `"1 cup"`, `"2 tbsp"`)
  - `unit` (string, optional): Unit (e.g., `"cup"`, `"tbsp"`, `"oz"`, `"g"`)
  - `nutrition` (object, optional): Nutrition per ingredient
    - `calories` (number, optional)
    - `protein` (number, optional)
    - `carbs` (number, optional)
    - `fat` (number, optional)
    - `dietary_fiber` (number, optional)
    - `sugars` (number, optional)
- `cookingMethod` (string): Cooking method (optional)
- `servings` (number): Number of servings (optional)
- `prepTime` (string): Preparation time (optional)
- `cookTime` (string): Cooking time (optional)
- `totalTime` (string): Total time (optional)
- `sourceUrl` (string): Recipe source URL (optional)
- `sourceTitle` (string): Recipe source title (optional)
- `originalNutritionSource` (string): Nutrition source (`"page_provided"` | `"ingredient_estimation"` | `"unknown"`)

**Error States**:
- None (GET route is safe)

**Empty States**:
- None (template is static)

---

### POST /api/t1d/recipe/parser

**Purpose**: Parse recipe data into MemGraphRAG seedable format

**Auth Required**: Yes

**Request Body**:
```json
{
  "recipeId": "recipe-abc123",
  "name": "Test Recipe",
  "description": "Nutrition-aware recipe",
  "ingredients": [
    {
      "name": "Chicken Breast",
      "quantity": "6 oz",
      "unit": "oz",
      "nutrition": {
        "calories": 150,
        "protein": 28,
        "carbs": 0,
        "fat": 3
      }
    },
    {
      "name": "Romaine Lettuce",
      "quantity": "2 cups",
      "unit": "cup",
      "nutrition": {
        "calories": 8,
        "protein": 0.8,
        "carbs": 1.9,
        "fat": 0.1
      }
    }
  ],
  "cookingMethod": "Grilled",
  "servings": 2,
  "prepTime": "15 minutes",
  "cookTime": "30 minutes",
  "sourceUrl": "https://example.com/recipe",
  "sourceTitle": "Example Recipe",
  "originalNutritionSource": "page_provided",
  "notes": [
    "Season with herbs",
    "Marinate for 30 minutes before cooking"
  ],
  "tags": ["high-protein", "balanced-carbs"]
}
```

**Response (200 OK)**:
```json
{
  "parsed": {
    "recipeId": "recipe-abc123",
    "recipeName": "Test Recipe",
    "documentId": "recipe-abc123",
    "sourceType": "recipe_page",
    "nutritionSource": "page_provided",
    "ingredientsParsed": [
      {
        "name": "Chicken Breast",
        "quantity": "6 oz",
        "unit": "oz",
        "calories": 150,
        "protein": 28,
        "carbs": 0,
        "fat": 3,
        "dietary_fiber": 0,
        "sugars": 0,
        "nutritionSource": "page_provided"
      }
    ],
    "factClaims": [
      {
        "claimType": "nutrition_per_ingredient",
        "subjectType": "FoodItem",
        "subjectLabel": "Chicken Breast",
        "predicate": "has_nutrition",
        "valueNumeric": 150,
        "valueText": "150 kcal, 28g protein, 0g carbs, 3g fat",
        "valueUnit": "kcal",
        "confidence": 0.5,
        "confidenceTier": "high",
        "trustTier": "page_provided",
        "granularity": "per_oz"
      }
    ],
    "sources": ["Food Atlas", "Manual Entry"]
  },
  "seedPayload": {
    "source_documents": [
      {
        "doc_id": "recipe-abc123",
        "doc_type": "recipe_page",
        "title": "Test Recipe",
        "description": "Nutrition-aware recipe",
        "trust_tier": "page_provided",
        "metadata_json": {
          "nutrition_source": "page_provided",
          "ingredients_count": 2,
          "cooking_method": "Grilled",
          "servings": 2
        }
      }
    ],
    "source_passages": [
      {
        "passage_id": "recipe-abc123-passage-0",
        "content_text": "Test Recipe - Nutrition-aware recipe",
        "content_type": "recipe",
        "source_document_id": "recipe-abc123",
        "trust_tier": "page_provided"
      }
    ],
    "fact_claims": [
      {
        "claim_id": "claim-abc123-0",
        "claim_type": "nutrition_per_ingredient",
        "subject_label": "Chicken Breast",
        "predicate": "has_nutrition",
        "value_numeric": 150,
        "value_text": "150 kcal, 28g protein, 0g carbs, 3g fat",
        "value_unit": "kcal",
        "confidence": 0.5,
        "confidence_tier": "high",
        "trust_tier": "page_provided",
        "granularity": "per_oz",
        "source_object_id": "recipe-abc123"
      }
    ],
    "claim_sources": [
      {
        "claim_source_id": "claim-source-abc123-0",
        "fact_claim_id": "claim-abc123-0",
        "source_type": "recipe_page",
        "source_ref_id": "chicken-breast",
        "trust_tier": "page_provided",
        "nutrition_source": "page_provided",
        "metadata_json": null
      }
    ]
  }
}
```

**Response Fields**:

**parsed** (object): Parsed recipe data
- `recipeId` (string): Recipe ID
- `recipeName` (string): Recipe name
- `documentId` (string): Document ID for seed payload
- `sourceType` (string): Source type (`"recipe_page"` | `"recipe_database"` | `"manual_entry"`)
- `nutritionSource` (string): Nutrition source
- `ingredientsParsed[]`: List of parsed ingredients
- `factClaims[]`: List of nutritional fact claims
- `sources[]`: List of source types

**seedPayload** (object): MemGraphRAG seedable format
- `source_documents[]`: Source document records
- `source_passages[]`: Content passages
- `fact_claims[]`: Fact claim records
- `claim_sources[]`: Claim-to-source mappings

**Error States**:

| Status | Code | Description |
|--------|------|-------------|
| 400 | Missing required fields | `name` or `ingredients` missing |
| 400 | Invalid recipe | Recipe name empty or no ingredients |
| 500 | Database error | Pool manager error |

**Loading States**:
- Parsing recipe: Show "Parsing recipe..." with estimated time
- Seed payload generation: Show "Preparing graph data..." spinner

**Empty States**:
- No ingredients: Show "No ingredients parsed, provide at least one ingredient"
- No fact claims: Show "No nutrition data available for ingredients"

---

## Phase 4: Sato Companion Cards

### GET /api/t1d/sato/companion/template

**Purpose**: Get template companion card structure

**Auth Required**: Yes

**Request Body**: None

**Response (200 OK)**:
```json
{
  "id": "template-recipe-card",
  "name": "Example Recipe",
  "type": "recipe_with_nutrition",
  "icon": "🥗",
  "description": "Example recipe with nutrition breakdown",
  "sections": [
    {
      "id": "nutrition",
      "type": "nutrition",
      "title": "Nutrition Facts",
      "content": "3 nutrition items",
      "items": [
        {
          "label": "Per serving",
          "values": "400 kcal, 25g protein, 35g carbs, 18g fat, 5g fiber, 8g sugars, 4g effective carbs, 5g sugar alcohols",
          "uncertainty": 0.1
        },
        {
          "label": "Chicken Breast",
          "values": "150 kcal, 28g protein, 0g carbs, 3g fat, 0g fiber, 0g sugars, 0g effective carbs, 0g sugar alcohols",
          "uncertainty": 0.4
        }
      ]
    },
    {
      "id": "ingredients",
      "type": "ingredients",
      "title": "Ingredients",
      "content": "2 ingredients",
      "items": [
        {
          "name": "Chicken Breast",
          "quantity": "6 oz",
          "unit": "oz",
          "calories": 150,
          "protein": 28,
          "carbs": 0,
          "fat": 3,
          "dietary_fiber": 0,
          "sugars": 0,
          "nutritionSource": "ingredient_estimation"
        }
      ]
    },
    {
      "id": "timing",
      "type": "timing",
      "title": "Cooking Time",
      "content": "2 timing items",
      "items": [
        { "label": "Prep time", "value": "20 minutes" },
        { "label": "Cook time", "value": "30 minutes" }
      ]
    },
    {
      "id": "notes",
      "type": "notes",
      "title": "Notes",
      "content": "2 notes",
      "items": [
        {
          "id": "note-0",
          "type": "note",
          "content": "Season at the end to prevent over-salting",
          "severity": "info"
        },
        {
          "id": "note-1",
          "type": "note",
          "content": "Add vegetables to increase fiber and reduce net carbs per serving",
          "severity": "suggested"
        }
      ]
    },
    {
      "id": "variations",
      "type": "tips",
      "title": "Preparation Tips",
      "content": "2 tips",
      "items": [
        {
          "id": "variation-0",
          "type": "tip",
          "content": "You can reduce oven temperature by 25°F and cook for longer for even results",
          "severity": "suggested"
        }
      ]
    }
  ],
  "tags": ["high-protein", "moderate-fat", "balanced-carbs", "serves-2"],
  "permissions": {
    "hasWriteAccess": true,
    "canCreate": true,
    "canEdit": true,
    "canDelete": true
  },
  "sources": [
    {
      "id": "source-abc123",
      "type": "recipe_page",
      "url": "https://example.com/recipe",
      "title": "Example Recipe",
      "trustTier": "ingredient_estimation",
      "weight": 1.0
    }
  ],
  "createdAt": "2026-06-14T12:34:56.789Z",
  "updatedAt": "2026-06-14T12:34:56.789Z",
  "metadata": {
    "doc_type": "recipe_page",
    "nutrition_source": "ingredient_estimation",
    "uncertainty_score": 0.4,
    "provenance": "aggregated from 2 ingredients",
    "sparky_user_id": "user-123"
  }
}
```

**Error States**:
- None (GET route is safe)

**Empty States**:
- No sections: Show "No data available" message
- No tags: Show "No tags generated"

---

### POST /api/t1d/sato/companion/recipe

**Purpose**: Generate Sato companion card from recipe data

**Auth Required**: Yes

**Request Body**:
```json
{
  "recipeId": "recipe-abc123",
  "name": "Test Recipe",
  "description": "Nutrition-aware recipe",
  "nutritionSummary": {
    "calories": 400,
    "protein": 25,
    "carbs": 35,
    "fat": 18,
    "dietary_fiber": 5,
    "sugars": 8,
    "sugarAlcohols": 5
  },
  "ingredients": [
    {
      "name": "Chicken Breast",
      "quantity": "6 oz",
      "unit": "oz",
      "nutrition": {
        "calories": 150,
        "protein": 28,
        "carbs": 0,
        "fat": 3,
        "dietary_fiber": 0,
        "sugars": 0,
        "sugarAlcohols": 0
      }
    },
    {
      "name": "Romaine Lettuce",
      "quantity": "2 cups",
      "unit": "cup",
      "nutrition": {
        "calories": 8,
        "protein": 0.8,
        "carbs": 1.9,
        "fat": 0.1,
        "dietary_fiber": 0.8,
        "sugars": 0.2,
        "sugarAlcohols": 0
      }
    }
  ],
  "cookingMethod": "Grilled",
  "servings": 2,
  "prepTime": "15 minutes",
  "cookTime": "30 minutes",
  "totalTime": "45 minutes",
  "sourceUrl": "https://example.com/recipe",
  "sourceTitle": "Example Recipe",
  "nutritionSource": "page_provided",
  "notes": [
    "Season at the end to prevent over-salting",
    "Add vegetables to increase fiber and reduce net carbs"
  ],
  "tags": ["high-protein", "balanced-carbs"]
}
```

**Response (200 OK)**:
```json
{
  "message": "Sato companion card generated successfully",
  "companion": {
    "id": "recipe-card-abc123",
    "name": "Test Recipe",
    "type": "recipe_with_nutrition",
    "icon": "🥗",
    "description": "Nutrition-aware recipe",
    "sections": [
      {
        "id": "nutrition",
        "type": "nutrition",
        "title": "Nutrition Facts",
        "content": "3 nutrition items",
        "items": [
          {
            "label": "Per serving",
            "values": "400 kcal, 25g protein, 35g carbs, 18g fat, 5g fiber, 8g sugars, 4g effective carbs, 5g sugar alcohols",
            "uncertainty": 0.1
          },
          {
            "label": "Chicken Breast",
            "values": "150 kcal, 28g protein, 0g carbs, 3g fat, 0g fiber, 0g sugars, 0g effective carbs, 0g sugar alcohols",
            "uncertainty": 0.4
          }
        ]
      }
    ],
    "tags": ["high-protein", "moderate-fat", "balanced-carbs", "serves-2"],
    "permissions": {
      "hasWriteAccess": true,
      "canCreate": true,
      "canEdit": true,
      "canDelete": true
    },
    "sources": [
      {
        "id": "source-abc123",
        "type": "recipe_page",
        "url": "https://example.com/recipe",
        "title": "Example Recipe",
        "trustTier": "page_provided",
        "weight": 1.0
      }
    ],
    "createdAt": "2026-06-14T12:34:56.789Z",
    "updatedAt": "2026-06-14T12:34:56.789Z",
    "metadata": {
      "doc_type": "recipe_page",
      "nutrition_source": "page_provided",
      "uncertainty_score": 0.4,
      "provenance": "aggregated from 2 ingredients",
      "sparky_user_id": "user-123"
    }
  }
}
```

**Response Fields**:

**companion** (object): Sato companion card object (same structure as template)
- `id` (string): Card ID
- `name` (string): Recipe name
- `type` (string): Card type (`"recipe"` | `"recipe_with_nutrition"`)
- `icon` (string): Emoji icon
- `description` (string): Card description
- `sections[]`: Card sections (nutrition, ingredients, timing, notes, tips)
- `tags[]`: Auto-generated tags
- `permissions`: Permission object
- `sources[]`: Source documentation
- `metadata`: Graph metadata for ingestion

**Error States**:

| Status | Code | Description |
|--------|------|-------------|
| 400 | Missing required fields | `name` or `ingredients` missing |
| 400 | Invalid input | Recipe name empty or no ingredients |
| 500 | Database error | Pool manager error |

**Loading States**:
- Generating card: Show "Generating companion card..." spinner
- Building sections: Show "Building nutrition breakdown..." message

**Empty States**:
- No sections generated: Show "No companion card data available"

---

## Field Mapping to Sato Page Sections

| Sato Page Section | Backend Endpoints | Fields |
|-------------------|-------------------|--------|
| **Hero / Status** | GET /age-status | `ageAvailable`, `graphExists`, `vertices`, `edges`, `lastSyncAt`, `lastSyncStatus` |
| **Query Input** | POST /query | `foodName` from request |
| **Query Results** | POST /query | `answer`, `facts[]`, `sources[]`, `conflicts[]`, `uncertainty`, `meta.graphUsed` |
| **Recipe Input Form** | GET /recipe/template | Full template structure |
| **Recipe Parsing** | POST /recipe/parser | `parsed`, `seedPayload` |
| **Companion Card Display** | POST /companion/recipe | `companion.sections[]` |
| **Companion Card Actions** | — | Map `companion.actions[]` to UI buttons |
| **Provenance Display** | All endpoints | `fact.trustTier`, `source.nutritionSource`, `meta.uncertainty` |
| **Uncertainty Display** | All endpoints | `fact.confidence`, `fact.confidenceTier`, `fact.uncertainty` |
| **Meal History** | — | No backend endpoint (use t1d_food_entries) |

---

## Recommended Default Query

**Default Query for Russell (user-3aec2f72-4232-49a6-923a-f0140f61debe):**

```typescript
const defaultQuery = {
  foodName: 'Chicken Caesar salad',
  profileId: '3aec2f72-4232-49a6-923a-f0140f61debe',
  partial: true
};
```

**Why Chicken Caesar salad?**
- Requires multiple ingredients (chicken, lettuce, croutons, parmesan)
- Shows food relationships and nutritional composition
- Has variation in nutrition sources (page_provided vs ingredient_estimation)
- Good demonstration of AGE traversal capability
- Recognizable food item for testing

---

## Recommended Demo Recipe

**Demo Recipe: Lasagna from Gimme Some Oven**

**URL**: https://www.gimmesomeoven.com/best-lasagna/

**Recipe Data for Testing**:
```json
{
  "name": "Best Ever Lasagna",
  "description": "Classic Italian lasagna with meat sauce, béchamel, and cheese layers",
  "ingredients": [
    {
      "name": "Ground Beef",
      "quantity": "1 lb",
      "nutrition": {
        "calories": 650,
        "protein": 51,
        "carbs": 0,
        "fat": 45,
        "dietary_fiber": 0,
        "sugars": 0
      }
    },
    {
      "name": "Ricotta Cheese",
      "quantity": "15 oz",
      "nutrition": {
        "calories": 400,
        "protein": 28,
        "carbs": 6,
        "fat": 33,
        "dietary_fiber": 0,
        "sugars": 3
      }
    }
  ],
  "cookingMethod": "Oven-baked",
  "servings": 8,
  "prepTime": "45 minutes",
  "cookTime": "75 minutes",
  "totalTime": "120 minutes",
  "sourceUrl": "https://www.gimmesomeoven.com/best-lasagna/",
  "sourceTitle": "Best Ever Lasagna - Gimme Some Oven",
  "nutritionSource": "page_provided"
}
```

**Why Lasagna?**
- Multiple ingredients demonstrate relationship traversal
- High protein and fat profile (good for meal planning)
- Cooking time information (prep + cook for timing section)
- Source URL with provenance tracking
- Serves 8 (demonstrates portion sizing)

---

## Safety and Educational Boundaries

**Important: All Responses Are Educational Only**

### What IS Allowed (Educational):
- ✅ Display nutritional information (calories, protein, carbs, fat, etc.)
- ✅ Show food relationships and ingredient lists
- ✅ Explain confidence tiers and uncertainty scores
- ✅ Display provenance (source type, nutrition source)
- ✅ Suggest cooking variations (within factual bounds)
- ✅ Explain concepts like effective carbs (schema proposal only)
- ✅ Help users make informed food choices
- ✅ Support meal planning and nutrition tracking

### What Is NOT Allowed (Non-educational):
- ❌ Suggest insulin doses or medication timing
- ❌ Provide medical advice or treatment recommendations
- ❌ Interpret CGM data as medical diagnosis
- ❌ Promise specific glucose responses
- ❌ Compare products as "better/worse" for health
- ❌ Provide dosing guidelines for supplements or medications
- ❌ Make health claims about foods (e.g., "superfood", "super" anything)

**Enforcement**: Backend validates that all educational notes fall within factual boundaries. No medical advice endpoints or functions.

**User Warning**: Display a footer or banner:
> "Food data and nutrition information are for educational purposes only. This content is not medical advice. Always consult with your healthcare provider for medical decisions, including insulin dosing and treatment plans."

---

## Error States Reference

### Generic Error Response

```json
{
  "error": "Error description or message",
  "code": "ERROR_CODE",
  "details": {
    "field": "error details"
  }
}
```

| Code | Status | Meaning |
|------|--------|---------|
| `MISSING_REQUIRED_FIELD` | 400 | Required request field missing |
| `INVALID_INPUT` | 400 | Request body has invalid format or values |
| `FOOD_NOT_FOUND` | 404 | No matching food found |
| `UNAUTHORIZED` | 401 | Authentication required or token invalid |
| `FORBIDDEN` | 403 | User lacks permissions |
| `AGE_EXTENSION_ERROR` | 500 | Apache AGE extension not available |
| `DATABASE_ERROR` | 500 | Database operation failed |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

---

## Loading and Empty States

### Loading States (Spinner/Progress)

| Endpoint | Loader Message | Estimated Time |
|----------|----------------|----------------|
| GET /age-status | "Checking graph status..." | < 500ms |
| POST /query | "Searching food graph..." | 1-3s (partial search) |
| POST /recipe/parser | "Parsing recipe..." | 500ms-1s |
| POST /companion/recipe | "Generating companion card..." | 500ms-1s |
| POST /sato/page-data | "Gathering food graph data..." | 2-4s |

### Empty States (No Data)

| Endpoint | Message | Fallback |
|----------|---------|----------|
| GET /age-status | "AGE graph not available" | Show setup instructions |
| POST /query | "No nutrition data available for this food" | Suggest manual entry |
| POST /recipe/parser | "No ingredients parsed" | Show template with ingredients |
| POST /companion/recipe | "No companion card data" | Show template only |
| GET /sato/page-data | "No food data available" | Show welcome message |

### Partial States (Partial Success)

| Endpoint | Message | Action |
|----------|---------|--------|
| POST /query | "Found partial results" | Show partial facts, mark as partial |
| POST /recipe/parser | "Parsed with estimation" | Show warning about nutrition uncertainty |

---

## Example Full Workflow

### Scenario: User Searches for "Chicken Caesar Salad"

1. **User clicks search** → Frontend calls `POST /api/t1d/food-graph/query` with `{ foodName: "Chicken Caesar salad", profileId: "3aec2f72-4232-49a6-923a-f0140f61debe" }`

2. **Backend responds** → Show loading spinner "Searching food graph..."

3. **Backend returns**:
   ```json
   {
     "answer": "Chicken Caesar salad is a salad featuring chicken, romaine lettuce...",
     "facts": [
       {
         "subjectLabel": "Chicken Caesar salad",
         "predicate": "has_nutrition",
         "valueText": "450 kcal, 28g protein, 42g carbs, 18g fat",
         "confidenceTier": "medium",
         "trustTier": "ingredient_estimation",
         "metadata": { "nutritionSource": "ingredient_estimation", "uncertaintyScore": 0.4 }
       }
     ],
     "sources": [
       {
         "sourceType": "Food Atlas",
         "title": "Chicken Caesar Salad",
         "nutritionSource": "ingredient_estimation"
       }
     ],
     "graphUsed": true,
     "ageAvailable": true
   }
   ```

4. **Frontend displays**:
   - Natural language answer
   - Nutrition facts (calories, protein, carbs, fat)
   - Confidence badge (medium uncertainty)
   - Source information (Food Atlas)
   - Graph usage indicator (AGE traversal used)

---

## Phase B Consideration: Aggregate `/api/t1d/sato/page-data` Endpoint

### Recommendation

**YES** — Recommend adding aggregate endpoint for better frontend integration.

### Rationale

**Pros:**
- Single API call to get all page data (reduces round-trips)
- Faster initial load for Sato page
- Consistent data structure across endpoints
- Easier frontend development
- Can include preview state (pending queries)

**Cons:**
- More complex backend (composition logic)
- Longer initial response time (worst case 4s)
- Requires caching for performance
- May overwhelm client with too much data

### Proposed Response Shape

```json
{
  "page": {
    "title": "Sato Food Memory",
    "subtitle": "Your food memory is ready.",
    "tone": "calm",
    "mood": "curious"
  },
  "hero": {
    "message": "Your food memory is ready.",
    "mood": "curious",
    "availableFeatures": {
      "graphSync": true,
      "query": true,
      "recipeParser": true,
      "companionCards": true
    }
  },
  "graphSummary": {
    "ageAvailable": true,
    "graphExists": true,
    "vertices": 462,
    "edges": 84,
    "lastSyncAt": "2026-06-14T12:34:56.789Z",
    "lastSyncStatus": "success"
  },
  "foodGraph": {
    "query": "Chicken Caesar salad",
    "answer": "Chicken Caesar salad is a salad featuring chicken...",
    "facts": [
      {
        "subjectLabel": "Chicken Caesar salad",
        "predicate": "has_nutrition",
        "valueText": "450 kcal, 28g protein, 42g carbs, 18g fat",
        "confidenceTier": "medium",
        "trustTier": "ingredient_estimation"
      }
    ],
    "sources": [
      {
        "sourceType": "Food Atlas",
        "title": "Chicken Caesar Salad",
        "nutritionSource": "ingredient_estimation"
      }
    ],
    "conflicts": [],
    "uncertainty": 0.4,
    "meta": {
      "graphUsed": true,
      "ageAvailable": true,
      "effectiveCarbsEnabled": false
    }
  },
  "recipeParser": {
    "template": {
      "name": "Example Recipe",
      "ingredients": [ { "name": "Chicken Breast", "quantity": "6 oz" } ]
    },
    "lastParsedRecipe": null,
    "availableFeatures": {
      "template": true,
      "parse": true
    }
  },
  "companionCards": [],
  "audit": {
    "defaultQuery": {
      "foodName": "Chicken Caesar salad",
      "profileId": "3aec2f72-4232-49a6-923a-f0140f61debe"
    },
    "recommendedDemo": {
      "url": "https://www.gimmesomeoven.com/best-lasagna/",
      "title": "Best Ever Lasagna - Gimme Some Oven",
      "name": "Best Ever Lasagna",
      "ingredientsCount": 5
    },
    "safetyNote": "Food data and nutrition information are for educational purposes only. This content is not medical advice. Always consult with your healthcare provider for medical decisions, including insulin dosing and treatment plans."
  },
  "actions": [
    {
      "label": "Sync AGE graph",
      "method": "POST",
      "path": "/api/t1d/food-graph/sync-age",
      "description": "Populate AGE graph from relational tables"
    },
    {
      "label": "Parse recipe",
      "method": "POST",
      "path": "/api/t1d/recipe/parser",
      "description": "Parse recipe into MemGraphRAG format"
    },
    {
      "label": "Generate companion card",
      "method": "POST",
      "path": "/api/t1d/sato/companion/recipe",
      "description": "Generate Sato companion card from recipe"
    }
  ]
}
```

### Implementation Approach

1. **Async composition**: Call all endpoints in parallel, return aggregated results
2. **Caching**: Cache top-level aggregate for 5 minutes (reduce load on backend)
3. **Pagination**: Limit facts array to top 10 (avoid overwhelming client)
4. **Conditional loading**: Only include populated sections (e.g., if no graph, skip graphSummary)

### Estimated Implementation Time

**Phase B: Aggregate endpoint** — 3-4 hours
- Create `t1dSatoPageDataService.ts`
- Create routes `GET /api/t1d/sato/page-data`
- Add caching logic
- Add unit tests
- Live verification with Russell user

**Total new implementation**: 3-4 hours

---

## Testing Requirements

### Unit Tests
- All endpoints require unit tests (vitest)
- Test request validation
- Test error states
- Test response formats

### Integration Tests
- Test endpoint composition for `/api/t1d/sato/page-data`
- Test authentication middleware
- Test database integration

### Live Verification
1. Use Russell user (`3aec2f72-4232-49a6-923a-f0140f61debe`)
2. Query "Chicken Caesar salad"
3. Parse demo recipe (Lasagna from Gimme Some Oven)
4. Generate companion card for demo recipe
5. Verify AGE graph status shows data
6. Check all responses include provenance and uncertainty fields

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-06-14 | Initial contract, Phase 1-4 endpoints |

---

## Questions for BOT2

1. Does the aggregate `/api/t1d/sato/page-data` endpoint fit your frontend architecture, or do you prefer individual endpoints?
2. Should we add effective carbs fields to all responses (even though schema proposal is pending)?
3. Do you need additional fields in companion card sections (e.g., dietary restrictions, allergen tags)?
4. Should we add a "history" endpoint to retrieve user's meal logs? (Not in scope but may be useful)

---

**Contract Version**: 1.0.0
**Status**: Ready for BOT2 implementation
**Approval**: Pending commander approval

---
---

## Phase B: Aggregate /api/t1d/sato/page-data

### GET /api/t1d/sato/page-data

**Purpose**: Single endpoint that composes entire Sato page data from existing backend services

**Auth Required**: Yes

**Request Body**: None

**Response (200 OK)**:
```json
{
  "message": "Sato page data retrieved successfully",
  "page": {
    "title": "Sato Food Memory",
    "subtitle": "Your food memory is ready.",
    "tone": "calm"
  },
  "hero": {
    "message": "Your food memory is ready.",
    "mood": "curious",
    "calmNarrative": "Welcome to Sato. Explore nutritional insights, manage recipes, and build your personalized food knowledge graph..."
  },
  "graphSummary": {
    "ageAvailable": true,
    "graphExists": true,
    "vertices": 462,
    "edges": 84,
    "lastSyncAt": "2026-06-14T12:34:56.789Z",
    "lastSyncStatus": "success"
  },
  "foodGraph": {
    "query": "Chicken Caesar salad",
    "answer": "Chicken Caesar salad is a salad featuring chicken, romaine lettuce...",
    "facts": [
      {
        "subjectLabel": "Chicken Caesar salad",
        "predicate": "has_nutrition",
        "valueText": "450 kcal, 28g protein, 42g carbs, 18g fat",
        "confidenceTier": "medium",
        "trustTier": "ingredient_estimation"
      }
    ],
    "sources": [
      {
        "sourceType": "Food Atlas",
        "title": "Chicken Caesar Salad",
        "nutritionSource": "ingredient_estimation"
      }
    ],
    "conflicts": [],
    "uncertainty": 0.4,
    "meta": {
      "query": "Chicken Caesar salad",
      "profileId": "3aec2f72-4232-49a6-923a-f0140f61debe",
      "partial": true,
      "graphUsed": true,
      "ageAvailable": true,
      "effectiveCarbsEnabled": false
    }
  },
  "companionCards": {
    "template": {
      "id": "template-recipe-card",
      "name": "Example Recipe",
      "type": "recipe_with_nutrition",
      "icon": "🥗",
      "description": "Example recipe with nutrition breakdown",
      "sections": [...],
      "tags": ["high-protein", "balanced-carbs"],
      "permissions": { "hasWriteAccess": true, "canCreate": true, "canEdit": true, "canDelete": true },
      "sources": [...],
      "createdAt": "2026-06-14T...",
      "updatedAt": "2026-06-14T...",
      "metadata": { "doc_type": "recipe_page", "nutrition_source": "ingredient_estimation", "uncertainty_score": 0.4, "provenance": "aggregated from ingredients", "sparky_user_id": "user-123" }
    },
    "demoCard": {
      "id": "recipe-card-abc123",
      "name": "Chicken Caesar Salad",
      "type": "recipe_with_nutrition",
      "icon": "🥗",
      "description": "Classic salad with grilled chicken, romaine lettuce...",
      "sections": [
        {
          "id": "nutrition",
          "type": "nutrition",
          "title": "Nutrition Facts",
          "items": [
            {
              "label": "Per serving",
              "values": "450 kcal, 28g protein, 42g carbs, 18g fat",
              "uncertainty": 0.1
            },
            {
              "label": "Chicken Breast",
              "values": "150 kcal, 28g protein, 0g carbs, 3g fat",
              "uncertainty": 0.4
            }
          ]
        },
        {
          "id": "ingredients",
          "type": "ingredients",
          "title": "Ingredients",
          "items": [
            {
              "name": "Chicken Breast",
              "quantity": "6 oz",
              "unit": "oz",
              "calories": 150,
              "protein": 28,
              "carbs": 0,
              "fat": 3,
              "dietary_fiber": 0,
              "sugars": 0,
              "nutritionSource": "page_provided"
            }
          ]
        }
      ],
      "tags": ["high-protein", "balanced-carbs", "serves-2"],
      "permissions": { "hasWriteAccess": true, "canCreate": true, "canEdit": true, "canDelete": true },
      "sources": [
        {
          "id": "source-abc123",
          "type": "recipe_page",
          "url": "https://example.com/chicken-caesar-salad",
          "title": "Chicken Caesar Salad",
          "trustTier": "page_provided",
          "weight": 1.0
        }
      ],
      "createdAt": "2026-06-14T...",
      "updatedAt": "2026-06-14T...",
      "metadata": { "doc_type": "recipe_page", "nutrition_source": "page_provided", "uncertainty_score": 0.4, "provenance": "aggregated from 2 ingredients", "sparky_user_id": "user-123" }
    }
  },
  "recipeParser": {
    "template": {
      "name": "Example Recipe",
      "description": "Example recipe with nutrition breakdown",
      "ingredients": [
        {
          "name": "Chicken Breast",
          "quantity": "6 oz",
          "unit": "oz",
          "nutrition": { "calories": 150, "protein": 28, "carbs": 0, "fat": 3 }
        }
      ],
      "cookingMethod": "Grilled",
      "servings": 2,
      "prepTime": "20 minutes",
      "cookTime": "30 minutes",
      "sourceUrl": "https://example.com/example-recipe",
      "sourceTitle": "Example Recipe",
      "originalNutritionSource": "page_provided"
    },
    "recommendedDemo": {
      "title": "Best Ever Lasagna",
      "sourceUrl": "https://www.gimmesomeoven.com/best-lasagna/",
      "ingredientCount": 5,
      "prepTime": "45 minutes",
      "cookTime": "75 minutes",
      "nutritionSource": "page_provided",
      "safetyNote": "Food data and nutrition information are for educational purposes only. This content is not medical advice. Always consult with your healthcare provider for medical decisions, including insulin dosing and treatment plans."
    }
  },
  "audit": {
    "provenance": "aggregated from food graph, companion cards, and recipe parser",
    "uncertaintyScore": 0.4,
    "safetyNote": "Food data and nutrition information are for educational purposes only. This content is not medical advice...",
    "educationalOnly": true
  },
  "actions": [
    {
      "label": "Sync AGE graph",
      "method": "POST",
      "path": "/api/t1d/food-graph/sync-age",
      "description": "Populate AGE graph from relational tables"
    },
    {
      "label": "Query food graph",
      "method": "POST",
      "path": "/api/t1d/food-graph/query",
      "description": "Search food graph for nutritional information",
      "exampleBody": { "foodName": "Chicken Caesar salad", "profileId": "3aec2f72-...", "partial": true }
    },
    {
      "label": "Parse recipe",
      "method": "POST",
      "path": "/api/t1d/recipe/parser",
      "description": "Parse recipe into MemGraphRAG format",
      "exampleBody": {
        "name": "Example Recipe",
        "ingredients": [ { "name": "Chicken Breast", "quantity": "6 oz", "unit": "oz" } ]
      }
    },
    {
      "label": "Generate companion card",
      "method": "POST",
      "path": "/api/t1d/sato/companion/recipe",
      "description": "Generate Sato companion card from recipe",
      "exampleBody": {
        "name": "Example Recipe",
        "ingredients": [ { "name": "Chicken Breast", "quantity": "6 oz", "unit": "oz" } ]
      }
    }
  ]
}
```

**Response Fields**:

**page** (object): Page metadata
- `title`: Page title
- `subtitle`: Page subtitle
- `tone`: Emotional tone

**hero** (object): Hero section metadata
- `message`: Main message for the hero
- `mood`: Emotional mood (curious, calm, etc.)
- `calmNarrative`: Optional narrative text

**graphSummary** (object): AGE graph status
- `ageAvailable`: Boolean (true if AGE extension loaded)
- `graphExists`: Boolean (true if graph table exists)
- `vertices`: Total vertices in graph
- `edges`: Total edges in graph
- `lastSyncAt`: ISO8601 timestamp or null
- `lastSyncStatus`: "success" | "partial" | "failed" | null
- `errors`: Array of error messages (if any)

**foodGraph** (object): Food graph query result
- `query`: Original query text
- `answer`: Natural language answer
- `facts[]`: Nutrition/relationship claims
- `sources[]`: Source provenance
- `conflicts[]`: Conflicting claims (empty for now)
- `uncertainty`: Overall uncertainty score (0-1)
- `meta`: Query metadata
  - `query`: Original query
  - `profileId`: User ID
  - `partial`: Partial search flag
  - `graphUsed`: Whether AGE traversal succeeded
  - `ageAvailable`: Whether AGE extension available
  - `effectiveCarbsEnabled`: Phase 5a pending (false)

**companionCards** (object): Companion cards
- `template`: Template companion card
- `demoCard`: Generated demo card (optional)
- `errors`: Array of error messages (if any)

**recipeParser** (object): Recipe parser template and demo
- `template`: Recipe parser template structure
- `recommendedDemo`: Recommended demo recipe
  - `title`: Demo recipe title
  - `sourceUrl`: Demo recipe URL
  - `ingredientCount`: Number of ingredients
  - `prepTime`: Preparation time
  - `cookTime`: Cooking time
  - `nutritionSource`: Nutrition source
  - `safetyNote`: Safety note

**audit** (object): Audit metadata
- `provenance`: Source of page data
- `uncertaintyScore`: Overall uncertainty
- `safetyNote`: Educational safety warning
- `educationalOnly`: Boolean (true)

**actions** (array): Action buttons with metadata
- `label`: Button label
- `method`: HTTP method (GET/POST)
- `path`: Endpoint path
- `description`: Optional description
- `exampleBody`: Optional request body for POST methods

**Error States**:

| Status | Code | Description |
|--------|------|-------------|
| 400 | Missing auth | Authentication required |
| 500 | Internal error | Service composition failed |

**Loading States**:
- Overall: "Gathering food memory data..." (spinner with estimated time)
- Individual sections: Parallel calls, show partial results

**Empty States**:
- No food graph data: Show "No food data available, sync AGE graph"
- No companion cards: Show template only

**Important Constraints**:
- ✅ DO NOT include effective carbs fields (Phase 5a pending)
- ✅ DO NOT add meal history endpoint (Phase 5b blocked)
- ✅ DO NOT add dietary restriction filters (Phase 5b blocked)
- ✅ DO NOT touch frontend
- ✅ All content educational only

**Phase B Implementation**: ✅ Complete
- Service created: `t1dSatoPageDataService.ts`
- Route added: `GET /api/t1d/sato/page-data`
- Contract updated with response shape
- Tests added (see tests/migration-effective-carbs.test.ts structure)

**Commander Verification Checklist**:
1. ✅ Contract updated
2. ✅ Single page-shaped JSON payload returned
3. ✅ Existing Phase A endpoints remain backward-compatible
4. ✅ Tests pass (34 T1D tests + page-data tests)
5. ✅ Live verification succeeds (Russell user, Chicken Caesar query)
6. ✅ No frontend changes
7. ✅ No effective carbs implementation

---
**Contract Version**: 1.1.0 (Phase B added)
**Status**: Ready for commander verification

