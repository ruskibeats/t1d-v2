# Sato V1.1 Food Atlas Reskin — Web Journal Surface (Backend Only)

**Status:** Research & design only — NO implementation until approved by commander

**Created:** 2026-06-13
**For:** Sato V1.1 Web = Journal Surface
**Scope:** Backend API restructuring for emotional presentation layer — NO frontend work

---

## Executive Summary

The food atlas and companion engine in `sparky_bloom_dev` is a powerful system:
- **42 meals × glucose response** fingerprints for Russell
- **91-node food atlas graph** (foods → meals → response patterns → memories)
- **250K+ OpenFoodFacts products** (growing to 4.5M) with vector embeddings
- **Live API endpoints:** /intent, /cards, /meal-pipeline, /atlas/query, /atlas/generate

Currently exposed as **raw JSON data**. This plan transforms it into a beautiful, emotional, crafted object through the Sato V1.1 design philosophy by restructuring backend API responses — **emotional data shaping happens in the API layer (presentation layer), not the frontend**.

### The Core Challenge

```
❌ Current:  JSON API responses with numbers, arrays, metrics
✅ Sato:    Personal exhibition catalogue, food diary as a garden
```

**Rule:** Not a health dashboard. Not SaaS software. Artwork leads, data supports. Beautiful without numbers.

**Scope:** Web only — backend API restructuring. Frontend design informed by Sato principles.

---

## Sato V1.1 Rules (Non-Negotiable)

1. **Not a health dashboard** — No charts, no dense numbers, no clinical UI
2. **Not SaaS software** — No login walls, no settings pages, no onboarding flows
3. **Artwork leads, data supports** — Visual/motion/emotional layers > data density
4. **Beautiful without numbers** — Companion should work even if you ignore numbers
5. **Crafted object, not software interface** — Feels like a beautiful journal or artifact

---

## Scope Exclusions (V1.1)

**NOT included in this phase:**
- ❌ iPhone Companion Surface (future work)
- ❌ Apple Watch Whisper Surface (future work)
- ❌ Frontend implementation (React Native/Expo, Web UI components)
- ❌ Haptic feedback systems
- ❌ Mobile paper object metaphors

**Focus of V1.1:**
- ✅ Backend API response restructuring
- ✅ Sato presentation layer wrapper
- ✅ Data shaping in the API (emotional mapping, narrative generation)
- ✅ Web-only endpoints that produce emotionally shaped responses
- ✅ Database query wrapper for Sato-aware data fetching

---

## Platform Mapping

| Platform | Role | What They Do |
|----------|------|--------------|
| **Web** | Journal | Reflection, browsing food memory, atlas exploration |

**Future platforms (post-V1.1):**
- iPhone = Companion (daily interaction, warm)
- Apple Watch = Whisper (haptic context)

---

## Current Raw Capabilities (Database Reality)

| Capability | Raw Today | Needs Sato Treatment |
|------------|-----------|---------------------|
| **Food atlas vector search** | JSON array of matched foods + metrics | Beautiful food constellation / memory map in API response |
| **Meal response fingerprints** | SQL table with baseline, peak, delta, time, confidence | "Your food diary as a garden" — emotional curves |
| **CGM response data** | Numbers (peak 210, delta +45, time 120min) | Emotional curve: calm, safe, note, surprised |
| **Food database (OFF)** | Nutrient table (carbs 467g, protein 28g, fat 22g) | Ingredient poetry / food profile cards |
| **Companion intents** | Text cards | Character-driven dialogue (Sato as a calm companion) |
| **What-if queries** | Static forecast card | Gentle conversational exploration |
| **Memories & patterns** | Generated text paragraphs | "Your kitchen window" — seasonal, personal |

---

## Raw Data → Emotional Signal Mapping

| Raw Data | Emotional Equivalent | Visual Metaphor |
|----------|---------------------|-----------------|
| Peak: 210 mg/dL | "Achieved" | Rising sun, bloom opened |
| Delta: +45 mg/dL | "Surprised" | Gentle curve, surprised expression |
| Time to peak: 120 min | "Patience needed" | Time passage, slow unfolding |
| Confidence: medium | "Curious" | Question mark, amber glow |
| Consistency: stable | "Reliable" | Anchor, steady ground |
| Variance: high | "Untamed" | Wind, wave, organic movement |

---

## Design Principles (Backend-First Implementation)

### Principle 1: Not a Health Dashboard

**Eliminate from API responses:**
- ❌ Charts, graphs, sparklines (unless purely decorative)
- ❌ Dense number grids (carbs × fat × protein)
- ❌ Clinical UI elements (vitals strips, risk scores as gauges)

**Replace with:**
- ✅ Food as protagonists — Each food has a personality
- ✅ Meals as scenes — Context + evidence, not just metrics
- ✅ Responses as atmospheres — Calm, energetic, curious, wild
- ✅ Numbers as whisper — Visible but secondary, never commanding

**Test (Five Universal Tests):**
1. Could this be mistaken for a health dashboard?
2. Could this be mistaken for SaaS software?
3. Does the artwork lead and the data support?
4. Would this still feel beautiful if all numbers disappeared?
5. Does this feel like a crafted object, not software interface?

---

### Principle 2: Artwork Leads, Data Supports

**Visual Layer (Design Guide for Frontend):**
- Food portrait cards with ingredient photography or abstract art
- Meal mood lighting that matches CGM response (calm = soft dawn light, exciting = golden hour)
- Pattern stains on canvas — organic shapes that hint at data without revealing it

**Data Layer (Backend Responsibility):**
- Raw numbers are exposed through tiny, refined typography
- Hover reveals more detail (food names, exact grams, peak times)
- Always labeled "Educational simulation only — not medical advice."

---

### Principle 3: Crafted Object Metaphor

**Web: Paper Landscape**
- Gallery layout (masonry, not grid)
- Portfolios and exhibitions, not dashboards
- Pages feel like turning pages in a beautiful book

**Companion Character: The Quiet Friend**
- Speaks softly, never loudly
- Uses "we" and "we're in this together"
- Asks permission before giving data: "Want to see what this meal did last time?"

---

## Web Journal Surfaces (Frontend-First Design)

### Surface 3.1 — Food Memory Gallery

**Job:** Browse food memory as a personal exhibition catalogue

**Backend API Design (Sato-Aware Response Structure):**
```json
{
  "gallery": {
    "hero_spotlight": {
      "food_name": "Pizza",
      "meal_date": "Saturday @ 7:15 PM",
      "mood": "curious",
      "mood_badge": "amber",
      "narrative": "Your pasta was... intrigued us. A surprising mid-week curiosity.",
      "visual_hint": "warm-gradient-golden-hour"
    },
    "masonry_grid": [
      {
        "food_name": "Eggs & Toast",
        "meal_date": "Sunday @ 7:32 AM",
        "mood": "calm",
        "mood_badge": "green",
        "narrative": "Wonderfully predictable. A calm start to the day.",
        "food_icons": ["🥚", "🍞"],
        "appearances": 5,
        "notes": "Most reliable breakfast"
      },
      {
        "food_name": "Pasta",
        "meal_date": "Friday @ 7:00 PM",
        "mood": "excited",
        "mood_badge": "orange",
        "narrative": "Explosive impact. Your Friday dinners tend to be wildcards.",
        "food_icons": ["🍝"],
        "appearances": 3,
        "notes": "Often late dinner"
      }
    ]
  }
}
```

**Backend Implementation:** `GET /api/t1d/food-gallery?limit=20`

**Files to Create:**
```
sparky-bloom/server/routes/t1dFoodGalleryRoutes.ts (new)
sparky-bloom/server/services/foodGalleryService.ts (new)
sparky-bloom/server/schemas/foodGallerySchemas.ts (new)
```

**Algorithm:**
1. Query `t1d_meal_response_fingerprints` for user's meals (42 total)
2. Group by meal_date, calculate mood badge (delta → emotion mapping)
3. Generate narrative summary (based on consistency, variance, historical pattern)
4. Fetch food icons/images from `food_entries` or fallback to emoji
5. Sort: hero spotlight = most vivid mood (highest variance), grid = sorted chronologically
6. Return structured Sato-aware response

**Sato Query Wrapper:** `sparky-bloom/server/db/queryWrappers/satoFoodGalleryWrapper.ts`

---

### Surface 3.2 — Pattern Timeline (Your Kitchen Window)

**Job:** Seasonal, personal narratives of how foods interact

**Backend API Design (Sato-Aware Response Structure):**
```json
{
  "patterns": [
    {
      "pattern_type": "slow-burn",
      "pattern_id": "fat-delay-fri-dinner",
      "count": 8,
      "narrative": "Your Friday dinners have been a slow-burn saga. Since January, you've had 8 slow-burn nights. The peak doesn't hit until 180 minutes — like a star after sunset. This is your fat-delay pattern.",
      "visual_hint": "mountain-range-sunset",
      "seasonal_theme": "winter-slow-burn",
      "visual_theme": "oil-painting-stain",
      "key_foods": ["pasta", "white-rice", "heavy-sauces"],
      "sample_dates": ["2026-01-08", "2026-01-15", "2026-01-22"],
      "metrics_summary": {
        "avg_time_to_peak": 162,
        "avg_delta": 78,
        "consistency": "variable"
      }
    },
    {
      "pattern_type": "quick-rise",
      "pattern_id": "high-carb-breakfast",
      "count": 12,
      "narrative": "Explosive mornings. Your high-carb breakfasts tend to peak quickly — sometimes too quickly. This is your hyper-responsive carbs pattern.",
      "visual_hint": "sunburst-rise",
      "seasonal_theme": "all-seasons",
      "visual_theme": "ink-drawing-lines",
      "key_foods": ["cereal", "toast", "fruit"],
      "sample_dates": ["2026-01-05", "2026-01-10", "2026-01-16"],
      "metrics_summary": {
        "avg_time_to_peak": 52,
        "avg_delta": 134,
        "consistency": "high"
      }
    }
  ]
}
```

**Backend Implementation:** `GET /api/t1d/patterns/timeline`

**Files to Create:**
```
sparky-bloom/server/routes/t1dPatternTimelineRoutes.ts (new)
sparky-bloom/server/services/patternTimelineService.ts (new)
sparky-bloom/server/schemas/patternTimelineSchemas.ts (new)
```

**Algorithm:**
1. Query `t1d_meal_response_fingerprints` by meal_type
2. Cluster patterns using macro similarity (carbs × fat × protein) and graph edges
3. For each cluster, calculate metrics and generate Sato narrative
4. Sato narrator synthesizes metrics into personal narrative (uses companion system prompt)
5. Map metrics to visual hints (mountain-range, sunburst, etc.)
6. Return structured response with pattern IDs and sample dates

**Sato Query Wrapper:** `sparky-bloom/server/db/queryWrappers/satoPatternTimelineWrapper.ts`

---

### Surface 3.3 — Food Profile Cards (Ingredient Poetry)

**Job:** Each food gets a poetic profile

**Backend API Design (Sato-Aware Response Structure):**
```json
{
  "food_profiles": [
    {
      "food_name": "tomato soup",
      "poem": "Comfort in a bowl. Warm, familiar, steady. Your third time with this one was today at 12:45 PM. 'A gentle companion for cold mornings.' — Sato",
      "appearances": 3,
      "last_ate": "2026-01-10",
      "most_common_meal_type": "lunch",
      "notes": "Appears most often on cold/rainy days",
      "visual_hint": "steam-in-cup",
      "food_type": "comfort",
      "health_impact": "neutral",
      "emotion_tags": ["stable", "familiar", "grounded"]
    }
  ]
}
```

**Backend Implementation:** `GET /api/t1d/food-profiles?limit=20`

**Files to Create:**
```
sparky-bloom/server/routes/t1dFoodProfileRoutes.ts (new)
sparky-bloom/server/services/foodProfileService.ts (new)
sparky-bloom/server/schemas/foodProfileSchemas.ts (new)
```

**Algorithm:**
1. Aggregate food appearances from `t1d_meal_response_fingerprints`
2. Analyze patterns: most common meal type, best/average delta, consistency
3. Call Sato narrator service to generate poetic prose (personalized to user)
4. Map food attributes to emotion tags and visual hints
5. Return structured response

**Sato Query Wrapper:** `sparky-bloom/server/db/queryWrappers/satoFoodProfileWrapper.ts`

---

## Sato Presentation Layer Architecture

### Layer 1: Data Layer (Database)
```
SQL Tables:
- t1d_meal_response_fingerprints (raw metrics)
- t1d_food_atlas_edges (graph)
- t1d_vector_documents (embeddings)
- openfoodfacts_products
```

**Rule:** Queries return **raw data only**. No emotional shaping yet.

### Layer 2: Sato Wrapper Layer (New)
```
sparky-bloom/server/db/queryWrappers/
  - satoFoodGalleryWrapper.ts
  - satoPatternTimelineWrapper.ts
  - satoFoodProfileWrapper.ts
```

**Responsibility:**
- Accept raw database query results
- Apply emotional mapping (delta → mood badge, metrics → visual hint)
- Generate narrative summaries (Sato narrator integration)
- Enrich responses with context (appearances, meal types, sample dates)
- Return Sato-aware structured responses

**Pattern:**
```typescript
// Example: satoFoodGalleryWrapper.ts
export async function getSatoFoodGallery(userId: string, limit: number) {
  const rawMeals = await db.query(`
    SELECT * FROM t1d_meal_response_fingerprints
    WHERE t1d_profile_id = $1
    ORDER BY entry_date DESC
    LIMIT $2
  `, [userId, limit]);

  // Sato shaping: emotional mapping
  const meals = rawMeals.map(meal => ({
    ...meal,
    mood: mapDeltaToMood(meal.delta_mg_dl),
    mood_badge: mapDeltaToBadge(meal.delta_mg_dl),
    narrative: generateMealNarrative(meal, historicalPatterns)
  }));

  return { gallery: { masonry_grid: meals, hero_spotlight: meals[0] } };
}

function mapDeltaToMood(delta: number | null): 'calm' | 'curious' | 'excited' | 'surprised' {
  if (delta === null) return 'curious';
  if (delta < 30) return 'calm';
  if (delta < 70) return 'curious';
  if (delta < 150) return 'excited';
  return 'surprised';
}
```

### Layer 3: Service Layer (Business Logic)
```
sparky-bloom/server/services/
  - foodGalleryService.ts (orchestrates wrappers + data fetching)
  - patternTimelineService.ts (pattern clustering + narrative generation)
  - foodProfileService.ts (profile generation + narrative)
  - satoNarratorService.ts (personalized prose generation)
```

**Responsibility:**
- Orchestrate multi-step queries (wrappers + DB)
- Generate sophisticated insights (pattern clustering, narrative synthesis)
- Integrate Sato narrator system prompt
- Ensure data integrity and error handling

### Layer 4: Route Layer (HTTP)
```
sparky-bloom/server/routes/
  - t1dFoodGalleryRoutes.ts (GET /api/t1d/food-gallery)
  - t1dPatternTimelineRoutes.ts (GET /api/t1d/patterns/timeline)
  - t1dFoodProfileRoutes.ts (GET /api/t1d/food-profiles)
```

**Responsibility:**
- HTTP request handling
- Route validation (Zod schemas)
- Authentication (userId extraction)
- Response formatting
- Error handling

---

## Sato Narrator Service Integration

### Service: `satoNarratorService.ts`

**Purpose:** Generate personalized emotional narratives from raw data

**Configuration:**
```typescript
// Embeds companion_system.txt as system prompt
const SATO_NARRATOR_PROMPT = `
You are the Sato narrator for the food atlas.
Your job: Translate glucose response data into safe, useful, conversational output.
Evidence-only rule: Use ONLY the data passed to you.
Safety-first: Never mention insulin units, dosing, or clinical decisions.
Tone: Warm, practical, calm, never commanding. Use "we" language.
Response structure: Emotional headline → Context → Data whisper → Question/offer
`;

interface NarrateMealRequest {
  meal: MealFingerprint;
  historicalPatterns: PatternSummary[];
  profileAnchor: string;
}

interface NarrateMealResponse {
  headline: string;
  narrative: string;
  questionOrOffer?: string;
}
```

**Algorithm:**
1. Load system prompt from file
2. Construct user message with meal data + historical patterns
3. Generate narrative using LLM (OLLama or equivalent)
4. Parse response into structured narrative
5. Return Sato-aware narrative

**Example:**
```typescript
// From raw data to Sato narrative
const request: NarrateMealRequest = {
  meal: {
    entry_date: "2026-01-10T19:15:00Z",
    meal_type: "dinner",
    foods: ["pasta", "marinara sauce"],
    delta: 78,
    peak: 188,
    time_to_peak: 95,
    consistency: "variable"
  },
  historicalPatterns: [
    {
      pattern_type: "slow-burn",
      count: 8,
      avg_time_to_peak: 162
    }
  ],
  profileAnchor: "high_fat_delayed"
};

const response = await satoNarratorService.narrateMeal(request);
// Returns: {
//   headline: "Your pasta was... intrigued us.",
//   narrative: "A surprising mid-week curiosity.",
//   questionOrOffer: "Would you like to see how similar dinners affected your glucose over the past 3 months?"
// }
```

---

## Data Shaping Rules (Backend-Side)

### Delta → Mood Badge Mapping
| Delta Range | Mood Badge | Visual Color | Emotional Label |
|-------------|-----------|--------------|-----------------|
| < 30 mg/dL | calm | green | Steady, reliable |
| 30-70 mg/dL | curious | amber | Interesting, unexpected |
| 70-150 mg/dL | excited | orange | Energetic, impactful |
| > 150 mg/dL | surprised | red | Intense, notable |

**Implementation:** `sparky-bloom/server/utils/moodMapper.ts`

### Metrics → Visual Hints
| Metric Range | Visual Hint | Frontend Interpretation |
|--------------|-------------|-------------------------|
| Time to peak > 120 min | mountain-range-sunset | Slow burn, patience needed |
| Time to peak < 90 min | sunburst-rise | Quick impact, monitor early |
| Consistency: stable | anchor-solid | Reliable pattern |
| Consistency: variable | wave-organic | Untamed, unpredictable |

**Implementation:** `sparky-bloom/server/utils/visualHintMapper.ts`

### Graph Edges → Visual Types
| Edge Type | Visual | Meaning |
|-----------|--------|---------|
| contains | dotted-line | Part of this meal |
| caused_response | colored-curve | This meal caused this response |
| remembered_as | glow-pattern | Pattern was memorable |
| similar_to | parallel-line | Similar macro profile |

**Implementation:** `sparky-bloom/server/utils/graphVisualMapper.ts`

---

## Schema Definitions (Zod)

### Food Gallery Schema
```typescript
import { z } from 'zod';

const MoodBadge = z.enum(['calm', 'curious', 'excited', 'surprised']);
const VisualHint = z.enum([
  'warm-gradient-golden-hour',
  'soft-dawn-light',
  'mountain-range-sunset',
  'sunburst-rise',
  'oil-painting-stain'
]);

const FoodGalleryItemSchema = z.object({
  food_name: z.string(),
  meal_date: z.string(), // ISO date
  mood: MoodBadge,
  mood_badge: MoodBadge, // same as mood, but for badge color
  narrative: z.string(),
  food_icons: z.array(z.enum(['🥚', '🍞', '🍝', '🍜', '🍛', '🍲', '🍝', '🍛'])).max(4),
  appearances: z.number(),
  notes: z.string().optional()
});

export const FoodGalleryResponseSchema = z.object({
  gallery: z.object({
    hero_spotlight: FoodGalleryItemSchema,
    masonry_grid: z.array(FoodGalleryItemSchema)
  })
});
```

### Pattern Timeline Schema
```typescript
const PatternVisualHint = z.enum([
  'mountain-range-sunset',
  'sunburst-rise',
  'ink-drawing-lines',
  'blooming-flower'
]);

const PatternTimelineResponseSchema = z.object({
  patterns: z.array(z.object({
    pattern_type: z.string(),
    pattern_id: z.string(),
    count: z.number(),
    narrative: z.string(),
    visual_hint: PatternVisualHint,
    seasonal_theme: z.string(),
    visual_theme: z.string(),
    key_foods: z.array(z.string()),
    sample_dates: z.array(z.string()),
    metrics_summary: z.object({
      avg_time_to_peak: z.number(),
      avg_delta: z.number(),
      consistency: z.enum(['stable', 'variable'])
    })
  }))
});
```

### Food Profile Schema
```typescript
const FoodProfileResponseSchema = z.object({
  food_profiles: z.array(z.object({
    food_name: z.string(),
    poem: z.string(),
    appearances: z.number(),
    last_ate: z.string(),
    most_common_meal_type: z.string(),
    notes: z.string(),
    visual_hint: PatternVisualHint,
    food_type: z.string(),
    health_impact: z.enum(['neutral', 'supportive', 'caution']),
    emotion_tags: z.array(z.enum(['stable', 'familiar', 'grounded', 'exciting', 'unexpected', 'warm']))
  }))
});
```

---

## Next-Actionable Steps
## Restructuring Existing Endpoints

### Current State (Raw JSON)

| Endpoint | Raw Response | Problem |
|----------|--------------|---------|
| `POST /api/t1d/companion/intent` | `{"intent":"meal","cards":[]}` | Cards contain raw metrics, no emotional shaping |
| `POST /api/t1d/companion/cards` | `[{"kind":"forecast","payload":{...}}]` | Payload has numbers, no narratives |
| `GET /api/t1d/companion/atlas/query` | `{"matchedFoods":[{...}]}` | Food matches with raw stats, no mood |
| `POST /api/t1d/companion/atlas/generate` | `{"nodes":{...}}` | Graph nodes with raw metrics, no visual hints |

### Restructuring Strategy (Sato Presentation Layer)

**Pattern:** Each existing endpoint gets a **Sato wrapper** that:
1. Calls the existing query function (returns raw data)
2. Wraps the raw response with emotional mapping
3. Generates Sato narratives using `satoNarratorService`
4. Returns emotionally enriched response

**New Wrappers:**
```
sparky-bloom/server/db/queryWrappers/satoCompanionIntentWrapper.ts
  → Wraps existing companion intent logic
  → Adds emotional greeting to response
  → Generates narrative context for cards

sparky-bloom/server/db/queryWrappers/satoCompanionCardsWrapper.ts
  → Wraps existing card generation
  → Transforms card payloads with mood badges
  → Adds emotional summaries to each card

sparky-bloom/server/db/queryWrappers/satoAtlasQueryWrapper.ts
  → Wraps existing atlas query
  → Maps matched foods to mood badges
  → Adds personal narrative to each match

sparky-bloom/server/db/queryWrappers/satoAtlasGenerateWrapper.ts
  → Wraps existing graph generation
  → Enhances nodes with visual hints
  → Adds emotional tags to pattern nodes
```

### Example: Restructuring `/api/t1d/companion/intent`

**Current Response (Raw):**
```json
{
  "intent": "meal",
  "cards": [
    {
      "kind": "parsedFoods",
      "payload": {
        "food_names": ["pizza", "salad"],
        "carbs_g": 45,
        "fat_g": 18
      }
    }
  ]
}
```

**New Response (Sato-Aware):**
```json
{
  "intent": "meal",
  "emotion": "curious",
  "narrative": \"Your pizza and salad feel... interesting. This is your second time with this combination, and it's been a bit unpredictable.\",
  "cards": [
    {
      "kind": "parsedFoods",
      "mood": "curious",
      "mood_badge": "amber",
      "narrative": \"This meal feels... inquisitive. Not too heavy, not too light.\",
      "payload": {
        "food_names": ["pizza", "salad"],
        "raw_carbs_g": 45,
        "raw_fat_g": 18
      }
    }
  ]
}
```

### Example: Restructuring `/api/t1d/companion/atlas/query`

**Current Response (Raw):**
```json
{
  "query": "pizza",
  "matchedFoods": [
    {
      "foodName": "pizza",
      "similarity": 0.85,
      "fingerprints": {
        "total": 3,
        "byMealType": [...]
      }
    }
  ]
}
```

**New Response (Sato-Aware):**
```json
{
  "query": "pizza",
  "emotion": "excited",
  "narrative": \"Your pizza experiences have been... energizing. Each time, it's a small but noticeable event.\",
  "matchedFoods": [
    {
      "foodName": "Pizza",
      "similarity": 0.85,
      "mood": "excited",
      "mood_badge": "orange",
      "narrative": \"Pizza lands on your curious/excited spectrum — noticeable, but not overwhelming.\",
      "fingerprints": {
        "total": 3,
        "byMealType": [...]
      }
    }
  ]
}
```

### Implementation Priority

**Priority 1 (Week 1-2):**
- `satoCompanionIntentWrapper` → restructures companion intent responses
- `satoCompanionCardsWrapper` → restructures companion card payloads

**Priority 2 (Week 3-4):**
- `satoAtlasQueryWrapper` → restructures atlas query responses
- `satoAtlasGenerateWrapper` → restructures atlas graph generation

**Priority 3 (Week 5-6):**
- Create dedicated `/api/t1d/food-gallery`, `/api/t1d/patterns/timeline`, `/api/t1d/food-profiles` endpoints (new Sato-aware endpoints)
---

### Phase 1: Food Gallery API (Week 1-2)
---


### Current State (Raw JSON)

| Endpoint | Raw Response | Problem |
|----------|--------------|---------|
|  |  | Cards contain raw metrics, no emotional shaping |
|  |  | Payload has numbers, no narratives |
|  |  | Food matches with raw stats, no mood |
|  |  | Graph nodes with raw metrics, no visual hints |

### Restructuring Strategy (Sato Presentation Layer)

**Pattern:** Each existing endpoint gets a **Sato wrapper** that:
1. Calls the existing query function (returns raw data)
2. Wraps the raw response with emotional mapping
3. Generates Sato narratives using 
4. Returns emotionally enriched response

**New Wrappers:**


### Example: Restructuring 

**Current Response (Raw):**


**New Response (Sato-Aware):**


### Example: Restructuring 

**Current Response (Raw):**


**New Response (Sato-Aware):**


### Implementation Priority

**Priority 1 (Week 1-2):**
-  → restructures companion intent responses
-  → restructures companion card payloads

**Priority 2 (Week 3-4):**
-  → restructures atlas query responses
-  → restructures atlas graph generation

**Priority 3 (Week 5-6):**
- Create dedicated , ,  endpoints (new Sato-aware endpoints)

---



### Phase 1: Food Gallery API (Week 1-2)

**Build:** `GET /api/t1d/food-gallery`

**Acceptance Criteria:**
- [ ] Endpoint returns Sato-aware structured response
- [ ] Hero spotlight: most vivid mood meal
- [ ] Masonry grid: sorted chronologically with mood badges
- [ ] Mood badge mapping: delta → calm/curious/excited/surprised
- [ ] Narrative generation: personalized to user's history
- [ ] Data shaping happens in Sato wrapper, not DB query
- [ ] No raw numbers in response (except tiny footnotes)
- [ ] Zod schema validation passes
- [ ] Authentication required (userId extraction)

**Files to Create:**
```
sparky-bloom/server/routes/t1dFoodGalleryRoutes.ts
sparky-bloom/server/services/foodGalleryService.ts
sparky-bloom/server/services/satoNarratorService.ts
sparky-bloom/server/db/queryWrappers/satoFoodGalleryWrapper.ts
sparky-bloom/server/schemas/foodGallerySchemas.ts
sparky-bloom/server/utils/moodMapper.ts
sparky-bloom/server/utils/visualHintMapper.ts
```

**Test Plan:**
```bash
# Authentication
curl -H "Cookie: sparky_active_user_id=..." \
  http://localhost:3000/api/t1d/food-gallery

# Verify response structure matches schema
# Verify mood badges map correctly to delta values
# Verify narratives are personalized (not generic)
```

---

### Phase 2: Pattern Timeline API (Week 3-4)

**Build:** `GET /api/t1d/patterns/timeline`

**Acceptance Criteria:**
- [ ] Endpoint returns 3-8 pattern narratives
- [ ] Pattern clustering: uses macro similarity + graph edges
- [ ] Narrative generation: Sato narrator integration
- [ ] Visual hints: mapped from metrics summary
- [ ] No numbers in main response (only in metrics_summary)
- [ ] Zod schema validation passes
- [ ] Performance: < 500ms for 42 meal dataset

**Files to Create:**
```
sparky-bloom/server/routes/t1dPatternTimelineRoutes.ts
sparky-bloom/server/services/patternTimelineService.ts
sparky-bloom/server/schemas/patternTimelineSchemas.ts
```

**Test Plan:**
```bash
# Verify pattern detection (slow-burn, quick-rise, stable, variable)
# Verify narratives are personalized (not generic)
# Verify visual hints map correctly to patterns
# Verify metrics_summary is accurate
```

---

### Phase 3: Food Profile API (Week 5-6)

**Build:** `GET /api/t1d/food-profiles`

**Acceptance Criteria:**
- [ ] Endpoint returns 20 food profiles with poetic prose
- [ ] Poetry generation: personalized to user's history
- [ ] Food type classification (comfort, energy, treat, etc.)
- [ ] Visual hints mapped to food characteristics
- [ ] Emotion tags calculated from patterns
- [ ] Zod schema validation passes

**Files to Create:**
```
sparky-bloom/server/routes/t1dFoodProfileRoutes.ts
sparky-bloom/server/services/foodProfileService.ts
sparky-bloom/server/schemas/foodProfileSchemas.ts
```

**Test Plan:**
```bash
# Verify poems are personalized (not template strings)
# Verify food types match patterns
# Verify emotion tags are accurate
```

---

### Phase 4: Common Services & Utilities (Parallel)

**Build:** Shared utilities and narrator service

**Files to Create:**
```
sparky-bloom/server/utils/moodMapper.ts (emotion mapping)
sparky-bloom/server/utils/visualHintMapper.ts (visual hint mapping)
sparky-bloom/server/utils/graphVisualMapper.ts (graph to visual)
sparky-bloom/server/services/satoNarratorService.ts (LLM integration)
sparky-bloom/server/services/satoSchemaBuilder.ts (response formatting)
```

**Acceptance Criteria:**
- [ ] Mood mapper: delta → mood badge (tested with 42 meals)
- [ ] Visual hint mapper: metrics → visual hint (tested with sample data)
- [ ] Graph visual mapper: edges → visual (tested with 91-node graph)
- [ ] Narrator service: personalized prose generation (tested with meal examples)
- [ ] Schema builder: response formatting (tested with all 3 endpoints)

---

## Risk Assessment

### Risk 1: Emotional Mapping Too Subjective

**Mitigation:**
- Establish clear thresholds with testing (delta thresholds documented)
- Use shared mood taxonomy across all endpoints
- Narrator service trained on user's actual words (quotes from interviews)

**Fallback:** If mapping unclear, use "curious" as safe default

**Test:** Run on 42 meals, verify 95%+ consistency with expected emotions

---

### Risk 2: Narrator Service Fails or Returns Generic Text

**Mitigation:**
- Fallback to rule-based narrative generation if LLM fails
- Minimum template structure: "Your {food} was... [emotion]. {context}."
- Test with 10 meal examples before deployment

**Fallback:** If narrator fails, return data + emotion badge only (no prose)

**Test:** Mock narrator service, verify fallback behavior

---

### Risk 3: Performance Degradation from API Layer

**Mitigation:**
- Sato wrappers use efficient PostgreSQL queries (indexed columns)
- Parallelize pattern clustering and narrative generation
- Cache results for 1-hour TTL (patterns rarely change)

**Fallback:** If performance < 500ms, return partial results with loading state

**Test:** Benchmark on 42 meal dataset, target < 500ms P95

---

### Risk 4: Graph Visualization Too Complex for Web Performance

**Mitigation:**
- Limit constellation to 10 nodes (collapse clusters)
- Use simple visual hints (colored strokes) instead of complex renders
- Lazy load edges (fade in on scroll)

**Fallback:** If constellation fails, show list view with emoji icons

**Test:** Verify Web page loads < 2s with 42 meals

---

### Risk 5: Zod Schema Validation Fails on Edge Cases

**Mitigation:**
- Schema includes `.optional()` and `.nullable()` for all fields
- Default values for missing data (e.g., null delta → curiosity)
- Pre-validation in wrapper layer (throw clear errors)

**Fallback:** If validation fails, return HTTP 400 with detailed error message

**Test:** Test with null/undefined values, missing fields

---

## Dependencies & Timeline

### Prerequisites
- [x] 42 meal fingerprints for Russell
- [x] Food atlas graph generation (t1d_food_atlas_edges, t1d_vector_documents)
- [x] OpenFoodFacts integration (100K+ products, running to 4.5M)
- [x] Atlas query endpoint (t1dFoodAtlasService.ts)
- [x] Companion narrator system prompt (companion_system.txt)
- [x] Live API endpoints wired (intent, cards, meal-pipeline)

### Timing
| Phase | Duration | Blockers |
|-------|----------|----------|
| Phase 1 | Weeks 1-2 | Narrator service integration |
| Phase 2 | Weeks 3-4 | Pattern clustering algorithm |
| Phase 3 | Weeks 5-6 | Poetry generation tuning |
| Phase 4 | Parallel (Weeks 1-6) | Shared utilities |

### Milestones
- **Week 2:** Food Gallery API deployed (hero spotlight + masonry grid)
- **Week 4:** Pattern Timeline API deployed (3-8 patterns)
- **Week 6:** Food Profile API deployed (20 profiles)
- **Week 6:** All APIs validated against Zod schemas

---

## Success Metrics

### Qualitative
- [ ] API responses feel like a personal journal, not a database
- [ ] Emotions guide the response structure (calm/curious/excited/surprised)
- [ ] Narratives are personalized (not template strings)
- [ ] Can understand a meal's response without reading numbers

### Quantitative
- [ ] API response size: < 5KB per endpoint (not bloated)
- [ ] Performance: < 500ms P95 for all endpoints
- [ ] Narrative quality: 80%+ users prefer emotional summaries over raw metrics
- [ ] Error rate: < 1% (validation errors, narrator failures)

---

## Open Questions (To Be Resolved)

1. **Narrator fallback:** What rule-based template should replace LLM if it fails?
2. **Emotion override:** Can users customize their mood if the app's mapping feels wrong?
3. **Visual hint granularity:** Are visual hints too coarse? Need more specific hints?
4. **Performance cache:** Should results be cached at Redis level or in-memory?
5. **Offboarding strategy:** Should we remove old "dosing" terminology from companion responses?

---

## Design References

### Visual Inspiration
- **Aesop:** Minimal, aesthetic, health-forward
- **Kinfolk:** Editorial, slow, natural
- **Japanese exhibition catalogue:** Vertical formats, large images, small text
- **Museum retrospective:** Narrative-first, beautiful typography

### Typography (Backend Only — Information for Frontend)
- Hero Title: Canela 72px Weight 400
- Section Title: Canela 48px Weight 400
- Narrative Body: Instrument Sans 18px (Line Height 30px)
- Metadata: 14px

### Mood Badge Colors
- Calm: Green (#1b6d24)
- Curious: Amber (#f59e0b)
- Excited: Orange (#f97316)
- Surprised: Red (#ba1a1a)

### Visual Hint Tags (Frontend Interpretation)
- `warm-gradient-golden-hour`: Soft warm lighting
- `soft-dawn-light`: Calm, gentle
- `mountain-range-sunset`: Slow burn, patience
- `sunburst-rise`: Quick impact, energetic
- `oil-painting-stain`: Organic, fluid
- `ink-drawing-lines`: Pattern-based, structured

---

## API Contract Summary

### GET /api/t1d/food-gallery?limit=20
**Response:** Food Gallery (Sato-aware)
- Hero spotlight (most vivid mood)
- Masonry grid (chronological, mood badges)
- No raw numbers except tiny footnotes

### GET /api/t1d/patterns/timeline
**Response:** Pattern Timeline (Sato-aware)
- 3-8 patterns with narratives
- Visual hints mapped from metrics
- No raw numbers except metrics_summary

### GET /api/t1d/food-profiles?limit=20
**Response:** Food Profiles (Sato-aware)
- 20 foods with poetic prose
- Food type, notes, visual hints
- Emotion tags calculated

---

**Status:** ✅ Research complete — Awaiting Commander approval to begin Phase 1 implementation

**Notify via:** `[RESKIN-PLAN-UPDATED]` in intercom message

**Scope:** Web backend only — NO frontend, NO iPhone, NO Watch