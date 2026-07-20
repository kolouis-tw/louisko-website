# Deployment Reference

## Purpose

Use this file when the task touches deployment, domains, runtime entrypoints, Docker, or production routing.

## Canonical Targets

- Production domain: `https://louisko.com/`
- Production Bazi page: `https://louisko.com/apps/bazi/`
- Legacy Bazi compatibility URL: `https://louisko.com/bazi.html`
- Production Photo page: `https://louisko.com/apps/photo/`
- Production Photo albums API: `https://louisko.com/api/photo-cloud/albums`
- Production Photo object API: `https://louisko.com/api/photo-cloud/object?key=<storageKey>`
- Production Bazi auth API: `https://louisko.com/api/bazi/auth/{me,register,login,logout}`（HttpOnly session cookie）
- Production Bazi profiles API: `https://louisko.com/api/bazi/profiles`（需登入帳號）
- Production Bazi account security API: `/api/bazi/auth/{verify-email,resend-verification,forgot-password,reset-password,account}`
- Production Bazi LINE webhook: `https://louisko.com/api/line/webhook`（需 LINE channel secret、access token、owner email 與 allowlist）
- GitHub Pages mirror: `https://kolouis-tw.github.io/louisko-website/`
- Repository: `https://github.com/kolouis-tw/louisko-website`

## Current Service Mapping

- Primary Zeabur service: `louisko-node-photo`
- Primary Zeabur service id: `6a118115a458d428a0ab1ee4`
- Primary generated domain: `https://louisko-node-photo.zeabur.app/`
- Legacy backup service: `bazi-website`
- Legacy backup generated domain: `https://bazi-ko.zeabur.app/`

## Domain and DNS Ownership Map

This section records the current relationship between the application host and the DNS/email provider. The names below are operational identifiers, not proof that the corresponding Cloudflare zones are owned by or connected to the site owner.

| Layer | Confirmed value | Status / meaning |
|---|---|---|
| Public site | `https://louisko.com/` | Resolves to the production site. |
| Domain registrar | `Name.com, Inc.` (IANA `625`) | WHOIS identifies Name.com as the upstream registrar. The user-facing purchase and DNS management entry is Zeabur. |
| Domain registration | Created `2026-05-11`; expires `2027-05-11` | Confirmed from the public WHOIS record on `2026-07-16`. |
| Application host | Zeabur | Hosts the Node application and can bind a custom domain to a service. |
| Current Zeabur UI service | `bazi-website` / `bazi-ko.zeabur.app` | The currently inspected service did not show `louisko.com` as a bound domain. Do not assume it is the production service. |
| Production Zeabur mapping | `louisko-node-photo` / service id `6a118115a458d428a0ab1ee4` | Canonical production mapping recorded above; verify in Zeabur before changing domains. |
| Live DNS delegation | `henrik.ns.cloudflare.com`, `rose.ns.cloudflare.com` | Nameserver migration from the Zeabur-managed `cory`/`barbara` path completed on `2026-07-16`; verified through multiple public resolvers and `dig +trace`. |
| Cloudflare account currently inspected | `5208cf5dbbf25b1776f9b45cd796d45d` | Account visible in the logged-in dashboard and now confirmed as the active DNS/Email Sending account for `louisko.com`. |
| Cloudflare Zone currently inspected | `louisko.com` | The active DNS Zone in Cloudflare account `5208cf5dbbf25b1776f9b45cd796d45d`; assigned and now authoritative through `henrik.ns.cloudflare.com` and `rose.ns.cloudflare.com`. |
| Cloudflare Email Sending state | Enabled; production delivery tested | `wrangler email sending enable louisko.com` succeeded on `2026-07-16`; Cloudflare generated the `cf-bounce` MX, SPF, DKIM, and DMARC records. The production app reports `emailConfigured: true`, and verification/reset mail has been received and exercised end to end. |

### Current DNS Record Snapshot

Pre-migration read-only DNS checks on `2026-07-16` returned:

| Record | Current value | Meaning |
|---|---|---|
| `A louisko.com` | `43.153.172.212` | Apex website address preserved in the active Cloudflare Zone. |
| `AAAA louisko.com` | None observed | No IPv6 record was returned. |
| `CNAME www.louisko.com` | None observed | No `www` alias was returned. |
| `MX louisko.com` | None observed | No inbound mail routing record was returned. |
| `TXT louisko.com` | None observed | No SPF, DKIM, verification, or other TXT record was returned. |
| `DNSSEC` | Unsigned | Public WHOIS reported DNSSEC as unsigned at the time of the migration. |

The absence of MX/TXT records was the pre-migration snapshot. After delegation, Cloudflare Email Sending created the records listed in the Email Sending section below.

### Cloudflare Dashboard Snapshot

After the nameserver migration, the inspected Cloudflare dashboard initially showed `louisko.com` as an active/full DNS Zone with exactly one website record. Cloudflare Email Sending was then enabled through Wrangler and added its generated sending records:

- `louisko.com` → `A` → `43.153.172.212` → `Proxied` → `Auto TTL`
- No `www` record was present.
- The earlier dashboard warning about missing MX, SPF, DKIM, and DMARC records is now superseded by the successful Email Sending onboarding.

The dashboard's sample rows shown in the new DNS experience (`api-staging-env`, `test`, `api`, and `www`) were not part of the one-record total and must not be treated as real records.

### Cloudflare Product and Billing Map

This table separates products that are actually part of the Louisko production path from products that merely appear active in the Cloudflare account. Snapshot checked on `2026-07-16` against the repository and the account billing screen:

| Cloudflare product | Current role | Louisko dependency | Billing interpretation |
|---|---|---|---|
| `Free Plan` for `louisko.com` | Authoritative DNS, proxy/HTTPS edge, basic CDN/cache and baseline DDoS protection | Required for the current Cloudflare DNS path; the Node app still runs on Zeabur | No monthly plan fee shown |
| `Workers Paid` | Enables Cloudflare Email Sending to arbitrary recipients | Required for verification and password-reset mail sent from `server.js` via Cloudflare REST API; it does not host the website | Screenshot shows `US$5.00/month`; this is the Workers Paid account minimum, separate from Zeabur hosting |
| `R2 Paid` / bucket `louisko-photo` | Object storage for Photo assets, metadata, and the production R2-backed account/profile paths | Required for cross-device Photo and Bazi profile persistence when the production R2 variables are enabled | Usage-based; screenshot shows `US$0.00/month` currently. Standard R2 includes 10 GB-month storage, 1 million Class A operations, and 10 million Class B operations monthly |
| `Images Stream Basic` | Cloudflare-hosted image/video product bundle | No current repository route, Worker binding, Images API, or Stream API uses it; do not treat it as required by the website | Screenshot shows `US$0.00/month` for this account. Verify the subscription detail/invoice before keeping it; Cloudflare's general billing documentation describes an Images Stream Bundle Basic as a flat add-on, so the account-specific `$0` display may be a credit, trial, or pending-period price |

The current repository has no `wrangler.jsonc`, Worker source, Pages project, Images binding, or Stream integration. A read-only account check on `2026-07-16` returned no Worker scripts and no Pages projects, while the `louisko-photo` R2 bucket was present. Therefore the `US$5.00` Workers Paid subscription is retained for Email Sending, not because Louisko is deployed as a Cloudflare Worker.

Cloudflare Email Sending is not a separate website host: `server.js` runs on Zeabur and calls the Cloudflare Email Sending REST API. Cloudflare requires Cloudflare DNS for Email Service, and its current pricing states that arbitrary-recipient Email Sending is available on Workers Paid; this is why the nameserver migration and the `US$5.00` plan are connected.

### Zeabur Purchase Confirmation

The Zeabur account-level `Domains` page confirms that `louisko.com` was purchased and is managed through Zeabur:

- Zeabur domain id: `6a01386ec3f027a69a1468b3`
- Status: active
- Registration date: `2026-05-11`
- Expiry date: `2027-05-11`
- Registrant verification: verified
- Nameservers shown by Zeabur before migration: `cory.ns.cloudflare.com`, `barbara.ns.cloudflare.com`
- DNS record shown by Zeabur: `A louisko.com = 43.153.172.212`

This resolves the earlier ambiguity: `Name.com` is the registrar shown by public WHOIS, but Zeabur is the user-facing purchase and DNS-management entry for this domain. Use Zeabur's account-level `Domains` page, not the service-level “bind purchased domain” dialog, to manage it.

Official reference: [Zeabur Domain Registration](https://zeabur.com/docs/en-US/deploy/networking/domain-registration).

### Important Interpretation

- “Created in Zeabur” is confirmed for this domain: the account-level Zeabur Domains page shows an active registration and DNS management record for `louisko.com`.
- Zeabur hosts the application; the authoritative DNS provider controls the A/CNAME/MX/TXT records used for website routing and email verification.
- The live `henrik`/`rose` nameservers are now confirmed as the active Cloudflare DNS path. Zeabur remains the purchase/renewal entry for the domain, but Zeabur no longer manages DNS records for it.
- The application host remains Zeabur and the apex A record still points to `43.153.172.212`; `https://louisko.com/apps/bazi/` returned HTTP 200 after the switch.
- The production auth status endpoint returns `emailConfigured: true`. This confirms the email-provider configuration; it is separate from nameserver delegation and does not imply that the Cloudflare account is the domain registrar.

### Zone Identity Ledger

There are currently two separate records that must not be conflated:

| Identifier | What is known | What is not known |
|---|---|---|
| **Cloudflare Zone** | Name shown in Cloudflare account `5208cf5dbbf25b1776f9b45cd796d45d`: `louisko.com`; assigned nameservers: `henrik.ns.cloudflare.com`, `rose.ns.cloudflare.com`; status: active/full after the `2026-07-16` switch. | Whether any other Cloudflare account or old zone should be retained; verify before deleting anything. |
| **Zeabur domain record** | Zeabur domain id `6a01386ec3f027a69a1468b3` remains active for purchase/renewal; it previously exposed `cory`/`barbara`, which are no longer authoritative. | The underlying registrar credentials and Cloudflare account ownership should remain in their respective provider accounts. |

The Cloudflare Zone is now the active DNS path. The nameservers are the reliable external lookup key; Zeabur remains the domain purchase/renewal entry and application host.

### How to Find the Correct Zone Later

1. In Zeabur, open the account-level `Domains` page, not only a project's service network settings.
2. Open `louisko.com` and verify status, expiry, registrant verification, nameservers, and current records.
3. Run `dig +short NS louisko.com` and compare the result with the Cloudflare Zone. The current expected values are `henrik.ns.cloudflare.com` and `rose.ns.cloudflare.com`.
4. Add or inspect A, AAAA, CNAME, MX, TXT, and verification records from the Cloudflare DNS page. At minimum, preserve `A louisko.com = 43.153.172.212`.
5. In Zeabur, verify that the custom domain points to the canonical production service `louisko-node-photo`, not the legacy `bazi-website` service.
6. Do not change nameservers away from `henrik`/`rose` unless the domain is intentionally migrated again and all website and email records have been recreated first.

### Email Activation Plan

The production app uses Cloudflare Email Sending through the REST API. The sending domain is onboarded and production reports email as configured. The full application flow has been tested with a disposable Gmail alias: registration delivered a verification email, the verification link succeeded, forgot-password delivered a reset email, password reset succeeded, login succeeded, and the disposable account was deleted afterward.

Cloudflare's official Email Service flow requires the sending domain to be onboarded in the same Cloudflare account that owns the active DNS Zone. Onboarding automatically creates sending records under `cf-bounce.louisko.com`, including MX, SPF, DKIM, and DMARC records. See [Cloudflare domain configuration](https://developers.cloudflare.com/email-service/configuration/domains/) and [Cloudflare send emails](https://developers.cloudflare.com/email-service/get-started/send-emails/).

The nameserver migration was explicitly authorized and completed on `2026-07-16`:

1. Zeabur `Domains > louisko.com > 管理名稱伺服器` was changed to `henrik.ns.cloudflare.com` and `rose.ns.cloudflare.com`.
2. Public resolvers `1.1.1.1`, `8.8.8.8`, and `9.9.9.9`, plus `dig +trace`, all returned the new delegation.
3. `A louisko.com = 43.153.172.212` was preserved and the Bazi page returned HTTP 200.
4. `wrangler email sending enable louisko.com` succeeded. `wrangler email sending list` reports the domain enabled, and `wrangler email sending dns get louisko.com` returns the generated `cf-bounce` MX, SPF, DKIM, and DMARC records.

Cloudflare token record (value intentionally omitted):

- Token name: `Louisko Production Email Sending`
- Permission: account-scoped `Email Sending: Edit`
- Resource: `Kolouis@gmail.com's Account`
- Token value: never store in this repository, docs, commits, or chat.

### Production Secret Mapping

Zeabur retains the existing `CLOUDFLARE_EMAIL_API_TOKEN` key as an empty compatibility entry. The live secret is stored under the distinct key `LOUISKO_CLOUDFLARE_EMAIL_TOKEN`; `server.js` accepts the canonical key first and this explicit fallback alias second. This mapping is intentional and must remain documented because the two Cloudflare and Zeabur identifiers are not self-explanatory when viewed independently.

Completed verification:

1. Zeabur service `louisko-node-photo` received the secret through the `LOUISKO_CLOUDFLARE_EMAIL_TOKEN` environment variable.
2. The service was redeployed with the updated environment.
3. `https://louisko.com/api/bazi/auth/status` returned `{"ok":true,"emailConfigured":true}`.
4. Registration, verification, forgot-password, reset-password, login, and account deletion were exercised against production with a disposable test account; the test account and test messages were cleaned up.

Future changes should preserve the alias mapping or intentionally migrate the running service to a non-empty canonical key and then update this ledger.

If the Cloudflare dashboard continues to show no Email Sending onboarding for this account, do not invent mail records. Use Cloudflare support/account access to enable the product, or choose a transactional email provider whose DNS verification records can be added in the active Cloudflare Zone.

Useful read-only checks:

```sh
dig +short NS louisko.com
dig +short A louisko.com
dig +short AAAA louisko.com
dig +short CNAME www.louisko.com
dig +short MX louisko.com
dig +short TXT louisko.com
```

## Runtime Notes

- The current production entry combines the main site, subpages, and Photo API behind the same Node service.
- `server.js` is expected to listen on `PORT` and fall back to `8080`.
- The root `Dockerfile` runs `npm start` on Node 20 slim.
- Zeabur is the application host; Cloudflare remains the authoritative DNS and Email Sending layer. The Zeabur domain warning about external DNS is expected while `henrik.ns.cloudflare.com` and `rose.ns.cloudflare.com` are active.
- Shared brand assets are served by the same Node service from the repository root. After a deployment, verify `https://louisko.com/assets/louis-logo-transparent.png` returns `200` with `image/png`; a `404` here causes the homepage and inner pages to show the image alt text instead of the logo.

```Dockerfile
FROM node:20-bookworm-slim

WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .

ENV NODE_ENV=production
EXPOSE 8080
CMD ["npm", "start"]
```

## Dated Operational Snapshot

The items below are useful context, but they are time-sensitive and should be verified before making production decisions.

- As of `2026-05-24`, `louisko.com` had been moved from the old static `bazi-website` service to `louisko-node-photo`.
- As of `2026-05-24`, `https://louisko.com/api/photo-cloud/albums` was expected to return JSON `200`.
- As of `2026-05-24`, Photo metadata was expected to be single-output JPG mode with `thumbnailRefs=0` and `missingStorageKeys=0`.
- As of `2026-05-24`, the R2 metadata snapshot was expected to contain only `Phone` and `MacBook`; verify this instead of assuming it is still true.

## Security Rule

- Keep Zeabur tokens, Cloudflare credentials, and other secrets in local secure storage only.
- Never write secrets into the repository, docs, commits, issues, or chat replies.
- Bazi production email requires Zeabur secrets `BAZI_EMAIL_PROVIDER=cloudflare`, `CLOUDFLARE_EMAIL_ACCOUNT_ID`, `BAZI_EMAIL_FROM`, `BAZI_EMAIL_FROM_NAME`, `BAZI_PUBLIC_URL`, and the live token under `LOUISKO_CLOUDFLARE_EMAIL_TOKEN` (with `CLOUDFLARE_EMAIL_API_TOKEN` retained only as a supported fallback name); never commit the token.
- Bazi LINE Bot requires Zeabur secrets `BAZI_LINE_OWNER_EMAIL`, `BAZI_LINE_CHANNEL_SECRET`, `BAZI_LINE_CHANNEL_ACCESS_TOKEN`, and `BAZI_LINE_ALLOWED_USER_IDS`; optional limits are `BAZI_LINE_TEXT_SAFE_LIMIT`, `BAZI_LINE_SESSION_TTL_MS`, `BAZI_LINE_DOWNLOAD_TTL_MS`, and `BAZI_LINE_RATE_LIMIT_PER_MINUTE`. Never commit LINE credentials or user IDs.
