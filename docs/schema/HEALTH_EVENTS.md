# Health Event Views — Schema Reference

## Overview

Six non-destructive SQL views over the `health_metrics` table that expose typed
event schemas without migrating the underlying table. Each view filters by
`metric_type` and projects relevant columns, extracting typed fields from the
`metadata` JSONB column.

All views share common provenance columns from `health_metrics`:
- `id` — primary key
- `person_id` — foreign key to `tbl_users(id)`
- `timestamp` — when the event occurred
- `source` — origin system (`nightscout`, `graph_engine.*`, `manual`, etc.)
- `metadata` — original JSONB payload (preserved for forward compat)
- `created_at` — row creation timestamp

## Views

### `view_events_meal`
Filters: `metric_type = 'carbs'`

| Column | Source | Description |
|--------|--------|-------------|
| `carbs_g` | `value` | Grams of carbohydrate |
| `fat_g` | `metadata->>'fat_g'` | Fat in grams |
| `protein_g` | `metadata->>'protein_g'` | Protein in grams |
| `fiber_g` | `metadata->>'fiber_g'` | Fiber in grams |
| `meal_type` | `metadata->>'meal_type'` | Breakfast, lunch, dinner, etc. |
| `food_name` | `metadata->>'food_name'` | Description of food |

### `view_events_insulin`
Filters: `metric_type IN ('insulin', 'insulin_basal', 'insulin_bolus', 'insulin_correction')`

| Column | Source | Description |
|--------|--------|-------------|
| `insulin_type` | `type::text` | insulin / insulin_basal / insulin_bolus / insulin_correction |
| `insulin_units` | `value` | Units of insulin |
| `injection_site` | `metadata->>'injection_site'` | Body site |
| `device` | `metadata->>'device'` | Delivery device |
| `brand` | `metadata->>'brand'` | Insulin brand |

### `view_events_glucose`
Filters: `metric_type = 'blood_glucose'`

| Column | Source | Description |
|--------|--------|-------------|
| `glucose_mg_dl` | `value` | Blood glucose in mg/dL |
| `trend_arrow` | `metadata->>'trend_arrow'` | Trend arrow (→, ↑, ↓) |
| `device` | `metadata->>'device'` | CGM device model |
| `nightscout_id` | `metadata->>'nightscout_id'` | Stable Nightscout event id |

### `view_events_activity`
Filters: `metric_type IN (exercise_minutes, exercise_calories, steps, distance_km, floors_climbed, heart_rate, ...)`

| Column | Source | Description |
|--------|--------|-------------|
| `activity_type` | `type::text` | Specific metric type |
| `value` | `value` | Numeric value of the metric |
| `activity_name` | `metadata->>'activity_name'` | Human-readable activity name |
| `intensity` | `metadata->>'intensity'` | low / moderate / high |

### `view_events_sleep`
Filters: `metric_type IN (sleep_hours, sleep_deep, sleep_rem, sleep_light, sleep_awake, sleep_score, sleep_latency)`

| Column | Source | Description |
|--------|--------|-------------|
| `sleep_metric` | `type::text` | Specific sleep metric |
| `value` | `value` | Numeric value |
| `sleep_score` | `metadata->>'sleep_score'` | Composite sleep score |
| `body_battery` | `metadata->>'body_battery'` | Body battery value |

### `view_events_note`
Filters: `metric_type = 'custom'`

| Column | Source | Description |
|--------|--------|-------------|
| `note_value` | `value` | Numeric value (if applicable) |
| `note_text` | `metadata->>'note_text'` | Free-form note text |
| `tags` | `metadata->>'tags'` | Comma-separated tags |

## Python Domain Models

Each SQL view has a corresponding Python dataclass in `src/graph/views.py`:

| View | Domain Model | Factory Method |
|------|-------------|----------------|
| `view_events_meal` | `MealEvent` | `MealEvent.from_health_metric(row)` |
| `view_events_insulin` | `InsulinEvent` | `InsulinEvent.from_health_metric(row)` |
| `view_events_glucose` | `GlucoseReading` | `GlucoseReading.from_health_metric(row)` |
| `view_events_activity` | `ActivityEvent` | `ActivityEvent.from_health_metric(row)` |
| `view_events_sleep` | `SleepEvent` | `SleepEvent.from_health_metric(row)` |
| `view_events_note` | `NoteEvent` | `NoteEvent.from_health_metric(row)` |

All models extend `HealthEventBase` which provides:
- `id`, `person_id`, `timestamp`, `source`, `value`, `unit`, `metadata`, `created_at`

## Query Helpers

```python
from src.graph import query_typed_events, query_typed_events_as_models

# Raw dict rows
rows = await query_typed_events(
    session, "glucose",
    person_id=1,
    start=datetime(2025, 6, 1),
    source="nightscout",
    limit=50,
)

# Deserialised domain models
readings: list[GlucoseReading] = await query_typed_events_as_models(
    session, "glucose",
    person_id=1,
    order="ASC",
)
```

## Usage Notes

- Views are compatible with GraphEngine queries — the GraphEngine already
  reads from `health_metrics` and can equally read from the views.
- Synthetic legends work through the same views: both `source = 'graph_engine.*'`
  and `source = 'nightscout'` data appear transparently.
- The DDL is idempotent (`CREATE OR REPLACE VIEW`). Call
  `ensure_health_event_views(session)` at startup to guarantee views exist.

## Compatibility

| Concern | Status |
|---------|--------|
| Non-destructive — no migration of health_metrics | ✅ |
| Nightscout data queryable | ✅ |
| Simulator/graph_engine data queryable | ✅ |
| Pattern engine can consume views | ✅ |
| LLM prompts can reference views | ✅ |
| Idempotent setup | ✅ |