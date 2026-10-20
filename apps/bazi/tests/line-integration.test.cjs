const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const os=require('node:os');
const path=require('node:path');
const crypto=require('node:crypto');
const canonical=require('../server/canonical-service.cjs');
const bot=require('../server/line-bot.cjs');
const chart=require('../chart-export.js');
const role=require('../advisor-core.js');
const {Solar}=require('../vendor/lunar-javascript-1.7.7.js');
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const fixture=()=>({id:'fixture-a',...bot.parseLineCommand('排盤 測試命主 2000/01/01 12:00 男').profile});

test('normalized LINE solar/lunar input and Prompt agree exactly with website generation',()=>{
 const p=fixture();const input=canonical.createCanonicalInput(p);const engine=canonical.loadEngine();
 const lunar=Solar.fromYmdHms(2000,1,1,12,0,0).getLunar();
 const expected={year:lunar.getYear(),month:Math.abs(lunar.getMonth()),day:lunar.getDay(),isLeap:lunar.getMonth()<0,ganzhiYear:lunar.getYearInGanZhi()};
 assert.deepEqual(p.birthLunar,expected);assert.deepEqual(input.birthLunar,expected);
 const website=engine.analysis.analyzeBazi(engine.core.buildBaziAnalysisPayload(engine.core.calculateBaziChart(input,2026),input));
 const generated=canonical.generateBaziProfile(p,2026);
 assert.equal(generated.advisorPrompt.content,website.aiPrompt);
 assert.ok(website.aiPrompt.startsWith(role.text));assert.ok(!/流月|JSON|undefined|\[object Object\]/.test(website.aiPrompt));
 // Older LINE records containing an incorrectly copied solar date are repaired at the adapter boundary.
 assert.deepEqual(canonical.createCanonicalInput({...p,birthLunar:{year:2000,month:1,day:1}}).birthLunar,expected);
 const leap={id:'leap',name:'閏月測試',inputCalendarType:'lunar',birthLunar:{year:2020,month:4,day:1,isLeap:true},gender:'female',hemisphere:'north',dayChangeRule:'lateZiHour',timezoneOffset:8};
 const converted=canonical.createCanonicalInput(leap);assert.deepEqual([converted.year,converted.month,converted.day],[2020,5,23]);
 assert.equal(converted.birthLunar.isLeap,true);
});

test('fingerprint varies with nested birth data, name, rules, timezone, target year and template',()=>{
 const input=canonical.createCanonicalInput(fixture()),versions=canonical.getCurrentVersions();
 const baseline=canonical.buildInputFingerprint(input,versions,2026);
 for(const patch of [{year:2001},{minute:1},{displayName:'另一名字'},{gender:'女'},{lateZiSwitchDay:false},{timezoneOffset:9},{birthLunar:{...input.birthLunar,isLeap:true}}]) {
  assert.notEqual(canonical.buildInputFingerprint({...input,...patch},versions,2026),baseline,JSON.stringify(patch));
 }
 assert.notEqual(canonical.buildInputFingerprint(input,{...versions,promptTemplateVersion:'new'},2026),baseline);
 assert.notEqual(canonical.buildInputFingerprint(input,versions,2027),baseline);
 assert.equal(canonical.buildInputFingerprint({...input,birthLunar:Object.fromEntries(Object.entries(input.birthLunar).reverse())},Object.fromEntries(Object.entries(versions).reverse()),2026),baseline);
 for(const command of ['取得 PNG','下載 PNG','下載命盤','下載命盤 PNG','下載圖檔']) assert.equal(bot.parseLineCommand(command).command,'download-png');
 for(const command of ['取得文字檔','下載 TXT']) assert.equal(bot.parseLineCommand(command).command,'download-text');
 assert.equal(bot.parseLineCommand('重新產生').command,'regenerate');
 assert.throws(()=>bot.getDownloadFormat('__proto__'));assert.throws(()=>bot.getDownloadFormat('svg'));
});

test('signed webhook through cache migration, Prompt, MD/TXT/PNG download and owner/token boundaries',async()=>{
 const tmp=await fs.mkdtemp(path.join(os.tmpdir(),'bazi-line-integration-'));
 const env={PHOTO_STORAGE_PROVIDER:'local',PHOTO_STORAGE_DIR:path.join(tmp,'photos'),BAZI_AUTH_STORAGE_DIR:path.join(tmp,'auth'),BAZI_PROFILE_STORAGE_DIR:path.join(tmp,'profiles'),BAZI_LINE_OWNER_EMAIL:'owner@example.test',BAZI_LINE_CHANNEL_SECRET:'local-test-secret',BAZI_LINE_CHANNEL_ACCESS_TOKEN:'local-test-token',BAZI_LINE_ALLOWED_USER_IDS:'Utest',BAZI_LINE_RATE_LIMIT_PER_MINUTE:'120',BAZI_PUBLIC_URL:'http://localhost'};
 const previous=Object.fromEntries(Object.keys(env).map(k=>[k,process.env[k]]));Object.assign(process.env,env);
 const owner=sha(env.BAZI_LINE_OWNER_EMAIL),other=sha('other@example.test');const p=fixture();
 const userPath=path.join(tmp,'auth','users',owner+'.json');await fs.mkdir(path.dirname(userPath),{recursive:true});await fs.writeFile(userPath,JSON.stringify({accountId:owner,email:env.BAZI_LINE_OWNER_EMAIL,emailVerifiedAt:new Date().toISOString()}));
 await fs.mkdir(path.join(tmp,'profiles'),{recursive:true});
 await fs.writeFile(path.join(tmp,'profiles',owner+'.json'),JSON.stringify({profiles:[p]}));
 await fs.writeFile(path.join(tmp,'profiles',other+'.json'),JSON.stringify({profiles:[{...p,id:'foreign-profile'}]}));
 const artifactPath=path.join(tmp,'auth','line','artifacts',owner,p.id,'latest.json');await fs.mkdir(path.dirname(artifactPath),{recursive:true});await fs.writeFile(artifactPath,JSON.stringify({profileId:p.id,content:'舊版 Prompt',artifactId:'old',promptTemplateVersion:'advisor-v2.0'}));
 const replies=[];const realFetch=global.fetch;let server;
 global.fetch=async(url,opts)=>{
  if(String(url)==='https://api.line.me/v2/bot/message/reply'){replies.push(JSON.parse(opts.body));return new Response('{}',{status:200,headers:{'content-type':'application/json'}});}
  return realFetch(url,opts);
 };
 const png=require('../server/chart-png.cjs');const originalRender=png.renderPng;
 try{
  const {app}=require('../../../server.js');server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
  const base='http://127.0.0.1:'+server.address().port;let sequence=0;
  const emit=async(event,user='Utest',id)=>{
   const body=JSON.stringify({destination:'Dtest',events:[{webhookEventId:id||'test-'+(++sequence),timestamp:Date.now(),replyToken:'local-reply',source:{type:'user',userId:user},...event}]});
   const response=await fetch(base+'/api/line/webhook',{method:'POST',headers:{'content-type':'application/json','x-line-signature':crypto.createHmac('sha256',env.BAZI_LINE_CHANNEL_SECRET).update(body).digest('base64')},body});
   return response;
  };
  const message=text=>emit({type:'message',message:{type:'text',text}});
  const postback=(action,profileId=p.id)=>emit({type:'postback',postback:{data:new URLSearchParams({action,profileId}).toString()}});
  const last=()=>replies.at(-1).messages;
  const link=()=>new URL(last()[0].text.match(/http:\/\/localhost\/apps\/bazi\/line-download\.html#token=[a-f0-9]+/)[0]);
  const downloadPath=url=>"/api/bazi/line/download?"+url.hash.slice(1);
  const tokenOf=url=>new URLSearchParams(url.hash.slice(1)).get("token");
  const get=url=>fetch(base+downloadPath(url));
  assert.equal((await fetch(base+'/api/line/webhook',{method:'POST',headers:{'content-type':'application/json'},body:'{}'})).status,401);
  const status=await(await fetch(base+'/api/bazi/line/status')).json();assert.deepEqual(status.formats,['md','txt','png']);assert.equal(status.renderer.chineseFontAvailable,true);
  assert.equal((await message('我的命主')).status,200);
  assert.equal((await message('1')).status,200);
  assert.ok(last()[0].quickReply.items.some(item=>item.action.data?.startsWith('action=download-png')));
  assert.equal((await message('查看 Prompt')).status,200);
  assert.ok(last()[0].text.includes(role.text.slice(0,80)));
  let artifact=JSON.parse(await fs.readFile(artifactPath));assert.ok(canonical.isArtifactCurrent(artifact,p));
  assert.ok(artifact.content.startsWith(role.text));assert.ok(artifact.content.includes('農曆：己卯年 十一月廿五'));
  const firstTime=artifact.generatedAt;
  await message('查看 Prompt');assert.equal(JSON.parse(await fs.readFile(artifactPath)).generatedAt,firstTime,'fresh cache is reused');
  artifact.promptTemplateVersion='old';artifact.generationFingerprint='old';await fs.writeFile(artifactPath,JSON.stringify(artifact));
  await message('查看 Prompt');artifact=JSON.parse(await fs.readFile(artifactPath));assert.ok(canonical.isArtifactCurrent(artifact,p));
  await message('取得 Markdown');const mdLink=link();
  assert.equal((await fetch(base+downloadPath(mdLink),{method:'HEAD'})).status,405);
  assert.equal((await fetch(base+mdLink.pathname)).status,200,"landing preview must not consume token");
  const md=await get(mdLink);assert.equal(md.status,200);assert.match(md.headers.get('content-type'),/^text\/markdown/);assert.match(md.headers.get('content-disposition'),/\.md/);
  assert.equal(await md.text(),artifact.content);assert.equal((await get(mdLink)).status,410);
  await message('取得文字檔');const txt=await get(link());assert.equal(txt.status,200);assert.match(txt.headers.get('content-type'),/^text\/plain/);assert.equal(await txt.text(),artifact.content);
  await message('下載命盤 PNG');const pngLink=link();
  const recordPath=path.join(tmp,'auth','line','downloads',tokenOf(pngLink)+'.json');
  const tokenRecord=JSON.parse(await fs.readFile(recordPath));assert.equal(tokenRecord.format,'png');assert.equal(tokenRecord.ownerId,owner);assert.equal(tokenRecord.artifactId,artifact.artifactId);
  // Failed native rendering must not consume the token.
  png.renderPng=async()=>{const e=new Error('fixture render busy');e.statusCode=503;throw e;};
  assert.equal((await get(pngLink)).status,503);await fs.access(recordPath);png.renderPng=originalRender;
  const imageResponse=await get(pngLink);assert.equal(imageResponse.status,200);assert.equal(imageResponse.headers.get('content-type'),'image/png');assert.equal(imageResponse.headers.get('cache-control'),'private, no-store');assert.match(imageResponse.headers.get('content-disposition'),/\.png/);
  const image=Buffer.from(await imageResponse.arrayBuffer());assert.equal(image.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
  const sharp=require('sharp');const metadata=await sharp(image).metadata();assert.equal(metadata.width,2560);assert.ok(metadata.height>2500);
  const {data,info}=await sharp(image).removeAlpha().raw().toBuffer({resolveWithObject:true});
  for(const color of Object.values(chart.colors)){
   const rgb=color.match(/[a-f0-9]{2}/gi).map(v=>parseInt(v,16));let found=false;
   for(let i=0;i<data.length;i+=info.channels)if(rgb.every((n,j)=>data[i+j]===n)){found=true;break;}
   assert.ok(found,'PNG missing five-element color '+color);
  }
  if(process.env.BAZI_TEST_PNG_OUTPUT)await fs.writeFile(process.env.BAZI_TEST_PNG_OUTPUT,image);
  assert.equal((await get(pngLink)).status,410);
  await message('下載 PNG');const parallel=link();const outcomes=await Promise.all([get(parallel),get(parallel)]);assert.equal(outcomes.filter(r=>r.status===200).length,1,'token permits at most one response');
  await message('取得 Markdown');const expired=link();const expiryPath=path.join(tmp,'auth','line','downloads',tokenOf(expired)+'.json');const expiredRecord=JSON.parse(await fs.readFile(expiryPath));expiredRecord.expiresAt=new Date(0).toISOString();await fs.writeFile(expiryPath,JSON.stringify(expiredRecord));assert.equal((await get(expired)).status,410);
  await message('下載 PNG');const oldLink=link();
  const updated={...p,name:'更新名字',birthSolar:{...p.birthSolar,minute:1}};await fs.writeFile(path.join(tmp,'profiles',owner+'.json'),JSON.stringify({profiles:[updated]}));
  assert.equal((await get(oldLink)).status,410,'edited profile invalidates old download without first regenerating');
  await message('查看 Prompt');artifact=JSON.parse(await fs.readFile(artifactPath));assert.ok(canonical.isArtifactCurrent(artifact,updated));assert.ok(artifact.content.includes('更新名字'));assert.ok(artifact.content.includes('12:01'));
  assert.equal((await postback('download-png','foreign-profile')).status,404);
  const replyCount=replies.length;await emit({type:'message',message:{type:'text',text:'我的命主'}},'Udenied');assert.equal(replies.length,replyCount,'non-allowed user receives no owner information');
  const event={type:'message',message:{type:'text',text:'幫助'}};await emit(event,'Utest','duplicate');const count=replies.length;await emit(event,'Utest','duplicate');assert.equal(replies.length,count);
  await message('重新產生');assert.ok(last()[0].text.includes('檔案已產生'));
  // Full new-profile confirmation flow and persisted lunar conversion.
  await message('排盤 新測試命主 2024/03/10 00:20 女');const confirm=last()[0].quickReply.items[0].action.data;
  assert.ok(last()[0].text.includes('請確認排盤資料'));assert.equal((await emit({type:'postback',postback:{data:confirm}})).status,200);
  assert.ok(last()[0].text.includes('甲辰｜丁卯｜癸酉｜壬子'));assert.ok(last()[0].quickReply.items.some(item=>item.action.data?.startsWith('action=download-png')));
  const saved=JSON.parse(await fs.readFile(path.join(tmp,'profiles',owner+'.json'))).profiles.find(item=>item.name==='新測試命主');assert.ok(saved);assert.notEqual(saved.birthLunar.month,3);
 }finally{
  png.renderPng=originalRender;global.fetch=realFetch;if(server)await new Promise(resolve=>server.close(resolve));
  for(const key of Object.keys(env)){if(previous[key]===undefined)delete process.env[key];else process.env[key]=previous[key];}
  await fs.rm(tmp,{recursive:true,force:true});
 }
});
