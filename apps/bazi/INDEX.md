# INDEX.md

## Overview

| Item | Role | Read When | Cost / Notes |
|---|---|---|---|
| `index.html` | Main app and most live logic | You are changing UI or calculation behavior | Large, mixed HTML/CSS/JS |
| `bazi-analysis.html` | Alternate or legacy analysis surface | The task explicitly mentions analysis page behavior | Large and easy to over-read |
| `docs_algorithm.md` | Algorithm explanation | You are changing calculation rules | Highest-value doc for logic changes |
| `docs_overview.md` | Product and feature map | You need conceptual orientation first | Faster than opening app code |
| `SMOKE_TEST.md` | Quick verification list | You already changed behavior and need checks | Short |
| `docs/regression_cases.md` | Regression anchors | You touched Bazi logic | Short, mandatory for logic work |
| `examples/` | Sample payloads | You need example structures or output shape | Optional |
| `changelog/` | Historical notes | You need why a prior change happened | Optional history only |

## Item Notes

### `index.html`

- Summary: main Bazi application file with the primary implementation surface.
- Trigger: open when the request changes UI, rendering, or live calculation behavior.
- Inputs / outputs: user birth data in, rendered chart and related analysis out.
- Caution: avoid scanning this first if the task is only conceptual; start with docs.

### `bazi-analysis.html`

- Summary: separate analysis-facing surface with overlapping domain behavior.
- Trigger: read only if the task names this file or a behavior unique to it.
- Inputs / outputs: analysis-oriented presentation from chart data.
- Caution: do not assume it is the canonical source for all Bazi logic.

### `docs_algorithm.md`

- Summary: the most important doc for rule-level calculation changes.
- Trigger: mandatory before editing pillars, luck cycles, annual flow, six pillars, or ten gods.
- Inputs / outputs: algorithm assumptions and calculation structure.
- Caution: pair this with `docs/regression_cases.md` before finalizing.

### `docs_overview.md`

- Summary: high-level feature map of the system.
- Trigger: use for quick orientation when you do not yet know which file to inspect.
- Inputs / outputs: feature inventory, terminology, and presentation scope.
- Caution: overview is not sufficient for algorithm edits by itself.

### `SMOKE_TEST.md`

- Summary: short verification checklist.
- Trigger: after UI or feature edits.
- Inputs / outputs: manual checks and expected behavior.
- Caution: smoke coverage is lighter than regression coverage.

### `docs/regression_cases.md`

- Summary: known regression anchors for calculation correctness.
- Trigger: mandatory after Bazi logic changes.
- Inputs / outputs: canonical inputs with expected outcomes.
- Caution: keep these checks alongside the two repo-level regression cases in `AGENTS.md`.

### `examples/`

- Summary: sample chart and sample prompt output.
- Trigger: use when you need data shape examples.
- Inputs / outputs: example structures for debugging or integration.
- Caution: examples are references, not authoritative logic specs.

### `changelog/`

- Summary: compact history of prior Bazi changes.
- Trigger: only when you need rationale for a past change.
- Inputs / outputs: version notes and fix summaries.
- Caution: historical notes may not reflect the current canonical implementation.
