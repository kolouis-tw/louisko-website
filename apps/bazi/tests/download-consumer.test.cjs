const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const {createDownloadConsumer} = require('../server/download-consumer.cjs');
const token = 'a'.repeat(64);
test('separate consumer instances sharing local storage allow only one successful consume', async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(),'bazi-download-once-'));
  try {
    const config = {provider:'local',filePath:key=>path.join(tmp,'receipts',key+'.json')};
    const consumers = Array.from({length:12},()=>createDownloadConsumer(config));
    const results = await Promise.all(consumers.map(consume=>consume(token,'2099-01-01T00:00:00Z')));
    assert.equal(results.filter(Boolean).length,1);
    assert.equal(await createDownloadConsumer(config)(token,'2099-01-01T00:00:00Z'),false);
  } finally { await fs.rm(tmp,{recursive:true,force:true}); }
});
test('R2 uses conditional create and fails closed on storage failures', async () => {
  const requests=[]; const keys=new Set();
  const client={send:async command=>{
    requests.push(command.input);
    if(keys.has(command.input.Key)) {const e=new Error('exists');e.$metadata={httpStatusCode:412};throw e;}
    keys.add(command.input.Key);
  }};
  const config={provider:'r2',client,bucket:'test',objectKey:key=>'receipts/'+key};
  const results=await Promise.all([createDownloadConsumer(config)(token,''),createDownloadConsumer(config)(token,'')]);
  assert.deepEqual(results,[true,false]);
  assert.ok(requests.every(r=>r.IfNoneMatch==='*'&&r.CacheControl==='private, no-store'));
  const unavailable=createDownloadConsumer({...config,client:{send:async()=>{throw new Error('offline')}}});
  await assert.rejects(unavailable('b'.repeat(64),''),e=>e.statusCode===503);
});
