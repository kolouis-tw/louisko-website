# Louisko Site Workflow

這個資料夾保存 `louisko.com` 主站新增入口、建立子頁、驗證、推送 GitHub 與部署 Zeabur 的共用腳本。

本工作區目前以 `AI_Web` 這個 repo 為正式來源；除非使用者明確指定，勿再把舊的平行資料夾當成預設同步對象。

主腳本：

```sh
node scripts/site-workflow/manage-site.mjs
```

最終視覺風格腳本：

```sh
node scripts/site-workflow/louisko-style-system.mjs info
node scripts/site-workflow/louisko-style-system.mjs final
```

目前最終定案為「苔原綠 / System」：暖白 `#F8F6EF` + 苔原綠 `#DDE8D2`，字體為 Manrope + Noto Sans TC，整體較厚、圓潤、穩。此腳本只重套顏色與字體 token，不應改動已確認的版面結構與功能。

## 流程與紀錄文件

- `WEB_CHANGE_DEPLOYMENT_WORKFLOW.md`：記錄每次網頁變更、GitHub 同步與 Zeabur 部署的標準流程，以及各步驟的作用。
- `WEB_CHANGE_LOG.md`：每次修改、commit、push、deploy 與線上驗證後都要補一筆紀錄。

## 常用流程

列出首頁目前入口：

```sh
node scripts/site-workflow/manage-site.mjs list
```

建立新的子頁資料夾，並自動加到首頁入口：

```sh
node scripts/site-workflow/manage-site.mjs add-page \
  --slug my-tool \
  --title "我的新工具" \
  --description "我的新工具" \
  --code 000000
```

這會建立：

```text
apps/my-tool/index.html
```

重新依 `site-pages.json` 產生首頁入口：

```sh
node scripts/site-workflow/manage-site.mjs refresh-home
```

檢查首頁入口與必要檔案：

```sh
node scripts/site-workflow/manage-site.mjs verify
```

提交並推送 GitHub：

```sh
node scripts/site-workflow/manage-site.mjs publish --message "Update Louisko pages"
```

提交、推送 GitHub，並重新部署 Zeabur：

```sh
node scripts/site-workflow/manage-site.mjs publish --message "Update Louisko pages" --zeabur
```

## 約定

- `index.html` 是 Louisko 主頁。
- `apps/<slug>/index.html` 是子頁或子專案入口。
- `apps/bazi/index.html` 是八字排盤主檔。
- `bazi.html` 保留在根目錄作為舊網址相容入口。
- 首頁入口資料放在 `site-pages.json`。
- `index.html` 裡的首頁入口按鈕區塊由下列 marker 管理：

```html
<!-- LOUISKO_APP_CARDS_START -->
<!-- LOUISKO_APP_CARDS_END -->
```

請不要手動刪除這兩個 marker，否則腳本無法更新首頁入口。

## 單一 repo 連動

若有 louisko.com 站台、八字頁、Photo、測試、工作流或部署相關更新，務必同步檢查這個 repo 內相鄰區塊是否需要連動，例如：

- 根目錄 `README.md` / `AGENTS.md`
- `apps/<slug>/`
- `scripts/site-workflow/`
- `docs/agent-governance/`

若使用者另外指定外部副本或獨立 engine，再額外同步；否則以本 repo 為準。

## 安全與頁面規則

- 腳本不會覆蓋已存在的 `apps/<slug>/index.html`。
- Zeabur token 只會從 `/Users/kolouis/.codex/config.toml` 讀取，不會寫入 repository。
- `publish` 只會加入網站與文件相關檔案，不會批次加入整個工作區。
- 除非使用者明確要求，不要把提示詞、說明提醒、使用說明、安全提醒或教學文字放到公開頁面上。
