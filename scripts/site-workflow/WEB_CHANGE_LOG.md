# Louisko Web Change Log

本文件用來記錄每次 `louisko.com` 網頁修改、GitHub 同步與 Zeabur 部署。

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
