# AGENTS.md

## Purpose

This repository is the working root for `louisko.com`.

- Root-level files own the main site, shared deployment entry, and cross-site workflow.
- `apps/<slug>/` owns each subproject boundary.
- Prefer low-disruption, traceable changes, and keep main-site vs. app ownership clear.

## Core Rules

1. First decide whether the request belongs to the main site or to a specific `apps/<slug>/` project.
2. Treat `apps/<slug>/` as ownership boundaries. Do not move app-specific logic back into the root unless the user explicitly asks.
3. When adding or changing main-site entry cards, preserve `LOUISKO_APP_CARDS_START` / `LOUISKO_APP_CARDS_END` in `index.html`.
4. Prefer `node scripts/site-workflow/manage-site.mjs add-page ...` for new general site pages.
5. Do not put prompt text, usage instructions, safety reminders, or tutorial copy on public pages unless the user explicitly asks.
6. `bazi.html` is a compatibility entry only. Keep the real Bazi logic inside `apps/bazi/`.
7. Do not commit secrets, tokens, access keys, `.DS_Store`, archives, or unnecessary binaries.
8. Do not use destructive Git commands such as `git reset --hard` or `git checkout --` unless the user explicitly requests them.

## Read This Before Editing

- Main site home or navigation: read [docs/agent-governance/project-structure.md](docs/agent-governance/project-structure.md).
- Deployment, runtime entry, domains, Zeabur, or Docker: read [docs/agent-governance/deployment-reference.md](docs/agent-governance/deployment-reference.md).
- Cloudflare / Wrangler / R2 work: read [docs/agent-governance/cloudflare-r2-operations.md](docs/agent-governance/cloudflare-r2-operations.md).
- Bazi algorithm or luck-cycle logic: first read `../重要資料_八字規格入口.md`, then read [docs/agent-governance/bazi-guardrails.md](docs/agent-governance/bazi-guardrails.md).

## Quick Map

| Area | Start Here | Read Deeper Only If |
|---|---|---|
| Main site structure | `AGENTS.md` + [docs/agent-governance/project-structure.md](docs/agent-governance/project-structure.md) | You need script behavior or page-registry detail |
| Bazi app | [apps/bazi/INDEX.md](apps/bazi/INDEX.md) | You are changing calculations, UI, or regression-sensitive logic |
| Photo app | [apps/photo/INDEX.md](apps/photo/INDEX.md) | You are changing upload, HEIC, storage, watermark, or sync behavior |
| Site workflow scripts | [scripts/site-workflow/INDEX.md](scripts/site-workflow/INDEX.md) | You are adding pages, refreshing home cards, verifying, or publishing |
| Deployment / production routing | [docs/agent-governance/deployment-reference.md](docs/agent-governance/deployment-reference.md) | You are changing domains, server entry, Docker, or Zeabur behavior |
| Cloudflare / R2 | [docs/agent-governance/cloudflare-r2-operations.md](docs/agent-governance/cloudflare-r2-operations.md) | You are inspecting buckets, domains, or same-origin object delivery |

## High-Risk Guardrails

### Public Content

- Internal reminders belong in docs, not public pages, unless the user explicitly wants them exposed.
- The home-page passcode modal is only a front-end gate, not a real security boundary.

### Bazi Changes

- Never infer Bazi data from DOM text. Use structured program data such as `chart.year.pillar`, `chart.month.pillar`, `chart.day.pillar`, and `chart.hour.pillar`.
- After changing Bazi calculation logic, run the mandatory regression checks listed in [docs/agent-governance/bazi-guardrails.md](docs/agent-governance/bazi-guardrails.md).

## Operating Flow

1. Route the task to root or the correct `apps/<slug>/` owner.
2. Read the matching governance module only when the task touches that area.
3. Make the smallest change that fits the local ownership boundary.
4. Run the relevant preview, smoke test, or regression check.
5. Update docs only when architecture, workflow, or operational reality changed.
