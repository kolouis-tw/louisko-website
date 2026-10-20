const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {File}=require('node:buffer');
const root=path.resolve(__dirname,'..');
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b});return {promise,resolve,reject}};
class Element {
  constructor(){this.hidden=false;this.disabled=false;this.textContent='';this.style={};this.events={};this.children=new Map();this.clicks=0;}
  querySelector(selector){if(!this.children.has(selector))this.children.set(selector,new Element());return this.children.get(selector);}
  addEventListener(name,callback){(this.events[name]??=[]).push(callback);}
  async emit(name,event={}){for(const fn of this.events[name]??[])await fn(event);}
  removeAttribute(name){delete this[name];}
  appendChild(child){this.child=child;}
  select(){this.selected=true;}
  remove(){this.removed=true;}
  click(){this.clicks++;return this.emit('click');}
}
function harness({file=File,navigator={}}={}){
  const nodes=new Map(),window=new Element(),urls=new Map(),revoked=[];let urlId=0;
  class ObjectURL extends URL{}
  ObjectURL.createObjectURL=blob=>{const url='blob:test/'+(++urlId);urls.set(url,blob);return url};
  ObjectURL.revokeObjectURL=url=>{revoked.push(url);urls.delete(url)};
  const document={getElementById:id=>{if(!nodes.has(id))nodes.set(id,new Element());return nodes.get(id)},createElement:()=>new Element(),body:new Element(),execCommand:()=>true};
  const context=vm.createContext({document,window,navigator,URL:ObjectURL,URLSearchParams,Blob,File:file,Uint8Array,DOMException,Error,TypeError,AbortController,Response,ReadableStream,TextEncoder,setTimeout,clearTimeout,
    location:{href:'https://example.test/apps/bazi/line-download.html#token='+'a'.repeat(64),hash:'#token='+'a'.repeat(64)}});
  vm.runInContext(fs.readFileSync(path.join(root,'file-delivery.js'),'utf8'),context);
  const container=new Element(),messages=[];
  const delivery=context.BaziFileDelivery.mount(container,message=>messages.push(message));
  const el=name=>container.querySelector(`[data-file="${name}"]`);
  const loadLine=fetch=>{context.fetch=fetch;vm.runInContext(fs.readFileSync(path.join(root,'line-download.js'),'utf8'),context);return {node:document.getElementById}};
  return {context,container,delivery,messages,el,document,urls,revoked,window,loadLine};
}
const png=()=>new Blob([Buffer.from('89504e470d0a1a0a00000000','hex')],{type:'image/png'});

test('MD preview opens as text, saves original bytes and works without File constructor',async()=>{
  const h=harness({file:undefined});
  // Explicitly model a browser whose File constructor is unavailable.
  h.context.File=undefined;
  const blob=new Blob(['# 顧問全文'],{type:'text/markdown;charset=utf-8'});
  await h.delivery.show(blob,'顧問.md');
  assert.equal(h.container.hidden,false);assert.equal(h.el('text').textContent,'# 顧問全文');
  assert.equal(h.el('share').hidden,true);assert.equal(h.el('save').download,'顧問.md');
  assert.equal(h.urls.get(h.el('save').href),blob);assert.equal(h.urls.get(h.el('open').href).type,'text/plain;charset=utf-8');
  assert.equal(h.el('save').clicks,0,'preparation never auto-saves');
  assert.equal(h.el('save').href.startsWith('blob:'),true);
  h.delivery.reset();assert.equal(h.urls.size,0);assert.equal(h.el('text').textContent,'');
});
test('proxy HTML, empty downloads and invalid PNG bytes cannot look like successful exports',async()=>{
  const h=harness();
  for(const blob of [new Blob(['proxy error'],{type:'text/html'}),new Blob([],{type:'text/plain'}),new Blob(['invalid'],{type:'image/png'})]){
    await assert.rejects(h.delivery.show(blob,'file'));assert.equal(h.container.hidden,true);assert.equal(h.urls.size,0);
  }
  await h.delivery.show(png(),'八字.png');assert.equal(h.el('image').hidden,false);assert.equal(h.el('copy').hidden,true);
});
test('clipboard rejection falls back to selection, and async copy/share cannot update another file',async()=>{
  const copying=deferred(),sharing=deferred();let fallback=0;
  const navigator={clipboard:{writeText:()=>Promise.reject(new Error('blocked'))},canShare:()=>true,share:()=>sharing.promise};
  const h=harness({navigator});h.document.execCommand=()=>{fallback++;return true};
  await h.delivery.show(new Blob(['A'],{type:'text/plain'}),'A.txt');await h.el('copy').emit('click');assert.equal(fallback,1);assert.equal(h.document.body.child.removed,true);
  const pendingShare=h.el('share').emit('click');assert.equal(h.el('share').disabled,true);
  await h.delivery.show(new Blob(['B'],{type:'text/plain'}),'B.txt');const count=h.messages.length;
  sharing.reject(new DOMException('cancel','AbortError'));await pendingShare;assert.equal(h.messages.length,count);assert.equal(h.el('share').disabled,false);
  navigator.clipboard.writeText=()=>copying.promise;const pendingCopy=h.el('copy').emit('click');
  h.delivery.reset();copying.reject(new Error('blocked'));await pendingCopy;assert.equal(fallback,1);assert.equal(h.el('text').textContent,'');
});
test('share cancellation retains the file; persisted pagehide retains it while ordinary exit revokes it',async()=>{
  const h=harness({navigator:{canShare:()=>true,share:async()=>{throw new DOMException('cancel','AbortError')}}});
  await h.delivery.show(png(),'盤.png');const url=h.el('save').href;await h.el('share').emit('click');
  assert.match(h.messages.at(-1),/取消分享/);assert.equal(h.el('save').href,url);
  await h.window.emit('pagehide',{persisted:true});assert.equal(h.urls.has(url),true);
  await h.window.emit('pagehide',{persisted:false});assert.equal(h.urls.size,0);
});
test('LINE displays real received bytes before showing any save action',async()=>{
  const h=harness(),gate=deferred();let stream;
  const {node}=h.loadLine(async()=>new Response(new ReadableStream({start(c){stream=c;c.enqueue(new TextEncoder().encode('第一段'));gate.promise.then(()=>{c.enqueue(new TextEncoder().encode('第二段'));c.close()})}}),{headers:{'content-type':'text/plain;charset=utf-8','content-length':'18'}}));
  const pending=node('download-file').emit('click');
  await new Promise(resolve=>setImmediate(resolve));
  assert.match(node('transfer-detail').textContent,/9 B／18 B/);assert.equal(node('transfer-progress').value,9);assert.equal(node('file-result').hidden,true);
  gate.resolve();await pending;assert.equal(node('file-result').hidden,false);assert.equal(node('download-file').hidden,true);assert.match(node('transfer-detail').textContent,/18 B/);
  assert.equal(node('external-browser').hidden,true);
});
test('LINE terminal links stop retrying, transient server errors recover and do not expose proxy HTML',async()=>{
  const h=harness();let code=503;
  const {node}=h.loadLine(async()=>new Response('<html>upstream error</html>',{status:code,headers:{'content-type':'text/html'}}));
  await node('download-file').emit('click');assert.equal(node('download-file').hidden,false);assert.match(node('download-status').textContent,/稍後重試/);assert.ok(!node('download-status').textContent.includes('html'));
  code=410;await node('download-file').emit('click');assert.equal(node('download-file').hidden,true);assert.match(node('download-status').textContent,/LINE/);
});
test('LINE incomplete successful transfer requires a fresh token; hash switch prevents stale preview',async()=>{
  const h=harness();const {node}=h.loadLine(async()=>new Response('short',{headers:{'content-type':'text/plain','content-length':'100'}}));
  await node('download-file').emit('click');assert.equal(node('file-result').hidden,true);assert.equal(node('download-file').hidden,true);assert.match(node('download-status').textContent,/不完整/);
  h.context.location.hash='#token='+'b'.repeat(64);await h.window.emit('hashchange');
  const gate=deferred();h.context.fetch=()=>gate.promise;
  const pending=node('download-file').emit('click');h.context.location.hash='#token='+'c'.repeat(64);await h.window.emit('hashchange');
  gate.resolve(new Response('OLD',{headers:{'content-type':'text/plain'}}));await pending;
  assert.equal(node('file-result').hidden,true);assert.match(node('download-status').textContent,/尚未載入/);assert.equal(node('download-file').disabled,false);
});
test('website PNG is prepared before explicit save and all export buttons unlock after a render error',async()=>{
  const h=harness();
  const html=fs.readFileSync(path.join(root,'bazi-analysis.html'),'utf8');
  const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
  const cutoff=script.indexOf('    try {\n      const raw = localStorage.getItem');
  const gate=deferred();h.context.BaziChartExport={createCanvas:()=>gate.promise};
  vm.runInContext(script.slice(0,cutoff),h.context);
  h.context.payload={pillars:Object.fromEntries(['year','month','day','hour'].map(key=>[key,{pillar:'甲子'}])),user:{gender:'male'},annualLuck:{year:2026}};
  vm.runInContext('registerExports(payload,"顧問全文")',h.context);
  const button=h.document.getElementById('download-png');const pending=button.onclick();
  assert.equal(button.disabled,true);assert.equal(h.document.getElementById('download-txt').disabled,true);
  gate.resolve({toBlob:callback=>callback(png())});await pending;
  const panel=h.document.getElementById('export-file-result');assert.equal(panel.hidden,false);assert.equal(panel.querySelector('[data-file="save"]').clicks,0);
  assert.equal(panel.querySelector('[data-file="save"]').download,'乾造_甲子甲子甲子甲子_2026_八字命盤.png');
  h.context.BaziChartExport.createCanvas=async()=>{throw new Error('render failed')};await button.onclick();
  assert.equal(button.disabled,false);assert.equal(panel.hidden,true);assert.match(h.document.getElementById('export-status').textContent,/失敗/);
});
test('missing shared script leaves a clear recovery action instead of an inert download button',()=>{
  const h=harness();h.context.BaziFileDelivery=undefined;
  h.loadLine(async()=>{throw new Error('must not fetch')});
  assert.equal(h.document.getElementById('download-file').disabled,true);
  assert.equal(h.document.getElementById('reload-page').hidden,false);
  assert.match(h.document.getElementById('download-status').textContent,/未能載入/);
});
