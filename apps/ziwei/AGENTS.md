# AGENTS.md

## Purpose

This app owns the standalone Ziwei Doushu project at `apps/ziwei/`.

- Keep Ziwei rules, engine scaffolds, and UI inside this app boundary.
- Treat unfinished rule areas as explicitly incomplete, never as implied working logic.
- Prefer traceable, modular growth over fast but mixed-in calculation code.

## Core Rules

1. Do not infer Ziwei results from DOM text. Use structured data objects only.
2. Keep rule docs, engine files, and UI states aligned when behavior changes.
3. If a module is not implemented yet, render `待補` instead of fake star placements.
4. Add or update a regression case whenever a new rule module becomes functional.
5. Split logic by concern: input, palaces, ming/shen, major stars, minor stars, transforms, annual flows.

## Read This Before Editing

- Quick routing: read `INDEX.md`.
- Product context and setup: read `README.md`.
- Rule boundaries and data contracts: read `docs/rules_scaffold.md`.
- Manual verification scope: read `docs/regression_cases.md`.

## High-Risk Guardrails

- Do not claim `命宮`, `身宮`, `主星`, `四化`, or flows are calculated unless the engine module truly returns them.
- Do not mix prototype notes into the public UI unless the user explicitly asks.
- Keep browser-facing code dependency-light unless the app intentionally adopts a build step.

## Working Flow

1. Decide whether the task is UI-only, engine-only, or both.
2. Read the smallest relevant file set using `INDEX.md`.
3. Make the smallest change inside this app boundary.
4. Re-check incomplete states still show `待補` where appropriate.
5. Update docs and regression cases when behavior or structure changes.
