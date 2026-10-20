const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { createHash } = require("node:crypto");
const root = path.resolve(__dirname, "..");
const chart = require("../chart-export.js");
const core = require("../advisor-core.js");
const { Solar } = require("../vendor/lunar-javascript-1.7.7.js");

function load(file, marker, globals = {}) {
  const html = fs.readFileSync(path.join(root, file), "utf8");
  const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  new vm.Script(script, { filename:file });
  const end = script.indexOf(marker);
  assert.ok(end > 0);
  const context = vm.createContext({ window:{location:{search:""}}, URLSearchParams, ...globals });
  vm.runInContext(script.slice(0, end), context);
  return context;
}
const main = load("index.html", '    document.getElementById("year").value = String(defaults.year);');
const analysis = load("bazi-analysis.html", '    try {\n      const raw = localStorage.getItem', { BaziAdvisorCore:core, BaziChartExport:chart });
function payload(year=1973, month=11, day=27, hour=13, minute=20, gender="男", target=2026) {
  const lunar=Solar.fromYmdHms(year,month,day,hour,minute,0).getLunar();
  const birthLunar={year:lunar.getYear(),month:Math.abs(lunar.getMonth()),day:lunar.getDay(),isLeap:lunar.getMonth()<0,ganzhiYear:lunar.getYearInGanZhi()};
  main.input = { year,month,day,hour,minute,gender,birthLunar,calendarType:"solar",birthHemisphere:"北半球",lateZiSwitchDay:true,timezoneOffset:8 };
  main.target = target;
  return JSON.parse(vm.runInContext("JSON.stringify(buildBaziAnalysisPayload(calculateBaziChart(input,target),input))", main));
}

test("core source is preserved and every exported prompt begins with the supplied role", () => {
  const raw = fs.readFileSync(path.join(root,"docs/advisor-core.md"),"utf8");
  assert.equal(core.sourceSha256, createHash("sha256").update(raw).digest("hex"));
  assert.equal(core.text,raw.split(/\r?\n/).filter(l=>!["→ 流月","→ 流日","→ 流時"].includes(l.trim())).join("\n").trim());
  analysis.payload = payload();
  const prompt = vm.runInContext("buildAiPrompt(payload)",analysis);
  assert.ok(prompt.startsWith(core.text));
  for(const heading of ["何者當令、何者成勢", "人生領域分析標準", "每一步大運都必須有獨立性", "後續長期諮詢"]) assert.ok(prompt.includes(heading));
  assert.ok(!/流月|JSON|基礎引擎初判/.test(prompt));
});

test("screenshot six-pillar star, self-seat and void facts match", () => {
  const detail=chart.derive(payload());
  assert.deepEqual(detail.columns.map(p=>p.pillar),["丁未","丁卯","癸亥","癸丑","戊午","丙午"]);
  assert.deepEqual(detail.columns.map(p=>p.star),["冠帶","病","胎","墓","臨官","臨官"]);
  assert.deepEqual(detail.columns.map(p=>p.self),["冠帶","病","帝旺","冠帶","帝旺","帝旺"]);
  assert.deepEqual(detail.columns.map(p=>p.void),["寅卯","戌亥","子丑","寅卯","子丑","寅卯"]);
  assert.deepEqual(detail.seasonal,[{element:"水",state:"旺"},{element:"木",state:"相"},{element:"金",state:"休"},{element:"土",state:"囚"},{element:"火",state:"死"}]);
  assert.equal(new Set(Object.values(chart.colors)).size,5);
});

test("all ten-god pairs agree with the existing engine; all sixty pillars have two void branches", () => {
  for(const day of [..."甲乙丙丁戊己庚辛壬癸"])for(const stem of [..."甲乙丙丁戊己庚辛壬癸"]) {
    main.day=day;main.stem=stem;
    assert.equal(chart.tenGod(day,stem),vm.runInContext("getTenGod(day,stem)",main),day+stem);
  }
  const stems=[..."甲乙丙丁戊己庚辛壬癸"],branches=[..."子丑寅卯辰巳午未申酉戌亥"];
  for(let i=0;i<60;i++)assert.equal(chart.voidBranches(stems[i%10]+branches[i%12]),["戌亥","申酉","午未","辰巳","寅卯","子丑"][Math.floor(i/10)]);
  assert.throws(()=>chart.voidBranches("甲丑"));
});

test("relationships retain source pillars and separate natal from dynamic facts", () => {
  const detail=chart.derive(payload());
  for(const type of ["刑","沖","合","害","破","三合","天沖地沖","天沖地刑"])assert.ok(detail.relationships.some(r=>r.type===type),type);
  assert.ok(detail.relationships.some(r=>r.type==="三合"&&r.scope==="原局"&&r.participants.length===3));
  assert.ok(detail.relationships.some(r=>r.text.includes("午午")&&r.scope==="運年引動"));
  for(const relation of detail.relationships)assert.ok(relation.participants.every(p=>p.key&&p.label&&p.stem&&p.branch));
  const columns=[{key:"year",label:"年柱",stem:"甲",branch:"寅"},{key:"month",label:"月柱",stem:"乙",branch:"卯"}];
  assert.ok(!chart.relationships(columns).some(r=>r.type==="三會"));
  assert.ok(!chart.relationships(columns).some(r=>r.type==="三合"));
  assert.ok(chart.relationships([...columns,{key:"annual",label:"流年",stem:"丙",branch:"辰"}]).some(r=>r.type==="三會"&&r.participants.length===3));
  assert.ok(!chart.relationships([{key:"day",label:"日柱",stem:"丙",branch:"午"}]).some(r=>r.type==="刑"));
});

test("derived exports do not mutate birth charts or use legacy extras", () => {
  const p=payload();const original=JSON.stringify(p);
  chart.derive(p);const reference=chart.formatReference(p);
  assert.equal(JSON.stringify(p),original);
  assert.equal(chart.formatReference({...p,monthlyLuck:[{bad:"flow"}],oldAnalysis:{score:100}}),reference);
  for(const text of ["星運","自坐","空亡","六柱關係提示","三合","2029"])assert.ok(reference.includes(text));
});

test("mandatory pillars and female luck regressions remain unchanged", () => {
  const p=payload(2024,3,10,0,20);
  assert.equal(["year","month","day","hour"].map(k=>p.pillars[k].pillar).join(" "),"甲辰 丁卯 癸酉 壬子");
  for(const [target,luck] of [[1998,"辛未"],[2026,"戊辰"],[2046,"丙寅"]]) {
    const female=payload(1974,10,3,4,0,"女",target);
    assert.equal(female.currentLuck.pillar,luck);
    analysis.payload=female;
    const prompt=vm.runInContext("buildAiPrompt(payload)",analysis);
    assert.ok(prompt.includes("坤造"));assert.ok(prompt.includes(luck));assert.ok(prompt.includes(String(target)));
  }
});


test("current analysis exports preserve names and structured shensha without leaked placeholders", () => {
  analysis.payload=payload();
  analysis.payload.user.displayName="測試命主";
  const result=vm.runInContext("analyzeBazi(payload)",analysis);
  assert.ok(result.aiPrompt.includes("命主：測試命主"));
  assert.ok(result.aiPrompt.includes("農曆："));
  assert.ok(result.aiPrompt.includes("天乙貴人：月柱；依據 依日干丁查得，命中 亥"));
  assert.ok(!/undefined|\[object Object\]|流月|JSON/.test(result.aiPrompt));
  assert.equal(result.promptExport.lifetime.prompt,result.aiPrompt);
});
