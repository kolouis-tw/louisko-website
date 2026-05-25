# AI_Web Scripts

此資料夾放 `AI_Web` 層級的跨專案腳本。

## louisko deployment plan

`louisko-deployment-plan.mjs` 會把 `louisko.com` 的部署規劃變成可執行檢查：

- 印出 GitHub / Zeabur / Cloudflare / R2 分工。
- 檢查白話部署手冊是否存在。
- 檢查 Wrangler CLI / Cloudflare login / R2 bucket 狀態。
- 檢查正式 `louisko.com` Node service 的首頁、Photo 頁、Photo API。
- 檢查 Photo metadata 是否仍有 ghost `Louis Album`、舊縮圖 references、缺 storageKey 的照片。
- 檢查 Photo source 是否仍會自動建立 `Louis Album`，以及刪除相簿是否會清掉 storage prefix。
- 檢查同網域照片下載代理 `/api/photo-cloud/object` 是否可讀第一張雲端照片。
- 檢查 generated domain `louisko-node-photo.zeabur.app` 備援網址。
- 印出下一步人工作業與 Codex 作業。

用法：

```sh
node scripts/louisko-deployment-plan.mjs plan
node scripts/louisko-deployment-plan.mjs check
node scripts/louisko-deployment-plan.mjs check --online
node scripts/louisko-deployment-plan.mjs next
```

注意：

- 腳本不會修改 GitHub、Zeabur、Cloudflare 或 R2。
- 腳本只做讀取與狀態檢查。
- 預設 `check` 只做快速本機檢查。
- `check --online` 會查 Wrangler、R2 與線上網址；若在 Codex sandbox 中沒有外部網路權限，可能顯示 `WARN`，這代表外部查詢被擋，不代表網站一定壞掉。
- 目前正式架構是 `louisko.com` 直接綁 Zeabur Node service；`louisko-node-photo.zeabur.app` 是備援 generated domain，不是主要入口。
- R2 只應保存單一成品 JPG，不應再保存 `_thumb.jpg` 或 `thumbnailUrl` metadata。
- 目前 Photo 乾淨空狀態可以是 `0 albums / 0 photos`；這時 `/api/photo-cloud/object` 沒有照片樣本可測是正常情況。
- Photo 不可再自動建立 `Louis Album`；若瀏覽器本機 IndexedDB 還有舊 `Louis Album`，新版前端會在啟動時清除。
- Photo 刪除規則是「刪照片或相簿時，同時清本機 IndexedDB/blob、雲端 metadata、R2/local storage 實體路徑」。
- 不要把任何 Cloudflare / R2 / Zeabur / GitHub secret 寫入腳本或文件。

## R2 photo orphan audit

`r2-photo-orphan-audit.mjs` 用於完整盤點 `louisko-photo` bucket：

- 讀取 R2 內的 `_metadata/photo-cloud.json`。
- 列出 metadata 有登記、但 R2 bucket 缺少的照片檔案。
- 列出 R2 bucket 內存在、但 metadata 沒有登記的孤兒檔。
- 特別標示舊架構可能留下的 `_thumb.jpg` 類型檔案。
- 預設只稽核，不會刪除任何檔案。

用法：

```sh
R2_ACCOUNT_ID=... R2_ACCESS_KEY_ID=... R2_SECRET_ACCESS_KEY=... R2_BUCKET=louisko-photo \
  node scripts/r2-photo-orphan-audit.mjs
```

確認輸出內容後，才可刪除孤兒檔：

```sh
R2_ACCOUNT_ID=... R2_ACCESS_KEY_ID=... R2_SECRET_ACCESS_KEY=... R2_BUCKET=louisko-photo \
  node scripts/r2-photo-orphan-audit.mjs --delete --yes
```

若 metadata 登記了不存在於 R2 的照片檔，可先備份 metadata，再移除幽靈照片紀錄；若相簿因此變成空相簿，也可一併清掉：

```sh
R2_ACCOUNT_ID=... R2_ACCESS_KEY_ID=... R2_SECRET_ACCESS_KEY=... R2_BUCKET=louisko-photo \
  node scripts/r2-photo-orphan-audit.mjs --prune-missing-metadata --prune-empty-albums --yes
```

注意：

- `--delete --yes` 只會刪除「R2 有、metadata 沒有」的孤兒物件。
- `--prune-missing-metadata --yes` 會先寫入 `_metadata/backups/` 備份，再移除「metadata 有、R2 沒有」的幽靈照片紀錄。
- `--prune-empty-albums` 只會移除因幽靈照片紀錄被清掉後變成空的相簿。
- 腳本不會刪除 metadata 內仍有登記的照片，即使相簿名稱在 Cloudflare Dashboard 看起來不像資料夾。
- R2 secret 只能透過環境變數傳入，不可寫入 README、AGENTS 或任何 commit。

## Louisko maintenance audit

`louisko-maintenance-audit.mjs` 用於跨平台盤點 GitHub / Zeabur / Cloudflare：

- GitHub：repo、分支、Actions artifacts、Actions caches。
- Zeabur：服務、domain 綁定、部署紀錄。
- Cloudflare：R2 bucket、R2 bucket info、Pages 專案清單。
- 預設只稽核，不刪任何東西。

用法：

```sh
node scripts/louisko-maintenance-audit.mjs --online --stale-days=7
```

安全清理 GitHub 已過期 artifacts：

```sh
node scripts/louisko-maintenance-audit.mjs --online --delete-expired-github-artifacts --yes
```

注意：

- `--delete-expired-github-artifacts --yes` 只刪 GitHub 已標記 expired 的 Actions artifacts。
- Zeabur 無 domain 服務只列為人工確認，不由腳本自動刪除。
- Cloudflare / R2 的物件級孤兒檔仍使用 `r2-photo-orphan-audit.mjs` 獨立檢查。
