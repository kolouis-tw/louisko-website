const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const lineBot = require("../server/line-bot.cjs");
const canonical = require("../server/canonical-service.cjs");

function profile(overrides = {}) {
  return {
    id: "regression-profile",
    name: "測試命主",
    inputCalendarType: "solar",
    birthSolar: { year: 2005, month: 11, day: 28, hour: 6, minute: 0 },
    birthLunar: { year: 2005, month: 10, day: 28, isLeap: false, ganzhiYear: "" },
    gender: "female",
    hemisphere: "north",
    dayChangeRule: "lateZiHour",
    timezone: "Asia/Taipei",
    timezoneOffset: 8,
    ...overrides,
  };
}

function assertPillars(result, expected) {
  assert.deepEqual(Object.values(result.canonicalResult.pillars).map((pillar) => pillar.pillar), expected);
}

function runLineUtilityChecks() {
  const body = Buffer.from(JSON.stringify({ destination: "Dtest", events: [] }), "utf8");
  const signature = crypto.createHmac("sha256", "test-channel-secret").update(body).digest("base64");
  assert.equal(lineBot.verifyLineSignature(body, signature, "test-channel-secret"), true);
  assert.equal(lineBot.verifyLineSignature(body, "invalid", "test-channel-secret"), false);

  const parsed = lineBot.parseLineCommand("排盤 柯耿誌 1975/12/27 00:20 男");
  assert.equal(parsed.status, "ready");
  assert.deepEqual(parsed.profile.birthSolar, { year: 1975, month: 12, day: 27, hour: 0, minute: 20 });
  assert.equal(parsed.profile.gender, "male");
  assert.equal(parsed.profile.timezone, "Asia/Taipei");
  assert.equal(parsed.profile.dayChangeRule, "lateZiHour");

  const missing = lineBot.parseLineCommand("排盤 柯耿誌");
  assert.equal(missing.status, "needs-fields");
  assert(missing.missing.includes("性別（男或女）"));
  assert.equal(lineBot.parseLineCommand("排盤 柯耿誌 1975/13/27 00:20 男").code, "INVALID_DATE");
  assert.equal(lineBot.parseLineCommand("排盤 柯耿誌 1975/02/31 00:20 男").code, "INVALID_DATE");
  assert.equal(lineBot.parseLineCommand("排盤 柯耿誌 1975/12/27 24:20 男").code, "INVALID_TIME");

  const chunks = lineBot.chunkPrompt("甲".repeat(9001), 4500);
  assert(chunks.length <= 5, "LINE Prompt chunks must stay within five messages");
  assert(Math.max(...chunks.map(lineBot.toUtf16Length)) <= 4500, "LINE chunks must stay under the configured limit");
  assert(chunks[0].startsWith("【終身 AI 命理顧問 Prompt 1/"));

  const event = { webhookEventId: "01JLINE-TEST", type: "message", timestamp: 1, source: { userId: "Utest" } };
  assert.equal(lineBot.eventFingerprint(event, "Dtest"), lineBot.eventFingerprint(event, "Dtest"));
  assert.equal(lineBot.isAllowedLineUser("Utest", lineBot.normalizeLineUserIds("Utest, Uother")), true);
  assert.equal(lineBot.isAllowedLineUser("Udenied", lineBot.normalizeLineUserIds("Utest, Uother")), false);
}

function runCanonicalChecks() {
  const chartA = canonical.generateBaziProfile(profile(), 2026);
  assertPillars(chartA, ["乙酉", "丁亥", "丙辰", "辛卯"]);
  assert.equal(chartA.canonicalResult.currentLuck.pillar, "己丑");
  assert(chartA.advisorPrompt.content.length > 0);
  assert.equal(chartA.advisorPrompt.contentHash, canonical.generateBaziProfile(profile(), 2026).advisorPrompt.contentHash);

  const chartB = canonical.generateBaziProfile(profile({
    id: "regression-profile-b",
    name: "柯耿誌",
    birthSolar: { year: 1975, month: 12, day: 27, hour: 0, minute: 20 },
    birthLunar: { year: 1975, month: 11, day: 5, isLeap: false, ganzhiYear: "" },
    gender: "male",
  }), 2026);
  assertPillars(chartB, ["乙卯", "戊子", "丁未", "庚子"]);
  assert.equal(chartB.canonicalResult.currentLuck.pillar, "癸未");
  assert.equal(chartA.versions.baziCoreVersion, "website-bazi-inline-v1");
  assert.equal(chartA.versions.promptTemplateVersion, "advisor-v2.0");
  assert.notEqual(chartA.advisorPrompt.contentHash, chartB.advisorPrompt.contentHash);
  const lunarProfile = canonical.createCanonicalInput({
    id: "lunar-regression",
    name: "農曆測試",
    inputCalendarType: "lunar",
    birthLunar: { year: 2020, month: 4, day: 1, isLeap: true, ganzhiYear: "庚子" },
    gender: "female",
    hemisphere: "north",
    dayChangeRule: "lateZiHour",
    timezoneOffset: 8,
  });
  assert.deepEqual({ year: lunarProfile.year, month: lunarProfile.month, day: lunarProfile.day }, { year: 2020, month: 5, day: 23 });
  return { chartA, chartB };
}

runLineUtilityChecks();
const { chartA, chartB } = runCanonicalChecks();
console.log(JSON.stringify({
  ok: true,
  chartA: {
    pillars: Object.values(chartA.canonicalResult.pillars).map((pillar) => pillar.pillar).join(" "),
    currentLuck: chartA.canonicalResult.currentLuck.pillar,
    promptChars: chartA.advisorPrompt.chars,
  },
  chartB: {
    pillars: Object.values(chartB.canonicalResult.pillars).map((pillar) => pillar.pillar).join(" "),
    currentLuck: chartB.canonicalResult.currentLuck.pillar,
    promptChars: chartB.advisorPrompt.chars,
  },
}, null, 2));
