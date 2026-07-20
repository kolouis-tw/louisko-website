# Project Structure

## Purpose

Use this file when the task touches site structure, entrypoints, ownership boundaries, or where a new file should live.

## Main Entrypoints

- Main site home: `index.html`
- Legacy Bazi compatibility entry: `bazi.html`
- Main site page registry: `scripts/site-workflow/site-pages.json`
- Main site workflow script: `scripts/site-workflow/manage-site.mjs`
- Project manifest: `manifest.json`
- Human-oriented project overview: `README.md`

## Ownership Boundaries

- Repository root: main site, shared assets, deployment entry, and shared workflow
- `apps/bazi/`: Bazi charting app
- `apps/photo/`: Photo app
- `apps/ziwei/`: Ziwei Doushu app
- `apps/erp/`, `apps/ai/`, `apps/docs/`: reserved or lightweight app roots
- `scripts/site-workflow/`: cross-site workflow tooling, not a single app's private code

## Placement Rules

- Add new public-facing subprojects under `apps/<slug>/`.
- Keep general main-site navigation logic in the root plus `scripts/site-workflow/`.
- Do not place new production site files inside legacy holding folders such as `01_乾淨網站資料/` or `AI_八字`.
- Put new internal specs, templates, deployment notes, or archive material in clearly named root folders.

## Main-Site Editing Notes

- `index.html` currently follows a Muji-like visual direction: off-white base, low saturation, generous whitespace, circular entry buttons.
- Home-page app cards are managed by both `scripts/site-workflow/site-pages.json` and the card markers inside `index.html`.
- Prefer the site workflow script when adding ordinary site pages so routing and home-page cards stay in sync.
