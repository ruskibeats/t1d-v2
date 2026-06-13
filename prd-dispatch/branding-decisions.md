# Branding Decisions (#81)

## Date
2026-06-12

## Confirmed Decisions

### 1. Final Brand Name: Sato ✅
**Decision:** Use "Sato" as the final brand name
**Rationale:** Sato is already the working name for the combined SparkyFitness + T1D Companion platform
**Implementation Impact:**
- Update `package.json` in sato-bloom
- Update server names and comments
- Update `SparkyFitnessServer.ts` references

### 2. Email Sender: DrSato@sato.health ✅
**Decision:** Use `DrSato@sato.health` as the email sender address
**Rationale:** Professional, branded email identity
**Implementation Impact:**
- Update `emailService.ts` sender configuration
- Update `emailService.ts` subject templates
- Ensure domain has SPF/DKIM/DMARC configured

### 3. DB Role Rename: Deferred ✅
**Decision:** Defer DB role rename as recommended in PRD user story 39
**Rationale:** Out of scope for initial implementation wave; requires dedicated migration plan
**Implementation Impact:**
- No code changes required
- Document as "deferred" in migration comments
- Plan for separate PR in future wave

## Pending Decision

### 4. Swagger/docs rename scope: ⏳ Pending
**Current title:** `SparkyFitness API`
**Options:**
1. **Full rename:** Change to `Sato API` everywhere in Swagger docs
2. **Alias:** Keep `SparkyFitness API` but add `Sato API` as alias/version
3. **Versioned transition:** Keep both for 3.x → 4.0.x transition period

**Recommendation:** Full rename (Option 1) for simplicity and consistency with brand name decision

## Next Steps

1. **Implement confirmed items:**
   - Update brand name to "Sato" across codebase
   - Update email sender to `DrSato@sato.health`
   - Note DB role rename as deferred

2. **Await Swagger decision:**
   - Discuss with product owner
   - Decide between full rename vs alias vs versioned transition

3. **Update GitHub issue #81** with confirmation and await Swagger decision