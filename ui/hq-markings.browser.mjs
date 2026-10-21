// GP-103: short real-renderer inspection of HQ lettering; no gameplay simulation.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {serve} from '../tools/serve.mjs';
const {chromium}=createRequire(import.meta.url)('playwright');
const root=fileURLToPath(new URL('..',import.meta.url)),shots=path.join(root,'Claude outputs/shots/gp103');fs.mkdirSync(shots,{recursive:true});
const before=process.argv.includes('--before'),prefix=before?'before':'after';
const server=await serve(root,0);let browser;
const hard=setTimeout(()=>{console.error('GP-103 quick-check timeout');process.exit(2);},90000);
try {
 browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(server.origin+'/index.html?debug=1&raf=timer',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.TT&&DWLoad.snapshot().state==='ready',null,{timeout:45000});
 await page.evaluate(()=>DWOpening.dismissForTesting());await page.waitForFunction(()=>document.getElementById('opening').hidden);
 if(!before)await page.waitForFunction(()=>TT.house.group.getObjectByName('hq-designation')?.userData.letteringReady);
 await page.evaluate(()=>{
  const canvas=[...document.querySelectorAll('canvas')].sort((a,b)=>b.clientWidth*b.clientHeight-a.clientWidth*a.clientHeight)[0];
  const keep=new Set();for(let el=canvas;el&&el!==document.body;el=el.parentElement)keep.add(el);
  for(const child of document.body.children)if(!keep.has(child))child.style.setProperty('display','none','important');
  TT.setWorldTime(.4);
 });
 for(const [name,x,y,z,tx,ty,tz,fov] of [['facade',0,3.6,-17,0,2.9,-5,48],['legacy',-4.0,2.5,-9,-3.2,1.95,-5.1,38],['designation',.2,5,-10.5,0,4.8,-5.1,42]]) {
  await page.evaluate(({x,y,z,tx,ty,tz,fov})=>{const base=TT.house.group.position.y;TT.setShotView({x,y:y+base,z,tx,ty:ty+base,tz,fov});},{x,y,z,tx,ty,tz,fov});
  await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  await page.screenshot({path:path.join(shots,prefix+'-'+name+'.png')});
 }
 if(!before)for(const name of ['hq-designation','hq-legacy-marking']){
  const png=await page.evaluate(name=>TT.house.group.getObjectByName(name).material.map.image.toDataURL('image/png'),name);
  fs.writeFileSync(path.join(shots,name+'-texture.png'),Buffer.from(png.split(',')[1],'base64'));
 }
 assert.deepEqual(errors,[]);console.log('PASS GP-103 '+prefix+': actual WebGPU facade, designation and legacy closeups; no page errors.');
} finally {clearTimeout(hard);if(browser)await browser.close();server.close();}
