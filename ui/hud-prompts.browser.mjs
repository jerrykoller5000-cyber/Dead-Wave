// GP-31: production styles, isolated presentation fixture (no GPU/gameplay claims).
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {serve} from '../tools/serve.mjs';
const {chromium}=createRequire(import.meta.url)('playwright');
const root=fileURLToPath(new URL('..',import.meta.url)),before=process.argv.includes('--before');
const src=fs.readFileSync(path.join(root,'index.html'),'utf8');
const styles=[...src.matchAll(/<style[^>]*>[\s\S]*?<\/style>|<link[^>]+rel="stylesheet"[^>]*>/g)].map(m=>m[0]).join('\n');
const html=`<!doctype html><meta charset="utf-8">${styles}<body class="playing"><div id="hud">
<div id="hudNotices"><div id="kioskPrompt" class="on">E — Supply Kiosk</div><aside id="firstMinuteCoach"><strong>Press E to bank your skulls.</strong></aside><div id="placeBanner"></div></div>
<div id="objectiveHud"><aside class="objective-tracker"><h2>Ranger cache</h2><span class="objective-distance">110 m</span><p>Supplies at the Ranger campsite.</p><p class="objective-prompt">Reach the cache to search.</p><button>Stop tracking</button></aside></div>
<div id="ammo" class="glass"><div id="ammoCount">12</div><div id="ammoMeta">Pistol<br>12 / 12 · 50 spare</div></div></div>`;
const shots=path.join(root,'Claude outputs/shots/gp31');fs.mkdirSync(shots,{recursive:true});
const server=await serve(root,0);let browser;
try {
 browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 const page=await browser.newPage();await page.route('**/hud-prompt-check',r=>r.fulfill({body:html,contentType:'text/html'}));
 await page.goto(server.origin+'/hud-prompt-check');
 for(const [width,height] of [[1280,720],[390,844]]) {
  await page.setViewportSize({width,height});
  await page.screenshot({path:path.join(shots,`${before?'before':'after'}-${width}.png`)});
  if(before)continue;
  for(const selector of ['#kioskPrompt','#firstMinuteCoach'])assert(await page.locator(selector).isVisible(),`${selector} remains visible while tracking`);
  const boxes=await page.evaluate(()=>['hudNotices','objectiveHud','ammo'].map(id=>{const r=document.getElementById(id).getBoundingClientRect();return {id,l:r.left,r:r.right,t:r.top,b:r.bottom};}));
  const overlap=(a,b)=>Math.min(a.r,b.r)>Math.max(a.l,b.l)&&Math.min(a.b,b.b)>Math.max(a.t,b.t);
  assert(!overlap(boxes[0],boxes[1]),'local hints and tracker occupy separate space');
  assert(!overlap(boxes[0],boxes[2]),'hints stay above ammunition');
  assert(!overlap(boxes[1],boxes[2]),'tracker stays above ammunition');
  assert(boxes.every(r=>r.t>=0&&r.b<=height&&r.l>=0&&r.r<=width),'panels stay inside viewport');
 }
 await page.locator('.objective-tracker').evaluate(e=>e.hidden=true);
 if(!before)assert(await page.locator('#kioskPrompt').isVisible(),'untracking keeps local hints');
 console.log(before?'Captured GP-31 before styles.':'PASS GP-31 tracked/untracked local prompts and coach visible; no tracker/hint/ammo overlap at 390 and 1280.');
} finally {if(browser)await browser.close();server.close();}
