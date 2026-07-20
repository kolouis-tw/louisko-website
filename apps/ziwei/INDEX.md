# INDEX.md

## Overview

| Item | Role | Read When | Cost / Notes |
|---|---|---|---|
| `index.html` | Public app shell and layout regions | You are changing structure or content blocks | Small |
| `styles.css` | Visual system, responsive layout, board styling | You are changing the look or mobile behavior | Medium |
| `app.js` | Form state, placeholder payload creation, and DOM rendering | You are changing live behavior | Main runtime file |
| `docs/rules_scaffold.md` | Rule boundary and data contract doc | You are adding calculation logic | Highest-value spec |
| `docs/chart-baseline-ggdvb.md` | Captured charting baseline from Wenmo app code `GGDVB` | You are encoding or checking rule defaults against the chosen baseline | Reference baseline, source-backed |
| `docs/development-reference.md` | Working reference that ranks Ziwei sources by trust and implementation readiness | You need one practical entrypoint before touching engine rules | Best first read for ongoing Ziwei work |
| `docs/baseline-implementation-notes.md` | Converts baseline into implementation-oriented settings groups | You are turning screenshot rules into engine config | Bridge doc between research and code |
| `docs/input-regression-cases.md` | Verified calendar-conversion and late-zi-hour cases for the input layer | You are changing `input.ts` or time/calendar handling | Best guardrail before real charting |
| `docs/regression_cases.md` | Manual regression anchors | You changed logic or visible states | Short, mandatory for rule changes |
| `engine/src/baseline.ts` | Structured baseline constant for `GGDVB` | You are wiring defaults into payload or future calculation modules | Early implementation anchor |
| `scripts/verify-input.mjs` | Runnable regression verifier for calendar conversion and warnings | You need to validate the input layer without a full TS test runner | Temporary executable guardrail |
| `engine/src/` | Future rule modules and type scaffolds | You are implementing reusable Ziwei logic | TypeScript scaffold, not yet wired into build |
| `AGENTS.md` | App-specific governance rules | The task touches calculation truthfulness or module boundaries | Read first for risky edits |

## Item Notes

### `index.html`

- Summary: the standalone Ziwei entry page.
- Trigger: open when changing visible sections, labels, or DOM anchors.
- Inputs / outputs: form controls in, rendered summary and palace board out.
- Caution: preserve stable IDs used by `app.js`.

### `styles.css`

- Summary: the cream-and-ink visual system for the first-pass Ziwei experience.
- Trigger: use when changing layout, palette, spacing, or board presentation.
- Inputs / outputs: styles for the full page and palace grid.
- Caution: keep desktop and mobile layouts both functional.

### `app.js`

- Summary: creates a safe placeholder chart payload and renders incomplete states.
- Trigger: open for any interaction or rendering change.
- Inputs / outputs: birth input in, summary cards and 12 palaces out.
- Caution: do not sneak real calculation claims into this file without matching rule modules.

### `docs/rules_scaffold.md`

- Summary: canonical first-pass contract for inputs, palaces, and future modules.
- Trigger: mandatory before adding `命宮`, `身宮`, star placement, or transforms.
- Inputs / outputs: structured input contract and module responsibilities.
- Caution: update this before or with engine behavior changes.

### `docs/chart-baseline-ggdvb.md`

- Summary: source-backed baseline for chart settings captured from the Wenmo app using code `GGDVB`.
- Trigger: mandatory when translating defaults such as style, star placement variants, leap-month handling, or late-zi-hour behavior.
- Inputs / outputs: screenshot-derived option states in, implementation defaults and rule decisions out.
- Caution: do not infer missing rows; preserve `待補查` when screenshots are incomplete.

### `docs/development-reference.md`

- Summary: the main working reference that merges current Ziwei materials into one implementation-oriented reading path.
- Trigger: start here when a Ziwei task needs both source judgment and practical next steps.
- Inputs / outputs: mixed-quality Ziwei materials in, trust-ranked implementation guidance out.
- Caution: this file distinguishes confirmed baseline from candidate rules; do not flatten the distinction.

### `docs/baseline-implementation-notes.md`

- Summary: implementation-facing translation of the `GGDVB` baseline into config groups and type directions.
- Trigger: read before writing baseline enums, constants, or module switches.
- Inputs / outputs: baseline doc in, engine config shape out.
- Caution: this is a bridge document, not proof that the underlying algorithm is complete.

### `docs/input-regression-cases.md`

- Summary: the current regression set for solar-lunar conversion, leap-month detection, and late-zi-hour handling.
- Trigger: mandatory before or after changing `input.ts` or calendar-boundary rules.
- Inputs / outputs: known date cases in, expected conversion and warning behavior out.
- Caution: these cases validate the input layer, not the full Ziwei chart engine.

### `engine/src/baseline.ts`

- Summary: structured source-backed baseline constant currently representing `GGDVB`.
- Trigger: use when payloads or future modules need explicit default rules.
- Inputs / outputs: normalized baseline config in code form.
- Caution: existing modules may reference this metadata before they fully implement its consequences.

### `scripts/verify-input.mjs`

- Summary: executable verifier for solar-lunar conversion, leap-month detection, and late-zi-hour warnings.
- Trigger: run before or after changing `input.ts`, calendar rules, or related UI data contracts.
- Inputs / outputs: fixed regression cases in, pass/fail output out.
- Caution: this script currently mirrors the input logic because the Ziwei app does not yet have a direct TypeScript runtime test harness.

### `docs/regression_cases.md`

- Summary: manual checks for the current incomplete-but-safe project state.
- Trigger: run after UI or engine edits.
- Inputs / outputs: test inputs and expected visible outcomes.
- Caution: incomplete modules must remain visibly incomplete until implemented.

### `engine/src/`

- Summary: module scaffold for future reusable Ziwei logic.
- Trigger: use when moving from UI prototype to real rules.
- Inputs / outputs: typed domain models and pure calculation modules.
- Caution: files here define ownership boundaries even before they contain full logic.
