import type { ZiweiPalace } from "./types";

export const EARTHLY_BRANCHES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"] as const;

export const PALACE_TEMPLATE: ZiweiPalace[] = [
  { key: "ming", label: "命宮", branch: "子", majorStars: [], minorStars: [], transforms: [], notes: [] },
  { key: "siblings", label: "兄弟宮", branch: "丑", majorStars: [], minorStars: [], transforms: [], notes: [] },
  { key: "marriage", label: "夫妻宮", branch: "寅", majorStars: [], minorStars: [], transforms: [], notes: [] },
  { key: "children", label: "子女宮", branch: "卯", majorStars: [], minorStars: [], transforms: [], notes: [] },
  { key: "wealth", label: "財帛宮", branch: "辰", majorStars: [], minorStars: [], transforms: [], notes: [] },
  { key: "health", label: "疾厄宮", branch: "巳", majorStars: [], minorStars: [], transforms: [], notes: [] },
  { key: "travel", label: "遷移宮", branch: "午", majorStars: [], minorStars: [], transforms: [], notes: [] },
  { key: "friends", label: "交友宮", branch: "未", majorStars: [], minorStars: [], transforms: [], notes: [] },
  { key: "career", label: "官祿宮", branch: "申", majorStars: [], minorStars: [], transforms: [], notes: [] },
  { key: "property", label: "田宅宮", branch: "酉", majorStars: [], minorStars: [], transforms: [], notes: [] },
  { key: "fortune", label: "福德宮", branch: "戌", majorStars: [], minorStars: [], transforms: [], notes: [] },
  { key: "parents", label: "父母宮", branch: "亥", majorStars: [], minorStars: [], transforms: [], notes: [] }
];
