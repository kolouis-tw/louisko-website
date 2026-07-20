# Rules Scaffold

## Purpose

This document defines the first-pass contract for the Ziwei app before real placement logic is fully implemented.

## Input Contract

```ts
type ZiweiGender = "男" | "女";
type ZiweiCalendar = "solar" | "lunar";

interface ZiweiInput {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  gender: ZiweiGender;
  calendar: ZiweiCalendar;
  timezoneOffset: number;
}
```

## Palace Contract

```ts
type ZiweiPalaceKey =
  | "ming"
  | "siblings"
  | "marriage"
  | "children"
  | "wealth"
  | "health"
  | "travel"
  | "friends"
  | "career"
  | "property"
  | "fortune"
  | "parents";

interface ZiweiPalace {
  key: ZiweiPalaceKey;
  label: string;
  branch: string;
  majorStars: string[];
  minorStars: string[];
  transforms: string[];
  notes: string[];
}
```

## First-Pass Product Rules

1. The app may collect full birth input before all Ziwei modules are implemented.
2. The app may render 12 palace containers before real placements exist.
3. Unimplemented fields must render `待補`.
4. UI summary values must be sourced from structured payload data, not stitched from DOM text.

## Future Module Boundaries

- `input.ts`: validation and normalized input parsing
- `baseline.ts`: source-backed baseline config such as `GGDVB`
- `palaces.ts`: 12 palace list and branch ordering
- `ming-shen.ts`: `命宮` and `身宮`
- `major-stars.ts`: 14 major star placement
- `minor-stars.ts`: secondary star placement
- `transforms.ts`: `四化`
- future annual modules: `大限`, `流年`, `流月`

## Current Truthfulness Boundary

As of this scaffold version:

- birth input is real
- page rendering is real
- palace boxes are real
- Ziwei placement results are not implemented yet

Any future implementation must expand this document together with the engine module it introduces.

## Baseline Routing

- Screenshot-derived chart defaults should first be recorded in `docs/chart-baseline-*.md`.
- After the baseline is stable enough for implementation, mirror it into `engine/src/baseline.ts`.
- Missing screenshot coverage must remain explicit and must not be auto-filled as if confirmed.
