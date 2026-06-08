# PRD: Next-Level Showcase Runner

## Problem Statement

T1D Companion v2 now has a substantial set of AI-assisted capabilities: LLM meal parsing, food evidence, glucose forecasting, historical similarity, what-if cards, troubleshooting cards, situation cards, daily check-ins, insights, safety review, calibration metadata, graph-backed context, and legend profiles.

The current terminal showcase demonstrates parts of this system, but it still feels like a developer walkthrough rather than a polished product demo. A stakeholder, clinician, product partner, or investor should be able to run one command and immediately understand the potential of the app.

The problem is real because recent CLI demos exposed friction:

- Random showcase selection can miss important features.
- Single-question mode under-demonstrates the system.
- LLM behavior must be central, not hidden behind deterministic fallback.
- Demo output needs clearer narrative, feature coverage, and AI provenance.
- The terminal runner should make the product vision obvious without requiring code knowledge.

## Solution

Build a next-level showcase runner that intentionally demonstrates every meaningful feature written so far through a polished terminal narrative.

The runner should present a complete product-style demo around one or more legends, showing how AI parsing, evidence lookup, forecast generation, historical context, what-if reasoning, troubleshooting, routine check-ins, safety constraints, and insights combine into a coherent companion experience.

### Key Behaviors

1. **Showcase modes**
   - `single`: one curated legend story.
   - `all-cards`: one example of every card family.
   - `all-legends`: compact tour across all 12 legend profiles.
   - `investor-demo` or `product-demo`: tightly scripted, high-signal flow.

2. **AI-first operation**
   - LLM parsing is the default and required for AI demo modes.
   - If Ollama/LLM fails, the runner surfaces a clear error and exits non-zero.
   - Deterministic parsing remains available only via explicit developer/debug flag.

3. **Narrative structure**
   - Start with the legend and their context.
   - Show current CGM and profile traits.
   - Show the question deck.
   - Run feature cards in a deliberate sequence.
   - End with a concise “what was demonstrated” summary.

4. **Feature coverage summary**
   At the end of a demo, print a checklist of features exercised:
   - LLM parser
   - food evidence
   - forecast engine
   - uncertainty band
   - historical meal context
   - graph-derived context, when available
   - safety scaffold
   - what-if card
   - troubleshooting high/low
   - situation card
   - morning/lunch/evening cards
   - insights card

5. **Demo polish**
   - Avoid noisy internal logs.
   - Avoid stack traces for expected user exits.
   - Clearly label AI-generated vs deterministic/debug output.
   - Keep educational safety framing visible.
   - Provide stable commands for repeatable demos.

## User Stories

- As a product owner, I can run a single showcase command so that I can demo the full companion vision without explaining internals.
- As a stakeholder, I can see every major card family so that I understand the breadth of the app.
- As an engineer, I can run strict LLM mode so that AI failures are visible instead of hidden.
- As a demo operator, I can choose a specific legend so that I can tell a consistent story.
- As a clinician reviewer, I can see safety language and confidence boundaries so that I can assess risk posture.
- As a tester, I can run non-interactive showcase mode so that terminal output can be regression-tested.
- As a developer, I can still use deterministic parsing explicitly so that I can debug non-LLM subsystems.

## Implementation Decisions

- Keep `src.cli` as the terminal entry point.
- Keep LLM mode strict by default: no automatic deterministic fallback.
- Keep deterministic parser available behind explicit `--no-llm` developer/debug flag.
- Extend current legend-based showcase instead of creating a separate demo app.
- Use existing card builders in `src.companion` rather than duplicating UI text.
- Use existing `run_companion_scenario` pipeline for meal/what-if flows.
- Add a demo coverage tracker that records which feature families were exercised.
- Prefer scripted demo sequences for high-quality presentations over random-only behavior.

## Testing Decisions

Success means the terminal showcase can be run reliably and visibly demonstrates all major features.

### Acceptance Criteria

- [ ] `python3 -m src.cli --demo product --legend 1` or equivalent runs a polished full demo.
- [ ] `--all-cards` exercises every card family and prints a final coverage checklist.
- [ ] LLM parser is used by default for meal and what-if flows.
- [ ] LLM connection or parse errors produce clear terminal errors and non-zero exit codes.
- [ ] `--no-llm` remains explicitly labeled as developer/debug only.
- [ ] User interrupts exit cleanly without asyncio tracebacks.
- [ ] Situation cards route to heat/exercise/alcohol/illness based on question text.
- [ ] Demo output includes an end summary of capabilities shown.
- [ ] Non-interactive demo mode is testable in CI.
- [ ] Existing tests remain green.

### Suggested Tests

- CLI argument parsing tests for demo modes.
- Snapshot-style tests for non-interactive `--all-cards --no-llm` output.
- Mocked LLM success test showing `Parser: llm` in output.
- Mocked LLM failure test asserting non-zero exit and clear error.
- Coverage checklist test verifying every expected feature appears.

## Out of Scope

- Building a web/mobile UI.
- Clinical validation of forecasts.
- Replacing terminal cards with Rich/Textual UI.
- Removing deterministic parser entirely.
- Rewriting the forecast model.
- Adding new medical recommendations or dosing guidance.

## Further Notes

### Dependencies

- Ollama must be reachable for AI demo modes.
- `DATABASE_URL` must be configured for full food evidence and graph-backed context.
- `data/legends.json` should remain the canonical demo dataset.

### Risks

- LLM output quality can vary; demo commands should use curated prompts/questions.
- Food evidence quality remains a core product risk.
- The terminal demo should avoid implying clinical validation.

### Follow-Up Work

This PRD complements the existing open product-hardening issues:

- #13 test coverage edge cases
- #15 food uncertainty/evidence confidence
- #16 calibration harness
- #17 graph provenance/confidence labels
- #18 mobile parity UX state spec
- #19 safety regression matrix
