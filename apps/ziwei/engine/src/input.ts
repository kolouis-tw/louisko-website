import { ZIWEI_BASELINE_GGDVB } from "./baseline";
import type {
  ZiweiInput,
  ZiweiLunarDateTime,
  ZiweiResolvedInput,
  ZiweiSolarDateTime
} from "./types";

const LUNAR_FORMATTER = new Intl.DateTimeFormat("en-u-ca-chinese", {
  year: "numeric",
  month: "numeric",
  day: "numeric",
  timeZone: "UTC"
});

export function normalizeZiweiInput(input: ZiweiInput): ZiweiInput {
  return {
    ...input,
    year: Number(input.year),
    month: Number(input.month),
    day: Number(input.day),
    hour: Number(input.hour),
    minute: Number(input.minute),
    timezoneOffset: Number(input.timezoneOffset),
    isLeapMonth: Boolean(input.isLeapMonth)
  };
}

export function validateZiweiInput(input: ZiweiInput): string[] {
  const errors: string[] = [];

  if (input.month < 1 || input.month > 12) {
    errors.push("month_out_of_range");
  }

  if (input.day < 1 || input.day > 31) {
    errors.push("day_out_of_range");
  }

  if (input.hour < 0 || input.hour > 23) {
    errors.push("hour_out_of_range");
  }

  if (input.minute < 0 || input.minute > 59) {
    errors.push("minute_out_of_range");
  }

  if (!Number.isInteger(input.year)) {
    errors.push("year_invalid");
  }

  if (!Number.isInteger(input.timezoneOffset)) {
    errors.push("timezone_offset_invalid");
  }

  if (input.calendar === "lunar" && input.day > 30) {
    errors.push("lunar_day_out_of_range");
  }

  return errors;
}

export function resolveZiweiInput(input: ZiweiInput): ZiweiResolvedInput {
  const normalized = normalizeZiweiInput(input);
  const validationErrors = validateZiweiInput(normalized);
  const warnings: string[] = [];

  if (validationErrors.length) {
    return {
      source: normalized,
      solar: createEmptySolarDate(normalized),
      lunar: createEmptyLunarDate(normalized),
      chartSolar: createEmptySolarDate(normalized),
      chartLunar: createEmptyLunarDate(normalized),
      validationErrors,
      warnings
    };
  }

  const solar =
    normalized.calendar === "solar"
      ? resolveConfirmedSolarInput(normalized)
      : convertLunarToSolar(normalized);

  const solarErrors = validateSolarDateTime(solar, normalized.timezoneOffset);
  if (solarErrors.length) {
    return {
      source: normalized,
      solar,
      lunar: createEmptyLunarDate(normalized),
      chartSolar: solar,
      chartLunar: createEmptyLunarDate(normalized),
      validationErrors: [...validationErrors, ...solarErrors],
      warnings
    };
  }

  const lunar =
    normalized.calendar === "lunar"
      ? resolveConfirmedLunarInput(normalized)
      : convertSolarToLunar(solar, normalized.timezoneOffset);

  const { chartLunar, chartSolar, warnings: ruleWarnings } = applyChartInputRules(
    normalized,
    solar,
    lunar
  );
  warnings.push(...ruleWarnings);

  return {
    source: normalized,
    solar,
    lunar,
    chartSolar,
    chartLunar,
    validationErrors,
    warnings
  };
}

export function convertSolarToLunar(
  solar: ZiweiSolarDateTime,
  timezoneOffset: number
): ZiweiLunarDateTime {
  const utcMs = localDateTimeToUtcMs(solar, timezoneOffset);
  const shiftedLocalDate = new Date(utcMs + timezoneOffset * 60_000);
  const parts = LUNAR_FORMATTER.formatToParts(shiftedLocalDate);

  const relatedYear = Number(parts.find((part) => part.type === "relatedYear")?.value ?? NaN);
  const rawMonth = parts.find((part) => part.type === "month")?.value ?? "";
  const day = Number(parts.find((part) => part.type === "day")?.value ?? NaN);
  const isLeapMonth = rawMonth.endsWith("bis");
  const month = Number(rawMonth.replace("bis", ""));

  return {
    year: relatedYear,
    month,
    day,
    hour: solar.hour,
    minute: solar.minute,
    isLeapMonth
  };
}

export function convertLunarToSolar(input: ZiweiInput): ZiweiSolarDateTime {
  const startUtcMs =
    Date.UTC(input.year - 1, 10, 1, input.hour, input.minute) - input.timezoneOffset * 60_000;
  const endUtcMs =
    Date.UTC(input.year + 1, 2, 1, input.hour, input.minute) - input.timezoneOffset * 60_000;

  const matches: ZiweiSolarDateTime[] = [];

  for (let utcMs = startUtcMs; utcMs <= endUtcMs; utcMs += 86_400_000) {
    const candidate = utcMsToLocalDateTime(utcMs, input.timezoneOffset);
    const lunar = convertSolarToLunar(candidate, input.timezoneOffset);

    if (
      lunar.year === input.year &&
      lunar.month === input.month &&
      lunar.day === input.day &&
      lunar.isLeapMonth === Boolean(input.isLeapMonth)
    ) {
      matches.push(candidate);
    }
  }

  if (matches.length !== 1) {
    throw new RangeError(
      matches.length === 0 ? "lunar_date_not_found" : "lunar_date_ambiguous"
    );
  }

  return matches[0];
}

function resolveConfirmedSolarInput(input: ZiweiInput): ZiweiSolarDateTime {
  return {
    year: input.year,
    month: input.month,
    day: input.day,
    hour: input.hour,
    minute: input.minute
  };
}

function resolveConfirmedLunarInput(input: ZiweiInput): ZiweiLunarDateTime {
  return {
    year: input.year,
    month: input.month,
    day: input.day,
    hour: input.hour,
    minute: input.minute,
    isLeapMonth: Boolean(input.isLeapMonth)
  };
}

function applyChartInputRules(
  source: ZiweiInput,
  solar: ZiweiSolarDateTime,
  lunar: ZiweiLunarDateTime
): {
  chartLunar: ZiweiLunarDateTime;
  chartSolar: ZiweiSolarDateTime;
  warnings: string[];
} {
  const warnings: string[] = [];

  let chartLunar = { ...lunar };
  let chartSolar = { ...solar };

  if (
    ZIWEI_BASELINE_GGDVB.calendarHandling.lateZiHour.ziweiDayBoundary === "same-day" &&
    source.hour === 23
  ) {
    warnings.push("late_zi_hour_same_day_applied");
  }

  if (
    ZIWEI_BASELINE_GGDVB.calendarHandling.leapMonth === "midpoint" &&
    chartLunar.isLeapMonth &&
    chartLunar.day >= 16
  ) {
    warnings.push("leap_month_midpoint_rule_requires_verified_mapping");
    warnings.push("chart_uses_confirmed_input_time_until_verified_leap_month_mapping_exists");
  }

  return {
    chartLunar,
    chartSolar,
    warnings
  };
}

function validateSolarDateTime(solar: ZiweiSolarDateTime, timezoneOffset: number): string[] {
  const utcMs = localDateTimeToUtcMs(solar, timezoneOffset);
  const shiftedLocalDate = new Date(utcMs + timezoneOffset * 60_000);

  const errors: string[] = [];
  if (shiftedLocalDate.getUTCFullYear() !== solar.year) {
    errors.push("solar_year_invalid");
  }
  if (shiftedLocalDate.getUTCMonth() + 1 !== solar.month) {
    errors.push("solar_month_invalid");
  }
  if (shiftedLocalDate.getUTCDate() !== solar.day) {
    errors.push("solar_day_invalid");
  }
  if (shiftedLocalDate.getUTCHours() !== solar.hour) {
    errors.push("solar_hour_invalid");
  }
  if (shiftedLocalDate.getUTCMinutes() !== solar.minute) {
    errors.push("solar_minute_invalid");
  }

  return errors;
}

function localDateTimeToUtcMs(dateTime: ZiweiSolarDateTime, timezoneOffset: number): number {
  return (
    Date.UTC(dateTime.year, dateTime.month - 1, dateTime.day, dateTime.hour, dateTime.minute) -
    timezoneOffset * 60_000
  );
}

function utcMsToLocalDateTime(utcMs: number, timezoneOffset: number): ZiweiSolarDateTime {
  const shiftedLocalDate = new Date(utcMs + timezoneOffset * 60_000);

  return {
    year: shiftedLocalDate.getUTCFullYear(),
    month: shiftedLocalDate.getUTCMonth() + 1,
    day: shiftedLocalDate.getUTCDate(),
    hour: shiftedLocalDate.getUTCHours(),
    minute: shiftedLocalDate.getUTCMinutes()
  };
}

function createEmptySolarDate(input: ZiweiInput): ZiweiSolarDateTime {
  return {
    year: input.year,
    month: input.month,
    day: input.day,
    hour: input.hour,
    minute: input.minute
  };
}

function createEmptyLunarDate(input: ZiweiInput): ZiweiLunarDateTime {
  return {
    year: input.year,
    month: input.month,
    day: input.day,
    hour: input.hour,
    minute: input.minute,
    isLeapMonth: Boolean(input.isLeapMonth)
  };
}
