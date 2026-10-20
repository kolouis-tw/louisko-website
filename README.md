# louisko.com

This repository is the main working directory for the future `louisko.com` site.

- Root-level files own the home page, shared deployment entry, and cross-site workflow.
- `apps/<slug>/` owns each subproject.
- This repo is the current canonical source for the site in this workspace.
- Local working root: `/Users/kolouis/Desktop/AI_Codex/AI_Web`

## Quick Map

- Main governance hub: `AGENTS.md`
- Governance modules: `docs/agent-governance/`
- Main site home: `index.html`
- Legacy Bazi compatibility entry: `bazi.html`
- Bazi app: `apps/bazi/`
- Photo app: `apps/photo/`
- Site workflow scripts: `scripts/site-workflow/`
- Project manifest: `manifest.json`

If you are routing agent work, start with `AGENTS.md`. If you are onboarding a human developer, use this README first and then jump to the matching app or workflow folder.

Historical sibling folders or migration-era notes may still appear in old records, but current edits should be made against this repository unless the user explicitly says otherwise.

## Recent Status Summary

2026-10-19 健診修復：靜態服務只公開網站頁面與前端資產；PHOTO 雲端修改沿用網站登入，限 `PHOTO_OWNER_EMAIL`（未設定時沿用 `BAZI_LINE_OWNER_EMAIL`）擁有者。讀取維持共享相簿；雲端刪除失敗會保留本機資料。執行 `npm run test:security` 驗證存取邊界。

截至 `2026-07-16`，目前正式網站已完成這幾天的主要整合：

- **部署架構**：GitHub 是版本來源；Zeabur 的 `louisko-node-photo` 執行 Node 主站、次頁與 API；Cloudflare 管理 `louisko.com` DNS、Email Sending 與 R2；Gmail 是驗證信與重設密碼信的收件測試端，不是網站資料庫。
- **Bazi**：完成國曆／農曆輸入、命主姓名與紀錄、帳號跨裝置同步、Email 驗證、忘記密碼、直接重設密碼、顯示密碼、刪除帳號，以及排盤後的 AI Prompt 匯出流程。大運規則統一記錄為「前後節氣起運、十步大運」。
- **Bazi LINE Bot**：已建立 Phase 1 私有 owner-scoped webhook adapter，沿用網站排盤與終身 AI Prompt Builder，支援排盤確認、命主列表、Prompt 查看、Markdown 短效下載與重複事件防護；尚待在 Zeabur 填入 LINE channel secret、access token 與 allowlist 後啟用。
- **資料安全**：帳號資料由登入帳號隔離；密碼以雜湊保存；正式寄信 token 只放 Zeabur secrets；R2 與 Cloudflare 憑證不可進 GitHub、README、AGENTS 或前端。
- **Photo**：完成本機 IndexedDB 相簿、HEIC 轉檔、浮水印、雲端同步、R2 保存、跨裝置讀取、照片刪除、Lightbox 與 ZIP 下載。頁面標題已簡化為 `PHOTO`。
- **介面規範**：首頁、次頁與深層頁面共用按鈕模式：暖棕色主要操作、白底次要操作、分頁啟用色、圓形圖示按鈕、紅色危險操作，並統一桌面／手機尺寸與間距。所有返回首頁入口使用 `/`。
- **驗證狀態**：主站、Bazi、Bazi 論命、Photo、ERP、AI、文件庫、紫微等正式頁面均已檢查回傳 `200`；共用 CSS、Logo、Photo JS、Manifest 與主要深層頁資源均可取得；Zeabur 正式部署成功。

詳細的服務關係、Cloudflare Zone、Workers Paid、R2、Email Sending、Zeabur 服務與未來擴充方向，請先讀 [docs/agent-governance/deployment-reference.md](docs/agent-governance/deployment-reference.md)；跨服務資料流請讀 [docs/agent-governance/louisko-backend-architecture.md](docs/agent-governance/louisko-backend-architecture.md)。
LINE Bot 的設定、指令、資料隔離與測試請讀 [docs/agent-governance/line-bot-operations.md](docs/agent-governance/line-bot-operations.md)。


## 八字／LINE 階段交接（2026-10-20）

已完成核心義顧問 Prompt、TXT／MD／五行配色六柱 PNG、LINE 與網站資料對齊、下載進度與預覽，以及最新共用儲存操作和一次性授權審核修正。已完成程式位於 release worktree；主工作目錄仍保留其他未提交變更，沒有整份回灌。

**程式完成並推送、正式站最新版切換尚未確認完成。** 上一輪通過 14 組 LINE／下載、7 組匯出與 33 項存取檢查；最新手機 LINE／瀏覽器實機驗收仍待補齊。完整新版論命決策引擎與 LINE 即時 LLM 對話尚未實作。

詳見 [八字子專案 AGENTS](apps/bazi/AGENTS.md)、[八字 README](apps/bazi/README.md) 與 [階段交接紀錄](docs/agent-governance/bazi-stage-handoff.md)。後者包含程式基準、worktree、已完成階段、測試證據、部署快照與接手順序；歷史摘要不應覆蓋此有日期的紀錄。

## Repository Structure

- Root: main site, shared assets, deployment entry, and shared workflow
- `apps/bazi/`: Bazi charting app
- `apps/photo/`: Louis Image Processor and Photo cloud front end
- `apps/erp/`, `apps/ai/`, `apps/docs/`: reserved or lightweight app roots
- `apps/ziwei/`: Ziwei Doushu standalone scaffold
- `scripts/site-workflow/`: page-management and publish workflow
- `docs/agent-governance/`: governance modules referenced by `AGENTS.md`

## Local Preview

```sh
npm start
```

Default port is `8080`. To override:

```sh
PORT=3000 npm start
```

## Common Workflows

List site pages:

```sh
npm run site:list
```

Verify main-site entry wiring:

```sh
npm run site:verify
```

Add a new page:

```sh
npm run site -- add-page --slug my-tool --title "我的新工具" --description "我的新工具"
```

You can also call the script directly:

```sh
node scripts/site-workflow/manage-site.mjs add-page --slug my-tool --title "我的新工具" --description "我的新工具"
node scripts/site-workflow/manage-site.mjs verify
```

## Photo App

`apps/photo/` is the Louis Image Processor.

It supports albums, photo upload, EXIF info bars, Louis Logo watermarking, rotation, deletion, lightbox preview, and ZIP download. HEIC / HEIF files are converted through the shared Node service at `POST /api/convert-heic`.

For storage, sync, HEIC, and cloud-delivery constraints, read:

- `apps/photo/AGENTS.md`
- `apps/photo/INDEX.md`
- `docs/agent-governance/deployment-reference.md`
- `docs/agent-governance/cloudflare-r2-operations.md`

## Bazi App

`apps/bazi/` is the production Bazi subproject. Root-level `bazi.html` is only a compatibility entry.

Before changing Bazi logic, read:

- `../重要資料_八字規格入口.md`
- `docs/agent-governance/bazi-guardrails.md`
- `apps/bazi/INDEX.md`

## Deployment

Current canonical targets:

- Production domain: `https://louisko.com/`
- Production Photo page: `https://louisko.com/apps/photo/`
- Production Bazi page: `https://louisko.com/apps/bazi/`
- Production Photo API: `https://louisko.com/api/photo-cloud/albums`
- Repository: `https://github.com/kolouis-tw/louisko-website`

The current production entry uses the Node service `louisko-node-photo`, which serves the main site, app pages, and Photo API from the same runtime entry.

For Zeabur, Docker, and dated operational snapshots, read `docs/agent-governance/deployment-reference.md`.

## Cloudflare R2

Use Wrangler CLI for Cloudflare / R2 tasks in this repo.

Do not place Cloudflare tokens, R2 access keys, Zeabur tokens, or other secrets into repository files, commit messages, issues, or chat replies.

For commands and domain-setup notes, read `docs/agent-governance/cloudflare-r2-operations.md`.

## Style System

The current shared site direction is the `苔原綠 / System` palette:

- Background: `#F8F6EF` + `#DDE8D2`
- Fonts: `Manrope` + `Noto Sans TC`

To reapply the shared style tokens:

```sh
npm run style:final
```

This should update shared color and typography tokens only, not established page structure or functionality.

## Public Content Rule

Unless the user explicitly asks, do not add prompts, usage instructions, safety reminders, or tutorial copy to public-facing pages. Keep that material in internal docs such as `README.md` or `AGENTS.md`.

## Housekeeping

Keep the repo free of ghost files such as stray `.DS_Store`, empty temporary folders, and accidental generated leftovers when they are safe to remove.
