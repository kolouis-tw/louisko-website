# INDEX.md

## Overview

| Item | Role | Read When | Cost / Notes |
|---|---|---|---|
| `app.js` | Main front-end logic | You are changing upload, album, cloud sync, watermark, or lightbox behavior | Largest code file here |
| `index.html` | UI structure and upload entrypoints | You are changing layout or input wiring | Medium |
| `styles.css` | Tool styling and responsive layout | You are changing appearance | Medium |
| `AGENTS.md` | High-risk operating rules | You are touching HEIC, storage, cloud sync, or smoke-test expectations | Detailed but governance-heavy |
| `README.md` | Human-oriented feature and usage guide | You need product context or local run info | Overlaps with `AGENTS.md` |
| `assets/louis-logo-data.js` | Embedded watermark asset | Only when logo loading or canvas taint issues matter | Large generated-like asset |
| `assets/louis-logo.png` | Raw logo image | Only for asset replacement work | Binary |

## Item Notes

### `app.js`

- Summary: central implementation for albums, IndexedDB, canvas processing, EXIF, watermarking, sync, and downloads.
- Trigger: open for almost any behavioral change in the Photo tool.
- Inputs / outputs: uploaded files in, processed JPGs and album state out.
- Caution: this is the primary file; avoid opening asset files unless the issue demands it.

### `index.html`

- Summary: page structure and upload controls.
- Trigger: read when changing visible layout, buttons, or file inputs.
- Inputs / outputs: DOM scaffold for the Photo app.
- Caution: preserve iPhone upload affordances if touching upload inputs.

### `styles.css`

- Summary: dark photography-tool visual system and mobile layout.
- Trigger: read when changing presentation or responsive behavior.
- Inputs / outputs: styling rules for the app surface.
- Caution: do not assume layout logic lives here; behavior is mostly in `app.js`.

### `AGENTS.md`

- Summary: the strongest source for HEIC handling, cloud-sync boundaries, storage rules, and validation expectations.
- Trigger: mandatory before changing storage flow, HEIC conversion, cloud APIs, or watermark output rules.
- Inputs / outputs: operational constraints and verification expectations.
- Caution: contains dated operational snapshots; verify time-sensitive details.

### `README.md`

- Summary: human-readable product overview and local run instructions.
- Trigger: use for quick orientation or handoff context.
- Inputs / outputs: feature map, preview steps, API list.
- Caution: overlaps with `AGENTS.md`; prefer `AGENTS.md` for rules and `README.md` for narrative context.

### `assets/louis-logo-data.js`

- Summary: embedded data URL version of the logo to avoid file-mode canvas taint issues.
- Trigger: only when debugging watermark asset loading.
- Inputs / outputs: logo asset encoded for front-end use.
- Caution: high token cost and low routing value for most tasks.

### `assets/louis-logo.png`

- Summary: source logo image.
- Trigger: only when replacing or visually checking the logo asset.
- Inputs / outputs: bitmap input asset.
- Caution: binary asset; do not read it for ordinary coding tasks.
