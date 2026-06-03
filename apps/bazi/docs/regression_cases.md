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

## Case 4：論命 payload 與 AI prompt

### 操作

完成排盤後點擊：

```text
論命
```

### 期望

`bazi-analysis.html` 讀取的 payload 與 AI prompt 需包含：

- 提示詞前言
- 出生資料
- 四柱八字
- 十神
- 藏干
- 指定流年
- 對應大運
- 五行統計
- 十二流月
- 神煞輔助
