---
type: source
title: "Observation: Memory consolidated from 161 to ~11 active entries"
slug: obs-2026-06-09-memory-consolidated-from-161-to-11-active-entries
status: observation
created: 2026-06-09
updated: 2026-06-09
relevance: high
observed_at: 2026-06-09T13:17:21.380Z
tags: ["memory", "consolidation", "tool-quirk"]
source_context: "Memory consolidation across all targets (memory, user, failure)"
---
# ⭐ Observation: Memory consolidated from 161 to ~11 active entries
Consolidated memory from ~161 entries down to a clean file structure. MEMORY.md now has 3 authoritative entries (architecture, bloom design, tool+github conventions). USER.md has the authoritative entry as the last/active entry. failures.md went from 18 entries to 6 unique project-specific entries (meal memory card, unsloth studio, pi model config, tld-v2 direction, mobile/expo env, nightscout read-only). The memory tool's remove/replace (target=failure/memory) is unreliable — text matching fails for entries without HTML comment suffix; the only reliable pattern is to add a new authoritative entry that declares supersession. Direct SQL on sessions.db can reduce in-DB row count but the running pi process rehydrates from its internal cache.
*Relevance: high*

*Context: Memory consolidation across all targets (memory, user, failure)*

*Tags: memory consolidation tool-quirk*
---
*Observed: 2026-06-09T13:17:21.380Z*