# Progress
Branch: historical-insight-depth
Previous branch merged: food-matching-tuning → main (7,094 graph edges, 4 edge types: meal_to_glucose_spike 6,014, precedes 2,007, sleep_to_next_day_glucose 1,091, meal_to_delayed_spike 732)

## Status
In Progress

## Tasks
- Item 6: Similarity reason — "Matched on X + Y + Z" → DONE (historical meal matcher + Postgres metrics)
- Item 7: What changed vs prior (e.g., "carbs 18g higher than usual"))
- Item 8: Best past outcome
- Item 9: Consistency score
- Item 10: Counterfactual note — "Without the coke, this would be lower risk"

## Files Changed

## Notes
- Postgres knowledge graph built with health_metric_edges table
- 12 legend users with 90-day food history synthetic data
- Graph queries: compare_meal_outcomes_by_sleep_quality, find_similar_meals_with_better_outcomes, trace_backward_from_good_morning_glucose, find_repeating_low_risk_motifs
