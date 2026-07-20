# Cloudflare R2 Operations

## Purpose

Use this file when the task involves Wrangler CLI, Cloudflare account access, R2 inspection, public object delivery, or bucket domain configuration.

## Working Rules

- In this repo, prefer Wrangler CLI over any unavailable Cloudflare MCP connector.
- Do not store Cloudflare OAuth tokens, R2 access keys, or secret keys in repository files or public notes.
- For cross-device Photo downloads, use the same-origin API path `/api/photo-cloud/object`. Do not switch the front end to direct `r2.dev` fetches because of CORS and device-behavior differences.

## Known Wrangler Access

- Wrangler CLI is available locally through `/opt/homebrew/bin/npx -y wrangler@latest`.
- The logged-in account was noted as Cloudflare account `5208cf5dbbf25b1776f9b45cd796d45d`.
- Verify auth again before sensitive changes if the session might be stale.
- `louisko.com` remains purchased/renewed through Zeabur, but its authoritative DNS was intentionally migrated on `2026-07-16` to the Cloudflare Zone in account `5208cf5dbbf25b1776f9b45cd796d45d`, with nameservers `henrik.ns.cloudflare.com` and `rose.ns.cloudflare.com`. The old Zeabur path used `cory.ns.cloudflare.com` and `barbara.ns.cloudflare.com`. See [deployment-reference.md](deployment-reference.md) for the domain identity ledger and email follow-up.

## Common Commands

```sh
/opt/homebrew/bin/npx -y wrangler@latest --version
/opt/homebrew/bin/npx -y wrangler@latest whoami
/opt/homebrew/bin/npx -y wrangler@latest r2 bucket list
/opt/homebrew/bin/npx -y wrangler@latest r2 bucket info louisko-photo
/opt/homebrew/bin/npx -y wrangler@latest r2 bucket dev-url get louisko-photo
/opt/homebrew/bin/npx -y wrangler@latest r2 bucket domain list louisko-photo
```

## Custom Domain Note

- The `louisko-photo` bucket's `r2.dev` public URL was previously enabled.
- If connecting `media.louisko.com`, first ensure `louisko.com` is under the same Cloudflare account and get the zone id.

```sh
/opt/homebrew/bin/npx -y wrangler@latest r2 bucket domain add louisko-photo \
  --domain media.louisko.com \
  --zone-id <cloudflare-zone-id>
```
