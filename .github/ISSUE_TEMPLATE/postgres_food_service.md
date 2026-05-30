---
name: Postgres-only food service rollout
about: Ensure all environments use DATABASE_URL and remove all traces of fake food fallback
title: "infra: postgres-only food service"
labels: enhancement, food-matching
assignees: ''
---

## What to build

The food service now queries only Postgres/OpenFoodFacts. When `DATABASE_URL` is unset or the DB is unreachable, it returns an empty list and the runner returns a clear `database_error` message. No built-in fallback database exists.

Ensure:
- The runner works at all times (the early-return path is tested).
- The CLI output for a disconnected state is helpful.
- No code path silently falls through to a fake food estimate.

## Acceptance criteria

- [ ] Running without `DATABASE_URL` prints: "Cannot estimate this meal — database connection is not available."
- [ ] Running with `DATABASE_URL` set and live Postgres returns real OpenFoodFacts matches
- [ ] `db_manager.verify_connection()` returns `True`/`False` correctly
- [ ] All tests pass with and without `DATABASE_URL` set
- [ ] No built-in food archetypes remain in `app/food/service.py`

## Blocked by

- `food-matching-tuning` branch merge

---
name: Safety policy externalisation
about: Move emergency keywords, dosing patterns, and treatment patterns to data/safety_policy.json
title: "safety: externalise policy to JSON"
labels: safety
assignees: ''
---

## What to build

Dosing/treatment regex patterns were moved from code to `data/safety_policy.json` in the `food-matching-tuning` branch. Confirm that:

- The JSON file is the single source of truth.
- Changes to safety policy do not require code deploys.
- The `SafetyScaffold` falls back to hardcoded defaults when the file is missing.
- A test verifies that editing the JSON file changes behaviour without touching Python code.

## Acceptance criteria

- [ ] `data/safety_policy.json` is loaded at `SafetyScaffold` init
- [ ] Toggling a dosing pattern in the JSON file changes `validate()` output (tested)
- [ ] Missing file falls back to hardcoded defaults (tested)
- [ ] All 16 tests pass
- [ ] No dosing/treatment regex patterns remain in Python code except as fallback

## Blocked by

- `food-matching-tuning` branch merge

---
name: Ollama meal parser reliability
about: Monitor and harden the LLM meal parser with retry, timeout, and fallback metrics
title: "ops: ollama parser reliability"
labels: enhancement, ops
assignees: ''
---

## What we have

The Ollama parser at `parse_meal_llm()` was recovered from V1. It:
- Calls Ollama at `$OLLAMA_URL` with the `prompts/parser_system.txt` prompt.
- Retries twice with exponential backoff (5s connect, 15s total timeout).
- Falls back to deterministic regex on timeout/failure.
- Merges deterministic hints (units, quantities) back into LLM results.

## What to build

- Add a parse-quality metric: track success rate, avg latency, fallback rate.
- Add a `--parse-stats` CLI flag to expose the metrics.
- Consider caching common meal patterns so repeated queries skip Ollama.
- Add an optional local TinyDB/SQLite cache keyed on meal text hash.

## Acceptance criteria

- [ ] Parse latency is logged at INFO level
- [ ] Parse success/fail is logged at WARN level for failures
- [ ] Repeated identical meal texts within a session are cached
- [ ] CLI `--parse-stats` prints: hits, misses, avg latency, fallback rate
- [ ] All 16 tests still pass

## Blocked by

- `food-matching-tuning` branch merge

