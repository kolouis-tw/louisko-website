# Regression Cases

## Scope

Use these checks after UI or rule-related edits.

## Cases

1. Page render
   - Open `apps/ziwei/index.html`.
   - Expected: hero, form, summary card, and 12 palaces render without missing asset errors.

2. Form update
   - Change birth year, month, day, hour, minute, gender, or calendar.
   - Expected: the input summary text updates to reflect the latest structured values.

3. Safe incomplete state
   - Submit any valid birth input.
   - Expected: `命宮`, `身宮`, `主星`, and `四化` stay `待補` until real modules exist.

4. Palace completeness
   - Load the board on desktop and mobile widths.
   - Expected: all 12 palace cards render and remain readable.

5. No fake star placement
   - Inspect any palace card after input changes.
   - Expected: no fabricated major or minor star names appear.
