# Bazi LINE Bot Operations

## Scope

This document describes the phase 1 private LINE Bot adapter for the Bazi app. The adapter is part of the existing Zeabur Node service and reuses the website Bazi Core, existing lifetime AI Prompt Builder, website account owner, and existing R2/local persistence layer.

It is not a second Bazi engine and it does not implement AI dialogue. Phase 2 conversational AI remains deferred.

## Runtime Boundary

```text
LINE Platform
  -> POST https://louisko.com/api/line/webhook
  -> server.js (raw body + HMAC signature verification)
  -> apps/bazi/server/line-bot.cjs (parse, chunk, message helpers)
  -> apps/bazi/server/canonical-service.cjs
  -> apps/bazi/index.html + apps/bazi/bazi-analysis.html (existing calculation and Prompt functions)
  -> existing Bazi account/profile persistence and R2/local storage
```

The website, LINE, and Markdown download all use the same structured canonical result for a generation. LINE artifacts are stored under the existing storage provider using `line/` keys; there is no LINE-specific database.

## Production Configuration

### Production Channel Ledger

The first production channel was created and verified on `2026-07-20`:

| Item | Confirmed value |
|---|---|
| LINE Official Account | `Louisko 八字 AI 顧問` |
| Basic ID | `@061rakvm` |
| LINE Developers provider | `kolouis` / provider id `2005215144` |
| Messaging API channel id | `2010764409` |
| Zeabur service | `louisko-node-photo` / service id `6a118115a458d428a0ab1ee4` |
| Webhook URL | `https://louisko.com/api/line/webhook` |
| Allowlist owner | The configured `BAZI_LINE_ALLOWED_USER_IDS` value in Zeabur; do not copy it into documentation |

The channel secret and long-lived channel access token were issued in LINE Developers and entered directly into Zeabur environment variables. Their values are intentionally omitted from this repository and all operational notes.

Set these in the Zeabur service environment, never in GitHub, Markdown, browser code, or chat:

```text
BAZI_LINE_OWNER_EMAIL=kolouis@gmail.com
BAZI_LINE_CHANNEL_SECRET=<LINE Developers channel secret>
BAZI_LINE_CHANNEL_ACCESS_TOKEN=<LINE Messaging API channel access token>
BAZI_LINE_ALLOWED_USER_IDS=<comma-separated LINE user IDs>
```

Optional controls:

```text
BAZI_LINE_TEXT_SAFE_LIMIT=4500
BAZI_LINE_SESSION_TTL_MS=900000
BAZI_LINE_DOWNLOAD_TTL_MS=900000
BAZI_LINE_RATE_LIMIT_PER_MINUTE=30
```

The configured owner email is resolved to the existing website account by normalized email. The website password is never used by LINE. The allowed-user list is the authorization boundary; an unlisted LINE user is denied before profile access or generation.

## LINE Developer Console

For the production channel above, set the Webhook URL to:

```text
https://louisko.com/api/line/webhook
```

Enable webhook delivery, copy the channel secret and channel access token into Zeabur secrets, and add only the intended LINE User ID(s) to `BAZI_LINE_ALLOWED_USER_IDS`. Do not expose the owner email as a public LINE command or return it in logs.

After the Zeabur service restarts with the four LINE variables, use the LINE Developers `Verify` action. A successful result confirms that Cloudflare, louisko.com, Zeabur, and the deployed webhook handler are connected. This console verification does not replace an end-to-end message test from an allowlisted LINE account.

The handler validates the raw request body with HMAC-SHA256, uses LINE `webhookEventId` when available for idempotency, and never logs Prompt content or full personal birth data.

## Supported Phase 1 Commands

```text
排盤 姓名 YYYY/MM/DD HH:MM 男／女
我的命主
查看 Prompt
取得 Markdown
幫助
取消
```

Example:

```text
排盤 柯耿誌 1975/12/27 00:20 男
```

The parser applies the website defaults for LINE input: solar calendar, `Asia/Taipei` / UTC+8, north hemisphere, and `子初換日`. Gender is required in the LINE command. The Bot first displays the normalized data and asks for confirmation; only after confirmation does it save/update the owner-scoped profile and generate the artifact.

`查看 Prompt` reads the current saved artifact and does not regenerate it. `重新產生` explicitly generates a new artifact with the current canonical versions. `取得 Markdown` creates a one-time, short-lived, owner/profile/artifact-scoped download token.

## Data Records

The existing Bazi profile record remains the source of owner profile data. The LINE adapter adds:

- `line/sessions/<hashed-line-user-id>.json`: short-lived confirmation and selection state.
- `line/events/<event-fingerprint>.json`: idempotency record for completed webhook events.
- `line/generations/<owner>/<profile>/<input-fingerprint>.json`: canonical result and version metadata.
- `line/artifacts/<owner>/<profile>/<artifact-id>.json`: Prompt content, hash, character count, and quality metadata.
- `line/artifacts/<owner>/<profile>/latest.json`: latest artifact pointer/content used by read-only Prompt retrieval.
- `line/downloads/<random-token>.json`: one-time Markdown download authorization.

Profile and artifact reads always use the resolved website account ID. A profile ID supplied by LINE cannot cross the owner boundary.

## Verification Checklist

Local checks:

```sh
node --check server.js
node --check apps/bazi/server/line-bot.cjs
node --check apps/bazi/server/canonical-service.cjs
npm run test:bazi:line
npm run site:verify
git diff --check
```

Before enabling the webhook in production:

- Confirm the owner website account exists and its email is verified.
- Confirm `BAZI_LINE_ALLOWED_USER_IDS` contains the intended LINE account only.
- Confirm no secret value is present in `git diff`, repository files, or logs.
- Send a LINE `幫助` command and verify a reply.
- Send an incomplete `排盤` command and verify missing fields are reported.
- Send the example command and verify the confirmation step appears before generation.
- Confirm the test chart returns `乙酉 丁亥 丙辰 辛卯` and current luck `己丑` for the 2005 female fixture.
- Confirm `查看 Prompt` does not change the artifact hash or generation time.
- Confirm `取得 Markdown` works once and the same token fails on a second request.
- Re-send an identical webhook event and verify it is not processed twice.
- Send a message from a non-allowed LINE user and verify no owner data is returned.

Production setup status on `2026-07-20`:

- The production channel was created under provider `kolouis` and bound to the `Louisko 八字 AI 顧問` Official Account.
- The Webhook URL was saved in both LINE Official Account Manager and LINE Developers.
- Zeabur received the four required LINE variables and the running service was restarted.
- LINE Developers `Verify` returned `Success`.
- The remaining acceptance step is a real message from the allowlisted LINE account: add `@061rakvm`, then send `幫助` and the documented sample `排盤` command.

## Deployment and Rollback

Deploy the repository through the existing GitHub -> Zeabur workflow after code and tests pass. Environment variables are configured separately in Zeabur. A deployment without LINE variables intentionally leaves the endpoint fail-closed with `LINE_NOT_CONFIGURED`, `OWNER_NOT_CONFIGURED`, or `LINE_ALLOWLIST_EMPTY`.

Rollback is the existing Zeabur service rollback or a revert of the LINE adapter commit. Existing website Bazi calculation and Prompt export remain available independently of LINE configuration.

## Platform References

- [LINE Messaging API webhook events and signature validation](https://developers.line.biz/en/reference/messaging-api/nojs/)
- [LINE text message character count](https://developers.line.biz/en/docs/messaging-api/text-character-count/)
