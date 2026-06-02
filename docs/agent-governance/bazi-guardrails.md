# Bazi Guardrails

## Purpose

Use this file before changing Bazi calculation logic, luck-cycle behavior, regression expectations, or Bazi-specific docs.

## Mandatory Read Order

1. `../重要資料_八字規格入口.md`
2. `apps/bazi/README.md`
3. `apps/bazi/docs_algorithm.md`
4. `apps/bazi/docs_overview.md`
5. `apps/bazi/SMOKE_TEST.md`
6. `apps/bazi/docs/regression_cases.md`

## Change Boundary

- Keep Bazi logic inside `apps/bazi/`.
- Do not reintroduce core Bazi logic into root-level files.

## Data Rule

- Do not infer chart values from DOM text.
- Use structured internal data, for example:

```js
chart.year.pillar
chart.month.pillar
chart.day.pillar
chart.hour.pillar
```

## Mandatory Regression Checks

After changing Bazi calculation, luck-cycle, annual-flow, six-pillar, or ten-god logic, confirm at least:

```text
2024/03/10 00:20 => 甲辰 丁卯 癸酉 壬子
1974/10/03 04:00 女命 2026流年 => 六柱大運需為戊辰
```

## Supporting Context

- Use `apps/bazi/INDEX.md` first when you only need routing help.
- Use the files in `apps/bazi/changelog/` and `apps/bazi/examples/` only when the task clearly needs historical or sample context.
