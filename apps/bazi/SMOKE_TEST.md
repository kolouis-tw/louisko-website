# Smoke Test Checklist

每次修改後請至少檢查：

## A. 基本四柱校驗

預設輸入：

```text
2024/03/10 00:20
```

應輸出：

```text
年柱：甲辰
月柱：丁卯
日柱：癸酉
時柱：壬子
```

## B. 功能檢查

- [ ] 開啟 `index.html` 不報錯
- [ ] 點擊「開始排盤」不報錯
- [ ] 點擊「查看十神分析」不報錯
- [ ] 十神統計不全部為 0
- [ ] 地支藏干不出現 undefined
- [ ] 大運顯示前後節氣起運、十步大運
- [ ] 大運每步含西元年月
- [ ] 大運每步含年齡
- [ ] 流年查詢顯示指定年份往後 6 年
- [ ] 點擊「論命」可開啟 `bazi-analysis.html`
- [ ] 改流年年份後，payload 的 `annualLuck` 與 `currentLuck` 會同步切換
- [ ] 論命頁可顯示大運、流年、十二流月與 AI prompt
- [ ] 論命頁預設顯示「終身 AI 命理顧問 Prompt」
- [ ] 可在「終身 AI 命理顧問 Prompt」與「完整除錯資料」間切換
- [ ] Prompt 字數與狀態顯示正常
- [ ] 終身 Prompt 一致性檢查結果會顯示為品質狀態
- [ ] 即使一致性檢查未通過，仍可複製與下載 Prompt；品質提醒不可阻擋匯出
- [ ] 可複製 Prompt
- [ ] 可下載 `.md`
- [ ] A4 列印預覽不顯示按鈕

## 命主紀錄與雙曆法

- [ ] 八字排盤頁預設顯示「八字排盤」，可切換「命主紀錄」。
- [ ] 命主姓名輸入框與國曆／農曆日期輸入框的高度、內距、圓角與寬度行為一致。
- [ ] 輸入命主姓名後完成排盤，紀錄列表會顯示姓名；姓名留白時會產生「未命名命主 YYYY-MM-DD」。
- [ ] 國曆 `2026-06-20 12:30` 顯示農曆，且轉換後時、分仍為 `12:30`。
- [ ] 國曆 `2026-06-20 12:30` 切換到農曆，再切回國曆後仍為同一日期與時間。
- [ ] 農曆月份會依年份顯示普通月與實際閏月；不存在的閏月不會出現在選項。
- [ ] 農曆日期會依月份動態限制 29／30 日，非法日期顯示可理解的錯誤訊息。
- [ ] 以農曆輸入完成排盤後，四柱仍從轉換出的標準陽曆資料進入既有 `calculateBaziChart()`。
- [ ] 點擊「使用此資料」會完整還原姓名、原始曆法、日期時間、性別、出生地與換日法，但不自動排盤。
- [ ] 相同資料再次排盤不會新增重複紀錄，只更新最近使用時間。
- [ ] 刪除紀錄前會要求確認，確認後列表與 `louisko_bazi_profiles_v1` 同步移除。
- [ ] 命主紀錄頁顯示帳號登入區；未登入時清楚顯示資料只保留本機。
- [ ] 建立帳號後，頁面顯示已登入與跨裝置同步狀態。
- [ ] `/api/bazi/auth/me` 未登入回傳 `authenticated: false`；`/api/bazi/profiles` 未登入回傳 `401`。
- [ ] 建立帳號後自動帶入目前瀏覽器 owner key 下的舊雲端紀錄；登入另一個瀏覽器後可讀取相同紀錄。
- [ ] 登出後清除本機快取，其他帳號不能讀取前一帳號的命主紀錄。
- [ ] 登入狀態下排盤成功會自動 POST／更新帳號雲端命主紀錄；刪除後會同步 DELETE。
- [ ] `BAZI_EMAIL_PROVIDER=console` 本機模式可輸出 Email 驗證連結與忘記密碼連結。
- [ ] 未完成 Email 驗證時登入會被拒絕；驗證連結過期或重複使用會被拒絕。
- [ ] 忘記密碼重設連結只能使用一次；重設後舊 session 失效，新密碼可登入。
- [ ] 從忘記密碼信開啟 `/apps/bazi/?reset=...` 後，頁面會直接切到命主紀錄的重設密碼模式，顯示新密碼、確認新密碼與「顯示新密碼」選項。
- [ ] 刪除帳號需再次輸入目前密碼；成功後帳號、session 與該帳號命主紀錄都不存在。
- [ ] 正式環境設定 `BAZI_EMAIL_PROVIDER=cloudflare`、Cloudflare Email Sending token、account id、寄件地址與公開網址後，註冊與忘記密碼信可實際寄出。

可執行回歸檢查：

```sh
node apps/bazi/scripts/calendar-profile-regression-check.mjs
```

## LINE Bot Phase 1

- [ ] `POST /api/line/webhook` 只接受有效 `x-line-signature` 的原始 body。
- [ ] 未列入 `BAZI_LINE_ALLOWED_USER_IDS` 的 LINE User ID 不會讀取 owner 資料。
- [ ] `排盤 姓名 YYYY/MM/DD HH:MM 男／女` 會先顯示正規化資料並要求確認。
- [ ] 確認後才會寫入現有帳號 owner 的命主紀錄與 canonical generation/artifact。
- [ ] `我的命主` 及數字選擇只列出 owner scope 內的命主。
- [ ] `查看 Prompt` 只讀最新 artifact，不重新計算；`重新產生` 才更新 artifact。
- [ ] `取得 Markdown` 連結為一次性、短效、owner/profile/artifact scoped token。
- [ ] Prompt 分段不超過設定安全字數，且單次回覆不超過 5 則訊息。
- [ ] 重送相同 `webhookEventId` 不會重複處理。
- [ ] 不完整排盤、過期確認、未知命主與未設定環境變數都有可理解錯誤。

可執行 LINE／canonical 回歸檢查：

```sh
npm run test:bazi:line
```
