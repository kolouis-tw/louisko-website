# 紫微斗數開發基本參考資料

## 目的

這份文件只保留目前**有把握**、可直接支撐 `apps/ziwei/` 下一步開發的內容。

不確定、未驗證、或需要更多來源才能落地的規則，先不放進這份乾淨版本。

## 主要依據

1. [chart-baseline-ggdvb.md](/Users/kolouis/Desktop/AI_Codex/AI_Web/apps/ziwei/docs/chart-baseline-ggdvb.md)
2. [baseline-implementation-notes.md](/Users/kolouis/Desktop/AI_Codex/AI_Web/apps/ziwei/docs/baseline-implementation-notes.md)
3. [engine/src/baseline.ts](/Users/kolouis/Desktop/AI_Codex/AI_Web/apps/ziwei/engine/src/baseline.ts)

## 已確認可用基準

### 1. 預設風格

- 語系：`正體中文`
- 預設排盤風格：`三合`

### 2. 安星方法

- 安天馬：依據 `年支`
- 安天空：`常規排法`
- 星曜亮度：依據 `中州派理論`
- 安截空旬空：`正副雙星法`
- 安天使天傷：`中州派排法`
- 安魁鉞：`六辛逢虎馬`
- 安命主：依據 `中州派理論`
- 流年四化：依據 `流年天干`
- 安長生十二神：
  - 區分陰陽順逆
  - 採 `水土共長生`

### 3. 四化表主列

- 甲：`廉破武陽`
- 戊：`貪陰右機`
- 庚：`陽武陰同`
- 辛：`巨陽曲昌`
- 壬：`梁紫輔武`
- 癸：`破巨陰貪`

### 4. 曆法邊界

- 閏月：`月中分界`
- 晚子時：`視為當日`
- 八字日柱與時柱：`均按當日`

### 5. 顯示層基準

- 使用平鋪型限流按鈕面板
- 十二宮內顯示流年虛歲年齡
- 十二宮內顯示小限虛歲年齡
- 中宮顯示三方四正指示線
- 顯示太極點轉換標籤
- 顯示自化箭頭圖標
- 使用彩色多箭頭標識自化
- 六煞星使用黑字標識
- 顯示運曜和流曜
- 顯示限流天馬、紅鸞天喜、文昌文曲

## 接下來直接可做的項目

### 第一批

- 在 `baseline.ts` 維持這份 `GGDVB` 基準
- 在 `input.ts` 實作閏月與晚子時正規化
- 在 `types.ts` 補足 baseline / calendar 相關型別

### 第二批

- 在 `transforms.ts` 實作四化表主列
- 在 `payload.ts` 掛上 baseline metadata

## 閱讀順序

1. 先讀 [chart-baseline-ggdvb.md](/Users/kolouis/Desktop/AI_Codex/AI_Web/apps/ziwei/docs/chart-baseline-ggdvb.md)
2. 再讀 [development-reference.md](/Users/kolouis/Desktop/AI_Codex/AI_Web/apps/ziwei/docs/development-reference.md)
3. 然後讀 [baseline-implementation-notes.md](/Users/kolouis/Desktop/AI_Codex/AI_Web/apps/ziwei/docs/baseline-implementation-notes.md)
4. 最後進 [engine/src/baseline.ts](/Users/kolouis/Desktop/AI_Codex/AI_Web/apps/ziwei/engine/src/baseline.ts)

## 工作原則

1. 先做已確認基準，不延伸未驗證公式。
2. 先做設定結構化，再接演算法。
3. 不把顯示設定誤當成核心排盤公式。
4. 不因為文件整理完成，就誤認引擎已完成。

## 目前輸入層已確認狀態

- 已可做陽曆轉農曆
- 已可做農曆轉陽曆
- 已可驗證陽曆日期是否合法
- 已可驗證農曆日期是否能對應到唯一陽曆日期
- 晚子時目前依 `GGDVB` 採當日說

## 目前尚未宣稱完成的點

- 閏月 `月中分界` 的實際排盤映射，不能只靠 `month + 1` 這種簡化邏輯
- 在沒有更高把握依據前，遇到這一類輸入時，系統應保留 warning，不應假裝已完成最終排盤映射
