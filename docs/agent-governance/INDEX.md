# INDEX.md

## Overview

| Item | Role | Read When | Cost / Notes |
|---|---|---|---|
| `project-structure.md` | Root/site ownership and file placement rules | You are deciding where code or docs should live | Highest-frequency governance read |
| `deployment-reference.md` | Deployment, runtime, domain, and service routing reference | You touch Zeabur, Docker, domains, or production entrypoints | Contains dated operational notes |
| `louisko-backend-architecture.md` | Relationship diagram for GitHub, Zeabur, Cloudflare, Gmail, website, and future extensions | You need to understand backend data flow or plan a cross-service feature | Mermaid diagrams plus current/future capability map |
| `cloudflare-r2-operations.md` | Cloudflare and R2 operating rules | You inspect buckets, domains, or object delivery | CLI-oriented and time-sensitive |
| `bazi-guardrails.md` | Bazi-specific high-risk rules and regression order | You change Bazi calculation, luck-cycle, or Bazi docs | Mandatory for Bazi logic work |
| `line-bot-operations.md` | Bazi LINE Bot runtime, secrets, commands, storage, and deployment checks | You touch LINE webhook, owner sync, or LINE Prompt delivery | Phase 1 private owner workflow |

## Item Notes

### `project-structure.md`

- Summary: the main placement and ownership guide for root-level work.
- Trigger: read before adding new pages, moving files, or choosing between root and `apps/<slug>/`.
- Inputs / outputs: task scope in, correct repo location and boundary decisions out.
- Caution: use this before deeper docs when the task is mostly routing.

### `deployment-reference.md`

- Summary: canonical deployment targets, runtime entry, and service mapping.
- Trigger: read when changing domains, Docker, server entrypoints, or publish flow assumptions.
- Inputs / outputs: deploy/runtime questions in, current target and service context out.
- Caution: verify dated snapshots before making production decisions.

### `louisko-backend-architecture.md`

- Summary: current backend relationship diagrams, request flows, email flows, deployment flow, and future capability priorities.
- Trigger: read when a task crosses GitHub, Zeabur, Cloudflare, Gmail, the website, or the shared Node backend.
- Inputs / outputs: a cross-service feature request in, the correct ownership boundary and integration path out.
- Caution: distinguish confirmed current connections from dashed future integrations; do not assume GitHub push automatically deploys to Zeabur.

### `cloudflare-r2-operations.md`

- Summary: working rules for Wrangler, R2 inspection, and same-origin object delivery.
- Trigger: read for bucket, auth, domain, or photo object delivery work.
- Inputs / outputs: Cloudflare task in, approved CLI path and guardrails out.
- Caution: credentials and session state are time-sensitive.

### `bazi-guardrails.md`

- Summary: high-risk Bazi read order, data rules, and mandatory regression anchors.
- Trigger: mandatory before changing Bazi calculations or regression-sensitive behavior.
- Inputs / outputs: Bazi logic task in, required read path and checks out.
- Caution: this file points to required deeper reads, including the external Bazi spec entry.
