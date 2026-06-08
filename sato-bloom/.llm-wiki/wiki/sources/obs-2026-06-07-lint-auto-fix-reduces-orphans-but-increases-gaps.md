---
type: source
title: "Observation: Lint auto-fix reduces orphans but increases gaps"
slug: obs-2026-06-07-lint-auto-fix-reduces-orphans-but-increases-gaps
status: observation
created: 2026-06-07
updated: 2026-06-07
relevance: medium
observed_at: 2026-06-07T17:28:46.749Z
source_context: "Running wiki-lint --auto-fix on Sato wiki"
---
# 🔍 Observation: Lint auto-fix reduces orphans but increases gaps
Wiki lint auto-fix reduced orphans significantly (106→9) but created 116 gaps (missing pages for topics referenced in content). This is expected behavior after synthesis creates concepts/entities with source references that mention other topics without corresponding pages. Gaps should be filled incrementally by reviewing the synthesized content and creating pages for important missing topics.
*Relevance: medium*

*Context: Running wiki-lint --auto-fix on Sato wiki*
---
*Observed: 2026-06-07T17:28:46.749Z*