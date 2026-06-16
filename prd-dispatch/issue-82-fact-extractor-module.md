# PRD: FactExtractor Module Extraction

## Problem Statement

The `t1dFoodGraphService.ts` mixes deterministic fact assembly logic with LLM summarization. This makes testing expensive (1031 tests require LLM calls) and localizes critical domain logic in private functions that are hard to verify independently.

## Solution

Extract a `FactExtractor` module with a clean interface that assembles food/recipe facts deterministically. LLM summarization becomes a thin wrapper over the extracted facts.

## User Stories

1. As a developer, I want to test fact assembly without LLM calls, so that tests run in milliseconds instead of seconds.
2. As a T1D user, I want meal-response facts to include provenance and conflict information, so that I can assess the quality of food recommendations.
3. As a T1D profile, I want facts to be extracted from diary entries, fingerprints, and claim sources, so that evidence-backed answers are assembled consistently.
4. As a safety boundary, I want to separate educational facts from CGM-backed facts, so that uncertainty levels remain clear.
5. As a domain expert, I want to see the deletion test pass — deleting FactExtractor should concentrate complexity across many callers, so that the module proves its depth.

## Implementation Decisions

- Create `FactExtractor` module with `extractFacts(input: FoodExtractionInput): ExtractedFacts` interface
- Move all deterministic logic: `gatherFoodEntryFacts`, `gatherFingerprintFacts`, `gatherClaimFacts`, `gatherSources`, `gatherConflicts`, `computeUncertainty` into FactExtractor
- Keep LLM summarization as `LLMSummarizer.summarize(facts)` wrapper
- Add `confidenceTier` field derived from source count and conflict presence
- Expose `subgraphBundle` alongside facts for future GraphAdapter integration

## Testing Decisions

- Test through the `FactExtractor` interface only (external behavior)
- Deterministic tests verify fact assembly without LLM calls
- LLM tests only verify narrative quality, not fact correctness
- Prior art: `t1dFoodGraphService.test.ts` currently has 1031 assertions on end-to-end behavior

## Out of Scope

- GraphAdapter implementation (future work for issue #13)
- Pattern genome explorer features
- Cohort comparison logic

## Further Notes

This module extraction addresses architectural friction across issues #1, #12, #13, #15 by providing a testable seam for fact assembly that can be verified independently of chat or summarization layers.