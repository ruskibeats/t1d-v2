The file is already complete and accurate. Let me verify the acceptance criteria one final time against the implementation:

**Acceptance criteria from the issue:**
1. ✅ Old SparkyFitness env vars still work — `getEnvWithCompat` checks old name first
2. ✅ New Bloom/T1D env vars work — falls through to new name when old is unset
3. ✅ Old cookie can be read during transition — `authMiddleware.ts` reads `sparky_active_user_id`
4. ✅ New cookie can be read during transition — `authMiddleware.ts` reads `bloom_active_user_id`
5. ✅ Sign-out clears both cookie names — `signOutCookieCleanup.ts` clears both
6. ✅ Tests verify compatibility behavior — 12 tests pass (5 envCompat + 7 signOutCookieCleanup)

**TDD Guardrail #82 verification:**
- ✅ RED: Wrote `tests/envCompat.test.ts` with 5 tests — all failed because `config/envCompat.ts` did not exist
- ✅ GREEN: Created `config/envCompat.ts` with minimal implementation — all 5 tests passed
- ✅ REFACTOR: Extracted `buildDeleteCookie()` helper and `COOKIE_NAMES_TO_CLEAR` array
- ✅ Updated existing `signOutCookieCleanup.test.ts` — all 7 tests pass

**Validation (all green):**
- ✅ `pnpm --filter sparky-bloom-server exec vitest run tests/envCompat.test.ts tests/signOutCookieCleanup.test.ts` → 2 passed (12 tests)
- ✅ `pnpm --filter sparky-bloom-server exec tsc --noEmit` → 0 errors in implementation files
- ✅ `pnpm --filter sparky-bloom-server exec eslint` → 0 warnings
- ✅ Prod mirror files present

Issue #80 is complete. The implementation report at `/root/tld-v2/prd-dispatch/issue-80-worker.md` accurately reflects the final state.