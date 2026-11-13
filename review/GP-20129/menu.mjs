import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {serve} from '../../tools/serve.mjs';
import {launch} from '../../tools/cdp.mjs';
if(!process.env.DW_GAME_TEST_TOKEN)throw Error('Use crew slot');
const phase=process.argv[2]||'before',root=fileURLToPath(new URL('../..',import.meta.url)),out=path.join(root,'review/GP-20129'),pause=ms=>new Promise(r=>setTimeout(r,ms));
const result={phase,at:new Date().toISOString()},server=await serve(root,0),browser=await launch({headless:false});
try{
 const page=await browser.newPage({width:process.argv.includes('--narrow')?390:1280,height:process.argv.includes('--narrow')?844:720});
 await page.goto(server.origin+'/index.html?debug=1',{timeout:240000});await page.waitFor('!!window.TT && DWLoad.snapshot().state==="ready"',{timeout:120000});
 await page.evaluate('DWOpening.dismissForTesting()');await page.waitFor('!DWOpening.active');
 await page.evaluate('document.getElementById("playerName").value="Armory supplies";document.getElementById("modeTraining").click()');
 await page.waitFor('TT.trainingDbg.state().active && !document.getElementById("trainingBlackout")?.classList.contains("on")',{timeout:120000});
 await page.evaluate('(()=>{const T=TT,t=T.trainingDbg.tg(),f=t.stations.armory.front;T.grantAllWeapons();T.setMacheteOwned(false);T.player.position.set(f.x,t.floorY,f.z);T.doAction();document.getElementById("armoryPanel").scrollTop=0;})()');
 await pause(800);await page.screenshot(path.join(out,phase+'-menu.png'));
 result.layout=await page.evaluate('(()=>{const p=document.getElementById("armoryPanel"),r=p.querySelector("[data-restock-all]"),m=[...p.querySelectorAll(".perk")].find(e=>e.textContent.includes("Machete"));return {restock:r?.getBoundingClientRect().toJSON(),machete:m?.getBoundingClientRect().toJSON(),scrollHeight:p.scrollHeight,viewport:innerHeight};})()');
 if(phase.startsWith('after')){
  result.purchase=await page.evaluate('(()=>{const p=document.getElementById("armoryPanel"),m=[...p.querySelectorAll(".perk")].find(e=>e.textContent.includes("Machete")),r=p.querySelector("[data-restock-all]");if(!m||!r)throw Error("missing main supplies");if(m.getBoundingClientRect().bottom>innerHeight||r.getBoundingClientRect().bottom>innerHeight)throw Error("supplies below initial viewport");m.querySelector("button").click();if(!TT.isMacheteOwned())throw Error("machete purchase failed");const buy=p.querySelector("[data-restock-all] button");if(buy.disabled)throw Error("restock quote should be purchasable");buy.click();const full=p.querySelector("[data-restock-all] button");if(!full.disabled)throw Error("restock did not reach full state");return {macheteOwned:TT.isMacheteOwned(),restockFull:full.disabled,restockText:full.textContent};})()');
 }
 result.errors=page.errors.slice();console.log(JSON.stringify(result));
}catch(e){result.failure=String(e.stack||e);console.error(result.failure);process.exitCode=1;}
finally{fs.writeFileSync(path.join(out,phase+'-menu.json'),JSON.stringify(result,null,2));await browser.close();await server.close();}
