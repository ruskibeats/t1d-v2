# Product Quality Issue Drafts

Source: architecture zoom-out after issue #15/#16/#18/#20/#30 work.

These are vertical-slice issues intended to move T1D Companion v2 from a strong text-first prototype toward a first-class, mobile-ready product surface.

## Recommended priority order

1. Structured Card Model
2. Safety-copy regression tests
3. Terminal renderer compatibility
4. Showcase capability metadata
5. Mobile/API card serialization contract
6. Pipeline orchestration consolidation

---

## Issue: Introduce structured Card Model for companion outputs

Labels: `architecture`, `product-quality`, `mobile`, `refactor`

### What to build

Introduce a structured intermediate representation for companion output cards so meal, evidence, forecast, history, confidence, what-if, pattern, experiment, debrief, and report surfaces are not defined only as terminal strings.

The goal is to make every product surface render from stable card data with explicit metadata such as card id, kind, title, confidence tier, source label, safety label, and payload data.

### Acceptance criteria

- [ ] Meal pipeline cards can be represented as structured card objects before text rendering.
- [ ] At minimum, structured cards exist for parsed foods, food evidence, forecast, meal memory, what-if/counterfactuals, monitoring, confidence, pattern genome, experiment context, clarification, and debrief.
- [ ] Each card includes stable `id`, `kind`, `title`, `data`, and optional `confidence`, `source_label`, `safety_label` fields.
- [ ] Existing terminal output can still be generated after the structured card is created.
- [ ] Tests cover representative cards and verify required metadata is present.

### Blocked by

None.

---

## Issue: Add safety-copy regression tests for user-facing card text

Labels: `safety`, `product-quality`, `testing`

### What to build

Add regression tests that render or inspect every user-facing card/report/demo surface and fail on banned or risky medical advice language.

This should cover terminal cards, showcase output, report exports, and any generated demo text. The goal is to prevent accidental reintroduction of dosing/treatment language.

### Acceptance criteria

- [ ] Tests cover all card families in `src/companion.py`.
- [ ] Tests cover showcase/demo outputs from `src/cli.py` where feasible.
- [ ] Tests cover clinician/care-team export text.
- [ ] Forbidden phrases include dosing/treatment/device-specific terms defined by the shared safety policy.
- [ ] Tests allow explicit safety-boundary statements such as “not dosing advice” only when used as prohibition/disclaimer copy.
- [ ] Full test suite passes.

### Blocked by

None.

---

## Issue: Add terminal renderer compatibility for structured cards

Labels: `text-ux`, `architecture`, `refactor`, `product-quality`

### What to build

Once structured cards exist, add a terminal renderer that preserves the current text-first experience while rendering from structured card objects instead of hand-built strings.

This should keep the CLI/showcase useful as the canonical product proving ground while preparing the same cards for mobile/API rendering.

### Acceptance criteria

- [ ] Terminal renderer can render each structured card family.
- [ ] Existing CLI and showcase tests continue to pass.
- [ ] Golden/snapshot-style tests verify intentional terminal output for core card families.
- [ ] Renderer keeps synthetic/demo source labels and educational disclaimers visible.
- [ ] No regression in safety-copy tests.

### Blocked by

- Introduce structured Card Model for companion outputs.

---

## Issue: Drive showcase coverage from structured capability metadata

Labels: `product-quality`, `showcase`, `testing`, `refactor`

### What to build

Replace showcase coverage inference from rendered text with explicit capability metadata from structured cards.

The showcase runner should know which capabilities were actually demonstrated because cards declare their capability ids, not because the terminal output happened to contain particular strings.

### Acceptance criteria

- [ ] Each structured card can declare one or more capability ids.
- [ ] `--all-cards`, `--demo product`, `--demo investor`, and `--all-legends` build coverage checklists from declared metadata.
- [ ] Coverage checklist still includes meal pipeline, food evidence, forecast, meal memory, counterfactuals, confidence, pattern genome, experiment context, situation routing, clarification, and debrief.
- [ ] Tests prove the checklist fails or marks missing when a capability is not emitted.
- [ ] Product-pitch summary remains polished and investor-ready.

### Blocked by

- Introduce structured Card Model for companion outputs.

---

## Issue: Define mobile/API card serialization contract

Labels: `mobile`, `architecture`, `api`, `product-quality`

### What to build

Define and test a JSON serialization contract for mobile-compatible cards.

This should turn the mobile parity spec into a concrete payload shape that future mobile/API work can consume without parsing terminal text.

### Acceptance criteria

- [ ] Document or implement a canonical card JSON schema.
- [ ] Every card includes stable `id`, `kind`, `title`, `data`, `source_label`, and `safety_label` fields.
- [ ] Confidence-aware cards include `confidence` and `missing_information_flags` where applicable.
- [ ] Forecast cards include chart-ready data rather than ASCII-only output.
- [ ] Serialization tests cover at least meal evidence, forecast, confidence, history, pattern, experiment, and debrief cards.
- [ ] Schema aligns with `docs/mobile-parity-ux-spec.md` and `docs/state_serialization_spec.md`.

### Blocked by

- Introduce structured Card Model for companion outputs.

---

## Issue: Consolidate runner and CompanionPipeline orchestration

Labels: `architecture`, `refactor`, `testing`, `product-quality`

### What to build

Reduce drift between `src/runner.py` and `src/pipeline/companion_pipeline.py` by establishing one canonical orchestration path for parse → food evidence → forecast → historical context → evidence bundle → safety.

The CLI and programmatic pipeline should share behavior for evidence propagation, missing-information flags, counterfactuals, historical context, and safety validation.

### Acceptance criteria

- [ ] One canonical orchestration path is identified and documented.
- [ ] CLI and pipeline entry points produce consistent key fields for the same deterministic input.
- [ ] Food evidence, missing-information flags, confidence tier, forecast evidence fields, counterfactual context, and safety output are propagated consistently.
- [ ] Tests cover both entry points with the same scenario.
- [ ] No silent fallback behavior is introduced for LLM or food DB failures.
- [ ] Full test suite passes.

### Blocked by

Can start independently, but should coordinate with structured Card Model work to avoid duplicate refactors.
