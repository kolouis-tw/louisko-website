# LINE Bot Repository Audit

## Audit Date

`2026-07-20`

## Scope

本報告依 `Codex_八字網站_LINE_Bot_終身AI命理Prompt_完整實作規格_v3.md` 審查目前 `AI_Web` repository，作為 LINE Bot 實作前的結構基準。

## A. Runtime and Deployment

| Item | Confirmed state |
|---|---|
| Runtime | Node.js 18+，目前 Zeabur Docker Node service |
| Framework | Express 4，單一 `server.js` application |
| Package manager | npm lockfile/deployment convention；本機可用 pnpm tooling，但 repository 沒有 LINE SDK dependency |
| Production host | Zeabur service `louisko-node-photo` |
| Public domain | `https://louisko.com`，Cloudflare 負責 authoritative DNS / edge |
| Persistence | Cloudflare R2 when configured; local JSON fallback for local development |
| Existing API | Bazi auth/profile API and Photo cloud API in `server.js` |
| LINE | 已新增 webhook、HMAC signature validation、allowlist、idempotency 與 Messaging API adapter；啟用仍需 Zeabur secrets |

## B. Authentication and Owner Identity

- Website account identity is stored by normalized email hash under the existing Bazi auth storage layer.
- Website sessions are HttpOnly cookies and are not appropriate for LINE authentication.
- `kolouis@gmail.com` can resolve to the website account by reading the existing user record through the normalized email key.
- LINE will use a separate operator identity layer: `BAZI_LINE_ALLOWED_USER_IDS`.
- LINE must never receive or store the website password.
- Every LINE profile, generation, artifact, and download operation must be scoped to the resolved website `accountId`.

## C. Bazi Core

The live canonical calculation source is the inline script in `apps/bazi/index.html`:

- solar input normalization and validation
- lunar conversion adapter
- timezone and `lateZiSwitchDay`
- solar-term month boundary
- four pillars
- ten gods, hidden stems, five elements
- starting age and ten luck cycles
- annual flow
- structured `buildBaziAnalysisPayload()`

The current UI defaults confirmed from the form are:

- calendar: solar
- timezone: `Asia/Taipei` / UTC+8
- hemisphere: north
- gender: male only as form default; LINE must require gender when not supplied
- day change: `子初換日`

The calculation source must not be rewritten for LINE. The first adapter loads the existing pre-DOM engine surface and exposes it to Node without creating a second calculation implementation.

## D. Prompt Builder

The live canonical Prompt source is the inline script in `apps/bazi/bazi-analysis.html`:

- `analyzeBazi(payload)` builds the analysis sections and Prompt export state.
- `buildLifetimeBaziAdvisorPrompt(data)` builds the lifetime advisor content.
- `buildFullBaziPrompt(data)` and `buildCompactBaziPrompt(data)` remain available as separate export modes.
- The existing lifetime version is `advisor-v2.0`.

Current website Prompt generation is browser-driven from `localStorage` payload. LINE calls the same extracted pre-render functions through `apps/bazi/server/canonical-service.cjs`; it does not create a LINE-specific template.

## E. Profile Persistence

Existing website profile persistence is server-side when a user is authenticated:

- `GET/POST/DELETE /api/bazi/profiles`
- account-scoped profile JSON in R2 or local storage
- profile identity deduplication already exists

No LINE-specific profile database is required. LINE resolves the owner account and reuses `readBaziProfiles()` / `writeBaziProfiles()` through the existing service boundary. The adapter stores generation/artifact/session/event/download records in the same R2/local JSON layer under `line/` keys.

## F. Application and Adapter Boundaries

### Current coupling

- Core and UI are in large inline scripts.
- Prompt Builder and analysis section generation are in the analysis HTML.
- `server.js` owns persistence and HTTP routes in one file.

### Implemented boundary

- `apps/bazi/server/canonical-service.cjs`: adapter around the existing canonical inline engine surfaces.
- `apps/bazi/server/line-bot.cjs`: LINE parser, signature, chunking, event fingerprint, and message formatting utilities.
- `server.js`: webhook route, owner-scoped application operations, artifact persistence, and Markdown download route.

This keeps the delivery traceable while avoiding a risky full HTML-to-module rewrite. A later Phase 2 can move the extracted pure functions into an explicit shared package after golden snapshots are locked.

## G. Storage Model

The existing R2/local JSON storage is extended with owner-scoped records for:

- Bazi generation metadata and canonical result
- Advisor artifact content and content hash
- LINE session state with TTL
- processed LINE webhook event state
- short-lived Markdown download tokens

No password or LINE channel secret is stored in repository files.

## H. Regression Risks

1. Changing `apps/bazi/index.html` calculation code can change both Website and LINE output.
2. Changing `apps/bazi/bazi-analysis.html` Prompt functions changes both Website and LINE artifact content.
3. VM adapter cutoff markers must remain stable and are covered by `npm run test:bazi:line` golden generation checks.
4. R2 writes must remain owner-scoped and idempotent.
5. LINE replies must respect UTF-16 character counting, reply-token timing, and a maximum of five reply messages. The adapter uses a configurable safe limit below the platform maximum.

## Audit Gate Answers

| Question | Answer |
|---|---|
| A. Reusable core? | Existing Bazi calculation functions, payload builder, analysis, lifetime Prompt Builder, and profile storage |
| B. UI-coupled logic? | Inline scripts in both Bazi HTML pages and browser-only localStorage/rendering |
| C. Needs extraction? | A Node adapter now; explicit shared package later after golden snapshots |
| D. Server persistence? | Yes, account-scoped profile JSON in R2/local fallback |
| E. Owner resolution? | Read normalized email-hash account record for `BAZI_LINE_OWNER_EMAIL` |
| F. Webhook deployment? | Same Zeabur Node service at `/api/line/webhook` |
| G. Markdown output? | Persist artifact content and stream dynamic UTF-8 Markdown from an owner-scoped short-lived token |
| H. Regression risk? | Calculation and Prompt inline source changes; no direct algorithm change is planned |
