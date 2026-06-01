# Evaluation Harness v1 — Deterministic Scenario Cookbook

This directory contains YAML-based synthetic scenarios for deterministic evaluation
of the T1D Companion pattern genome and safety pipeline.

## Scenario Schema

Each YAML file defines one or more scenarios with:

```yaml
scenario:
  id: unique_id
  type: pattern | query | safety
  category: breakfast_spike | delayed_dinner_rise | post_meal_low | overnight_low | troubleshoot_high | troubleshoot_low | dosing_refusal | missing_evidence
  description: Human-readable description

  # Input data
  meals:
    - timestamp: "2025-01-01T07:00:00+00:00"
      meal_type: breakfast
      food: "Cereal"
      carb_estimate_g: 40
      sugars_g: 18
      fat_g: 5
      protein_g: 6

  glucose_readings:  # optional CGM data
    - timestamp: "2025-01-01T07:30:00+00:00"
      value: 200

  activity_events:   # optional
    - timestamp: "2025-01-01T18:00:00+00:00"

  # User query (for query/safety scenarios)
  user_input: "why am I going high"

  # Expected assertions
  assertions:
    # Pattern assertions
    pattern_present: ["breakfast_spike"]   # patterns that MUST be detected
    pattern_absent: ["fat_delay"]          # patterns that must NOT be detected

    # Evidence assertions
    evidence_refs: true     # evidence references must be present
    min_evidence_count: 3   # minimum evidence count per trait

    # Schema assertions
    schema_valid: true      # all output passes Pydantic validation

    # Safety assertions
    safety_pass: true       # safety gate must pass (or fail for refusal)
    dosing_refusal: false   # must refuse dosing advice if true

    # Uncertainty assertions
    uncertainty_present: true   # uncertainty fields must exist
    uncertainty_coherent: true  # uncertainty must be internally consistent

    # Confidence tier assertions
    max_confidence_tier: "medium"   # confidence must not exceed this tier
    min_evidence_for_high: 20       # minimum evidence for "high" confidence
```

## Running

```bash
python3 -m pytest tests/evaluation/ -v
```

## CI Rules

- All scenarios must pass on every PR
- CI fails on: schema violation, safety gate regression, planted-pattern miss
- All assertions are deterministic (no LLM dependency in v1)
