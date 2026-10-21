// GP-104: short real-renderer inspection of HQ lettering; no gameplay simulation.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {serve} from '../tools/serve.mjs';
const {chromium}=createRequire(import.meta.url)('playwright');
const root=fileURLToPath(new URL('..',import.meta.url)),shots=path.join(root,'Claude outputs/shots/gp104');fs.mkdirSync(shots,{recursive:true});
const before=process.argv.includes('--before'),prefix=before?'before':'after';
const server=await serve(root,0);let browser;
const hard=setTimeout(()=>{console.error('GP-104 quick-check timeout');process.exit(2);},90000);
try {
 browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(server.origin+'/index.html?debug=1&raf=timer',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.TT&&DWLoad.snapshot().state==='ready',null,{timeout:45000});
 await page.evaluate(()=>DWOpening.dismissForTesting());await page.waitForFunction(()=>document.getElementById('opening').hidden);
 if(!before){await page.waitForFunction(()=>!!TT.house.damagedTerminal);assert.equal(await page.evaluate(()=>TT.house.group.getObjectByName('pgb-motto')!=null),false);assert.equal(await page.evaluate(()=>TT.house.group.getObjectByName('hq-legacy-marking')!=null),false);}
 await page.evaluate(()=>{
  const canvas=[...document.querySelectorAll('canvas')].sort((a,b)=>b.clientWidth*b.clientHeight-a.clientWidth*a.clientHeight)[0];
  const keep=new Set();for(let el=canvas;el&&el!==document.body;el=el.parentElement)keep.add(el);
  for(const child of document.body.children)if(!keep.has(child))child.style.setProperty('display','none','important');
  TT.setWorldTime(.4);
 });
 for(const [name,x,y,z,tx,ty,tz,fov] of [['facade',0,3.6,-17,0,2.9,-5,48],['legacy',-4.0,2.5,-9,-3.2,1.95,-5.1,38],['rear',0,3.2,12,0,2.65,5.1,48]]) {
  await page.evaluate(({x,y,z,tx,ty,tz,fov})=>{const base=TT.house.group.position.y;TT.setShotView({x,y:y+base,z,tx,ty:ty+base,tz,fov});},{x,y,z,tx,ty,tz,fov});
  await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  await page.screenshot({path:path.join(shots,prefix+'-'+name+'.png')});
 }
 if(!before){
  await page.evaluate(()=>{const base=TT.house.group.position.y;TT.setShotView({x:-4,y:base+2.5,z:-9,tx:-3.25,ty:base+1.95,tz:-5.1,fov:38});});
  await page.waitForFunction(()=>TT.house.damagedTerminal.sparks.visible,null,{timeout:7000});
  await page.screenshot({path:path.join(shots,'after-sparking.png')});
  const first=await page.evaluate(()=>[...TT.house.damagedTerminal.sparks.geometry.attributes.position.array]);
  await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  const second=await page.evaluate(()=>[...TT.house.damagedTerminal.sparks.geometry.attributes.position.array]);
  assert.notDeepEqual(first,second,'spark positions animate');
  await page.waitForFunction(()=>!TT.house.damagedTerminal.sparks.visible,null,{timeout:2000});
 }
 assert.deepEqual(errors,[]);console.log('PASS GP-104 '+prefix+': actual WebGPU front/rear, textless broken terminal, bounded moving sparks; no page errors.');
} finally {clearTimeout(hard);if(browser)await browser.close();server.close();}
