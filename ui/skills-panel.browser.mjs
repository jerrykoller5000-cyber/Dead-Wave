import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {serve} from '../tools/serve.mjs';

const {chromium}=createRequire(import.meta.url)('playwright');
const root=fileURLToPath(new URL('..',import.meta.url));
const shots=path.join(root,'Claude outputs/shots/gp76'); fs.mkdirSync(shots,{recursive:true});
const server=await serve(root,0);
let browser;
try {
 browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(server.origin+'/index.html?debug=1&raf=timer',{waitUntil:'domcontentloaded',timeout:120000});
 await page.waitForFunction(()=>window.TT&&DWLoad.snapshot().state==='ready',null,{timeout:120000});
 await page.evaluate(()=>DWOpening.dismissForTesting());
 await page.fill('#playerName','Skills Tester'); await page.click('#modeHunt');
 await page.waitForFunction(()=>TT.getPhase()==='prep'&&!document.body.classList.contains('deploying'),null,{timeout:45000});
 await page.evaluate(()=>{ TT.addSkillXp(TT.getPlayers()[0],'legs',60,'chase'); });
 assert.equal(await page.locator('#skillToast').textContent(),'Fleet foot · rank 2');
 assert(await page.locator('#skillToast').evaluate(e=>e.classList.contains('show')));
 await page.evaluate(()=>TT.addSkillXp(TT.playerById(TT.addDummyPlayer(3,3)),'power',60,'dummy'));
 assert.equal(await page.locator('#skillToast').textContent(),'Fleet foot · rank 2','dummy rank does not toast locally');
 await page.keyboard.press('Escape'); await page.click('#skillsBtn');
 assert(await page.locator('#pauseSkillsView').isVisible());
 assert.equal(await page.locator('#pauseSkillsList .skill-row').count(),6);
 assert.match(await page.locator('#pauseSkillsList [data-skill="legs"]').textContent(),/Rank 2.*60 \/ 130 XP/s);
 await page.waitForTimeout(3400);
 for(const width of [1280,390]){ await page.setViewportSize({width,height:width===390?844:720}); await page.screenshot({path:path.join(shots,`pause-${width}-gpu.png`)}); }
 await page.click('#skillsBackBtn'); assert(await page.locator('#pauseMainView').isVisible());
 await page.click('#resumeBtn'); await page.evaluate(()=>TT.endGame(true,'Test finish'));
 assert(await page.locator('#win').isVisible());
 assert.equal(await page.locator('#deathSkillsList .skill-row').count(),6);
 assert.match(await page.locator('#deathSkillsList [data-skill="legs"]').textContent(),/Rank 2.*60 \/ 130 XP/s);
 for(const width of [1280,390]){ await page.setViewportSize({width,height:width===390?844:720}); await page.screenshot({path:path.join(shots,`end-${width}-gpu.png`)}); }
 assert.deepEqual(errors,[]);
 console.log('PASS GP-76 WebGPU: six-row pause and end panels at 1280/390, local rank toast, dummy isolation, Back and Resume, no page errors.');
} finally { if(browser)await browser.close(); server.close(); }
