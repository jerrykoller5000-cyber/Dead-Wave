// GP-100: short real-renderer title/mural check; no gameplay simulation.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {serve} from '../tools/serve.mjs';
const {chromium}=createRequire(import.meta.url)('playwright');
const root=fileURLToPath(new URL('..',import.meta.url));
const shots=path.join(root,'Claude outputs/shots/gp100');fs.mkdirSync(shots,{recursive:true});
const before=process.argv.includes('--before'),prefix=before?'before':'after';
const server=await serve(root,0);let browser;
const hard=setTimeout(()=>{console.error('GP-100 browser time limit');process.exit(2);},90000);
try {
 browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 const page=await browser.newPage({viewport:{width:1280,height:800}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(server.origin+'/index.html?debug=1&raf=timer',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.TT&&DWLoad.snapshot().state==='ready',null,{timeout:45000});
 await page.evaluate(()=>DWOpening.dismissForTesting());
 await page.waitForFunction(()=>document.getElementById('opening').hidden);
 await page.waitForFunction(()=>!document.querySelector('#loading')||getComputedStyle(document.querySelector('#loading')).display==='none'||getComputedStyle(document.querySelector('#loading')).opacity==='0');
 if(!before){assert.equal(await page.locator('#menuMotto').count(),0);await page.waitForFunction(()=>TT.house.mural.userData.letteringReady===true);}
 await page.screenshot({path:path.join(shots,prefix+'-menu.png')});
 const png=await page.evaluate(()=>TT.house.mural.material.map.image.toDataURL('image/png'));
 fs.writeFileSync(path.join(shots,prefix+'-mural-texture.png'),Buffer.from(png.split(',')[1],'base64'));
 await page.evaluate(()=>{
  const canvas=[...document.querySelectorAll('canvas')].sort((a,b)=>b.clientWidth*b.clientHeight-a.clientWidth*a.clientHeight)[0];
  const keep=new Set();for(let el=canvas;el&&el!==document.body;el=el.parentElement)keep.add(el);
  for(const child of document.body.children)if(!keep.has(child))child.style.setProperty('display','none','important');
  const m=TT.house.mural,p=m.getWorldPosition(m.position.clone());
  TT.setWorldTime(.4);TT.setShotView({x:p.x,y:p.y+.2,z:p.z-6.5,tx:p.x,ty:p.y,tz:p.z,fov:42});
 });
 await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 await page.screenshot({path:path.join(shots,prefix+'-hq-mural.png')});
 assert.deepEqual(errors,[]);
 console.log('PASS GP-100 '+prefix+': title screen and HQ mural captured with real WebGPU; no page errors.');
} finally {clearTimeout(hard);if(browser)await browser.close();server.close();}
