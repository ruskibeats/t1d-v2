---
type: source
title: "Memory tool uses Markdown+SQLite dual storage"
slug: memory-tool-dual-storage-architecture
status: insight
created: 2026-06-09
updated: 2026-06-09
category: tool-quirk
---
# Memory tool uses Markdown+SQLite dual storage
The `memory` tool has a **Markdown-first, SQLite-second** architecture. `memory_search` queries SQLite and displays all entries stored there. However, `remove`/`replace` operations only affect the **Markdown layer** — entries are removed from the runtime working store (reducing char count and entry count) but the SQLite index retains the old entries, causing `memory_search` to show stale/deleted entries alongside replacements. The `/memory-sync-markdown` TUI slash command would reconcile the two layers but is not accessible via tools.

**For consolidation**: rather than trying to individually remove old entries (which often fails due to stored format mismatches), the reliable pattern is:
1. Add a single consolidated entry with `SUPERSEDES ALL PRIOR` in the title
2. The char count/entry count API response reflects the true working store state
3. Accept that SQLite will show orphans until `/memory-sync-markdown` is run

**Consequence**: every consolidation session that tried `remove`+`add-new` left orphans behind, causing the very problem the user is trying to fix. The only clean approach is a single authoritative add with supersession declaration.
*Category: tool-quirk*
---
*Captured: 2026-06-09*
## Related
_Add links to related pages._