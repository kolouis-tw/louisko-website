const fs = require("fs");
const path = require("path");
const vm = require("vm");
const crypto = require("crypto");
const lunarApi = require("../vendor/lunar-javascript-1.7.7.js");

const baziIndexPath = path.join(__dirname, "..", "index.html");
const baziAnalysisPath = path.join(__dirname, "..", "bazi-analysis.html");
const baziCoreCutoff = 'document.getElementById("year").value = String(defaults.year);';
const baziAnalysisCutoff = "\n    try {";
const ADVISOR_SCHEMA_VERSION = "advisor-schema-v1";

let cachedEngine = null;

function extractInlineScript(filePath, cutoffMarker) {
  const html = fs.readFileSync(filePath, "utf8");
  const match = html.match(/<script>([\s\S]*)<\/script>/);
  if (!match) throw new Error(`Inline script not found: ${filePath}`);
  const script = match[1];
  const cutoffIndex = script.indexOf(cutoffMarker);
  return cutoffIndex === -1 ? script : script.slice(0, cutoffIndex);
}

function createContext() {
  return vm.createContext({
    console,
    Math,
    Date,
    URL,
    URLSearchParams,
    setTimeout,
    clearTimeout,
    window: { location: { search: "", origin: "https://louisko.com", hostname: "louisko.com" } },
    location: { hostname: "louisko.com", protocol: "https:" },
  });
}

function loadEngine() {
  if (cachedEngine) return cachedEngine;

  const coreContext = createContext();
  const coreScript = `${extractInlineScript(baziIndexPath, baziCoreCutoff)}
;globalThis.__baziCore = { calculateBaziChart, buildBaziAnalysisPayload, defaults };`;
  new vm.Script(coreScript, { filename: baziIndexPath }).runInContext(coreContext);

  const analysisContext = createContext();
  const analysisScript = `${extractInlineScript(baziAnalysisPath, baziAnalysisCutoff)}
;globalThis.__baziAnalysis = { analyzeBazi, createLifetimeAdvisorSource, buildLifetimeBaziAdvisorPrompt, buildFullBaziPrompt, buildCompactBaziPrompt, validatePromptLength };`;
  new vm.Script(analysisScript, { filename: baziAnalysisPath }).runInContext(analysisContext);

  cachedEngine = {
    core: coreContext.__baziCore,
    analysis: analysisContext.__baziAnalysis,
  };
  return cachedEngine;
}

function getCurrentVersions() {
  return {
    calendarRuleVersion: "website-calendar-inline-v1",
    baziCoreVersion: "website-bazi-inline-v1",
    advisorSchemaVersion: ADVISOR_SCHEMA_VERSION,
    promptTemplateVersion: "advisor-v2.0",
  };
}

function getProfileSolar(profile) {
  const source = profile?.birthSolar || profile?.canonicalBirthInput?.birthSolar || {};
  return {
    year: Number(source.year),
    month: Number(source.month),
    day: Number(source.day),
    hour: Number(source.hour),
    minute: Number(source.minute),
  };
}

function getProfileLunar(profile) {
  const source = profile?.birthLunar || profile?.canonicalBirthInput?.birthLunar || profile?.canonicalBirthInput?.birth || {};
  const timeSource = profile?.birthSolar || profile?.canonicalBirthInput?.birth || {};
  return {
    year: Number(source.year),
    month: Number(source.month),
    day: Number(source.day),
    hour: Number(source.hour ?? timeSource.hour ?? 0),
    minute: Number(source.minute ?? timeSource.minute ?? 0),
    isLeap: Boolean(source.isLeap ?? source.isLeapMonth),
    ganzhiYear: String(source.ganzhiYear || ""),
  };
}

function lunarToSolar(lunar) {
  const month = lunar.isLeap ? -lunar.month : lunar.month;
  const solar = lunarApi.Lunar.fromYmdHms(lunar.year, month, lunar.day, lunar.hour, lunar.minute, 0).getSolar();
  return {
    year: solar.getYear(),
    month: solar.getMonth(),
    day: solar.getDay(),
    hour: lunar.hour,
    minute: lunar.minute,
  };
}

function createCanonicalInput(profile) {
  const canonical = profile?.canonicalBirthInput || {};
  const calendarType = profile?.inputCalendarType || canonical.calendarType || "solar";
  const lunar = getProfileLunar(profile);
  const hasProfileSolar = [profile?.birthSolar?.year, profile?.birthSolar?.month, profile?.birthSolar?.day].every((value) => Number.isFinite(Number(value)));
  const solar = calendarType === "lunar" && !hasProfileSolar ? lunarToSolar(lunar) : getProfileSolar(profile);
  const dayChangeRule = profile?.dayChangeRule || canonical.dayChangeRule || "lateZiHour";
  const gender = profile?.gender || canonical.gender || "male";
  const hemisphere = profile?.hemisphere || canonical.hemisphere || "north";
  const timezoneOffset = Number(profile?.timezoneOffset ?? canonical.timezoneOffset ?? 8);

  return {
    ...solar,
    gender: gender === "female" || gender === "女" ? "女" : "男",
    birthHemisphere: hemisphere === "south" || hemisphere === "南半球" ? "南半球" : "北半球",
    dayChangeMethod: dayChangeRule === "midnight" || dayChangeRule === "子正換日" ? "子正換日" : "子初換日",
    lateZiSwitchDay: !(dayChangeRule === "midnight" || dayChangeRule === "子正換日"),
    timezoneOffset: Number.isFinite(timezoneOffset) ? timezoneOffset : 8,
    displayName: String(profile?.name || canonical.name || "").trim(),
    calendarType,
    birthLunar: lunar,
  };
}

function normalizeForFingerprint(value) {
  return JSON.stringify(value, Object.keys(value || {}).sort());
}

function buildInputFingerprint(input, versions) {
  return crypto.createHash("sha256")
    .update(normalizeForFingerprint({
      input: {
        year: input.year,
        month: input.month,
        day: input.day,
        hour: input.hour,
        minute: input.minute,
        gender: input.gender,
        timezoneOffset: input.timezoneOffset,
        birthHemisphere: input.birthHemisphere,
        lateZiSwitchDay: input.lateZiSwitchDay,
        calendarType: input.calendarType,
        birthLunar: input.birthLunar,
      },
      versions,
    }), "utf8")
    .digest("hex");
}

function buildArtifactId(profileId, fingerprint) {
  return `advisor_${crypto.createHash("sha256").update(`${profileId}|${fingerprint}`, "utf8").digest("hex").slice(0, 32)}`;
}

function generateBaziProfile(profile, targetYear = new Date().getFullYear()) {
  const engine = loadEngine();
  const input = createCanonicalInput(profile);
  const target = Number.isInteger(Number(targetYear)) ? Number(targetYear) : new Date().getFullYear();
  const chart = engine.core.calculateBaziChart(input, target);
  const payload = engine.core.buildBaziAnalysisPayload(chart, input);
  const analysis = engine.analysis.analyzeBazi(payload);
  const lifetime = analysis.promptExport?.lifetime;
  if (!lifetime?.prompt) throw new Error("Canonical lifetime Prompt was not generated.");

  const versions = getCurrentVersions();
  const inputFingerprint = buildInputFingerprint(input, versions);
  const generatedAt = new Date().toISOString();
  const contentHash = crypto.createHash("sha256").update(lifetime.prompt, "utf8").digest("hex");
  const profileId = String(profile.id || "");

  return {
    profileId,
    input,
    targetYear: target,
    inputFingerprint,
    artifactId: buildArtifactId(profileId, inputFingerprint),
    generatedAt,
    versions,
    canonicalResult: payload,
    analysis: {
      sections: analysis.sections,
      annualMonths: analysis.annualMonths,
      shenShaResult: analysis.shenShaResult,
      currentLuck: payload.currentLuck,
      annualLuck: payload.annualLuck,
    },
    advisorPrompt: {
      title: lifetime.label || "終身 AI 命理顧問 Prompt",
      content: lifetime.prompt,
      contentHash,
      chars: lifetime.validation?.chars || lifetime.prompt.length,
      validation: lifetime.validation || null,
      qualityReport: lifetime.qualityReport || null,
    },
  };
}

function resetEngineForTests() {
  cachedEngine = null;
}

module.exports = {
  ADVISOR_SCHEMA_VERSION,
  buildArtifactId,
  buildInputFingerprint,
  createCanonicalInput,
  generateBaziProfile,
  getCurrentVersions,
  loadEngine,
  resetEngineForTests,
};
