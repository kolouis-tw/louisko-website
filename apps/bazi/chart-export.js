/* Derived chart facts and a local Canvas PNG renderer. Does not recalculate birth pillars or luck cycles. */
(function (root) {
  "use strict";
  const stems = [..."甲乙丙丁戊己庚辛壬癸"];
  const branches = [..."子丑寅卯辰巳午未申酉戌亥"];
  const elements = ["木", "火", "土", "金", "水"];
  const stemElements = Object.fromEntries(stems.map((stem, index) => [stem, elements[Math.floor(index / 2)]]));
  const branchElements = { 子:"水", 丑:"土", 寅:"木", 卯:"木", 辰:"土", 巳:"火", 午:"火", 未:"土", 申:"金", 酉:"金", 戌:"土", 亥:"水" };
  const hidden = { 子:["癸"], 丑:["己","癸","辛"], 寅:["甲","丙","戊"], 卯:["乙"], 辰:["戊","乙","癸"], 巳:["丙","庚","戊"], 午:["丁","己"], 未:["己","丁","乙"], 申:["庚","壬","戊"], 酉:["辛"], 戌:["戊","辛","丁"], 亥:["壬","甲"] };
  const stages = ["長生","沐浴","冠帶","臨官","帝旺","衰","病","死","墓","絕","胎","養"];
  const stageOffset = { 甲:1, 乙:6, 丙:10, 丁:9, 戊:10, 己:9, 庚:7, 辛:0, 壬:4, 癸:3 };
  const colors = Object.freeze({ 木:"#008348", 火:"#dc2b28", 土:"#9a5a12", 金:"#626b76", 水:"#1655bd" });
  const mod = (n, m) => ((n % m) + m) % m;

  function tenGod(dayStem, stem) {
    const a = elements.indexOf(stemElements[dayStem]);
    const b = elements.indexOf(stemElements[stem]);
    if (a < 0 || b < 0) throw new Error("十神資料的天干無效。");
    const same = stems.indexOf(dayStem) % 2 === stems.indexOf(stem) % 2;
    return [["比肩","劫財"],["食神","傷官"],["偏財","正財"],["七殺","正官"],["偏印","正印"]][mod(b-a,5)][same ? 0 : 1];
  }

  function lifeStage(stem, branch) {
    const index = branches.indexOf(branch);
    if (stageOffset[stem] === undefined || index < 0) throw new Error("長生資料的干支無效。");
    return stages[mod(stageOffset[stem] + (stems.indexOf(stem) % 2 ? -index : index), 12)];
  }

  function voidBranches(pillar) {
    for (let i=0; i<60; i+=1) {
      if (stems[i%10]+branches[i%12] === pillar) return ["戌亥","申酉","午未","辰巳","寅卯","子丑"][Math.floor(i/10)];
    }
    throw new Error("空亡資料不是有效的六十甲子。");
  }

  function enrich(pillar, dayStem, key, label) {
    if (!pillar) return { key, label, missing:true };
    const stem = pillar.stem ?? pillar.pillar?.[0];
    const branch = pillar.branch ?? pillar.pillar?.[1];
    const ganzhi = stem+branch;
    const hiddenStems = (hidden[branch] ?? []).map((s) => ({ stem:s, element:stemElements[s], tenGod:tenGod(dayStem,s) }));
    return { ...pillar, key, label, stem, branch, pillar:ganzhi, stemElement:stemElements[stem], branchElement:branchElements[branch],
      stemGod:key === "day" ? "日主" : tenGod(dayStem,stem), hiddenStems,
      branchGod:hiddenStems[0]?.tenGod ?? "未提供", star:lifeStage(dayStem,branch), self:lifeStage(stem,branch), void:voidBranches(ganzhi) };
  }

  function relationships(columns) {
    const facts = [];
    const valid = columns.filter((p) => !p.missing);
    const seen = new Set();
    function add(type, kind, participants, text) {
      const signature = [type,kind,...participants.map((p)=>p.key).sort(),text].join("|");
      if (seen.has(signature)) return;
      seen.add(signature);
      facts.push({ type,kind,participants:participants.map(({key,label,stem,branch})=>({key,label,stem,branch})),
        scope:participants.every((p)=>!["luck","annual"].includes(p.key)) ? "原局" : "運年引動", text });
    }
    const stemClashes = ["甲庚","乙辛","丙壬","丁癸"];
    const stemCombines = ["甲己","乙庚","丙辛","丁壬","戊癸"];
    const pairs = {
      六合:["子丑","寅亥","卯戌","辰酉","巳申","午未"],
      六沖:["子午","丑未","寅申","卯酉","辰戌","巳亥"],
      六害:["子未","丑午","寅巳","卯辰","申亥","酉戌"],
      六破:["子酉","卯午","辰丑","未戌","寅亥","巳申"]
    };
    const match = (list,a,b) => list.find((pair)=>pair.includes(a)&&pair.includes(b)&&a!==b);
    for (let i=0;i<valid.length;i+=1) for (let j=i+1;j<valid.length;j+=1) {
      const a=valid[i],b=valid[j],participants=[a,b];
      const clash=match(stemClashes,a.stem,b.stem);
      if(clash) add("沖","天干",participants,`${clash}可相沖`);
      const combine=match(stemCombines,a.stem,b.stem);
      if(combine) add("合","天干",participants,`${combine}五合（成化另判）`);
      let branchClash=false,branchPunishment=false;
      for(const [name,list] of Object.entries(pairs)) {
        const pair=match(list,a.branch,b.branch);
        if(pair) { add({六合:"合",六沖:"沖",六害:"害",六破:"破"}[name],"地支",participants,`${pair}${name}${name === "六合" ? "（成化另判）" : ""}`); if(name==="六沖")branchClash=true; }
      }
      if(a.branch===b.branch&&"辰午酉亥".includes(a.branch)) { add("刑","地支",participants,`${a.branch}${b.branch}可自刑`); branchPunishment=true; }
      if(match(["子卯"],a.branch,b.branch)) { add("刑","地支",participants,"子卯相刑"); branchPunishment=true; }
      for(const group of ["寅巳申","丑戌未"]) {
        if(a.branch!==b.branch&&group.includes(a.branch)&&group.includes(b.branch)) { add("刑","地支",participants,`${a.branch}${b.branch}相刑（${group}刑組）`); branchPunishment=true; }
      }
      if(match(["午亥"],a.branch,b.branch)) add("暗合","地支",participants,"午亥暗合提示（藏干條件另判）");
      if(clash&&branchClash) add("天沖地沖","整柱",participants,"天沖地沖");
      if(clash&&branchPunishment) add("天沖地刑","整柱",participants,"天沖地刑");
    }
    for(const [type,groups] of [["三合",["申子辰","亥卯未","寅午戌","巳酉丑"]],["三會",["亥子丑","寅卯辰","巳午未","申酉戌"]],["三刑",["寅巳申","丑戌未"]]]) {
      for(const group of groups) {
        const matches=[...group].map((branch)=>valid.filter((p)=>p.branch===branch));
        if(matches.some((list)=>!list.length))continue;
        for(const a of matches[0])for(const b of matches[1])for(const c of matches[2])add(type,"地支",[a,b,c],`${group}${type}齊支${type==="三刑"?"":"（成局、成化另判）"}`);
      }
    }
    return facts;
  }

  function derive(payload) {
    const dayStem=payload.pillars.day.stem;
    const birthYear=Number.parseInt(payload.user?.birthSolar,10);
    const natal=[["hour","時柱"],["day","日柱"],["month","月柱"],["year","年柱"]].map(([key,label])=>enrich(payload.pillars[key],dayStem,key,label));
    const targetYear=Number(payload.annualLuck?.year);
    const columns=[...natal,enrich(payload.currentLuck,dayStem,"luck","大運"),enrich(payload.annualLuck,dayStem,"annual","流年")];
    const cycles=(payload.luckCycles??[]).map((p,index)=>({...enrich(p,dayStem,"cycle"+index,"大運"),selected:targetYear>=p.yearStart&&targetYear<=p.yearEnd}));
    const decade=Number.isInteger(targetYear)?Math.floor(targetYear/10)*10:null;
    const annuals=decade===null?[]:Array.from({length:10},(_,index)=>{
      const year=decade+index,offset=mod(year-1984,60);
      return {...enrich({stem:stems[offset%10],branch:branches[offset%12]},dayStem,"year"+year,"流年"),year,selected:year===targetYear};
    });
    const monthBranch=payload.pillars.month.branch;
    const seasonElement="寅卯".includes(monthBranch)?"木":"巳午".includes(monthBranch)?"火":"申酉".includes(monthBranch)?"金":"亥子".includes(monthBranch)?"水":"土";
    const base=elements.indexOf(seasonElement);
    const seasonal=[0,1,4,3,2].map((offset,i)=>({element:elements[mod(base+offset,5)],state:["旺","相","休","囚","死"][i]}));
    return {payload,columns,cycles,annuals,seasonal,relationships:relationships(columns),targetYear,annualYearDifference:Number.isFinite(birthYear)&&Number.isInteger(targetYear)?targetYear-birthYear:null};
  }

  const relationText = (r) => `[${r.scope}] ${r.participants.map((p)=>p.label).join("、")}：${r.text}`;
  function formatReference(payload) {
    const detail=derive(payload),cols=detail.columns;
    const shenSha=payload.shenSha?.hits;
    const shenShaText=Array.isArray(shenSha)?(shenSha.length?shenSha.map(h=>`${h.name}：${h.pillarLabel}；依據 ${Array.isArray(h.basis)?h.basis.map(b=>b.label??`${b.type}：${b.value}`).join("、"):h.basis??"未提供"}，命中 ${h.matchedValue??h.target??"未提供"}。${h.rule??""}`).join("\n"):"本次神煞規則未命中。"):"本次來源未提供神煞資料。";
    const row=(label,fn)=>`| ${label} | ${cols.map((p)=>p.missing?"未提供":fn(p)).join(" | ")} |`;
    const value=(v)=>v??"未提供";
    const start=payload.luckStartInfo??{};
    return `來源：網站排盤結果；細盤衍生資料版本 1.0。\n\n`+
      `${payload.user.gender==="female"?"坤造":"乾造"}：年柱 ${payload.pillars.year.pillar}，月柱 ${payload.pillars.month.pillar}，日柱 ${payload.pillars.day.pillar}，時柱 ${payload.pillars.hour.pillar}。日主 ${payload.dayMaster.stem}${payload.dayMaster.element}。\n`+
      (payload.user.displayName?`命主：${payload.user.displayName}。\n`:"")+
      (payload.user.birthLunar?`農曆：${payload.user.birthLunar}；輸入曆法：${payload.user.inputCalendarType === "lunar"?"農曆":"國曆"}。\n`:"")+
      `出生：${payload.user.birthSolar}；時區：${payload.user.timezone}；換日法：${payload.user.dayChangeRule}。\n參考流年：${value(payload.annualLuck?.year)}；參考大運：${value(payload.currentLuck?.pillar)}。\n\n`+
      `## 六柱細盤\n| 欄位 | ${cols.map(p=>p.label).join(" | ")} |\n|---|---|---|---|---|---|---|\n`+
      [row("干支",p=>p.pillar),row("天干十神",p=>p.stemGod),row("藏干與十神",p=>p.hiddenStems.map(h=>`${h.stem}（${h.tenGod}）`).join("、")),row("星運",p=>p.star),row("自坐",p=>p.self),row("空亡",p=>p.void)].join("\n")+
      `\n\n## 起運與大運\n${value(start.direction)}；約 ${value(start.startAge)} 歲起運；參考節氣 ${value(start.solarTermName)} ${value(start.solarTermTime)}。\n年份與歲數沿用既有排盤的整數區間，未推定精確交運月日。\n| 年份 | 歲數 | 大運 | 天干十神 | 地支本氣十神 |\n|---|---|---|---|---|\n`+
      detail.cycles.map(p=>`| ${p.yearStart}–${p.yearEnd} | ${p.ageStart}–${p.ageEnd} | ${p.pillar} | ${p.stemGod} | ${p.branchGod} |`).join("\n")+
      `\n\n## 參考年份所在十年的流年\n| 西元年 | 干支 | 天干十神 | 地支本氣十神 |\n|---|---|---|---|\n`+detail.annuals.map(p=>`| ${p.year} | ${p.pillar} | ${p.stemGod} | ${p.branchGod} |`).join("\n")+
      `\n\n## 月令五行氣勢\n`+detail.seasonal.map(p=>`${p.element}：${p.state}`).join("；")+"。此為季節分類，不是日主強弱或用神的最終結論。\n\n## 六柱關係提示\n"+
      (detail.relationships.map(relationText).join("\n")||"本次選用規則未命中關係提示。")+
      "\n提示只代表所選規則的字與柱位條件命中；成局、成化及喜忌仍須另判。\n\n## 神煞輔助\n"+shenShaText;
  }

  async function createCanvas(payload) {
    if(typeof document==="undefined")throw new Error("圖檔輸出需要瀏覽器。");
    if(document.fonts?.ready)await document.fonts.ready;
    const detail=derive(payload),width=1280,pad=28,inner=width-pad*2,labelW=84,colW=(inner-labelW)/6;
    const canvas=document.createElement("canvas"),ctx=canvas.getContext("2d");
    const font='"PingFang TC", "Noto Sans TC", "Microsoft JhengHei", sans-serif';
    const linesFor=(text,maxWidth,size)=>{
      ctx.font=`500 ${size}px ${font}`;
      const lines=[];let line="";
      for(const char of String(text)){if(char==="\n"){lines.push(line);line="";continue;}if(line&&ctx.measureText(line+char).width>maxWidth){lines.push(line);line="";}line+=char;}
      if(line)lines.push(line);return lines.length?lines:[""];
    };
    const groups=["天干","地支","整柱"].map(kind=>({kind,lines:detail.relationships.filter(r=>r.kind===kind).flatMap(r=>linesFor(relationText(r),inner-labelW-34,20))}));
    const relationHeight=groups.reduce((sum,g)=>sum+Math.max(66,g.lines.length*30+24),0);
    const height=1600+relationHeight;
    canvas.width=width*2;canvas.height=height*2;ctx.scale(2,2);
    ctx.fillStyle="#fff";ctx.fillRect(0,0,width,height);
    const text=(value,x,y,size=22,color="#242a2b",align="left",weight=500)=>{ctx.font=`${weight} ${size}px ${font}`;ctx.fillStyle=color;ctx.textAlign=align;ctx.textBaseline="middle";ctx.fillText(String(value),x,y);};
    const rect=(x,y,w,h,fill)=>{ctx.fillStyle=fill;ctx.fillRect(x,y,w,h);};
    const rule=(y)=>{rect(pad,y,inner,1,"#d7d5d1");};
    const title=(label,y)=>{rect(pad,y,inner,42,"#515654");text(label,pad+16,y+21,23,"#fff","left",700);};
    text("LOUISKO",pad,42,23,"#777e79","left",600);text("八字細盤",width-pad,42,38,"#242a2b","right",700);
    text(`${payload.user.gender==="female"?"坤造":"乾造"}  ${payload.user.birthSolar}  ·  ${payload.user.timezone??""}`,pad,91,22);
    text(`${payload.user.displayName?`${payload.user.displayName.slice(0,20)}  ·  `:""}日主 ${payload.dayMaster.stem}${payload.dayMaster.element}  ·  指定流年 ${detail.targetYear}`,pad,124,21);
    let y=154;
    rect(pad,y,inner,44,"#515654");text("欄位",pad+labelW/2,y+22,21,"#fff","center");
    detail.columns.forEach((p,i)=>text(p.label,pad+labelW+colW*(i+.5),y+22,25,"#fff","center",600));y+=44;
    const drawRow=(label,h,bg,fn)=>{rect(pad,y,inner,h,bg);text(label,pad+labelW/2,y+h/2,21,"#242a2b","center");detail.columns.forEach((p,i)=>{const x=pad+labelW+colW*i;rect(x,y,1,h,"#deddd9");if(p.missing)text("未提供",x+colW/2,y+h/2,19,"#7d817c","center");else fn(p,x,y,h);});y+=h;rule(y);};
    drawRow("歲年",68,"#eeedeb",(p,x,top)=>{
      const selected=detail.cycles.find(c=>c.selected),center=x+colW/2;
      if(p.key==="luck"&&selected){text(`${selected.ageStart}–${selected.ageEnd}歲`,center,top+21,18,"#515654","center");text(`${selected.yearStart}–${selected.yearEnd}`,center,top+48,18,"#515654","center");}
      else if(p.key==="annual"){text(detail.annualYearDifference===null?"—":`年差 ${detail.annualYearDifference} 歲`,center,top+21,18,"#515654","center");text(detail.targetYear,center,top+48,20,"#515654","center");}
      else text("—",center,top+34,20,"#515654","center");
    });
    drawRow("天干",106,"#fff",(p,x,top)=>{text(p.stem,x+colW*.43,top+54,64,colors[p.stemElement],"center",600);text(p.stemGod,x+colW*.81,top+50,18,"#2d3433","center");});
    drawRow("地支",136,"#eeedeb",(p,x,top)=>{text(p.branch,x+colW/2,top+43,59,colors[p.branchElement],"center",600);p.hiddenStems.forEach((h,j)=>text(`${h.stem} ${h.tenGod}`,x+colW/2,top+83+j*18,15,colors[h.element],"center"));});
    for(const [label,key] of [["星運","star"],["自坐","self"],["空亡","void"]])drawRow(label,49,key==="void"?"#fff":"#eeedeb",(p,x,top,h)=>text(p[key],x+colW/2,top+h/2,25,"#242a2b","center"));
    y+=14;title("起運與大運",y);y+=42;
    text(`${payload.luckStartInfo?.direction??""}  ·  約 ${payload.luckStartInfo?.startAge??"未提供"} 歲起運  ·  ${payload.luckStartInfo?.solarTermName??""} ${payload.luckStartInfo?.solarTermTime??""}`,pad+12,y+27,20);y+=54;
    const drawStrip=(items,annual)=>{
      const cellW=inner/Math.max(items.length,1),h=177;
      rect(pad,y,inner,h,"#f1f0ed");
      items.forEach((p,i)=>{const x=pad+i*cellW;rect(x,y,1,h,"#d7d5d1");text(annual?p.year:p.yearStart,x+cellW/2,y+22,22,"#242a2b","center",600);if(!annual)text(`${p.ageStart}–${p.ageEnd}歲`,x+cellW/2,y+49,16,"#646c67","center");text(p.stem,x+cellW*.35,y+83,39,colors[p.stemElement],"center",600);text(p.stemGod,x+cellW*.76,y+81,13,"#343a36","center");text(p.branch,x+cellW*.35,y+131,39,colors[p.branchElement],"center",600);text(p.branchGod,x+cellW*.76,y+129,13,"#343a36","center");if(p.selected){ctx.strokeStyle="#d75e39";ctx.lineWidth=3;ctx.strokeRect(x+3,y+3,cellW-6,h-6);}});
      y+=h;
    };
    drawStrip(detail.cycles,false);y+=15;
    title(`${detail.annuals[0]?.year??""}–${detail.annuals.at(-1)?.year??""} 流年`,y);y+=42;drawStrip(detail.annuals,true);y+=15;
    const seasonW=inner/5;detail.seasonal.forEach((p,i)=>{const x=pad+seasonW*i;rect(x,y,seasonW-1,64,"#f1f0ed");text(p.element,x+seasonW*.38,y+32,33,colors[p.element],"center",600);text(p.state,x+seasonW*.64,y+32,29);});y+=78;
    title("六柱關係提示",y);y+=42;
    for(const g of groups){const h=Math.max(66,g.lines.length*30+24);rect(pad,y,inner,h,g.kind==="地支"?"#fff":"#eeedeb");text(g.kind,pad+labelW/2,y+Math.min(h/2,36),21,"#242a2b","center");const list=g.lines.length?g.lines:["所選規則未命中提示"];list.forEach((line,i)=>text(line,pad+labelW+16,y+22+i*30,20));y+=h;}
    y+=24;text("五行：木綠 · 火紅 · 土棕 · 金灰 · 水藍",pad,y,19,"#616962");
    text("星運依日干，自坐依各柱天干；提示為規則命中，成局、成化與喜忌另判。",pad,y+30,18,"#616962");
    text("起運與歲數沿用網站估算區間，未推定精確交運日期。",pad,y+58,18,"#616962");
    // Crop the working canvas to the measured content height, preserving device-resolution text.
    const output=document.createElement("canvas");output.width=canvas.width;output.height=Math.ceil((y+86)*2);
    output.getContext("2d").drawImage(canvas,0,0);
    return output;
  }

  const api={ colors,tenGod,lifeStage,voidBranches,derive,relationships,formatReference,createCanvas };
  if(typeof module==="object"&&module.exports)module.exports=api;
  else root.BaziChartExport=Object.freeze(api);
})(typeof globalThis!=="undefined"?globalThis:this);
