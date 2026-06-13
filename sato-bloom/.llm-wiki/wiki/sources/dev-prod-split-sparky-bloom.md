---
type: source
title: "Sparky-Bloom dev/prod workspace architecture"
slug: dev-prod-split-sparky-bloom
status: insight
created: 2026-06-09
updated: 2026-06-09
category: architecture
---
# Sparky-Bloom dev/prod workspace architecture
sparky-bloom uses a dev/prod split to separate stolen upstream code from Bloom innovation. prod/ is a git subtree of github.com/CodeWithCJ/SparkyFitness (the full monorepo: SparkyFitnessServer, SparkyFitnessMobile, SparkyFitnessFrontend, shared, docker). It's independently runnable via `docker compose up -d` from prod/. The dev copies (server/, mobile/, shared/ at root) contain the same code plus Bloom modifications. The subtree sync flow: update `/tmp/sparkyfitness` via `git pull`, then `git subtree pull --prefix=prod /tmp/sparkyfitness main --squash` into sparky-bloom. Prod bugs use a dedicated issue template with the `prod` label. This enforces the product philosophy: steal the boring bits as-is, invent only the magical Bloom portrait layer.
*Category: architecture*
---
*Captured: 2026-06-09*
## Related
_Add links to related pages._