// GP-87: verify the live player store, all six multipliers, and kiosk removal.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {serve} from '../tools/serve.mjs';

const {chromium}=createRequire(import.meta.url)('playwright');
const root=fileURLToPath(new URL('..',import.meta.url));
const gpu=process.argv.includes('--gpu');
const shots=path.join(root,'Claude outputs/shots/gp87');
fs.mkdirSync(shots,{recursive:true});
let src=fs.readFileSync(path.join(root,'index.html'),'utf8');
if(!gpu)src=src.replace(/<script type="importmap">[\s\S]*?<\/script>/,
 '<script type="importmap">{"imports":{"three":"/tools/tests/fakethree.mjs","three/webgpu":"/tools/tests/fakethree.mjs","three/tsl":"/tools/tests/faketsl.mjs","three/addons/":"/tools/tests/addons/"}}</script>');
const server=await serve(root,0);
let browser;
try {
 browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/index.html?*',r=>r.fulfill({body:src,contentType:'text/html'}));
 await page.goto(server.origin+'/index.html?debug=1&raf=timer',{waitUntil:'domcontentloaded',timeout:120000});
 await page.waitForFunction(()=>window.TT&&DWLoad.snapshot().state==='ready',null,{timeout:120000});
 await page.evaluate(()=>DWOpening.dismissForTesting());
 await page.waitForFunction(()=>document.getElementById('opening').hidden);
 await page.fill('#playerName','Skill Tester');await page.click('#modeHunt');
 await page.waitForFunction(()=>TT.getPhase()==='prep'&&!document.body.classList.contains('deploying'),null,{timeout:45000});
 await page.evaluate(()=>{window.skillEvents=[];addEventListener('dw-game',({detail})=>{if(detail.type==='skill-up')skillEvents.push(detail);});TT.addCash(500);TT.openShop(true);});
 assert(await page.locator('#shop').isVisible());
 assert.equal(await page.locator('[data-shop-page="perks"]').count(),0,'paid Perks tab is gone');
 assert.equal(await page.locator('#shopList button:has-text("Vitality")').count(),0);
 for(const width of [1280,390]){
  await page.setViewportSize({width,height:width===390?844:720});
  await page.screenshot({path:path.join(shots,`kiosk-${width}${gpu?'-gpu':''}.png`)});
 }
 const result=await page.evaluate(()=>{
  const own=TT.getPlayers()[0],bank=TT.getBank();
  const dummyId=TT.addDummyPlayer(5,5),dummy=TT.playerById(dummyId);
  TT.addSkillXp(dummy,'power',60,'dummy test');
  TT.damagePlayer(20,'test');
  const wounded=own.hp;
  TT.addSkillXp(own,'vitality',6,'dawn');
  TT.addSkillXp(own,'power',60,'headshot');
  TT.addSkillXp(own,'hands',10,'reload');
  TT.addSkillXp(own,'legs',20,'run');
  TT.addSkillXp(own,'scavenger',15,'bank');
  TT.addSkillXp(own,'grenadier',5,'blast');
  return {bankBefore:bank,bankAfter:TT.getBank(),wounded,healed:own.hp,effects:TT.getSkillEffects(),own:structuredClone(own.skills),dummy:structuredClone(dummy.skills),events:skillEvents.map(({player,key,rank})=>({player,key,rank}))};
 });
 assert.equal(result.bankAfter,result.bankBefore,'skill XP never charges Cash');
 assert.equal(result.wounded,80);assert.equal(result.healed,95,'Vitality adds fifteen HP without fully healing');
 assert.deepEqual(result.effects,{damage:1.08,reload:1/1.1,speed:1.05,cash:1.06,grenades:6,radius:1.08,maxHp:115});
 assert.equal(result.own.power.rank,1);assert.equal(result.dummy.power.rank,1);
 assert.equal(result.dummy.vitality.rank,0);
 assert.equal(result.events.filter(e=>e.player===0).length,6);
 assert(result.events.some(e=>e.player!==0&&e.key==='power'));
 await page.evaluate(()=>TT.resetGame());
 const fresh=await page.evaluate(()=>({skills:TT.getPlayers()[0].skills,effects:TT.getSkillEffects(),players:TT.getPlayers().length}));
 assert(Object.values(fresh.skills).every(s=>s.rank===0&&s.xp===0));
 assert.equal(fresh.effects.maxHp,100);assert.equal(fresh.players,1);
 assert.deepEqual(errors,[]);
 console.log(`PASS GP-87 skills (${gpu?'WebGPU':'stand-in renderer'}): six local effects, independent dummy, rank events, no Cash charge, kiosk tab gone, reset, no page errors.`);
} finally {
 if(browser)await browser.close();server.close();
}
