# AGENTS.md

## Purpose

This repository is the working root for `louisko.com`.

- Root-level files own the main site, shared deployment entry, and cross-site workflow.
- `apps/<slug>/` owns each subproject boundary.
- This repo is the current canonical source in this workspace; do not assume historical sibling copies still exist.
- Prefer low-disruption, traceable changes, and keep main-site vs. app ownership clear.

## Recent Project Summary

As of `2026-07-16`, the repository and the production site have been consolidated around this `AI_Web` repo and the Zeabur service `louisko-node-photo`.

- The Node service on Zeabur serves the main site, all `apps/<slug>/` pages, shared assets, Bazi APIs, and Photo cloud APIs.
- `louisko.com` uses Cloudflare as the authoritative DNS and Email Sending layer while Zeabur remains the application host. Cloudflare R2 bucket `louisko-photo` stores the production Photo objects and related metadata.
- Bazi now supports solar/lunar input conversion, named owner records, account-based cross-device sync, Email verification, password reset, password visibility controls, account deletion, and reset links that open the password form directly.
- Bazi calculation work remains guarded: the four pillars, ten gods, hidden stems, starting age, ten luck cycles, annual flow, monthly flow, and related rules must not be changed casually. The documented luck-cycle rule is “前後節氣起運、十步大運”.
- Prompt export is separated from calculation logic. Full data remains available internally, while compact and lifetime AI prompt views are generated from structured chart data.
- Bazi Phase 1 LINE Bot is a private owner-scoped adapter at `/api/line/webhook`; it reuses the website Bazi Core and lifetime Prompt Builder, stores artifacts through the existing R2/local layer, and must remain fail-closed without channel secrets and an allowlist. Read [docs/agent-governance/line-bot-operations.md](docs/agent-governance/line-bot-operations.md) before changing it.
- Photo supports local IndexedDB albums, processed JPG output, HEIC conversion through the Node API, R2 sync, cross-device cloud reading, watermarking, and ZIP download. The page title is `PHOTO`, and Photo plus the other app pages use `/` for stable return-to-home links.
- Shared button styling is defined in `assets/louisko-theme.css`: primary, secondary, tab, icon, danger, spacing, shadows, and mobile sizing follow one site-wide pattern. Page-specific exceptions must be intentional and documented.
- Production checks completed during this work included Node syntax checks, site workflow verification, `git diff --check`, production HTTP checks for the main site and all current app/deep pages, shared asset checks, and successful Zeabur deployment.

For service identifiers, DNS delegation, Cloudflare billing, secret mapping, and the GitHub/Zeabur/Cloudflare/Gmail relationship, use [docs/agent-governance/deployment-reference.md](docs/agent-governance/deployment-reference.md) and [docs/agent-governance/louisko-backend-architecture.md](docs/agent-governance/louisko-backend-architecture.md). Do not duplicate secret values in this summary.

## Hub Role

Use this file as the root routing hub.

- Read this file first to decide whether the task belongs to the root site, a governance module, or a specific app.
- For root-level governance routing, use [docs/agent-governance/INDEX.md](docs/agent-governance/INDEX.md).
- For app-specific work, jump to the matching app index before reading large implementation files.

## Core Routing Rules

1. First decide whether the request belongs to the main site or to a specific `apps/<slug>/` project.
2. Treat `apps/<slug>/` as ownership boundaries. Do not move app-specific logic back into the root unless the user explicitly asks.
3. When adding or changing main-site entry cards, preserve `LOUISKO_APP_CARDS_START` / `LOUISKO_APP_CARDS_END` in `index.html`.
4. Prefer `node scripts/site-workflow/manage-site.mjs add-page ...` for new general site pages.
5. Do not put prompt text, usage instructions, safety reminders, or tutorial copy on public pages unless the user explicitly asks.
6. `bazi.html` is a compatibility entry only. Keep the real Bazi logic inside `apps/bazi/`.
7. Do not commit secrets, tokens, access keys, `.DS_Store`, archives, or unnecessary binaries.
8. Do not use destructive Git commands such as `git reset --hard` or `git checkout --` unless the user explicitly requests them.
9. Before finishing, remove ghost files such as empty temporary folders, stray `.DS_Store`, and abandoned generated artifacts when they are safe to clean.

## Read Paths

- Root/site governance routing: read [docs/agent-governance/INDEX.md](docs/agent-governance/INDEX.md).
- Bazi algorithm or luck-cycle logic: first read `../重要資料_八字規格入口.md`, then read [docs/agent-governance/bazi-guardrails.md](docs/agent-governance/bazi-guardrails.md).
- Root page workflow tasks: read [scripts/site-workflow/INDEX.md](scripts/site-workflow/INDEX.md).

## Quick Map

| Area | Start Here | Read Deeper Only If |
|---|---|---|
| Root governance modules | [docs/agent-governance/INDEX.md](docs/agent-governance/INDEX.md) | You need the matching module for structure, deployment, Cloudflare, or Bazi guardrails |
| Main site structure | [docs/agent-governance/project-structure.md](docs/agent-governance/project-structure.md) | You need script behavior or page-registry detail |
| Bazi app | [apps/bazi/INDEX.md](apps/bazi/INDEX.md) | You are changing calculations, UI, or regression-sensitive logic |
| Photo app | [apps/photo/INDEX.md](apps/photo/INDEX.md) | You are changing upload, HEIC, storage, watermark, or sync behavior |
| Ziwei app | [apps/ziwei/INDEX.md](apps/ziwei/INDEX.md) | You are changing Ziwei rules, baseline docs, or app UI |
| Site workflow scripts | [scripts/site-workflow/INDEX.md](scripts/site-workflow/INDEX.md) | You are adding pages, refreshing home cards, verifying, or publishing |
| Deployment / production routing | [docs/agent-governance/deployment-reference.md](docs/agent-governance/deployment-reference.md) | You are changing domains, server entry, Docker, or Zeabur behavior |
| Cloudflare / R2 | [docs/agent-governance/cloudflare-r2-operations.md](docs/agent-governance/cloudflare-r2-operations.md) | You are inspecting buckets, domains, or same-origin object delivery |
| Bazi LINE Bot | [docs/agent-governance/line-bot-operations.md](docs/agent-governance/line-bot-operations.md) | You are changing webhook, owner scope, LINE commands, Prompt delivery, or download tokens |

## High-Risk Guardrails

### Public Content

- Internal reminders belong in docs, not public pages, unless the user explicitly wants them exposed.
- The home-page passcode modal is only a front-end gate, not a real security boundary.

### Bazi Changes

- Never infer Bazi data from DOM text. Use structured program data such as `chart.year.pillar`, `chart.month.pillar`, `chart.day.pillar`, and `chart.hour.pillar`.
- After changing Bazi calculation logic, run the mandatory regression checks listed in [docs/agent-governance/bazi-guardrails.md](docs/agent-governance/bazi-guardrails.md).

### Operational Reality

- Treat deployment, Cloudflare, and service-account facts as time-sensitive unless just verified.
- Keep high-risk operational details in governance modules, not duplicated across public pages or app docs.

## Operating Flow

1. Route the task to root or the correct `apps/<slug>/` owner.
2. Read the matching governance module or app index only when the task touches that area.
3. Make the smallest change that fits the local ownership boundary.
4. Run the relevant preview, smoke test, or regression check.
5. Update docs only when architecture, workflow, or operational reality changed.
6. Clear safe ghost files created during the work so the repo stays clean.
