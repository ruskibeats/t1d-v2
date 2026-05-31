# T1D Companion v2 Architecture

T1D Companion v2 is an educational meal-impact simulator. It predicts and explains likely glucose movement after a meal for simulated Type 1 Diabetes profile anchors.

> It is not medical advice and must not recommend insulin dosing or treatment changes.

## Product spine

```text
meal text
  → parsed foods
  → food evidence + carb uncertainty
  → simulated profile anchor
  → physiology forecast
  → historical similar-meal context
  → evidence bundle
  → safety validation
  → text-first UX response
```

## Main runtime

The current runnable text-first prototype is:

```bash
python3 -m src.runner "pizza and large fries" --anchor high_fat_delayed
```

The runner is deliberately text-first. The terminal output is treated as the first version of the eventual mobile UI: if the information is not clear in text, it is probably not ready for mobile.

Mobile parity design target: see [`docs/mobile-parity-ux-spec.md`](mobile-parity-ux-spec.md) for the first-class mobile screen, state, navigation, and card-mapping spec.

## Layers

### 1. Text parsing

File: `src/runner.py`

Turns user meal text into `ParsedFood` items. The current parser is deterministic and intentionally simple. Food-matching improvements should add regression tests in `tests/test_golden_matrix.py`.

### 2. Food evidence

File: `app/food/service.py`

Search order:

1. Postgres `openfoodfacts_products` table when `DATABASE_URL` is configured.
2. Deterministic built-in archetypes when the DB is unavailable or has no match.

Outputs item-level nutrition, confidence, warnings, and carb uncertainty ranges.

### 3. Profile selection

Files:

- `app/simulator/schemas.py`
- `app/simulator/patient_factory.py`

There are 12 documented simulated T1D profile anchors:

- `well_controlled`
- `high_fat_delayed`
- `post_meal_spike`
- `brittle`
- `dawn_phenomenon`
- `overnight_hypo`
- `exercise_sensitive`
- `exercise_regimen`
- `insulin_sensitive`
- `insulin_resistant`
- `high_variability`
- `newly_diagnosed`

### 4. Forecast engine

Files:

- `src/forecast_engine.py`
- `src/physiology_model.py`
- `src/calibration_constants.py`

The forecast is deterministic and physiology-inspired. It models gut absorption, fat-delayed absorption, insulin action, basal reversion, and renal clearance.

`src/calibration_constants.py` is the single source of truth for anchor calibration constants.

### 5. Historical context

File: `app/services/historical_meal_matcher.py`

Uses historical meal data when available, including the V1 fallback dataset at:

```text
/root/t1d/data/food_history_90d.json
```

Historical context must be phrased as educational observation only.

### 6. Evidence bundle

File: `src/evidence_bundle.py`

Converts model/service outputs into the JSON shape expected by the companion narrator contract.

### 7. Prediction schema

Files:

- `app/schemas/prediction.py`
- `src/prediction_schema_adapter.py`

`GlycemicPrediction` is the canonical prediction contract for forecast outputs.

### 8. Safety validation

Files:

- `app/ai/safety.py`
- `app/schemas/safety.py`

`SafetyScaffold` is the current local veto gate. It blocks emergency/dosing/treatment-risk language and requires educational disclaimers.

## Testing

Golden tests live in:

```bash
tests/test_golden_matrix.py
```

Run:

```bash
pytest -q
```

The tests currently cover:

- all 12 profiles
- meal archetype behavior
- safety phrase blocking
- parser examples
- food-service archetypes
- runner end-to-end smoke

## See Also

- [Mobile Parity UX State Spec](mobile-parity-ux-spec.md) — first-class mobile screen, state, navigation, and card-mapping target.
- [State Serialization Spec](state_serialization_spec.md) — canonical cross-boundary state fields for prediction/session records.
- [Calibration Protocol](calibration_protocol.md) — calibration validation and regression protocol.

## Git workflow

Recommended branches:

- `food-matching-tuning`
- `text-ux`
- `safety-policy`
- `calibration-validation`

Keep deep safety and real calibration work on separate branches. They are high-impact and should be reviewed carefully.
