# AGENTS.md — Bazi 子專案交接

## 開始前

先讀根目錄 `AGENTS.md`，再讀本目錄 `README.md`／`INDEX.md`。目前階段與程式位置以 [階段交接紀錄](../../docs/agent-governance/bazi-stage-handoff.md) 為入口；其中部署狀態為有日期的核對快照，接手時需重新驗證。

## 已確認需求與邊界

- 保留四柱、節氣、時區、換日、起運、大運與流年核心。改計算前依根目錄 read path 讀八字規格與 guardrails，修改後跑必要回歸。
- 不加入流月。先分析原局四柱，再加入大運與指定流年兩柱，統整六柱十二字；格局、用神與旺衰不得僅按五行數量判定。
- 顧問角色使用指定核心義；複製／TXT／MD 共用同一份 Prompt，不輸出舊 JSON 或舊引擎初判。內部仍使用結構化 payload，不從 DOM 反抓命盤。
- 圖片由實際結構化資料繪製，四柱由右至左年、月、日、時；六柱細盤左至右時、日、月、年、大運、流年。干支以五行五色區分。
- 網站與 LINE 共用 canonical 資料與輸出規則；下載操作先預覽再明確儲存。不要恢復非同步後背景點擊下載，也不要把載入完成寫成手機已儲存。
- 成化、格局、用神與強弱結論和規則命中資料分開；完整新版論命引擎與 LINE 即時 LLM 對話尚待實作。

## 檔案與驗證

`file-delivery.js/css` 管共用檔案操作；`line-download.html/js` 管一次性下載頁；`server/` 管 LINE adapter、canonical、原生 PNG 與使用收據。這些最新檔案在 release worktree，主目錄可能尚未回灌，先查階段紀錄，勿重做或整份覆寫。

`npm run test:bazi:line`、匯出測試、calendar/profile、Prompt 隔離、存取檢查與 site verify 的命令及已通過數量見階段紀錄。伺服器 PNG 應加 `DISABLE_SYSTEM_FONTS_LOAD=1` 驗證，不依賴開發機字型。

Mock／VM／DOM 替身測試、一般瀏覽器測試與手機 LINE 實機測試必須分開記錄。GitHub／Zeabur success 不代表正式站內容已切換；須比對公開資產與後端標頭。發布／服務細節集中在治理文件，不複製任何憑證進來。
