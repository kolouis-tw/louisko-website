# 八字排盤子專案

這是 `louisko.com` 的八字排盤子專案。正式入口為：

```text
https://louisko.com/apps/bazi/
```

根目錄 `bazi.html` 只作為舊網址相容入口，會導向本子專案。

若要開始閱讀或路由此子專案工作，先看 `INDEX.md`，再依需要看 `docs_algorithm.md` 與根目錄 `AGENTS.md`。

## 主要檔案

- `index.html`: 八字排盤主頁與核心程式。
- `vendor/lunar-javascript-1.7.7.js`: MIT 授權的國曆／農曆轉換引擎，由 `index.html` 的 adapter 統一呼叫。
- `vendor/lunar-javascript-LICENSE.txt`: 農曆轉換引擎授權文字。
- `docs_algorithm.md`: 演算法說明。
- `docs_overview.md`: 功能總覽。
- `docs/script_blueprint.md`: 八字運算、大運流年、payload 與產出流程的腳本化整合藍圖。
- `SMOKE_TEST.md`: 基本測試清單。
- `docs/regression_cases.md`: 回歸案例。
- `changelog/`: 版本紀錄。
- `examples/`: 範例資料。

## 命主輸入與紀錄

`index.html` 的輸入層支援國曆（陽曆）與農曆（陰曆）雙向轉換。曆法轉換只負責民用日期互轉；子初／子正換日仍由既有四柱核心的 `lateZiSwitchDay` 處理，兩者不可混用。

完成排盤後，命主資料會在登入狀態下同步至同一 Node 服務的 `/api/bazi/profiles`，由現有 R2 儲存層保存；`louisko_bazi_profiles_v1` 仍作為本機快取與 API 暫時不可用時的 fallback。紀錄包含原始輸入曆法、標準陽曆出生時間、農曆年月日與閏月、性別、南北半球、換日法、時區與建立／更新時間。同一姓名、出生時間、性別、出生地與換日法再次排盤時只更新 `updatedAt`，不建立重複資料。

命主紀錄現在使用帳號登入與 HttpOnly 工作階段 Cookie。`/api/bazi/auth/register`、`/api/bazi/auth/login`、`/api/bazi/auth/logout` 與 `/api/bazi/auth/me` 管理帳號；密碼只以加鹽 scrypt 雜湊保存，命主資料以帳號 ID 分隔。建立帳號時會嘗試將目前瀏覽器舊 owner key 下的既有雲端紀錄轉入新帳號，之後在另一台裝置登入同一電子郵件與密碼即可讀取相同紀錄。未登入時仍可暫存本機資料，但 UI 會明確標示尚未同步到雲端。

帳號安全流程另提供 `GET /api/bazi/auth/verify-email`、`POST /api/bazi/auth/resend-verification`、`POST /api/bazi/auth/forgot-password`、`POST /api/bazi/auth/reset-password` 與 `DELETE /api/bazi/auth/account`。驗證信與重設密碼信使用一次性雜湊 token；重設密碼會使既有工作階段失效；刪除帳號會刪除帳號與該帳號的命主紀錄。正式環境需設定 Cloudflare Email Sending：

```text
BAZI_EMAIL_PROVIDER=cloudflare
CLOUDFLARE_EMAIL_API_TOKEN=<Email Sending: Edit token>
CLOUDFLARE_EMAIL_ACCOUNT_ID=<Cloudflare account id>
BAZI_EMAIL_FROM=no-reply@louisko.com
BAZI_EMAIL_FROM_NAME=Louisko 八字排盤
BAZI_PUBLIC_URL=https://louisko.com
```

本機可使用 `BAZI_EMAIL_PROVIDER=console` 檢查流程，信件連結會輸出到 server console；正式環境未設定郵件服務時，註冊會拒絕建立帳號，不會產生無法驗證的帳號。Cloudflare 寄件網域必須先完成 Email Sending 啟用，token 只能放在 Zeabur secret，不可寫入 repository。

農曆引擎目前以 1900–2100 年為可選輸入範圍；月份選項會依該年實際閏月建立，日期選項會依該月 29／30 日動態限制。

## 維護規則

不要從 DOM 畫面文字反抓八字資料。畫面文字可能含有 `span`、換行、顏色標籤或格式化內容，容易造成資料錯誤。

本工作區目前以 `AI_Web` 這個 repo 為正式來源。若修改八字頁、排盤邏輯、大運、流年、流月、神煞、AI payload、測試或文件，需同步檢查此子專案內的程式、文件、回歸案例與根目錄治理文件是否一致；若另有外部 engine 或歷史副本要同步，必須由使用者明確指定。

正確方式：

```js
chart.year.pillar
chart.month.pillar
chart.day.pillar
chart.hour.pillar
```

修改排盤、流年、大運、六柱或十神邏輯後，至少確認：

```text
2024/03/10 00:20 => 甲辰 丁卯 癸酉 壬子
1974/10/03 04:00 女命 2026流年 => 六柱大運需為戊辰
```

若要把目前八字運算拆成 Node.js、TypeScript、CLI、API 或跨平台共用核心，先讀：

```text
docs/script_blueprint.md
```
