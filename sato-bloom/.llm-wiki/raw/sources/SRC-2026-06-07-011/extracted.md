# PRD: T1D Companion v2 — Parser Abstraction & Architecture Refactor

> **Status:** Draft → Ready for Implementation  
> **Author:** pi-architecture-review  
> **Date:** 2026-05-31  
> **Labels:** `architecture`, `refactor`, `parser`, `testing`

---

## 1. Problem Statement

### Who has the problem
Developers working on the T1D Companion v2 codebase.

### What the problem is
After a rapid single-day development burst (20 commits, May 30–31), the codebase has accumulated structural debt that blocks testing, hinders parallel development, and increases bug surface area:

1. **`src/runner.py` is a god module** (38 symbols). It handles LLM client setup, retry logic, deterministic parsing, food lookup, forecasting, safety validation, evidence bundling, text rendering, and the main async event loop — violating the Single Responsibility Principle.
2. **Parser logic is scattered**: deterministic regex patterns and LLM-based parsing are interleaved with no shared contract or abstraction, making it impossible to unit-test either path in isolation.
3. **Forecast engine (`src/forecast_engine.py`, 39 symbols)** mixes dataclasses, calibration constants, execution logic, evidence population, and OU simulation into one file.
4. **Food service (`app/food/service.py`)** tightly couples Postgres DB lookup with deterministic archetype fallback, making both paths hard to test independently.
5. **Shallow modules** like `src/prediction_schema_adapter.py` (single 42-line function) and `src/forecast_renderer.py` (6 symbols) add file overhead without providing real abstraction depth.

### Evidence it's real
- Only 3 test files exist for 35 source files — thin test coverage.
- CodeGraph analysis shows 412 nodes across 714 edges with significant coupling in `runner.py` and `forecast_engine.py`.
- The architecture review identified 15 distinct structural issues across duplication, tight coupling, shallow modules, and missing abstractions.
- Every feature addition (graph engine, historical insights, uncertainty decomposition) has been layered into already-overloaded modules rather than emerging from clean boundaries.

---

## 2. Solution

### What we're building
A **Parser Abstraction & Architecture Refactor** that:
1. Extracts a clean `MealParser` contract with pluggable implementations.
2. Introduces an `OllamaClient` for reusable LLM communication.
3. Sets the pattern for subsequent P0 refactors (god module, forecast engine split).
4. Adds unit test coverage for the newly extracted modules.

### How it works

```
User input (meal text)
  → MealParser.parse(text)
    → DeterministicParser  OR  LLMParser
      → list[ParsedFood]
  → FoodRepository.resolve(foods)
    → PostgresFoodRepository  OR  ArchetypeFoodRepository
  → ForecastOrchestrator.run(foods, profile)
    → ForecastStage.forecast(totals, hour)
  → SafetyScaffold.validate(response)
  → ResponseRenderer.render(result)
  → Card output
```

### Key behaviors
- The `DeterministicParser` and `LLMParser` both implement `MealParser` (ABC).
- `LLMParser` receives an injected `OllamaClient` (handles retry, timeout, prompt loading).
- `runner.py` becomes a thin composition root — it wires dependencies but contains no business logic.
- All extracted modules have standalone unit tests.

---

## 3. User Stories

- **As a** developer, **I can** swap the meal parser implementation by changing one line in the composition root **so that** I don't need to modify parser internals or scattered conditional branches.
- **As a** developer, **I can** run unit tests for the deterministic parser without an Ollama server running **so that** CI is fast and deterministic.
- **As a** developer, **I can** mock `OllamaClient` when testing the LLM parser **so that** my tests don't make real HTTP calls.
- **As a** developer, **I can** understand the codebase in under 10 minutes by reading `src/parser/` and `src/forecast/` directories **so that** onboarding is fast.
- **As a** QA engineer, **I can** verify parser edge cases (combined dishes, quantity extraction, unit handling) via dedicated test files **so that** regressions are caught before they reach integration tests.

---

## 4. Implementation Decisions

### Technical choices
- **ABC for parser contract**: `MealParser` abstract base class with a single `parse(text: str) -> list[ParsedFood]` method. Keeps the surface area minimal.
- **Dataclasses for results**: Reuse existing `ParsedFood` dataclass from `app/food/service.py` — it's already the canonical shape.
- **OllamaClient as separate class**: Extracted from `runner.py` lines 182–203. Handles `AsyncClient`, retry with exponential backoff, timeout, and prompt loading from `data/` or `prompts/`.
- **No dependency injection framework**: Pure constructor injection. The project is small enough that a framework would be overkill.

### Trade-offs considered
| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| ABC vs Protocol | ABC is explicit, IDE-friendly | Slightly more boilerplate | **ABC** — team size is small, clarity wins |
| Extract OllamaClient now vs later | Unblocks LLM parser testing | Adds one more module | **Now** — it's a prerequisite for parser extraction |
| Keep regex patterns in code vs config | Config is flexible | Adds file I/O to parser tests | **In code for now** — patterns are stable, can externalize later |
| Split into `src/parser/` package vs flat files | Package scales better | More directories | **Package** — sets pattern for `src/forecast/` split later |

### Architecture target
```
src/
  parser/
    __init__.py          # exports MealParser, DeterministicParser, LLMParser
    base.py              # MealParser ABC
    deterministic.py     # regex-based deterministic parser (from runner.py)
    llm.py               # LLM-based parser using injected OllamaClient
    client.py            # OllamaClient with retry/timeout/prompt loading
```

---

## 5. Testing Decisions

### How we'll validate
1. **Tracer bullet test**: Write a test that instantiates `DeterministicParser`, calls `parse("2 donuts and a coke")`, and asserts the returned `ParsedFood` list matches expected items, quantities, and units.
2. **LLM parser test**: Mock `OllamaClient.parse()` to return a known JSON response, then assert `LLMParser.parse()` produces the correct `ParsedFood` list.
3. **Fallback test**: Mock `OllamaClient` to raise `TimeoutException`, assert `LLMParser` falls back to `DeterministicParser`.
4. **Integration regression**: Verify existing golden tests in `tests/test_golden_matrix.py` still pass after runner.py is updated to use the new parser abstraction.

### Metrics & acceptance criteria
- [ ] ` DeterministicParser` has ≥ 80% unit test coverage.
- [ ] `LLMParser` has ≥ 80% unit test coverage (via mocked client).
- [ ] `OllamaClient` retry logic has unit tests for timeout, HTTP error, and success paths.
- [ ] `tests/test_golden_matrix.py` passes with zero regressions.
- [ ] `runner.py` line count reduced by ≥ 30% (business logic moved to parser package).
- [ ] No new mypy errors introduced.

---

## 6. Out of Scope

| Item | Why not |
|------|---------|
| Refactoring `forecast_engine.py` (#6) | That's P0 but depends on parser refactor patterns being established first |
| Splitting food service into repositories (#8) | Follows same pattern as parser; do after parser is merged |
| Extracting `CompanionPipeline` from CLI + companion.py (#9) | Needs forecast engine split first to avoid double refactor |
| Adding type-safe `CalibrationRegistry` (#13) | Independent concern; can be done in parallel |
| Introducing a dependency injection framework | Project is too small; pure constructor injection is sufficient |
| Changing the Ollama model or prompt content | This is parser infrastructure, not model tuning |
| Adding asyncpg/SQLAlchemy repository pattern for graph engine (#10) | Graph work is P3 backlog |
| Full test coverage for entire codebase (#15) | Out of scope for this PRD; targeted parser tests only |

---

## 7. Further Notes

### Dependencies
- Requires `httpx` (already in project dependencies for Ollama calls).
- Requires `pytest` and `pytest-asyncio` (already in `dev` dependencies).

### Risks
| Risk | Mitigation |
|------|------------|
| Deterministic parser regex behavior changes subtly during extraction | Capture current behavior in tests before moving code; golden matrix as regression guard |
| OllamaClient retry logic behaves differently after extraction | Port existing retry loop exactly; add unit tests for each retry path |
| `runner.py` composition becomes complex | Keep it under 50 lines; if it grows, that's a signal to extract a `CompanionPipeline` next |

### Follow-up work
1. Apply same extract-package pattern to `forecast_engine.py` → `src/forecast/` (Issue #6).
2. Apply repository pattern to `app/food/service.py` → `app/food/repository.py` (Issue #8).
3. Merge `src/prediction_schema_adapter.py` into `src/adapter/` (Issue #4).
4. Expand `src/forecast_renderer.py` into multi-format renderer (Issue #5).

### Open questions
- Should `DeterministicParser` support the V1 fallback patterns that currently exist in `runner.py`? Yes — port exactly, do not change behavior.
- Should `OllamaClient` be usable by other modules (e.g., companion narrator)? Yes — design it as a general async LLM client, not parser-specific.
