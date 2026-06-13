---
type: source
title: "Observation: Dev/Stage/Prod environment architecture decided"
slug: obs-2026-06-09-dev-stage-prod-environment-architecture-decided
status: observation
created: 2026-06-09
updated: 2026-06-09
relevance: critical
observed_at: 2026-06-09T16:25:52.559Z
tags: ["architecture", "docker", "environments", "dev-stage-prod"]
---
# 🔴 Observation: Dev/Stage/Prod environment architecture decided
2026-06-09: User decided on three-environment strategy for sparky-bloom. Long-term target is Option B: Node server/ workspace becomes the canonical production backend, replacing the Python backend entirely. Temporary side-by-side migration path with Python T1D sidecar for inference. Three environments: dev (hot reload, bind mounts, separate dev DB), stage (prod image + config, separate stage DB), prod (same image, prod DB). Mobile runs locally via Expo, not in Docker Compose. One canonical docker/ folder at root. User explicitly mandated: don't duplicate Docker infrastructure between prod/ and dev.
*Relevance: critical*

*Tags: architecture docker environments dev-stage-prod*
---
*Observed: 2026-06-09T16:25:52.559Z*