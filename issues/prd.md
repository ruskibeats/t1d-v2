# PRD: SparkyFitness Backend Reskin into T1D/Bloom with Sato Skin Theme

## Problem Statement

The current backend still behaves like a SparkyFitness wellness and nutrition API. The product direction is moving toward a T1D-focused Bloom experience: a backend that understands glucose, CGM, Nightscout imports, meal reviews, forecast envelopes, Bloom windows, and Sato's watercolor skin language.

The problem is that the backend has some T1D infrastructure already, but it is not yet exposed as a coherent product surface. T1D data structures, repositories, RLS policies, and import services exist, but they are not mounted as public APIs. The AI chat layer still presents itself as Sparky, a nutrition and wellness coach, rather than a medically bounded T1D-aware assistant. The shared Bloom vocabulary exists, but server-side Bloom computation is incomplete. The Sato skin theme exists in the mobile prototype, but it is not yet a shared backend/mobile contract.

The user needs a structured product and implementation plan that turns this partial reskin into a test-driven, incremental backend transformation without breaking existing SparkyFitness behavior.

## Solution

Reskin the backend into a T1D/Bloom backend through vertical, test-driven slices.

The first slices should expose real behavior through public APIs instead of doing a cosmetic rename first. The backend should gradually gain:

1. A shared Sato skin theme contract.
2. T1D profile APIs.
3. Nightscout/CGM import APIs.
4. T1D meal review and forecast envelope APIs.
5. T1D-aware chat behavior.
6. Server-side Bloom window computation.
7. Optional T1D onboarding.
8. Branding/config rename only after behavior is stable.

The implementation should follow TDD: one public behavior, one failing test, one minimal implementation, then refactor. Tests should verify external behavior through public APIs rather than internal implementation details.

## User Stories

1. As a product owner, I want a clear PRD for the backend reskin, so that implementation can proceed without confusing cosmetic rename work with functional T1D work.
2. As a person with T1D, I want to create or retrieve my T1D profile, so that the backend knows how to associate my data with the right profile.
3. As a person with T1D, I want to opt into T1D mode after completing existing fitness onboarding, so that I do not have to restart onboarding from scratch.
4. As a person with T1D, I want to connect or import CGM data, so that Bloom can reason about my glucose patterns.
5. As a person with T1D, I want to import Nightscout CGM data, so that I can bring existing CGM history into Bloom.
6. As a person with T1D, I want Nightscout imports to be idempotent, so that repeated imports do not duplicate readings.
7. As a person with T1D, I want invalid CGM imports to be rejected clearly, so that I can fix configuration or payload issues.
8. As a person with T1D, I want CGM data to be protected from other users, so that my glucose history remains private.
9. As a person with T1D, I want to query CGM data by date range, so that I can inspect a specific period.
10. As a person with T1D, I want to see CGM summaries for a date range, so that I can understand min, max, average, and time-in-range.
11. As a person with T1D, I want meal reviews saved against my profile, so that I can track how specific meals affected me.
12. As a person with T1D, I want meal reviews to include safety boundaries, so that they do not become dosing or treatment recommendations.
13. As a person with T1D, I want forecast envelopes saved against my profile, so that I can preserve predicted glucose ranges and assumptions.
14. As a person with T1D, I want forecast envelopes to include provenance, so that I know whether they came from a simulation, model, or manual note.
15. As a person with T1D, I want vector search over my T1D context, so that chat and analysis can retrieve relevant historical notes.
16. As a person with T1D, I want vector search to respect profile ownership, so that private context is not exposed to other users.
17. As a person with T1D, I want chat to understand CGM and meal-review context when available, so that responses feel grounded in my data.
18. As a person with T1D, I want chat to refuse dosing, insulin adjustment, and treatment advice, so that the assistant remains educational and safe.
19. As a person with T1D, I want chat to defer emergencies to clinicians or emergency support, so that unsafe medical situations are not handled by AI.
20. As a person with T1D, I want Bloom windows computed from food, exercise, sleep, stress, and CGM data, so that my day can be represented as a metabolic pattern.
21. As a person with T1D, I want Bloom windows to include glucose averages, peaks, rate of change, and confidence, so that the visualization is meaningful.
22. As a person with T1D, I want Bloom windows to include pigment keys, so that the Sato renderer can map metabolic states to watercolor pigments.
23. As a person with T1D, I want low-data Bloom windows to be marked as low confidence, so that the UI does not overstate certainty.
24. As a person with T1D, I want Bloom windows to be deterministic for the same input data, so that visualizations are stable and testable.
25. As a mobile user, I want the backend to expose Sato skin theme tokens, so that the app can render the official product identity.
26. As a mobile user, I want Sato colors, pigments, surfaces, and typography metadata to be consistent across backend and mobile, so that the experience feels coherent.
27. As a mobile user, I want the Bloom API response to match the Sato Bloom renderer, so that the clock can render backend-produced data without custom mapping.
28. As a developer, I want the Sato skin theme to live in shared code, so that backend and mobile do not duplicate palette and pigment definitions.
29. As a developer, I want React Native Skia dependencies to stay mobile-specific, so that backend services remain lightweight and testable.
30. As a developer, I want to keep SparkyFitness env vars working during transition, so that existing deployments are not broken by the reskin.
31. As a developer, I want Bloom/T1D env vars to be introduced before old SparkyFitness vars are removed, so that migration can happen safely.
32. As a developer, I want old and new auth cookies to be handled during transition, so that users do not get logged out unexpectedly.
33. As a developer, I want RLS policies to be verified for every T1D table, so that user data cannot leak across profiles.
34. As a developer, I want Swagger to document the new T1D, Bloom, and skin theme APIs, so that clients know the public contracts.
35. As a developer, I want tests to be integration-style and public-interface focused, so that tests verify behavior rather than implementation details.
36. As a developer, I want to implement one vertical slice at a time, so that each cycle produces a working behavior before moving to the next.
37. As a developer, I want not to write all tests first and all implementation later, so that tests stay aligned with real behavior.
38. As a developer, I want refactor work to happen only after tests pass, so that RED work does not become speculative redesign.
39. As an operator, I want database role rename to be deferred until there is a dedicated migration plan, so that production deployments are not destabilized.
40. As a product owner, I want branding and cosmetic rename to happen after functional T1D/Bloom behavior is stable, so that the reskin is not mistaken for a complete product change.
41. As a reviewer, I want the PRD to clearly separate in-scope backend work from out-of-scope mobile implementation details, so that implementation can stay focused.
42. As a reviewer, I want the PRD to identify safety boundaries for T1D AI behavior, so that medical risk is explicit.

## Implementation Decisions

- The reskin will be implemented through vertical TDD slices rather than a single large rewrite.
- Functional T1D/Bloom behavior comes before cosmetic SparkyFitness renaming.
- The backend will preserve existing SparkyFitness behavior during transition.
- New Bloom/T1D env vars should be introduced as aliases before old SparkyFitness env vars are removed.
- Auth cookies should support a transition period where old Sparky cookies are read and new Bloom cookies are written.
- DB role renaming is out of the first implementation wave and should be treated as a separate migration.
- T1D profile ownership must be enforced through RLS and authenticated route behavior.
- T1D API routes must use the authenticated user context to associate data with the correct profile.
- T1D onboarding should be optional and backward-compatible with existing fitness onboarding.
- CGM import should be idempotent and should reject invalid payloads with clear errors.
- CGM queries should support date ranges, pagination, and summary responses.
- Meal reviews and forecast envelopes must be owner-scoped and include safety/provenance metadata.
- Vector search must be profile-scoped and must not return another user's documents.
- Chat behavior must be T1D-aware and medically bounded.
- Chat must refuse dosing recommendations, insulin adjustment advice, treatment decisions, and emergency medical handling.
- Bloom window computation should produce Sato-compatible data, including pigment keys and confidence.
- Bloom window computation should be deterministic for fixture data.
- Sato skin theme should become a shared contract for palette, pigment metadata, surfaces, and typography metadata.
- React Native Skia rendering should remain mobile-specific.
- The backend should expose Sato theme tokens through a public theme API.
- Swagger should document new T1D, Bloom, and skin theme APIs.
- Tests should verify public behavior through APIs and services where appropriate.
- Refactoring should happen only after each vertical slice is green.
- Branding/config rename should occur after the T1D/Bloom behavior is stable.

## Testing Decisions

Good tests should verify external behavior, not implementation details. A test should read like a product specification: what the system does, not how it does it.

The TDD workflow should be:

1. Choose one public behavior.
2. Write one failing test.
3. Implement the minimum code needed to pass.
4. Refactor only after the test passes.
5. Repeat for the next behavior.

Modules and behaviors to test:

- Skin theme API behavior.
- T1D profile creation, retrieval, and listing.
- T1D onboarding compatibility.
- Nightscout/CGM import validation.
- CGM duplicate import behavior.
- CGM date-range queries and summaries.
- Meal review creation and owner-only access.
- Forecast envelope creation and owner-only access.
- Vector search owner-only behavior.
- Bloom window computation for fixture data.
- Bloom window low-confidence behavior.
- T1D chat refusal behavior for dosing and treatment advice.
- RLS-protected cross-user access denial.
- Swagger documentation for new APIs.
- Env var compatibility during transition.
- Cookie compatibility during transition.

Prior art for tests:

- Existing route tests should be used as the model for integration-style API tests.
- Existing service tests should be used for pure computation and normalization behavior.
- Existing migration or DB setup helpers should be reused where possible.
- Tests should avoid mocking internal collaborators unless the public interface cannot reasonably be exercised.
- Tests should not depend on private functions, private methods, or internal data structures.

## Out of Scope

- Full cosmetic rename of SparkyFitness to Bloom in the first implementation wave.
- Renaming database roles as part of the initial T1D/Bloom work.
- Rewriting the entire mobile app.
- Replacing the Sato renderer with a different visual system.
- Adding medical dosing, insulin adjustment, or treatment recommendation features.
- Handling emergency medical care through the assistant.
- Building a new auth system.
- Migrating all existing SparkyFitness users in one large migration.
- Removing old SparkyFitness env vars before compatibility aliases are proven.
- Implementing every planned endpoint before the first vertical slice is stable.

## Further Notes

The most important strategic decision is to avoid treating this as a rename project. The backend already contains pieces of the T1D platform, but those pieces are not yet integrated into a coherent product surface.

The recommended first vertical slice is the Sato skin theme API because it is low risk, requires no database mutation, and immediately gives backend and mobile a shared identity contract.

After that, the next slices should be:

1. T1D profile API.
2. Nightscout/CGM import API.
3. T1D vector search API.
4. Bloom window computation API.
5. T1D-aware chat safety behavior.

Each slice should be implemented with one public-interface test at a time.
