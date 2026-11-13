import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {serve} from '../../tools/serve.mjs';
import {launch} from '../../tools/cdp.mjs';
if(!process.env.DW_GAME_TEST_TOKEN)throw Error('Use crew slot');
const phase=process.argv[2]||'before',root=fileURLToPath(new URL('../..',import.meta.url)),out=path.join(root,'review/GP-20131');
const report={phase,at:new Date().toISOString()},server=await serve(root,0),browser=await launch({headless:false});
try{
 const page=await browser.newPage({width:1280,height:720});
 await page.goto(server.origin+'/index.html?debug=1',{timeout:300000});
 if(!await page.waitFor('!!window.TT && DWLoad.snapshot().state==="ready"',{timeout:300000}))throw Error('load');
 await page.evaluate('DWOpening.dismissForTesting()');await page.waitFor('!DWOpening.active');
 await page.evaluate('document.getElementById("playerName").value="Shotgun drill QA";document.getElementById("modeTraining").click()');
 if(!await page.waitFor('TT.trainingDbg.state().active && !document.getElementById("trainingBlackout")?.classList.contains("on")',{timeout:150000}))throw Error('Training');
 report.copy=await page.evaluate(`(()=>{const T=TT,t=T.trainingDbg.tg(),f=t.stations.rangeConsole.front;T.grantAllWeapons();T.setViewFirstDbg(true);T.player.position.set(f.x,t.floorY,f.z);T.doAction();document.querySelector('[data-weapon="shotgun"]').click();document.querySelector('[data-drill="seven-on-steel"]').click();return document.querySelector('[data-drill="seven-on-steel"]').textContent;})()`);
 await new Promise(r=>setTimeout(r,350));await page.screenshot(path.join(out,phase+'-console.png'));
 report.start=await page.evaluate(`(async()=>{const d=(await import('/ui/range-drills.js')).drillsFor('shotgun')[0];return TT.rangeDbg.start(d);})()`);
 if(!await page.waitFor('TT.rangeDbg.read()?.state==="ACTIVE" && TT.trainingDbg.tg().targets.at(-5)?.state==="up"',{timeout:25000}))throw Error('not active/upright');
 // Native feature, target bank and score adapter; deterministic callbacks, not projectile aim/spread proof.
 report.callbacks=await page.evaluate(`(()=>{const f=TT.rangeDbg.feature(),t=TT.trainingDbg.tg(),index=t.targets.length-5,token=f.attack('shotgun'),accepted=[],duplicates=[];for(let i=0;i<18;i++){accepted.push(f.hit(index,null,token,i));duplicates.push(f.hit(index,null,token,i));}const nineteenth=f.hit(index,null,token,18),s=f.read();return {accepted,duplicates,nineteenth,stats:s.stats,efficiency:s.efficiency,state:s.state};})()`);
 await page.screenshot(path.join(out,phase+'-scored.png'));report.errors=page.errors.slice();
 const n=report.callbacks.accepted.filter(Boolean).length;
 if(n!==(phase==='before'?7:18)||report.callbacks.duplicates.some(Boolean)||report.callbacks.nineteenth||report.callbacks.efficiency!==100||report.errors.length)throw Error('callback proof failed');
 console.log(JSON.stringify(report));
}catch(e){report.failure=String(e.stack||e);console.error(report.failure);process.exitCode=1;}
finally{fs.writeFileSync(path.join(out,phase+'.json'),JSON.stringify(report,null,2)+'\n');await browser.close();await server.close();}
