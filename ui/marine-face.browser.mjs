// GP-105: bounded production-renderer model inspection, not a gameplay simulation.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {serve} from '../tools/serve.mjs';
const {chromium}=createRequire(import.meta.url)('playwright');
const root=fileURLToPath(new URL('..',import.meta.url)),shots=path.join(root,'Claude outputs/shots/gp105');fs.mkdirSync(shots,{recursive:true});
const before=process.argv.includes('--before'),prefix=before?'before':'after';
const server=await serve(root,0);let browser;
const hard=setTimeout(()=>{console.error('GP-105 quick-check timeout');process.exit(2);},110000);
try {
 browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const start=Date.now();
 await page.goto(server.origin+'/index.html?debug=1&raf=timer',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.TT&&DWLoad.snapshot().state==='ready',null,{timeout:45000});
 console.log('Title-ready sample: '+(Date.now()-start)+' ms');
 await page.evaluate(()=>DWOpening.dismissForTesting());await page.waitForFunction(()=>document.getElementById('opening').hidden);
 await page.evaluate(()=>{
  const canvas=[...document.querySelectorAll('canvas')].sort((a,b)=>b.clientWidth*b.clientHeight-a.clientWidth*a.clientHeight)[0];
  const keep=new Set();for(let el=canvas;el&&el!==document.body;el=el.parentElement)keep.add(el);
  for(const child of document.body.children)if(!keep.has(child))child.style.setProperty('display','none','important');
  TT.setWorldTime(.4);
  window.faceFigures=['okafor','brandt','pike','player'].map((who,i)=>{
   const m=who==='player'?TT.makeMarine():TT.makeSurvivorFigure(who);
   m.position.set(14+(i-1)*1.6,TT.sampleHeight(14+(i-1)*1.6,22),22);TT.scene.add(m);return m;
  });
 });
 await page.evaluate(()=>{faceFigures[3].visible=false;const y=TT.sampleHeight(14,22);TT.setShotView({x:14,y:y+1.3,z:27.2,tx:14,ty:y+1,tz:22,fov:45});});
 await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
 await page.screenshot({path:path.join(shots,prefix+'-survivors-front.png')});
 await page.evaluate(()=>{faceFigures[3].visible=true;});
 if(!process.argv.includes('--extras'))
 for(const [i,name] of ['okafor','brandt','pike','player'].entries())for(const angle of ['front','threequarter','side']){
  await page.evaluate(({i,angle})=>{
   const p=faceFigures[i].position,a=angle==='front'?0:angle==='side'?Math.PI/2:Math.PI/4;
   TT.setShotView({x:p.x+Math.sin(a)*1.25,y:p.y+1.44,z:p.z+Math.cos(a)*1.25,tx:p.x,ty:p.y+1.39,tz:p.z+.02,fov:32});
  },{i,angle});
  await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  await page.screenshot({path:path.join(shots,`${prefix}-${name}-${angle}.png`)});
 }
 if(!before){
  const result=await page.evaluate(()=>{
   const masks=faceFigures.map(m=>m.userData.wardrobe.mask.meshes.map(o=>o.visible));
   const oldJaws=faceFigures.slice(0,3).some(m=>!!m.getObjectByName('survivor-jaw'));
   const m=faceFigures[3],st=structuredClone(TT.getWardrobe());st.items.mask.camo='marpat';TT.dressMarine(m,st);
   return {masks,oldJaws,painted:m.userData.wardrobe.mask.mats.every(mat=>!!mat.map),visible:m.userData.wardrobe.mask.meshes.every(o=>o.visible),rig:!!m.userData.headG&&!!m.userData.weaponMount&&!!m.userData.gripR};
  });
  assert(result.masks.slice(0,3).every(a=>a.length&&a.every(v=>!v)),'survivors unmasked');
  assert(result.masks[3].length&&result.masks[3].every(Boolean),'player always masked');
  assert.equal(result.oldJaws,false,'no cover-up cubes');assert(result.painted&&result.visible&&result.rig,'camo and rig contracts remain intact');
  await page.evaluate(()=>{const m=faceFigures[3],p=m.position;TT.setShotView({x:p.x+.75,y:p.y+1.44,z:p.z+1,tx:p.x,ty:p.y+1.39,tz:p.z+.02,fov:32});});
  await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  await page.screenshot({path:path.join(shots,'after-player-camo.png')});
  await page.evaluate(()=>{const m=faceFigures[3];for(const [k,list] of Object.entries(m.userData.gearParts))for(const o of list)o.visible=['helmet','nvg','vest','pads'].includes(k);});
  await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  await page.screenshot({path:path.join(shots,'after-player-helmet.png')});
  await page.evaluate(()=>{const m=faceFigures[3],st=structuredClone(TT.getWardrobe());st.items.eyewear.style='goggles';TT.dressMarine(m,st);});
  await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  await page.screenshot({path:path.join(shots,'after-player-goggles.png')});
  console.log('PASS wardrobe integration: all survivors unmasked, main masked, MARPAT maps applied, rig handles retained; helmet/goggles inspected.');
 }
 assert.deepEqual(errors,[]);console.log('PASS GP-105 '+prefix+': production marine and all three survivor heads rendered front, three-quarter and profile; no page errors.');
} finally {clearTimeout(hard);if(browser)await browser.close();server.close();}
