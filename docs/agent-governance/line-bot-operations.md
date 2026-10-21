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

The website, LINE, Markdown/text downloads and PNG renderer all use the same structured canonical result for a generation. LINE artifacts are stored under the existing storage provider using `line/` keys; there is no LINE-specific database.

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

The handler validates the raw request body with HMAC-SHA256, uses LINE `webhookEventId` when available for idempotency, and never logs Prompt content or full personal birth data. `幫助` and unknown commands return the same command prompt with LINE quick-reply buttons for the main operations.

## Supported Phase 1 Commands

```text
排盤 姓名 YYYY/MM/DD HH:MM 男／女
我的命主
查看 Prompt
取得 Markdown
取得文字檔
下載命盤 PNG
重新產生
幫助
取消
我的ID
```

Example:

```text
排盤 王小明 2000/01/01 12:00 男
```

`我的ID`（亦支援 `查詢ID`、`/myid`）是白名單外唯一的辨識入口：須先通過 Webhook 簽章驗證，且只接受一對一文字訊息與有效的 LINE User ID；限速與事件去重照常執行。僅回覆發訊者自己的 ID，不讀取 owner、命主、session 或下載資料，也不自動加入白名單。群組／聊天室不回覆此指令。管理者核對帳號後，在 Zeabur 的 `BAZI_LINE_ALLOWED_USER_IDS` 追加 ID，保留既有項目；不得以暱稱代替 ID，也不要把真實 ID 寫進 Git 或文件。所有獲准帳號目前共用設定的網站 owner，尚無每個 LINE 使用者獨立資料隔離。

公開說明與測試範例只能使用虛構姓名、日期與時間，不得放入真實命主個資。LINE 官方帳號管理後台的「自動回應訊息」必須關閉，讓 `/api/line/webhook` 成為唯一回覆來源；Webhook 開啟即可接收並處理訊息。

The parser applies the website defaults for LINE input: solar calendar, `Asia/Taipei` / UTC+8, north hemisphere, and `子初換日`. Gender is required in the LINE command. The Bot first displays the normalized data and asks for confirmation; only after confirmation does it save/update the owner-scoped profile and generate the artifact.

`查看 Prompt`、文字檔、Markdown 與 PNG 共用同一份 canonical snapshot。讀取時比對命主資料、姓名、目標年份、核心義與網站引擎來源版本；舊檔、內容雜湊不符或資料更動時自動重建，版本有效時直接沿用。`重新產生` 可手動更新。

LINE 快速排盤會用網站同一套 lunar-javascript 轉成真正的農曆；伺服器 adapter 亦從標準陽曆重新轉換，修復舊 LINE 紀錄中誤填的農曆文字，不改既有四柱與大運算法。

`下載命盤 PNG`（亦支援 `取得 PNG`、`下載 PNG`、`下載命盤`）會回傳下載頁連結；`取得文字檔`／`下載 TXT` 及 `取得 Markdown` 提供相同 Prompt 的不同格式。命主選擇與產生完成的快速按鈕也包含三種格式。

連結採 `/apps/bazi/line-download.html?openExternalBrowser=1#token=...`，依 [LINE 官方 URL 規則](https://developers.line.biz/en/docs/messaging-api/using-line-url-scheme/) 優先使用外部瀏覽器；fragment 不傳給靜態頁伺服器，LINE 網頁預覽不會消耗下載權限。使用者點「載入檔案」才呼叫一次性 API。頁面顯示準備狀態、實際接收位元組進度、檔名、大小及 PNG／文字全文預覽，再由使用者點「儲存檔案」、「開啟檔案」、支援時的原生檔案分享或複製全文。PNG 亦可長按儲存。同頁可再次儲存已取得的本機 Blob，不重用伺服器 token；成功載入後隱藏外部瀏覽器連結，避免將已使用 token 帶到另一頁。載入完成及送出儲存請求都不宣稱檔案已存入手機，實際位置由瀏覽器／系統選擇。

下載 API 依 token 紀錄綁定 owner、profile、artifact、contentHash 與格式，禁止透過 query 更換格式。HEAD 不消耗 token；成功繪製才消耗，失敗可重試；單一 token 並行下載最多一次成功；`server/download-consumer.cjs` 以本機 exclusive create／R2 `If-None-Match: *` 在渲染成功後原子寫入收據，跨程序防止重播。收據寫入失敗回 503，不傳回檔案；清除原權限失敗不丟棄已產生的唯一回應。過期、已使用、命主資料變動、版本過舊與跨 owner 均拒絕。

PNG 使用 `chart-export.js` 同一個 Canvas 排版，以 `@napi-rs/canvas` 在伺服器繪圖；隨程式提供完整 Noto Sans TC 字型並明確註冊，不依賴容器的系統字型。單次只允許一個 PNG render，避免共享服務記憶體暴增。`GET /api/bazi/line/status` 僅回傳格式、字型就緒與程式版本，不回傳命主、LINE ID、token 或帳號設定。

## Data Records

The existing Bazi profile record remains the source of owner profile data. The LINE adapter adds:

- `line/sessions/<hashed-line-user-id>.json`: short-lived confirmation and selection state.
- `line/events/<event-fingerprint>.json`: idempotency record for completed webhook events.
- `line/generations/<owner>/<profile>/<input-fingerprint>.json`: canonical result and version metadata.
- `line/artifacts/<owner>/<profile>/<artifact-id>.json`: Prompt content, hash, character count, and quality metadata.
- `line/artifacts/<owner>/<profile>/latest.json`: latest artifact pointer/content used by read-only Prompt retrieval.
- `line/downloads/<random-token>.json`: one-time, format-bound download authorization.
- `line/download-receipts/<random-token>.json`: atomic consumption receipt shared by overlapping deployments; contains only timestamps. Keep until the original token has expired. Local deployments must share one storage path; R2 deployments must share one bucket/prefix.

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
- Confirm the LINE Official Account Manager `自動回應訊息` switch is disabled; the default system reply must not be sent alongside Webhook replies.
- Send an incomplete `排盤` command and verify missing fields are reported.
- Send the example command and verify the confirmation step appears before generation.
- Confirm the test chart returns `乙酉 丁亥 丙辰 辛卯` and current luck `己丑` for the 2005 female fixture.
- Confirm `查看 Prompt` returns the current core-based Prompt for LINE-created and existing website profiles, including automatic stale-artifact refresh.
- Confirm TXT/Markdown match the website Prompt, PNG has all five colors and the shared six-pillar layout, and expired/repeated tokens fail.
- Open a LINE download page on mobile; verify loading progress, filename/size, full TXT/MD or PNG preview, explicit save/open actions and native sharing when supported. Confirm there is no automatic download before save, PNG supports long-press, and merely opening the landing page does not consume the token.
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

## 2026-10-20 完整對齊驗證

`npm run test:bazi:line` 現在同時執行原有 canonical regression 與簽章 webhook HTTP 整合測試。整合測試使用隔離暫存帳號、命主、token 與 LINE reply mock，不發訊息至正式 LINE；涵蓋舊檔更新、深層 fingerprint、農曆一致性、三格式下載、過期與並行 token、渲染失敗重試、跨 owner 拒絕及新命主確認流程。正式手機 LINE 收發與儲存仍須與伺服器測試分別記錄。

字型驗收必須額外執行 `DISABLE_SYSTEM_FONTS_LOAD=1 npm run test:bazi:line`，確保不依賴開發機字型。正式 `/api/bazi/line/status` 的 `renderer.available` 與 `renderer.chineseFontAvailable` 都應為 `true`，且格式列表包含 `png`；不能只以部署 RUNNING 作為 PNG 就緒依據。

## 下載體驗審核

網站與 LINE 共用 `apps/bazi/file-delivery.js/css`。到期或已使用連結不再提供無效重試；代理錯誤、空內容、錯誤格式與傳輸不完整不作成功。初始化失敗可重新載入。詳見 [下載審核](../../apps/bazi/docs/download-audit.md)，包括手機／R2 實測範圍及收據維護。
