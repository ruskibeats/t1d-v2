# T1D Companion v2

Educational Type 1 Diabetes meal-impact companion and glucose forecast simulator.

> **Safety boundary:** this is **not medical advice** and does **not** calculate or recommend insulin dosing. It explains simulated glucose impact, uncertainty, historical context, and monitoring windows.

## What the app does

Given a meal description such as:

```text
pizza and large fries
```

The app can:

1. Parse foods from the text.
2. Look up nutrition evidence from Postgres/OpenFoodFacts when available, with deterministic fallback foods.
3. Estimate meal totals and carb uncertainty.
4. Select one of 12 simulated T1D profile anchors.
5. Run a physiology-inspired glucose forecast.
6. Add historical context from similar meals when available.
7. Build an evidence bundle for safe narration.
8. Validate output with a safety gate.
9. Print a text-first UX prototype for the eventual mobile app.

## Quick start

Install runtime + dev dependencies:

```bash
pip install -e '.[dev]'
```

Run the end-to-end text runner:

```bash
python3 -m src.runner "pizza and large fries" --anchor high_fat_delayed
```

After `pip install -e '.[dev]'`, you can also use the CLI command:

```bash
t1d-companion "pizza and large fries" --anchor high_fat_delayed
```

Run with JSON output:

```bash
python3 -m src.runner "2 donuts and 3 cokes" --anchor post_meal_spike --json
```

Run tests:

```bash
pytest -q
```

## Optional database integration

If `DATABASE_URL` points at a Postgres database containing the `openfoodfacts_products` table, `app/food/service.py` searches that table first. If the DB is unavailable or no match is found, it falls back to deterministic built-in food archetypes.

Example:

```bash
export DATABASE_URL="postgresql+asyncpg://postgres:postgres@localhost:5432/t1d_companion"
python3 -m src.runner "pizza" --anchor well_controlled
```

## Architecture

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the pipeline, module responsibilities, testing strategy, and suggested Git branch workflow.

## Key modules

- `src/runner.py` — recovered V2 CLI pipeline / text UX prototype
- `src/forecast_engine.py` — core deterministic forecast pipeline
- `src/physiology_model.py` — physiology-inspired compartment model
- `src/calibration_constants.py` — single source of truth for anchor calibration constants
- `src/evidence_bundle.py` — bridge from forecast/model output to narrator evidence JSON
- `src/prediction_schema_adapter.py` — converts forecasts to canonical prediction schema
- `app/food/service.py` — Postgres/OpenFoodFacts-backed food lookup with deterministic fallback
- `app/ai/safety.py` — safety veto gate for emergency/dosing/treatment language
- `app/services/historical_meal_matcher.py` — historical similar-meal context
- `app/simulator/` — 12 simulated T1D profile anchors
- `app/schemas/` — canonical prediction and safety schemas
- `tests/test_golden_matrix.py` — V1 golden matrix regression coverage

## Current product direction

Near-term focus:

1. Tune food matching quality.
2. Improve text-first UX states for terminal/mobile parity.
3. Expand golden tests.

Later/deeper branches:

1. Medical-adjacent safety policy and review.
2. Real CGM/Nightscout/Dexcom calibration and validation.

## License

MIT
