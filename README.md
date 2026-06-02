# louisko.com

This repository is the main working directory for the future `louisko.com` site.

- Root-level files own the home page, shared deployment entry, and cross-site workflow.
- `apps/<slug>/` owns each subproject.
- Local working root: `/Users/kolouis/Desktop/AI_Codex/AI_Web`

## Quick Map

- Main governance hub: `AGENTS.md`
- Governance modules: `docs/agent-governance/`
- Main site home: `index.html`
- Legacy Bazi compatibility entry: `bazi.html`
- Bazi app: `apps/bazi/`
- Photo app: `apps/photo/`
- Site workflow scripts: `scripts/site-workflow/`
- Project manifest: `manifest.json`

If you are routing agent work, start with `AGENTS.md`. If you are onboarding a human developer, use this README first and then jump to the matching app or workflow folder.

## Repository Structure

- Root: main site, shared assets, deployment entry, and shared workflow
- `apps/bazi/`: Bazi charting app
- `apps/photo/`: Louis Image Processor and Photo cloud front end
- `apps/erp/`, `apps/ai/`, `apps/design/`, `apps/docs/`: reserved or lightweight app roots
- `scripts/site-workflow/`: page-management and publish workflow
- `docs/agent-governance/`: governance modules referenced by `AGENTS.md`

## Local Preview

```sh
npm start
```

Default port is `8080`. To override:

```sh
PORT=3000 npm start
```

## Common Workflows

List site pages:

```sh
npm run site:list
```

Verify main-site entry wiring:

```sh
npm run site:verify
```

Add a new page:

```sh
npm run site -- add-page --slug my-tool --title "我的新工具" --description "我的新工具"
```

You can also call the script directly:

```sh
node scripts/site-workflow/manage-site.mjs add-page --slug my-tool --title "我的新工具" --description "我的新工具"
node scripts/site-workflow/manage-site.mjs verify
```

## Photo App

`apps/photo/` is the Louis Image Processor.

It supports albums, photo upload, EXIF info bars, Louis Logo watermarking, rotation, deletion, lightbox preview, and ZIP download. HEIC / HEIF files are converted through the shared Node service at `POST /api/convert-heic`.

For storage, sync, HEIC, and cloud-delivery constraints, read:

- `apps/photo/AGENTS.md`
- `apps/photo/INDEX.md`
- `docs/agent-governance/deployment-reference.md`
- `docs/agent-governance/cloudflare-r2-operations.md`

## Bazi App

`apps/bazi/` is the production Bazi subproject. Root-level `bazi.html` is only a compatibility entry.

Before changing Bazi logic, read:

- `../重要資料_八字規格入口.md`
- `docs/agent-governance/bazi-guardrails.md`
- `apps/bazi/INDEX.md`

## Deployment

Current canonical targets:

- Production domain: `https://louisko.com/`
- Production Photo page: `https://louisko.com/apps/photo/`
- Production Bazi page: `https://louisko.com/apps/bazi/`
- Production Photo API: `https://louisko.com/api/photo-cloud/albums`
- Repository: `https://github.com/kolouis-tw/louisko-website`

The current production entry uses the Node service `louisko-node-photo`, which serves the main site, app pages, and Photo API from the same runtime entry.

For Zeabur, Docker, and dated operational snapshots, read `docs/agent-governance/deployment-reference.md`.

## Cloudflare R2

Use Wrangler CLI for Cloudflare / R2 tasks in this repo.

Do not place Cloudflare tokens, R2 access keys, Zeabur tokens, or other secrets into repository files, commit messages, issues, or chat replies.

For commands and domain-setup notes, read `docs/agent-governance/cloudflare-r2-operations.md`.

## Style System

The current shared site direction is the `苔原綠 / System` palette:

- Background: `#F8F6EF` + `#DDE8D2`
- Fonts: `Manrope` + `Noto Sans TC`

To reapply the shared style tokens:

```sh
npm run style:final
```

This should update shared color and typography tokens only, not established page structure or functionality.

## Public Content Rule

Unless the user explicitly asks, do not add prompts, usage instructions, safety reminders, or tutorial copy to public-facing pages. Keep that material in internal docs such as `README.md` or `AGENTS.md`.
