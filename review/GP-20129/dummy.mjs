import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {serve} from '../../tools/serve.mjs';
import {launch} from '../../tools/cdp.mjs';
if(!process.env.DW_GAME_TEST_TOKEN)throw Error('Use crew slot');
const phase=process.argv[2]||'before',root=fileURLToPath(new URL('../..',import.meta.url)),out=path.join(root,'review/GP-20129'),pause=ms=>new Promise(r=>setTimeout(r,ms)),report={phase,shots:[]};
const server=await serve(root,0),browser=await launch({headless:false});
try{
 const page=await browser.newPage({width:1280,height:720});
 await page.goto(server.origin+'/index.html?debug=1',{timeout:240000});await page.waitFor('!!window.TT && DWLoad.snapshot().state==="ready"',{timeout:120000});
 await page.evaluate('DWOpening.dismissForTesting()');await page.waitFor('!DWOpening.active');
 await page.evaluate('document.getElementById("playerName").value="Training equipment";document.getElementById("modeTraining").click()');
 await page.waitFor('TT.trainingDbg.state().active && !document.getElementById("trainingBlackout")?.classList.contains("on")',{timeout:120000});
 report.placement=await page.evaluate('(()=>{const t=TT.trainingDbg.tg(),d=TT.trainingDbg.state().dummy;return {origin:t.origin,solid:d.solid,stations:t.stations};})()');
 for(const night of [false,true])for(const view of ['approach','eye','keypad']){
  const recipe=await page.evaluate(`(()=>{const T=TT,t=T.trainingDbg.tg(),o=t.origin;T.setWorldTime(${night?0:.5});T.setUnarmedDbg(true);T.setViewFirstDbg(false);T.player.position.set(o.x-4.5,t.floorY,o.z-2.1);T.setVelDbg(0,0);let c=${JSON.stringify(view)}==='approach'?{x:o.x-1,y:o.y+4.6,z:o.z-5.3,tx:o.x-6.2,ty:o.y+1,tz:o.z-2.1,fov:55}:${JSON.stringify(view)}==='eye'?{x:o.x-4.5,y:o.y+1.65,z:o.z-2.1,tx:o.x-7.5,ty:o.y+1.3,tz:o.z-2.1,fov:65}:{x:o.x-6.5,y:o.y+1.55,z:o.z-9.5,tx:o.x-7.7,ty:o.y+1.28,tz:o.z-9.5,fov:45};T.setShotView(c);return c;})()`);
  await pause(900);const name=phase+'-'+view+'-'+(night?'night':'noon')+'.png';await page.screenshot(path.join(out,name));report.shots.push({name,recipe});
 }
 report.errors=page.errors.slice();console.log(JSON.stringify(report));
}finally{fs.writeFileSync(path.join(out,phase+'-dummy.json'),JSON.stringify(report,null,2));await browser.close();await server.close();}
