export type ZiweiGender = "男" | "女";
export type ZiweiCalendar = "solar" | "lunar";
export type ZiweiPresetStyle = "sanhe" | "feixing" | "sihua";
export type ZiweiTianmaRule = "year-branch" | "month-branch";
export type ZiweiTiankongRule = "regular" | "hour-forward";
export type ZiweiBrightnessRule = "book" | "zhongzhou" | "modern-1" | "modern-2";
export type ZiweiLeapMonthRule = "current-month" | "next-month" | "midpoint";
export type ZiweiLateZiHourRule = "same-day" | "next-day";

export interface ZiweiInput {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  gender: ZiweiGender;
  calendar: ZiweiCalendar;
  timezoneOffset: number;
  isLeapMonth?: boolean;
}

export interface ZiweiSolarDateTime {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

export interface ZiweiLunarDateTime extends ZiweiSolarDateTime {
  isLeapMonth: boolean;
}

export interface ZiweiResolvedInput {
  source: ZiweiInput;
  solar: ZiweiSolarDateTime;
  lunar: ZiweiLunarDateTime;
  chartSolar: ZiweiSolarDateTime;
  chartLunar: ZiweiLunarDateTime;
  validationErrors: string[];
  warnings: string[];
}

export type ZiweiPalaceKey =
  | "ming"
  | "siblings"
  | "marriage"
  | "children"
  | "wealth"
  | "health"
  | "travel"
  | "friends"
  | "career"
  | "property"
  | "fortune"
  | "parents";

export interface ZiweiPalace {
  key: ZiweiPalaceKey;
  label: string;
  branch: string;
  majorStars: string[];
  minorStars: string[];
  transforms: string[];
  notes: string[];
}

export interface ZiweiSummary {
  ming: string;
  shen: string;
  majorStars: string;
  transforms: string;
}

export interface ZiweiChartPayload {
  input: ZiweiInput;
  summary: ZiweiSummary;
  palaces: ZiweiPalace[];
  baseline?: {
    code: string;
    presetStyle: ZiweiPresetStyle;
  };
}
