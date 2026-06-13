---
type: source
title: "Three-environment Docker pattern for sparky-bloom"
slug: docker-three-environment-pattern
status: insight
created: 2026-06-09
updated: 2026-06-09
category: devops
---
# Three-environment Docker pattern for sparky-bloom
Finalized architecture:
- **Dev** (`compose.dev.yml`): ports 3010/3005, hot reload via bind mounts, hardcoded dev secrets for convenience
- **Stage** (`compose.stage.yml`): ports 3011/3006, builds same image but with production NODE_ENV, requires secrets via `.env.stage`
- **Prod** (`compose.prod.yml`): blocked locally, defined for CI deployment with GitHub Environments protection

Key decisions:
1. Used `name:` in compose to isolate container naming
2. Separate internal networks per environment to prevent cross-talk
3. Stage uses build (not pre-built image) for local testing, but CI will push and use image
4. Dev stack uses hardcoded secrets to avoid .env requirement during local development
*Category: devops*
---
*Captured: 2026-06-09*
## Related
_Add links to related pages._