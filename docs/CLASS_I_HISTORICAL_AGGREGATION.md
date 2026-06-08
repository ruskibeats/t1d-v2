# Class I Food History Aggregation — Design Doc

> **Purpose**: Document the retrospective CGM aggregation feature for the T1D Companion iOS app. This replaces forward forecasting with factual historical data presentation to meet UK Class I medical device regulations.

## Executive Summary

The live app uses **pure historical aggregation** of logged CGM data. When a user selects a food item, the system queries past instances, aligns CGM traces, and shows statistical aggregates.

**No forward predictions. No anchors. No physiology model.**

---

## Regulatory Position (UK MHRA)

| Aspect | Classification | Reasoning |
|---|---|---|
| Units | **Locale-aware** | mmol/L (UK/EU) or mg/dL (US) based on phone region |
| Text output | **Factual retrospection** | "You peaked at X" is observation, not prediction |
| Safety guard | **Applied to insight text** | Same policy as companion_system.txt |
| Scope | **Read-only** | No dosing, no treatment changes |
| Confidence | **Statistical spread** | Shows variance, no clinical thresholds |

---

## Safety Guard Integration

### Policy (data/safety_policy.json)

The existing policy blocks treatment language:
- **Banned words**: `insulin`, `bolus`, `dose`, `injection`, `deliver`, `pump`, `basal`, `correction`
- **Dosing patterns**: "take X units", "give X units", injection language
- **Emergency keywords**: medical crisis terms

### Application to Food History

**Text output** (`insight_text`) → **must pass** `SafetyScaffold.validate()`
- Only shows glucose values ("you peaked at 13.2 mmol/L")
- No treatment verbs, no dosing numbers, no "should"
- ✅ Current insights pass validation

**Structured data** (`insulin_units: Double?`) → **displayed in card UI**
- Shows what the user logged (fact, not advice)
- No dosing language in isolation
- ✅ Struct values don't trigger text blocks

### Example of Safe Text

```text
You've logged **pizza** **258 times** over the last 90 days.

On average, your glucose peaked at **13.2 mmol/L** around **120 minutes** after eating.

The last time you had pizza (**2026-06-02**), you rose to **14.9 mmol/L** and dropped back to **6.2 mmol/L**.
```

This passes `SafetyScaffold.validate()` with `is_safe: true`.

---

## Unit Handling (Locale-Aware)

### Server (Python)

Always returns both units in JSON response:

```json
{
  "avg_peak_mmol_l": 13.2,
  "avg_peak_mg_dl": 238.0,
  "trace": [{
    "offset_minutes": 120,
    "mean_mmol_l": 13.2,
    "mean_mg_dl": 238.0,
    "count": 258
  }]
}
```

### Client (SwiftUI)

```swift
enum GlucoseUnitPreference {
    case mmolL  // UK/EU standard
    case mg_dL  // US standard
    
    static var current: GlucoseUnitPreference {
        // UK app -- check Locale or UserDefaults
        .mmolL
    }
}
```

All views use computed properties to select the right unit:

```swift
extension FoodHistory {
    func displayPeak(for pref: GlucoseUnitPreference) -> Double? {
        pref == .mmolL ? avgPeakMMOLL : avgPeakMGDL
    }
}
```

---

## Architecture

```
FoodDetailView (SwiftUI)
   ├── displayPref = GlucoseUnitPreference.current
   ├── trace data → Chart (Swift Charts)
   ├── last 3 → LastThreeCard (structured data)
   └── insight text → SafetyScaffold.validate()
       └── InsightCard (pass/fail determines display)

APIClient.fetchFoodHistory(foodName)
   └── result = get_food_history_sync(food_name, use_mmol=true)
       └── FoodHistoryResult with m/mol + mg/dl fields
```

---

## What Was NOT Removed

| Feature | Kept For |
|---|---|
| Forecast demo (`--demo investor`) | Still works for showcase/synthetic |
| `ForecastStage` class | Demo path uses it; live path doesn't |
| Anchor types | Demo/data generation uses them |
| Original MealsView forecast UI | Unchanged; FoodDetailView is additive |

The new food history view is **parallel** to the existing forecast UI, not a replacement.

---

## Data Model

### Swift (iOS)

```swift
struct FoodHistory: Codable {
    let foodName: String
    let totalInstances: Int
    let timeRangeDays: Int
    let trace: [CGMTracePoint]    // mean + min/max ± std
    let lastThree: [FoodInstance] // logged meal occurrences
    let insightText: String       // Safety-validated
    let disclaimer: String
}

struct CGMTracePoint: Codable {
    let offsetMinutes: Int
    let meanMMOLL: Double?
    let meanMGDL: Double?
    let minMMOLL: Double?
    let maxMMOLL: Double?
    let stdMMOLL: Double?
    let count: Int
}

struct FoodInstance: Codable {
    let date: String
    let mealTime: String?
    let startBGMMOLL: Double?
    let insulinUnits: Double?     // Logged, shown in card
    let is_active: Bool          // Apple Health activity
}
```

### Python (Server)

```python
@dataclass
class FoodHistoryResult:
    food_name: str
    total_instances: int
    time_range_days: int
    trace: list[AggregatedTracePoint]
    last_three: list[FoodInstance]
    insight_text: str
    avg_peak_mmol_l: float | None
    avg_peak_mg_dl: float | None

# Both units always populated via _mmol_to_mgdl()
```

---

## API Contract

**Future endpoint** (demo uses mock data):

```
GET /api/foods/{name}/history?range=week|month|year|all

Response: FoodHistory JSON (as above)
```

**iOS call**:

```swift
func fetchFoodHistory(foodName: String) async throws -> FoodHistory {
    // Demo: return .demo data
    // Live: URLSession GET to endpoint
}
```

---

## Activity Context (Apple Health)

The `is_active` boolean comes from `activity_context` JSONB in meal_log:

```swift
// FoodInstance card
Image(systemName: instance.isActive ? "figure.run" : "figure.stand")
```

Future: pull real workout data from `HKHealthStore` to populate this.

---

## Files

| Path | Purpose |
|---|---|
| `app/services/food_history_service.py` | Aggregation logic + dual-unit JSON |
| `ios/Models/FoodHistoryModels.swift` | Swift structs + locale preference |
| `ios/Views/FoodDetailView.swift` | Chart + cards + time picker |
| `ios/Views/MealsView.swift` | Food history navigation section |
| `ios/Services/APIClient.swift` | `fetchFoodHistory` stub |
| `docs/CLASS_I_HISTORICAL_AGGREGATION.md` | This document |

---

## Testing

1. Run demo: **Meals tab → tap "Pizza" under Food history**
2. Verify: chart shows mmol/L, last 3 have dates/BG/activity
3. Check: insight text matches safety validation output
4. Run: `python3 -c "from app.services.food_history_service import *; ..."`
   to verify JSON format

---

*Document status: complete for demo. Update when live path connects to DB.*