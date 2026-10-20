const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
(async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'louisko-security-'));
 process.env.PHOTO_STORAGE_DIR=path.join(root,'photo');
 process.env.BAZI_AUTH_STORAGE_DIR=path.join(root,'auth');
 process.env.BAZI_PROFILE_STORAGE_DIR=path.join(root,'profiles');
 process.env.PHOTO_OWNER_EMAIL='owner@example.test';
 process.env.BAZI_COOKIE_SECURE='false';
 const {app}=require('../../server.js');
 const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
 const base='http://127.0.0.1:'+server.address().port;const checks=[];
 const check=(name,actual,expected)=>{assert.equal(actual,expected,name);checks.push(name)};
 async function session(email){
  const hash=s=>crypto.createHash('sha256').update(s).digest('hex');const token=crypto.randomBytes(32).toString('hex');const accountId=hash(email);
  await fs.mkdir(path.join(root,'auth','users'),{recursive:true});await fs.mkdir(path.join(root,'auth','sessions'),{recursive:true});
  await fs.writeFile(path.join(root,'auth','users',hash(email)+'.json'),JSON.stringify({accountId,email,passwordVersion:1,emailVerifiedAt:new Date().toISOString()}));
  await fs.writeFile(path.join(root,'auth','sessions',hash(token)+'.json'),JSON.stringify({accountId,email,passwordVersion:1,expiresAt:new Date(Date.now()+60000).toISOString()}));
  return {cookie:'louisko_bazi_session='+token};
 }
 try{
  for(const p of ['/server.js','/package.json','/AGENTS.md','/.env','/apps/bazi/server/canonical-service.cjs','/apps/bazi/server/chart-png.cjs','/package-lock.json','/node_modules/express/package.json','/media/photo-cloud/metadata.json'])check('private '+p,(await fetch(base+p)).status,404);
  for(const p of ['/','/apps/bazi/','/apps/photo/','/apps/docs/','/apps/ziwei/','/assets/louisko-theme.css','/apps/photo/app.js','/apps/bazi/vendor/lunar-javascript-1.7.7.js','/apps/bazi/line-download.html','/manifest.json'])check('public '+p,(await fetch(base+p)).status,200);
  check('anonymous create denied',(await fetch(base+'/api/photo-cloud/albums',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({id:'security-test',name:'test'})})).status,401);
  const owner=await session('owner@example.test');const other=await session('other@example.test');
  check('nonowner denied',(await fetch(base+'/api/photo-cloud/albums',{method:'POST',headers:{...other,'content-type':'application/json'},body:'{}'})).status,403);
  const album=(await(await fetch(base+'/api/photo-cloud/albums',{method:'POST',headers:{...owner,'content-type':'application/json'},body:JSON.stringify({id:'security-test',name:'test'})})).json()).album;
  check('owner create',album.id,'security-test');
  const sharp=require('sharp');const image=await sharp({create:{width:32,height:32,channels:3,background:'#668844'}}).jpeg().toBuffer();
  const form=new FormData();form.set('file',new Blob([image],{type:'image/jpeg'}),'test.jpg');form.set('photoId','test-photo');
  check('owner upload',(await fetch(base+'/api/photo-cloud/albums/security-test/photos',{method:'POST',headers:owner,body:form})).status,200);
  check('shared read',(await(await fetch(base+'/api/photo-cloud/albums')).json()).photos.length,1);
  check('object download',(await fetch(base+'/api/photo-cloud/object?key=albums/security-test/test-photo.jpg')).status,200);
  check('anonymous delete denied',(await fetch(base+'/api/photo-cloud/albums/security-test',{method:'DELETE'})).status,401);
  check('owner delete',(await fetch(base+'/api/photo-cloud/albums/security-test',{method:'DELETE',headers:owner})).status,200);
  check('empty after cleanup',(await(await fetch(base+'/api/photo-cloud/albums')).json()).photos.length,0);
  console.log(JSON.stringify({ok:true,checkCount:checks.length,checks},null,2));
 }finally{await new Promise(resolve=>server.close(resolve));await fs.rm(root,{recursive:true,force:true})}
})().catch(e=>{console.error(e);process.exitCode=1});
