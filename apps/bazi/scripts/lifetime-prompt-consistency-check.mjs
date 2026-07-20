import fs from "fs";
import vm from "vm";

function extractScript(html, cutoffMarker) {
  const match = html.match(/<script>([\s\S]*)<\/script>/);
  if (!match) throw new Error("script block not found");
  const script = match[1];
  const cutoffIndex = cutoffMarker ? script.indexOf(cutoffMarker) : -1;
  return cutoffIndex === -1 ? script : script.slice(0, cutoffIndex);
}

function loadIndexContext() {
  const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const script = `${extractScript(html, 'document.getElementById("year").value = String(defaults.year);')}\n;globalThis.__indexExports = { calculateBaziChart, buildBaziAnalysisPayload };`;
  const context = vm.createContext({
    console,
    Math,
    Date,
    setTimeout,
    clearTimeout,
    URLSearchParams,
    window: { location: { search: "", origin: "http://localhost", hostname: "localhost" } }
  });
  new vm.Script(script).runInContext(context);
  return context.__indexExports;
}

function loadAnalysisContext() {
  const html = fs.readFileSync(new URL("../bazi-analysis.html", import.meta.url), "utf8");
  const script = `${extractScript(html, "\n    try {")}\n;globalThis.__analysisExports = { analyzeBazi, createLifetimeAdvisorSource, validateGeneratedLifetimePrompt, validateLifetimeAdvisorSource, analyzeLuckCycleEffects };`;
  const context = vm.createContext({
    console,
    Math,
    Date,
    setTimeout,
    clearTimeout,
    URLSearchParams,
    window: { location: { search: "", origin: "http://localhost", hostname: "localhost" } },
    location: { hostname: "localhost", protocol: "file:" }
  });
  new vm.Script(script).runInContext(context);
  return context.__analysisExports;
}

function buildInput({ year, month, day, hour, minute, gender, annualYear }) {
  return {
    year,
    month,
    day,
    hour,
    minute,
    gender,
    timezoneOffset: 8,
    birthHemisphere: "北半球",
    lateZiSwitchDay: true,
    annualYear,
    displayName: "",
    calendarType: "solar",
    birthLunar: {
      year,
      month,
      day,
      isLeap: false,
      ganzhiYear: ""
    }
  };
}

function buildPromptForChart(indexApi, analysisApi, config) {
  const input = buildInput(config);
  const chart = indexApi.calculateBaziChart(input, config.annualYear);
  const payload = indexApi.buildBaziAnalysisPayload(chart, input);
  const analysis = analysisApi.analyzeBazi(payload);
  const source = analysisApi.createLifetimeAdvisorSource(payload, analysis.sections, analysis.annualMonths, analysis.shenShaResult);
  const validation = analysisApi.validateGeneratedLifetimePrompt(source, analysis.promptExport.lifetime.prompt);
  return {
    chart,
    payload,
    analysis,
    source,
    validation
  };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function checkPromptIsolation(subject, forbiddenTokens) {
  const prompt = subject.analysis.promptExport.lifetime.prompt;
  forbiddenTokens.forEach((token) => {
    assert(!prompt.includes(token), `prompt contaminated with foreign token: ${token}`);
  });
}

function checkPromptLines(subject, forbiddenLines) {
  const prompt = subject.analysis.promptExport.lifetime.prompt;
  forbiddenLines.forEach((line) => {
    assert(!prompt.includes(line), `prompt contaminated with foreign line: ${line}`);
  });
}

function main() {
  const indexApi = loadIndexContext();
  const analysisApi = loadAnalysisContext();

  const chartA = buildPromptForChart(indexApi, analysisApi, {
    year: 2005, month: 11, day: 28, hour: 6, minute: 0, gender: "女", annualYear: 2026
  });
  const chartB = buildPromptForChart(indexApi, analysisApi, {
    year: 1975, month: 12, day: 27, hour: 0, minute: 20, gender: "男", annualYear: 2026
  });

  checkPromptLines(chartB, [
    "年柱：乙酉",
    "月柱：丁亥",
    "日柱：丙辰",
    "時柱：辛卯",
    "日主：丙火",
    "日支辰夫妻宮",
    "原局固有：辰酉合",
    "原局固有：卯辰害",
    "原局固有：卯酉沖"
  ]);
  checkPromptLines(chartA, [
    "年柱：乙卯",
    "月柱：戊子",
    "日柱：丁未",
    "時柱：庚子",
    "日主：丁火",
    "日支未夫妻宮",
    "原局固有：子未害"
  ]);

  const chartBAgain = buildPromptForChart(indexApi, analysisApi, {
    year: 1975, month: 12, day: 27, hour: 0, minute: 20, gender: "男", annualYear: 2026
  });
  checkPromptLines(chartBAgain, [
    "年柱：乙酉",
    "月柱：丁亥",
    "日柱：丙辰",
    "時柱：辛卯",
    "日主：丙火",
    "日支辰夫妻宮"
  ]);

  const [parallelA, parallelB] = [
    buildPromptForChart(indexApi, analysisApi, { year: 2005, month: 11, day: 28, hour: 6, minute: 0, gender: "女", annualYear: 2026 }),
    buildPromptForChart(indexApi, analysisApi, { year: 1975, month: 12, day: 27, hour: 0, minute: 20, gender: "男", annualYear: 2026 })
  ];
  checkPromptLines(parallelB, ["年柱：乙酉", "月柱：丁亥", "日柱：丙辰", "時柱：辛卯"]);
  checkPromptLines(parallelA, ["年柱：乙卯", "月柱：戊子", "日柱：丁未", "時柱：庚子"]);

  assert(chartB.analysis.promptExport.lifetime.qualityReport.passed, "lifetime quality report should pass for chart B");
  assert(chartBAgain.analysis.promptExport.lifetime.qualityReport.passed, "repeat generation should still pass");

  const guiWei = chartB.payload.luckCycles.find((cycle) => cycle.pillar === "癸未");
  const renWu = chartB.payload.luckCycles.find((cycle) => cycle.pillar === "壬午");
  assert(guiWei, "missing 癸未 luck cycle");
  assert(renWu, "missing 壬午 luck cycle");

  const guiWeiEffect = analysisApi.analyzeLuckCycleEffects(chartB.payload, guiWei);
  assert(guiWeiEffect.monthTouched, "癸未 should touch month pillar");
  assert(!guiWeiEffect.monthConflict, "癸未 should not clash month pillar");
  assert(guiWeiEffect.dayTouched, "癸未 should touch day pillar");
  assert(guiWeiEffect.branchRepeat, "癸未 should repeat branch 未");
  assert(guiWeiEffect.hourTouched, "癸未 should touch hour pillar");

  const renWuEffect = analysisApi.analyzeLuckCycleEffects(chartB.payload, renWu);
  assert(renWuEffect.monthConflict, "壬午 should clash month pillar");
  assert(renWuEffect.hourTouched, "壬午 should touch hour pillar");
  assert(renWuEffect.dayTouched, "壬午 should touch day pillar");
  assert(renWuEffect.repeatedTargetBranch === "子", "壬午 should repeatedly touch 子 branches");
  assert(renWuEffect.repeatedTargetBranchCount === 2, "壬午 should touch two 子 branches");

  const result = {
    chartA: {
      pillars: Object.values(chartA.payload.pillars).map((pillar) => pillar.pillar).join(" "),
      passed: chartA.analysis.promptExport.lifetime.qualityReport.passed
    },
    chartB: {
      pillars: Object.values(chartB.payload.pillars).map((pillar) => pillar.pillar).join(" "),
      passed: chartB.analysis.promptExport.lifetime.qualityReport.passed,
      currentLuck: chartB.source.currentLuck?.pillar ?? null,
      guiWeiEffect,
      renWuEffect
    }
  };

  console.log(JSON.stringify(result, null, 2));
}

main();
