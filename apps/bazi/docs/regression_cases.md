# Regression Cases

## Case 1：預設校驗

### 輸入

```text
2024/03/10 00:20
```

### 期望

```text
年柱：甲辰
月柱：丁卯
日柱：癸酉
時柱：壬子
```

---

## Case 2：大運與指定流年同步

### 輸入

```text
1974/10/03 04:00
性別：女
流年：2026
```

### 期望

大運試算與分析 payload 中，2026 年主要對應：

```text
戊辰大運
年齡：51–60歲
```

`currentLuck.pillar` 必須是：

```text
戊辰
```

不能顯示成：

```text
己巳
```

---

## Case 3：流年切換

### 操作

在會合局分析頁更改流年年份：

```text
1998
2046
```

### 期望

- 流年干支會更新
- 對應大運也會更新
- payload 的 `annualLuck` 與 `currentLuck` 重新計算

---

## Case 4：網站與 LINE 顧問檔案一致性

同一命主、出生資料、換日法、時區與目標年份，網站與 LINE 產生的完整 Prompt 必須相同。以使用者十九節核心義起首，包含原局、大運、流年、十神、藏干、星運、自坐、空亡、刑沖合會害破與神煞輔助，不含流月或舊 JSON。

LINE 國曆 `2000/01/01 12:00 男` 對應農曆必須是 `己卯年 十一月廿五`，四柱仍為 `己卯 丙子 戊午 戊午`。

舊 artifact 在核心義、引擎版本、姓名、出生資料或目標年份不同時，必須自動更新；相同資料與版本重讀則不重建。深層 fingerprint 不可將 input 或 versions 清空。

TXT 與 Markdown 內容相同；PNG 必須可解碼、含五行五色，並採共用 Canvas 六柱版型。下載頁預覽與 HEAD 不消耗 token；GET 成功後最多下載一次，逾期、改資料、跨 owner、重複與並行使用均須受控。

```sh
npm run test:bazi:line
node --test apps/bazi/tests/export.test.cjs
```
