import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { Solar, Lunar, LunarYear } = require("../vendor/lunar-javascript-1.7.7.js");

function solarToLunar(solar) {
  const lunar = Solar.fromYmdHms(solar.year, solar.month, solar.day, solar.hour, solar.minute, 0).getLunar();
  return {
    year: lunar.getYear(),
    month: Math.abs(lunar.getMonth()),
    day: lunar.getDay(),
    isLeap: lunar.getMonth() < 0,
    ganzhiYear: lunar.getYearInGanZhi()
  };
}

function lunarToSolar(lunar, hour, minute) {
  const month = lunar.isLeap ? -lunar.month : lunar.month;
  const solar = Lunar.fromYmdHms(lunar.year, month, lunar.day, hour, minute, 0).getSolar();
  return { year: solar.getYear(), month: solar.getMonth(), day: solar.getDay(), hour, minute };
}

const sourceSolar = { year: 2026, month: 6, day: 20, hour: 12, minute: 30 };
const lunar = solarToLunar(sourceSolar);
const roundTripSolar = lunarToSolar(lunar, sourceSolar.hour, sourceSolar.minute);
assert.deepEqual(roundTripSolar, sourceSolar, "solar -> lunar -> solar must preserve date and time");

const leapMonth = LunarYear.fromYear(2020).getLeapMonth();
assert.equal(leapMonth, 4, "2020 must expose leap fourth month");
const leapSolar = lunarToSolar({ year: 2020, month: 4, day: 1, isLeap: true }, 0, 20);
const leapBack = solarToLunar(leapSolar);
assert.deepEqual(leapBack, { year: 2020, month: 4, day: 1, isLeap: true, ganzhiYear: "庚子" });

assert.throws(
  () => Lunar.fromYmdHms(2020, -5, 1, 0, 0, 0),
  /wrong lunar year|wrong lunar year 2020 month -5|wrong lunar year 2020 month -5/
);

console.log("Calendar/profile regression checks passed.");
