# 排盤基準實作筆記

## 目的

這份文件把 `GGDVB` 基準從「截圖紀錄」往前推成「可實作規格」，方便後續把設定落到 `engine`。

參考來源仍以 [chart-baseline-ggdvb.md](/Users/kolouis/Desktop/AI_Codex/AI_Web/apps/ziwei/docs/chart-baseline-ggdvb.md) 為準；該文件現在已整合截圖逐列紀錄與規範型摘要，這份文件負責再往程式設計視角整理。

## 實作原則

1. 先把基準拆成結構化設定，不直接混進 UI 文案。
2. 先落 `baseline config`，再逐步讓各模組引用。
3. 若某條規則尚未實作，設定可以先存在，但不可假裝結果已生效。
4. 截圖未覆蓋處維持 `unknown` 或 `待補查`，不可自動補完。

## 第一批應落地的設定群組

### `presetStyle`

- 作用：定義預設排盤風格
- `GGDVB` 基準：
  - `feixing = false`
  - `sanhe = true`
  - `sihua = false`
- 建議：實作成單一 enum 主值，而不是三個互斥布林長期並存

### `placement`

- 作用：定義安星與排法分支
- 第一批重要項目：
  - `tianma = "year-branch"`
  - `tiankong = "regular"`
  - `brightness = "zhongzhou"`
  - `jiekongXunkong = "paired"`
  - `tianshiTianshang = "zhongzhou"`
  - `mingzhu = "zhongzhou"`
  - `annualTransform = "annual-stem"`
  - `changshengOrder = "yin-yang-directional"`
  - `changshengEarthPairing.waterEarthShared = true`
  - `changshengEarthPairing.fireEarthShared = false`

### `display.feixing`

- 作用：飛星盤的顯示偏好
- 第一批重要項目：
  - 顯示神煞
  - 顯示來因宮
  - 顯示命宮四化
  - 中宮三方四正指示線
- 注意：這些是顯示層設定，不等於飛星運算本身已完成

### `display.sanhe`

- 作用：三合盤的預設顯示偏好
- 第一批重要項目：
  - `panelLayout = "flat"`
  - `showAnnualAge = true`
  - `showMinorAge = true`
  - `showAnnualOverlay = true`
  - `showMinorOverlay = true`
  - `showTaijiSwitchLabel = true`
  - `showSelfTransformArrow = true`
  - `multiArrowBold = false`
  - `showFortuneFlowStars = true`

### `transformTable`

- 作用：保留四化表的版本選擇
- 第一批重要項目：
  - `jia = "廉破武陽"`
  - `wu = "貪陰右機"`
  - `geng = "陽武陰同"`
  - `xin = "巨陽曲昌"`
  - `ren = "梁紫輔武"`
  - `gui = "破巨陰貪"`

### `calendarHandling`

- 作用：處理閏月與晚子時
- 第一批重要項目：
  - `leapMonth = "midpoint"`
  - `lateZiHourDayBoundary = "same-day"`
  - `lateZiHourBaziSplit = "day-and-hour-both-same-day"`

## 建議型別方向

```ts
type ZiweiPresetStyle = "sanhe" | "feixing" | "sihua";
type TianmaRule = "year-branch" | "month-branch";
type TiankongRule = "regular" | "hour-forward";
type BrightnessRule = "book" | "zhongzhou" | "modern-1" | "modern-2";
type LeapMonthRule = "current-month" | "next-month" | "midpoint";
type LateZiHourRule = "same-day" | "next-day";
```

## 落地順序建議

1. 在 `engine/src/types.ts` 補 baseline 相關型別
2. 在 `engine/src/baseline.ts` 建立 `GGDVB` 結構化常數
3. 在 `payload.ts` 先掛上 baseline metadata
4. 等真實模組實作時，再由 `ming-shen.ts`、`major-stars.ts` 等逐步引用

## 目前不要做的事

- 不要直接把所有 display toggle 硬寫成 UI 控制項
- 不要把 `GGDVB` 當成唯一永遠不變的宇宙真理
- 不要因為已有 baseline 就宣稱命盤已可正確排出
