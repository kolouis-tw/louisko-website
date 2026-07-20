const ZIWEI_BASELINE_GGDVB = {
  calendarHandling: {
    leapMonth: "midpoint",
    lateZiHour: {
      ziweiDayBoundary: "same-day"
    }
  }
};

const LUNAR_FORMATTER = new Intl.DateTimeFormat("en-u-ca-chinese", {
  year: "numeric",
  month: "numeric",
  day: "numeric",
  timeZone: "UTC"
});

function normalizeInput(input) {
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

function validateInput(input) {
  const errors = [];

  if (input.month < 1 || input.month > 12) errors.push("month_out_of_range");
  if (input.day < 1 || input.day > 31) errors.push("day_out_of_range");
  if (input.hour < 0 || input.hour > 23) errors.push("hour_out_of_range");
  if (input.minute < 0 || input.minute > 59) errors.push("minute_out_of_range");
  if (!Number.isInteger(input.year)) errors.push("year_invalid");
  if (!Number.isInteger(input.timezoneOffset)) errors.push("timezone_offset_invalid");
  if (input.calendar === "lunar" && input.day > 30) errors.push("lunar_day_out_of_range");

  return errors;
}

function resolveInput(input) {
  const normalized = normalizeInput(input);
  const validationErrors = validateInput(normalized);
  const warnings = [];

  if (validationErrors.length) {
    return {
      source: normalized,
      solar: emptySolarDate(normalized),
      lunar: emptyLunarDate(normalized),
      chartSolar: emptySolarDate(normalized),
      chartLunar: emptyLunarDate(normalized),
      validationErrors,
      warnings
    };
  }

  const solar =
    normalized.calendar === "solar"
      ? confirmedSolar(normalized)
      : convertLunarToSolar(normalized);

  const solarErrors = validateSolarDateTime(solar, normalized.timezoneOffset);
  if (solarErrors.length) {
    return {
      source: normalized,
      solar,
      lunar: emptyLunarDate(normalized),
      chartSolar: solar,
      chartLunar: emptyLunarDate(normalized),
      validationErrors: [...validationErrors, ...solarErrors],
      warnings
    };
  }

  const lunar =
    normalized.calendar === "lunar"
      ? confirmedLunar(normalized)
      : convertSolarToLunar(solar, normalized.timezoneOffset);

  const chartLunar = { ...lunar };
  const chartSolar = { ...solar };

  if (
    ZIWEI_BASELINE_GGDVB.calendarHandling.lateZiHour.ziweiDayBoundary === "same-day" &&
    normalized.hour === 23
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
    source: normalized,
    solar,
    lunar,
    chartSolar,
    chartLunar,
    validationErrors,
    warnings
  };
}

function convertSolarToLunar(solar, timezoneOffset) {
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

function convertLunarToSolar(input) {
  const startUtcMs =
    Date.UTC(input.year - 1, 10, 1, input.hour, input.minute) - input.timezoneOffset * 60_000;
  const endUtcMs =
    Date.UTC(input.year + 1, 2, 1, input.hour, input.minute) - input.timezoneOffset * 60_000;

  const matches = [];

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

function confirmedSolar(input) {
  return {
    year: input.year,
    month: input.month,
    day: input.day,
    hour: input.hour,
    minute: input.minute
  };
}

function confirmedLunar(input) {
  return {
    year: input.year,
    month: input.month,
    day: input.day,
    hour: input.hour,
    minute: input.minute,
    isLeapMonth: Boolean(input.isLeapMonth)
  };
}

function validateSolarDateTime(solar, timezoneOffset) {
  const utcMs = localDateTimeToUtcMs(solar, timezoneOffset);
  const shiftedLocalDate = new Date(utcMs + timezoneOffset * 60_000);
  const errors = [];

  if (shiftedLocalDate.getUTCFullYear() !== solar.year) errors.push("solar_year_invalid");
  if (shiftedLocalDate.getUTCMonth() + 1 !== solar.month) errors.push("solar_month_invalid");
  if (shiftedLocalDate.getUTCDate() !== solar.day) errors.push("solar_day_invalid");
  if (shiftedLocalDate.getUTCHours() !== solar.hour) errors.push("solar_hour_invalid");
  if (shiftedLocalDate.getUTCMinutes() !== solar.minute) errors.push("solar_minute_invalid");

  return errors;
}

function localDateTimeToUtcMs(dateTime, timezoneOffset) {
  return (
    Date.UTC(dateTime.year, dateTime.month - 1, dateTime.day, dateTime.hour, dateTime.minute) -
    timezoneOffset * 60_000
  );
}

function utcMsToLocalDateTime(utcMs, timezoneOffset) {
  const shiftedLocalDate = new Date(utcMs + timezoneOffset * 60_000);

  return {
    year: shiftedLocalDate.getUTCFullYear(),
    month: shiftedLocalDate.getUTCMonth() + 1,
    day: shiftedLocalDate.getUTCDate(),
    hour: shiftedLocalDate.getUTCHours(),
    minute: shiftedLocalDate.getUTCMinutes()
  };
}

function emptySolarDate(input) {
  return {
    year: input.year,
    month: input.month,
    day: input.day,
    hour: input.hour,
    minute: input.minute
  };
}

function emptyLunarDate(input) {
  return {
    year: input.year,
    month: input.month,
    day: input.day,
    hour: input.hour,
    minute: input.minute,
    isLeapMonth: Boolean(input.isLeapMonth)
  };
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertDate(actual, expected, label) {
  for (const key of Object.keys(expected)) {
    assert(actual[key] === expected[key], `${label}: expected ${key}=${expected[key]}, got ${actual[key]}`);
  }
}

const cases = [
  {
    name: "Case 1 solar -> lunar 2024-02-10 08:00",
    run() {
      const resolved = resolveInput({
        year: 2024,
        month: 2,
        day: 10,
        hour: 8,
        minute: 0,
        gender: "男",
        calendar: "solar",
        timezoneOffset: 480
      });
      assert(!resolved.validationErrors.length, "should not have validation errors");
      assertDate(
        resolved.lunar,
        { year: 2024, month: 1, day: 1, hour: 8, minute: 0, isLeapMonth: false },
        "case1 lunar"
      );
    }
  },
  {
    name: "Case 2 solar -> lunar leap month 2023-03-22 08:00",
    run() {
      const resolved = resolveInput({
        year: 2023,
        month: 3,
        day: 22,
        hour: 8,
        minute: 0,
        gender: "女",
        calendar: "solar",
        timezoneOffset: 480
      });
      assertDate(
        resolved.lunar,
        { year: 2023, month: 2, day: 1, hour: 8, minute: 0, isLeapMonth: true },
        "case2 lunar"
      );
    }
  },
  {
    name: "Case 3 solar -> lunar leap month 2023-04-19 08:00",
    run() {
      const resolved = resolveInput({
        year: 2023,
        month: 4,
        day: 19,
        hour: 8,
        minute: 0,
        gender: "女",
        calendar: "solar",
        timezoneOffset: 480
      });
      assertDate(
        resolved.lunar,
        { year: 2023, month: 2, day: 29, hour: 8, minute: 0, isLeapMonth: true },
        "case3 lunar"
      );
    }
  },
  {
    name: "Case 4 solar -> lunar 2023-04-20 08:00",
    run() {
      const resolved = resolveInput({
        year: 2023,
        month: 4,
        day: 20,
        hour: 8,
        minute: 0,
        gender: "女",
        calendar: "solar",
        timezoneOffset: 480
      });
      assertDate(
        resolved.lunar,
        { year: 2023, month: 3, day: 1, hour: 8, minute: 0, isLeapMonth: false },
        "case4 lunar"
      );
    }
  },
  {
    name: "Case 5 solar -> lunar leap month 2020-05-23 08:00",
    run() {
      const resolved = resolveInput({
        year: 2020,
        month: 5,
        day: 23,
        hour: 8,
        minute: 0,
        gender: "男",
        calendar: "solar",
        timezoneOffset: 480
      });
      assertDate(
        resolved.lunar,
        { year: 2020, month: 4, day: 1, hour: 8, minute: 0, isLeapMonth: true },
        "case5 lunar"
      );
    }
  },
  {
    name: "Case 6 lunar -> solar 2024-1-1 08:00",
    run() {
      const resolved = resolveInput({
        year: 2024,
        month: 1,
        day: 1,
        hour: 8,
        minute: 0,
        gender: "男",
        calendar: "lunar",
        timezoneOffset: 480,
        isLeapMonth: false
      });
      assertDate(
        resolved.solar,
        { year: 2024, month: 2, day: 10, hour: 8, minute: 0 },
        "case6 solar"
      );
    }
  },
  {
    name: "Case 7 lunar -> solar 2023 leap-2-1 08:00",
    run() {
      const resolved = resolveInput({
        year: 2023,
        month: 2,
        day: 1,
        hour: 8,
        minute: 0,
        gender: "女",
        calendar: "lunar",
        timezoneOffset: 480,
        isLeapMonth: true
      });
      assertDate(
        resolved.solar,
        { year: 2023, month: 3, day: 22, hour: 8, minute: 0 },
        "case7 solar"
      );
    }
  },
  {
    name: "Case 8 lunar -> solar 2020 leap-4-1 08:00",
    run() {
      const resolved = resolveInput({
        year: 2020,
        month: 4,
        day: 1,
        hour: 8,
        minute: 0,
        gender: "男",
        calendar: "lunar",
        timezoneOffset: 480,
        isLeapMonth: true
      });
      assertDate(
        resolved.solar,
        { year: 2020, month: 5, day: 23, hour: 8, minute: 0 },
        "case8 solar"
      );
    }
  },
  {
    name: "Case 9 late zi hour warning",
    run() {
      const resolved = resolveInput({
        year: 2024,
        month: 2,
        day: 10,
        hour: 23,
        minute: 30,
        gender: "男",
        calendar: "solar",
        timezoneOffset: 480
      });
      assert(resolved.warnings.includes("late_zi_hour_same_day_applied"), "missing late zi warning");
      assertDate(
        resolved.chartSolar,
        { year: 2024, month: 2, day: 10, hour: 23, minute: 30 },
        "case9 chartSolar"
      );
    }
  },
  {
    name: "Case 10 invalid solar date",
    run() {
      const resolved = resolveInput({
        year: 2024,
        month: 2,
        day: 30,
        hour: 8,
        minute: 0,
        gender: "男",
        calendar: "solar",
        timezoneOffset: 480
      });
      assert(resolved.validationErrors.includes("solar_day_invalid"), "missing invalid solar day error");
    }
  },
  {
    name: "Case 11 invalid lunar date",
    run() {
      const resolved = resolveInput({
        year: 2024,
        month: 1,
        day: 31,
        hour: 8,
        minute: 0,
        gender: "女",
        calendar: "lunar",
        timezoneOffset: 480,
        isLeapMonth: false
      });
      assert(
        resolved.validationErrors.includes("lunar_day_out_of_range"),
        "invalid lunar date should include lunar_day_out_of_range"
      );
    }
  },
  {
    name: "Case 12 leap month midpoint warning",
    run() {
      const resolved = resolveInput({
        year: 2023,
        month: 2,
        day: 29,
        hour: 8,
        minute: 0,
        gender: "女",
        calendar: "lunar",
        timezoneOffset: 480,
        isLeapMonth: true
      });
      assert(
        resolved.warnings.includes("leap_month_midpoint_rule_requires_verified_mapping"),
        "missing leap month midpoint warning"
      );
      assert(
        resolved.warnings.includes("chart_uses_confirmed_input_time_until_verified_leap_month_mapping_exists"),
        "missing leap month chart fallback warning"
      );
    }
  }
];

let passed = 0;

for (const testCase of cases) {
  try {
    testCase.run();
    passed += 1;
    console.log(`PASS ${testCase.name}`);
  } catch (error) {
    console.error(`FAIL ${testCase.name}`);
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

console.log(`\n${passed}/${cases.length} cases passed.`);
