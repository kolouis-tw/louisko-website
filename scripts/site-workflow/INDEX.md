# INDEX.md

## Overview

| Item | Role | Read When | Cost / Notes |
|---|---|---|---|
| `manage-site.mjs` | Main workflow script | You are adding pages, refreshing home cards, verifying, or publishing | Primary executable |
| `site-pages.json` | Home-page card registry | You are adding, removing, or renaming a main-site entry | Small, structured |
| `louisko-style-system.mjs` | Theme token helper | You are asked to reapply or inspect the approved style system | Limited scope |
| `README.md` | Workflow usage guide | You need script intent or command examples | Good first read |
| `WEB_CHANGE_DEPLOYMENT_WORKFLOW.md` | Change/deploy checklist | You are doing end-to-end publish or deploy work | Process-heavy |
| `WEB_CHANGE_LOG.md` | Historical change log | You need prior deployment context | History only |

## Item Notes

### `manage-site.mjs`

- Summary: main automation entry for listing pages, adding pages, refreshing home cards, verifying, and publish flows.
- Trigger: open when the task changes main-site routing or wants scripted site maintenance.
- Inputs / outputs: file-system and registry updates, plus optional publish actions.
- Caution: prefer this over manual home-card edits when the task fits its workflow.

### `site-pages.json`

- Summary: canonical registry of home-page app cards.
- Trigger: read when the task concerns which pages appear on the home page.
- Inputs / outputs: structured page metadata consumed by the workflow.
- Caution: changes here usually pair with home-page regeneration logic.

### `louisko-style-system.mjs`

- Summary: helper for the approved style token set.
- Trigger: only when the task explicitly touches the shared site style system.
- Inputs / outputs: style-token application rather than structural page changes.
- Caution: do not use this as a license to redesign layout or functionality.

### `README.md`

- Summary: quick orientation for the workflow folder and common commands.
- Trigger: best first read when you are new to this workflow.
- Inputs / outputs: command examples and conventions.
- Caution: command examples do not replace checking the actual script behavior.

### `WEB_CHANGE_DEPLOYMENT_WORKFLOW.md`

- Summary: standard process doc for change, GitHub sync, and Zeabur deploy work.
- Trigger: read when the task includes publish or deployment steps.
- Inputs / outputs: ordered operational checklist.
- Caution: process details can age; verify any environment-specific steps.

### `WEB_CHANGE_LOG.md`

- Summary: history of prior changes and deploys.
- Trigger: only when you need context from earlier work.
- Inputs / outputs: chronological notes.
- Caution: useful for history, not for current authority.
