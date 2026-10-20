# Louisko Web Change Log

本文件用來記錄每次 `louisko.com` 網頁修改、GitHub 同步與 Zeabur 部署。

## 2026-10-20 - LINE 與網站完整匯出對齊及命盤 PNG

- 目的：LINE 的新舊命主都使用這次網站核心義與同一份六柱資料，支援 TXT／Markdown／PNG；不加入流月。
- 功能 commit：`e5ed332 Align Bazi LINE exports with website and add chart PNG downloads`；字型可攜性修正 `5647c4e Bundle Traditional Chinese fonts for portable LINE chart PNG rendering`。均已推送實際部署分支 `codex/bazi-compact-prompt`。
- 資料修正：國曆以既有 lunar-javascript 轉農曆；舊 LINE 紀錄的錯誤農曆在 canonical adapter 正規化。Fingerprint 保留深層出生資料、姓名、規則、目標年與來源版本，讀取舊檔時自動更新。
- 下載：TXT／MD 內容與網站 Prompt 相同；PNG 共用 `chart-export.js` 的六柱五色版型。LINE 回傳下載頁，按鈕才消耗一次性權限；PNG 可預覽與長按儲存。格式、owner、profile、artifact、contentHash、期限及並行下載都受控，渲染失敗可重試。
- 本機驗證：原有 LINE canonical 回歸、3 組整合測試、7 組匯出測試、曆法與必要四柱／女命大運、Prompt 隔離、29 項存取保護及 site verify 通過。整合測試經由真實 HTTP 簽章 webhook，只有對 LINE reply API 的呼叫使用 mock，沒有寄送正式 LINE 訊息。
- 瀏覽器：390px 手機版實際下載 TXT／MD／PNG、同頁再次儲存、PNG 預覽與已使用連結提示通過；TXT／MD 檔案比對一致。
- 字型驗證：停用系統字型後的整合測試通過；使用隨附、具 SIL OFL 授權的 Noto Sans TC regular／bold，避免正式環境缺字。新增必要字型資產與來源 SHA-256，保持 server 目錄不能公開存取。
- Zeabur 部署：`6ad6fb577d48a89b2ad3d50f`（字型終稿）運作中。正式 `/api/bazi/line/status` 確認原生 PNG 編碼與中文字型均就緒，格式為 `md/txt/png`、來源版本吻合；下載頁、共享繪圖及排盤頁原始檔比對一致。未登入 profiles 維持 401，server 字型、程式與 lockfile 維持 404。
- 驗證範圍：完成伺服器整合與一般手機尺寸瀏覽器實際下載；尚未從使用者手機 LINE App 實際收發與儲存，不以 mock 測試冒充正式 LINE 收發。
- 工作區：沿用獨立管理 worktree，未覆蓋原工作目錄其他子專案或未提交變更。

## 2026-10-20 12:48 Asia/Taipei - 核心義終身顧問與五行命盤 PNG 上線

- 目的：文字檔、Markdown、複製功能改用使用者提供的十九節核心義作角色設定，附個別命主六柱細盤；不輸出流月或舊 JSON。新增本機 Canvas 五行配色 PNG，保留排盤演算法。
- 範圍：`apps/bazi/{index.html,bazi-analysis.html,advisor-core.js,chart-export.js}`、核心義原文副本、產生腳本、匯出測試、canonical service 與相應文件。
- 合併基準：確認 Zeabur 實際追蹤 `codex/bazi-compact-prompt` 的 `90a2a27`，保留 LINE、帳號同步、農曆輸入、Photo 存取保護及公開檔案限制；沒有從較舊的 `main` 覆寫正式站。
- 本機驗證：匯出測試 7/7、十神 100 組、旬空 60 柱、必要四柱與女命大運回歸、Prompt 命盤隔離、calendar profile、LINE canonical、security 25 項及 site verify 通過。
- GitHub 功能 commit：`0c3a54e Add source-based lifetime advisor exports and five-element chart PNG`；已推送 `codex/bazi-compact-prompt`。
- Zeabur：GitHub push 自動觸發；部署 `6ad6f1eb7d48a89b2ad3d27c` 已確認運作中。既有 CLI legacy token 回 `401`，改以已登入 Dashboard 查驗自動部署，沒有變更憑證。
- 線上驗證：主頁、論命頁、兩個 JS 模組均 HTTP 200 且檔案雜湊與發佈來源一致。實際排盤後下載 TXT／MD／PNG 成功；TXT 與 MD 相同、以核心義起首、無流月及舊 JSON；PNG 為 2560 × 4186，桌面四柱方向及 390px 手機版正常，複製與下載內容相同。
- 存取界線：後端程式、內部文件仍 404；未登入命主紀錄 API 仍 401。沒有建立正式測試帳號或發送 LINE／Email。
- 工作區：使用獨立管理 worktree 發佈，保留原工作目錄其他未提交變更；只同步本次作者建立的匯出模組修正，不覆蓋其他子專案。

## 2026-07-20 - 建立 Bazi Phase 1 私有 LINE Bot adapter

- 變更目的：依 LINE Bot 終身 AI 命理 Prompt 規格，讓已授權 LINE User ID 可使用既有網站 Bazi Core、命主紀錄、終身 Prompt 與 Markdown 匯出。
- 修改檔案：`server.js`、`apps/bazi/server/canonical-service.cjs`、`apps/bazi/server/line-bot.cjs`、`apps/bazi/scripts/line-bot-regression-check.cjs`、LINE governance／README／SMOKE_TEST／後端架構文件。
- API：新增 `POST /api/line/webhook` 與 owner-scoped、短效一次性 `GET /api/bazi/line/download`。
- 安全邊界：HMAC signature、LINE User ID allowlist、`kolouis@gmail.com` owner resolver、owner-scoped profile／artifact、session TTL、generation lock、rate limit、PII-safe logging；不讀取或保存網站密碼。
- 本機驗證：LINE canonical regression、2005／1975 golden chart、農曆閏月轉換、calendar regression 12/12、Prompt consistency、Ziwei 12/12、site verify、HTTP webhook fail-closed smoke 與 `git diff --check` 通過。
- GitHub commit：`4fd581d Add Bazi LINE Bot adapter and governance`。
- GitHub push：已推送到 `kolouis-tw/louisko-website` 的 `codex/bazi-compact-prompt` 分支。
- Zeabur 部署：project `6a008755e6a21fff4d962fee`、service `6a118115a458d428a0ab1ee4`、environment `6a008755e5ed304c1d845a06`，CLI 回報 `Service deployed successfully`。
- 線上驗證：`https://louisko.com/` 與 `/apps/bazi/` 回 `200`；`/api/bazi/auth/status` 回 `emailConfigured:true`；`POST /api/line/webhook` 無效簽章回 `401 LINE_SIGNATURE_INVALID`，確認 endpoint 已上線。
- 三資料夾同步：目前以 `AI_Web` 單一 repo 為正式來源；LINE 操作與設定已同步記錄於 `docs/agent-governance/line-bot-operations.md`。

## 2026-07-16 - 命主紀錄改為帳號雲端同步

- 變更目的：將命主紀錄從瀏覽器 owner key 雲端保存升級為真正的帳號登入與跨裝置同步，並保留本機 fallback。
- 修改檔案：`server.js`、`apps/bazi/index.html`、`apps/bazi/README.md`、`apps/bazi/SMOKE_TEST.md`、`docs/agent-governance/deployment-reference.md`。
- API：`/api/bazi/auth/{me,register,login,logout}` 與登入後的 `GET/POST/DELETE /api/bazi/profiles`。
- 隱私邊界：密碼以加鹽 scrypt 雜湊保存，登入使用 HttpOnly session cookie；命主資料以帳號 ID 分隔。建立帳號時遷移目前瀏覽器舊 owner key 紀錄。
- 本機驗證：server 語法、Bazi inline script、帳號註冊／登入／登出／未登入拒絕／跨登入讀取測試與 `git diff --check` 通過。
- GitHub commit：`6c6d460 Add bazi account sync across devices`。
- GitHub push：已推送到 `kolouis-tw/louisko-website` 的 `main`。
- Zeabur 部署：`6a57c15b3c393b66819cc33d`，狀態 `RUNNING`。
- 線上驗證：`https://louisko.com/apps/bazi/` 已載入「跨裝置同步」帳號介面；未登入 `/api/bazi/auth/me` 回傳 `authenticated:false`，未登入 `/api/bazi/profiles` 回傳 `401 AUTHENTICATION_REQUIRED`。

## 2026-07-16 - 加入 Bazi Email 驗證、忘記密碼與刪除帳號

- 變更目的：為帳號同步加入 Email 驗證、一次性忘記密碼連結、密碼重設後 session 失效，以及要求目前密碼確認的帳號刪除流程。
- 修改檔案：`server.js`、`apps/bazi/index.html`、`apps/bazi/README.md`、`apps/bazi/SMOKE_TEST.md`、`docs/agent-governance/deployment-reference.md`。
- API：`GET /api/bazi/auth/verify-email`、`POST /api/bazi/auth/resend-verification`、`POST /api/bazi/auth/forgot-password`、`POST /api/bazi/auth/reset-password`、`DELETE /api/bazi/auth/account`。
- 郵件服務：Cloudflare Email Sending REST API；本機 `BAZI_EMAIL_PROVIDER=console` 可輸出測試連結，正式環境必須配置 Zeabur secrets。
- 本機驗證：註冊／驗證／登入／忘記密碼／一次性重設／舊 session 失效／刪除帳號與 profile 檔案清除通過；password 欄位顯示切換語法檢查通過。
- GitHub commit：`c1f48f8 Add bazi email account security flows`。
- GitHub push：已推送到 `kolouis-tw/louisko-website` 的 `main`。
- Zeabur 部署：`6a5818bf3c393b66819cca84`，狀態 `RUNNING`。
- 線上驗證：正式頁面已載入 Email 驗證、忘記密碼、刪除帳號與顯示密碼控制；未登入 `/api/bazi/auth/me` 回 `authenticated:false`，未登入 profiles 回 `401 AUTHENTICATION_REQUIRED`。正式註冊目前回 `503 EMAIL_SERVICE_NOT_CONFIGURED`，因 Zeabur 尚未配置 Cloudflare Email Sending secret，未建立測試帳號。

## 2026-07-16 - 顯示 Email 服務未啟用狀態

- 變更目的：修正 Email 相關按鈕看似沒有作用的問題，新增 `/api/bazi/auth/status`，並在 UI 直接以錯誤色提示 Email 驗證、忘記密碼與重寄驗證信尚未啟用的真正原因。
- 修改檔案：`server.js`、`apps/bazi/index.html`。
- 本機驗證：server 與 inline script 語法、`git diff --check` 通過。
- GitHub commit：`079ef8f Show bazi email service status in UI`。
- GitHub push：已推送到 `kolouis-tw/louisko-website` 的 `main`。
- Zeabur 部署：`6a5844273d3d099ed2f12df6`，狀態 `RUNNING`。
- 線上驗證：`GET /api/bazi/auth/status` 回傳 `{"ok":true,"emailConfigured":false}`；正式頁面已載入郵件未啟用的錯誤提示，註冊回傳 `503 EMAIL_SERVICE_NOT_CONFIGURED`，未建立測試帳號。

## 2026-07-16 - 修正命主姓名輸入框視覺一致性

- 變更目的：修正命主姓名 `type=text` 未套用既有表單控制樣式，造成尺寸、內距與日期輸入欄位不一致。
- 修改檔案：`apps/bazi/index.html`、`apps/bazi/SMOKE_TEST.md`。
- 資料與演算法：未修改，純 UI 樣式修正。
- 本機驗證：inline script 語法檢查、曆法回歸檢查與 `npm run site:verify` 待本次完成後補記。
- GitHub push：待本次變更確認後處理。
- Zeabur 部署：待本次變更確認後處理。
- 線上驗證：待部署後補記。

## 2026-07-16 - 八字命主紀錄與國曆／農曆雙輸入

- 變更目的：在正式八字排盤頁加入命主姓名、命主紀錄分頁、localStorage 儲存與刪除確認，以及國曆／農曆雙向輸入。
- 主要檔案：`apps/bazi/index.html`、`apps/bazi/vendor/lunar-javascript-1.7.7.js`、`apps/bazi/scripts/calendar-profile-regression-check.mjs`、`apps/bazi/README.md`、`apps/bazi/SMOKE_TEST.md`。
- 資料邊界：曆法轉換只產生標準陽曆日期；四柱、子時換日、前後節氣起運與十步大運仍沿用原有函式。
- 儲存方式：`louisko_bazi_profiles_v1`，僅存在目前瀏覽器裝置，不代表雲端同步。
- 本機驗證：HTML inline script `node --check`、農曆 `2026-06-20 12:30` round-trip、`npm run site:verify` 通過；Playwright CLI 因環境沒有 `npx` 未執行。
- GitHub push：待本次變更確認後處理。
- Zeabur deploy：待本次變更確認後處理。
- 線上驗證：待部署後補記。
- 三資料夾同步：目前以 `AI_Web` 單一 repo 為正式來源，本次同步更新此 app 與站台變更紀錄。

## 記錄格式

```md
## YYYY-MM-DD HH:mm TZ - 變更標題

- 變更目的：
- 修改檔案：
- 本機驗證：
- GitHub commit：
- GitHub push：
- Zeabur 部署：
- 線上驗證：
- 三資料夾同步：
- 備註：
```

## 2026-05-22 10:51 Asia/Taipei - 修正八字論命頁返回排盤連結

- 變更目的：修正 `https://louisko.com/apps/bazi/bazi-analysis.html` 的「返回排盤」指到不存在的 `bazi-input-test.html`，造成 404。
- 修改檔案：`apps/bazi/bazi-analysis.html`
- 本機驗證：本機 server 開啟 `http://127.0.0.1:8083/apps/bazi/bazi-analysis.html`，點擊頂部「返回排盤」後回到 `http://127.0.0.1:8083/apps/bazi/`。
- GitHub commit：`71f2482 Fix bazi analysis return link`
- GitHub push：已推送到 `kolouis-tw/louisko-website` 的 `main`。
- Zeabur 部署：先用 `deploy` 重跑服務，確認未帶入本機未推內容；再用 `upload --interactive=false --json` 上傳本機站台檔案。
- 線上驗證：重新抓取 `https://louisko.com/apps/bazi/bazi-analysis.html`，確認兩個「返回排盤」皆為 `href="./"`。
- 三資料夾同步：已同步目前站台與未來主專案候選；`03_bazi-engine-ts` 未改，因該獨立 engine 測試頁本來存在 `bazi-input-test.html`，不是正式站台 404 問題。
- 備註：本次同時修復 GitHub SSH key 與 remote，後續可正常 `git push origin main`。

## 2026-05-22 11:00 Asia/Taipei - 補充八字同步與十步大運文件

- 變更目的：補充三資料夾連動規則，並把舊文件中的九步大運描述校正為前後節氣起運、十步大運。
- 修改檔案：`AGENTS.md`、`README.md`、`apps/bazi/README.md`、`apps/bazi/SMOKE_TEST.md`、`apps/bazi/changelog/v2_luck_sync_fix.md`、`apps/bazi/docs_algorithm.md`、`apps/bazi/docs_overview.md`、`scripts/site-workflow/README.md`
- 本機驗證：文件變更，未涉及頁面執行邏輯。
- GitHub commit：`6c21c76 Document bazi sync workflow`
- GitHub push：尚未推送時建立本紀錄；後續推送時補記。
- Zeabur 部署：未部署，文件不影響線上頁面功能。
- 線上驗證：不適用。
- 三資料夾同步：此紀錄先建立於目前站台；後續同步到未來主專案候選工作流文件。
- 備註：此 commit 之後如有 push 或 deploy，需在本段補記。

## 2026-05-22 11:20 Asia/Taipei - 建立網頁變更與部署流程紀錄

- 變更目的：整理並固定每次網頁修改、新增頁面、GitHub push、Zeabur deploy/upload 與線上驗證的標準流程。
- 修改檔案：`scripts/site-workflow/WEB_CHANGE_DEPLOYMENT_WORKFLOW.md`、`scripts/site-workflow/WEB_CHANGE_LOG.md`、`scripts/site-workflow/README.md`
- 本機驗證：文件變更，檢查 Markdown 內容與路徑引用。
- GitHub commit：`Document web change deployment workflow`（本次 commit）。
- GitHub push：與前一筆文件 commit 一起推到 `main`。
- Zeabur 部署：未部署；此變更為文件與流程紀錄，不影響線上頁面。
- 線上驗證：不適用。
- 三資料夾同步：已同步新增到目前站台與未來主專案候選；`03_bazi-engine-ts` 未改，因本流程屬於網站與部署工作流，非 engine 程式或測試。
- 備註：後續每次站台變更都應先看 `WEB_CHANGE_DEPLOYMENT_WORKFLOW.md`，完成後補本檔。

## 2026-07-10 16:30 Asia/Taipei - 新增八字精簡 AI Prompt 匯出模式

- 變更目的：在 `bazi-analysis.html` 保留完整 Prompt 的前提下，新增預設顯示的「精簡 AI Prompt」匯出模式，讓內容可貼入 ChatGPT、Gemini 等 AI 輸入框。
- 修改檔案：`apps/bazi/bazi-analysis.html`、`apps/bazi/SMOKE_TEST.md`、`apps/bazi/docs/regression_cases.md`、`scripts/site-workflow/WEB_CHANGE_LOG.md`
- 本機驗證：`/opt/homebrew/bin/node --check /private/tmp/bazi-analysis-check.js`、`/opt/homebrew/bin/node scripts/site-workflow/manage-site.mjs verify`、自製 harness 驗證測試命盤四柱 / 目前大運 / 2026 流年 / 2026 流月 / compact prompt 字數。
- GitHub commit：待補
- GitHub push：待補
- Zeabur 部署：待補
- 線上驗證：待補
- 三資料夾同步：本工作區目前以 `AI_Web` 單一 repo 為正式來源；本次僅更新八字 Prompt Export Layer 與對應測試文件。
- 備註：未修改四柱、十神、藏干、起運、大運、流年、流月、五虎遁與神煞判定邏輯；完整 JSON 與完整 Prompt 仍保留。

## 2026-07-13 00:35 Asia/Taipei - 修正終身八字 Prompt 一致性與防污染

- 變更目的：修正終身八字 AI 顧問 Prompt 的單一資料來源、跨命盤污染、原局 / 大運作用誤判、人生領域舊 fixture 殘留，並加入生成前後驗證與 UI 阻斷。
- 修改檔案：`apps/bazi/bazi-analysis.html`、`apps/bazi/SMOKE_TEST.md`、`apps/bazi/scripts/lifetime-prompt-consistency-check.mjs`、`scripts/site-workflow/WEB_CHANGE_LOG.md`
- 本機驗證：`/opt/homebrew/bin/node` 語法檢查 `apps/bazi/bazi-analysis.html`、`/opt/homebrew/bin/node --check apps/bazi/scripts/lifetime-prompt-consistency-check.mjs`、`/opt/homebrew/bin/node apps/bazi/scripts/lifetime-prompt-consistency-check.mjs`、`PATH=/opt/homebrew/bin:$PATH /opt/homebrew/bin/npm run site:verify`
- GitHub commit：待補
- GitHub push：待補
- Zeabur 部署：待補
- 線上驗證：待補
- 三資料夾同步：本工作區目前以 `AI_Web` 單一 repo 為正式來源；本次僅更新 `apps/bazi/` 與站台變更紀錄。
- 備註：已移除終身 Prompt 內的「動態時運資料包」段落；未修改四柱、日主、十神、藏干、起運、大運、流年、流月等核心計算入口。

## 2026-07-14 00:25 Asia/Taipei - 調整終身八字 AI 顧問首次完整建檔流程

- 變更目的：讓終身八字 AI 顧問 Prompt 在第一次貼入外部聊天模型時，先完成一次完整本命與終身大運建檔論命，之後再切換成精準顧問模式；同時移除永久 Prompt 對建檔流年的主動分析暗示。
- 修改檔案：`apps/bazi/bazi-analysis.html`、`scripts/site-workflow/WEB_CHANGE_LOG.md`
- 本機驗證：`/opt/homebrew/bin/node apps/bazi/scripts/lifetime-prompt-consistency-check.mjs`、`PATH=/opt/homebrew/bin:$PATH /opt/homebrew/bin/npm run site:verify`
- GitHub commit：待補
- GitHub push：待補
- Zeabur 部署：待補
- 線上驗證：待補
- 三資料夾同步：本工作區目前以 `AI_Web` 單一 repo 為正式來源；本次僅更新 `apps/bazi/` 與站台變更紀錄。
- 備註：未修改四柱、十神、藏干、起運、大運、流年、流月等核心計算；主要更新 Prompt Builder、首次行為規則、後續回答規則與品質檢查。
