// GP-150: short production-renderer visual check; no full playthrough.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {serve} from '../tools/serve.mjs';
const {chromium}=createRequire(import.meta.url)('playwright');
const out=process.env.CIF_SHOT_OUT||'review/cif-exterior', before=process.argv.includes('--before'), prefix=before?'before':'after';
const server=await serve(process.cwd(),0); let browser;
const stop=setTimeout(()=>{console.error('CIF visual check timed out');process.exit(2);},115000);
try {
 browser=await chromium.launch({executablePath:process.env.CHROME||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const p=await browser.newPage({viewport:{width:1280,height:800}}), errors=[];
 p.on('pageerror',e=>errors.push(e.message));
 await p.goto(server.origin+'/index.html?debug=1&raf=timer',{waitUntil:'domcontentloaded'});
 await p.waitForFunction(()=>window.TT&&DWLoad.snapshot().state==='ready',null,{timeout:60000});
 await p.evaluate(()=>DWOpening.dismissForTesting());
 await p.waitForFunction(()=>document.getElementById('opening').hidden);
 await p.evaluate(()=>{
  const cv=[...document.querySelectorAll('canvas')].sort((a,b)=>b.clientWidth*b.clientHeight-a.clientWidth*a.clientHeight)[0], keep=new Set();
  for(let e=cv;e&&e!==document.body;e=e.parentElement)keep.add(e);
  for(const e of document.body.children)if(!keep.has(e))e.style.setProperty('display','none','important');
 });
 const checks=await p.evaluate(()=>{
  const h=TT.house, g=h.group.getObjectByName('hq-cif');let meshes=0,triangles=0,lights=0;
  g.traverse(o=>{if(o.isMesh){meshes++;triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;}if(o.isLight)lights++;});
  return {anchor:g.position.toArray(),yaw:g.rotation.y,front:TT.HQ_CIF_FRONT,signs:h.lockSigns.length,meshes,triangles,lights};
 });
 for(const [name,eye,target,time] of [
  ['detail',[2.5,2.2,-.8],[0,1.89,0],.4],
  ['front',[6,2.5,0],[0,1.9,0],.4],
  ['angle',[5.2,3.0,-2.7],[0,1.9,0],.4],
  ['context',[10,6,5],[0,2,3],.4],
  ['night',[5.2,3,-2.7],[0,1.9,0],0]
 ]) {
  await p.evaluate(({eye,target,time})=>{const h=TT.house.group,b=h.getObjectByName('hq-cif').getWorldPosition(new TT.THREE.Vector3());TT.setWorldTime(time);TT.setShotView({x:b.x+eye[0],y:b.y+eye[1],z:b.z+eye[2],tx:b.x+target[0],ty:b.y+target[1],tz:b.z+target[2],fov:42});},{eye,target,time});
  await p.waitForTimeout(250);
  await p.screenshot({path:`${out}/${prefix}-${name}.png`});
 }
 assert.deepEqual(errors,[]); assert.equal(checks.signs,2);
 if(!before){const old=JSON.parse(fs.readFileSync(out+'/before-checks.json','utf8'));assert.deepEqual(checks.anchor,old.anchor);assert.deepEqual(checks.front,old.front);assert.equal(checks.yaw,old.yaw);assert.equal(checks.lights,0);}
 if(!before){
  const hooks=await p.evaluate(()=>{
   const h=TT.house,g=h.group.getObjectByName('hq-cif');let sharedLamp=false;
   g.traverse(o=>{if(o.material===h.bayLampMat)sharedLamp=true;});
   return {sharedLamp,sign:g.getObjectByName('cif-exterior-sign').material===h.lockSigns[0]};
  });assert(hooks.sharedLamp&&hooks.sign);checks.lockHooks=hooks;
  await p.evaluate(fs.readFileSync('tools/tests/lib.js','utf8'));
  const encoding=await p.evaluate(fs.readFileSync('tools/tests/t215.js','utf8'));
  fs.writeFileSync(out+'/t215.txt',encoding);console.log(encoding);assert(!encoding.includes('FAIL'));
  await p.evaluate(()=>{TT.player.position.set(TT.HQ_CIF_FRONT.x,TT.house.group.position.y,TT.HQ_CIF_FRONT.z);TT.openCIF();});
  assert(await p.evaluate(()=>TT.isCIFOpen()));await p.evaluate(()=>TT.closeCIF());
  checks.opens=true;assert.deepEqual(errors,[]);
 }
 fs.writeFileSync(`${out}/${prefix}-checks.json`,JSON.stringify({...checks,errors},null,2));
 console.log('PASS '+prefix+': five production-renderer views; CIF anchor, approach, sign hooks; zero page errors. '+JSON.stringify(checks));
} finally {clearTimeout(stop);await browser?.close();server.close();}
