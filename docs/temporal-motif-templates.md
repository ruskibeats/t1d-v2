# Temporal Motif Query Templates

## Pattern Types with Detection Logic

### FastSpike
```cypher
MATCH (f:FoodItem)-[:ate]->(m:MealEvent)-[:produced]->(r:MealResponseFingerprint)
WHERE 
  r.delta_mg_dl > 50 AND     // Significant spike
  r.time_to_peak_minutes < 90 AND  // Fast onset
  r.baseline_glucose < 140
RETURN f.food_name, avg(r.delta_mg_dl), count(*)
```

### DelayedRise
```cypher
MATCH (f:FoodItem)-[:ate]->(m:MealEvent)-[:produced]->(r:MealResponseFingerprint)
WHERE
  r.time_to_peak_minutes > 120 AND  // Late peak
  r.delta_mg_dl BETWEEN 30 AND 80 AND  // Moderate spike
  r.late_tail_score > 0.3
RETURN f.food_name, avg(r.delta_mg_dl), count(*)
```

### ExerciseBufferedMeal
```cypher
MATCH (e:ExerciseEvent)-[:occurred]->(t:TimeWindow)-[:precedes]->(m:MealEvent)
WHERE
  t.hours_before_meal <= 2 AND
  t.hours_before_meal >= 0
MATCH (m)-[:produced]->(r:MealResponseFingerprint)
WHERE r.delta_mg_dl < 30
RETURN e.exercise_name, avg(r.delta_mg_dl), count(*)
```

### HighFatLateTail
```cypher
MATCH (f:FoodItem)-[:ate]->(m:MealEvent)-[:produced]->(r:MealResponseFingerprint)
WHERE
  f.fat_g > 25 AND
  r.late_tail_score > 0.5 AND
  r.recovery_time_minutes > 180
RETURN f.food_name, avg(r.late_tail_score), count(*)
```

## Implementation Notes

1. **Temporal edges needed**: MEAL_PRECEDES_GLUCOSE_SEGMENT, WITHIN_2H_OF_MEAL, BOLUS_BEFORE_MEAL
2. **GraphAdapter queryPattern** already exists - shape these queries with string interpolation
3. **Pattern fingerprints** from MealResponseFingerprint table already have: delta, peak, time_to_peak, late_tail_score