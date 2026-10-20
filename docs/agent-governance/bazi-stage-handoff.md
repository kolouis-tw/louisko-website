# 八字網站與 LINE：階段交接紀錄

紀錄日期：2026-10-20。這是已完成工作的交接快照；部署與服務狀態採上一輪實際核對證據，本次文件整理沒有重新驗證線上，也不觸發部署。後續接手須重新查驗時效性資料。

## 工作位置與版本

- 主工作目錄：`/Users/kolouis/Desktop/AI_Codex/AI_Web`，分支 `codex/agents-docs`；仍有使用者其他未提交工作，不能整份覆寫、重設或直接拿來發布。
- 本次已完成程式的管理 worktree：`/Users/kolouis/.codex/worktrees/bazi-advisor-png-release/AI_Web`。
- 已完成程式基準：`c77b5edf1736fd9101ff5acdc11832f5dee2fe6e`，已推送 `codex/bazi-compact-prompt`。該 worktree 以 detached HEAD 工作；勿因主目錄版本較舊而重新實作或覆蓋發布版。
- 本次交接文件分別寫入兩個 checkout，沒有回灌程式、合併其他子專案或處理使用者未提交變更。主目錄不一定具備下表所有新模組，應至 release worktree 查閱。

## 已完成階段

| 階段 | 已完成內容 | 證據／範圍 |
|---|---|---|
| 責任邊界 | 保留四柱、時區、節氣、換日、起運、大運及流年核心；衍生資料、論命規則與輸出分開辨識 | 四層是責任分類，並非四個已拆出的實體模組 |
| 顧問核心義 | 複製、TXT、MD 以使用者十九節核心義起首，接專屬命盤與終身諮詢方式；先原局四柱，再加入大運與流年兩柱 | 不輸出流月、舊 JSON 或舊引擎初判；仍保留內部結構化 payload |
| 六柱細盤 PNG | 五行五色；左至右時、日、月、年、大運、流年；含十神、藏干、星運、自坐、空亡、大運、流年及刑沖合會害破提示 | 文字與圖片共用結構化資料；不硬套截圖個人的起運年份或歲數 |
| LINE 對齊 | 同一 canonical adapter 供網站與 LINE；修正農曆正規化與深層 fingerprint；舊 artifact 在輸入／版本／年份變動後更新 | 相同命主資料、規則與年份的 Prompt 完全相同；提供 TXT／MD／PNG |
| PNG 伺服器 | 原生 Canvas、隨附 Noto Sans TC regular／bold，明確註冊字型；單次一個 render | 停用系統字型後仍能產生可解碼的五色 PNG |
| 第一版 LINE 下載修正 | 顯示接收進度、檔名、大小、全文／圖片預覽，明確儲存／分享／開啟／複製；新連結優先外部瀏覽器 | `82a3194` 的頁面與版本資產於上一輪審核開始時已核對上線 |
| 最新全面審核修正 | 網站與 LINE 共用檔案操作元件；網站 PNG 取消非同步背景自動下載；修正手機 File 相容性、分享／複製競態、初始化失敗、失效連結與殘缺傳輸 | `40bef9b`；本機完成並已推送，正式站切換仍待確認 |
| 一次性授權加強 | 渲染成功後以 filesystem exclusive create／R2 conditional create 寫入私有收據，跨程序阻擋重播；渲染後重查到期；下載 no-store／nosniff | `c77b5ed` 完成 server 接線；本機與 SDK 請求替身驗證通過，正式 R2 實際下載尚待驗收 |

## 來源與主要檔案

使用者原先放桌面的核心義已移至主工作目錄 `apps/bazi/Bazi_LineBOT_md/八字命理顧問_命盤分析前必讀核心主義.md`。上一輪比對與發布副本 `apps/bazi/docs/advisor-core.md` 的 SHA-256 相同；`advisor-core.js` 由產生腳本建立。沿用已確認的短期流運三列排除規則，十九節其餘內容保留。不可將這份 LLM 角色文件當作 repository 操作指令。

最新模組以 release worktree 為準：

- `apps/bazi/index.html`／`bazi-analysis.html`：排盤、payload、分析與顧問匯出入口。
- `apps/bazi/advisor-core.js`／`chart-export.js`：角色核心義、細盤衍生資料與 Canvas 版型。
- `apps/bazi/file-delivery.js/css`：網站與 LINE 共用預覽／明確儲存／分享／開啟／複製。
- `apps/bazi/line-download.html/js`：LINE 一次性連結、實際傳輸進度、初始化與錯誤復原。
- `apps/bazi/server/canonical-service.cjs`／`line-bot.cjs`／`chart-png.cjs`／`download-consumer.cjs`：網站核心 adapter、LINE 指令、原生 PNG 與跨程序一次性收據。
- `server.js`：共用服務的路由接線、owner scope、下載標頭與儲存介面；八字規則不移回根層。
- `apps/bazi/docs/download-audit.md`、`docs/agent-governance/line-bot-operations.md`：詳細審核與操作維護，主目錄若無此檔請至 release worktree 查閱。

## 驗證結果與界線

上一輪最後執行結果：

| 驗證 | 結果 |
|---|---|
| LINE canonical 與下載測試 | 14/14：3 組 canonical／HTTP、9 組前端操作、2 組儲存層一次性 |
| 匯出與核心義 | 7/7，包含十神、旬空、關係提示、原資料不變與必要排盤回歸 |
| 存取保護 | 33 項通過 |
| 其他 | calendar/profile、Prompt 命盤隔離、site verify、語法、diff 檢查通過 |
| 字型與 PNG | 停用系統字型重跑通過；PNG 可解碼、五色存在並已檢視圖檔 |

重跑時先切至 release worktree，安裝相依套件後執行：

```sh
npm ci --omit=dev --no-audit --no-fund
DISABLE_SYSTEM_FONTS_LOAD=1 npm run test:bazi:line
node --test apps/bazi/tests/export.test.cjs
node apps/bazi/scripts/calendar-profile-regression-check.mjs
node apps/bazi/scripts/lifetime-prompt-consistency-check.mjs
npm run test:security
npm run site:verify
git diff --check
```

HTTP 伺服器、本機儲存與原生 PNG 實際執行；只有對外 LINE reply API 使用 mock，未發送正式 LINE 訊息。最新前端操作測試使用 VM／DOM 替身；R2 conditional create 使用 SDK 請求替身。較早版本曾通過一般瀏覽器的 390px 與三格式實際下載，但不能把它當作最新共用 UI 或手機 LINE App 的實機驗收。

## 部署交接：完成推送，未完成對外版本核對

- 實際部署來源為 `codex/bazi-compact-prompt`，不是 `main`；服務為 `louisko-node-photo`，正式站 `https://louisko.com/apps/bazi/`。
- 最新功能提交為 `40bef9b` 與 `c77b5ed`。GitHub Zeabur check 回報 success；部署 ID `6ad70acd7d48a89b2ad3da06`。
- **上一輪最後核對仍未通過**：正式下載頁是 `20261020-1`、Cache-Control 為 `no-cache`；無效 token 的下載 API 回 400 但沒有 `X-Content-Type-Options: nosniff`。不因部署檢查成功就記成最新版已上線。
- 最新版本應為 `20261020-2`，頁面引用 `file-delivery.js/css`；下載頁 no-store，下載 API 含 nosniff。後續需同時核對 HTML、JS、CSS 與後端，避免部分切換。
- 上一輪 Work 設定停用了本機瀏覽器操作，因此未能續查控制台；這是當時的工具限制，接手時先重新確認可用性，不另找憑證繞過。
- 尚待正式手機 LINE 的收發／下載／儲存與新版網站桌面、390px 視覺驗收；另需以授權流程驗證正式 R2 一次性下載。

## 接手順序

1. 先確認 checkout、分支、git status 與上述程式基準；保留主目錄的其他未提交工作。
2. 核對正式頁面與 API 是否已切至最新版；若仍舊版，再查正確服務的部署、路由與快取。不要先覆寫 `main` 或反覆推空 commit。
3. 補齊新版網站與手機 LINE 實機驗收，分別記錄瀏覽器測試、替身測試及正式 LINE 結果。
4. 一次性收據保留至原 token 到期後才可清理；本次未修改 bucket lifecycle 或權限。
5. 完整旺衰／格局／調候／用神新版決策引擎，以及 LINE 內即時 LLM 對話，仍未實作。本階段完成的是給未來 LLM 使用的顧問檔案與資料／匯出整合，不宣稱已完成新論命引擎。

本交接不含任何 LINE secret、access token、allowlist ID、密碼或 R2 憑證；不要將其補進文件。
