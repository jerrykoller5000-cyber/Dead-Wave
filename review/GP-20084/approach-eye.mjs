import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {serve} from '../../tools/serve.mjs';
import {launch} from '../../tools/cdp.mjs';
if(!process.env.DW_GAME_TEST_TOKEN)throw Error('Use crew game-test slot');
const root=path.resolve(fileURLToPath(new URL('../..',import.meta.url))),out=path.join(root,'review/GP-20084');
const server=await serve(root,0),browser=await launch({headless:false,args:['--window-size=1280,720']});
const report=[];
try{
 const page=await browser.newPage({width:1280,height:720});
 await page.goto(`${server.origin}/index.html?debug=1&raf=timer`);
 assert(await page.waitFor('!!window.TT && window.DWLoad?.snapshot().state==="ready"',{timeout:90000}));
 await page.evaluate('DWOpening.dismissForTesting()');
 assert(await page.waitFor('document.getElementById("opening").hidden',{timeout:15000}));
 await page.evaluate(`(()=>{document.getElementById('playerName').value='GP-20084 Approach';document.getElementById('modeTraining').click()})()`);
 assert(await page.waitFor('TT.trainingDbg.state().active && TT.getPhase()==="prep"',{timeout:90000}));
 assert(await page.waitFor('!document.getElementById("trainingBlackout")?.classList.contains("on")',{timeout:30000}));
 await page.evaluate('document.getElementById("perf")?.classList.remove("on")');
 for(const width of [1280,390]){
  await page.setViewport(width,width===390?844:720);
  for(const station of ['cif','kiosk','armory','hqPanel','skullWindow','lightSwitch','rangeConsole']){
   const position=await page.evaluate(`(()=>{const T=TT,tg=T.trainingDbg.tg(),s=tg.stations[${JSON.stringify(station)}],f=s.front,dx=f.x-s.x,dz=f.z-s.z,len=Math.hypot(dx,dz),back=1.4,x=f.x+dx/len*back,z=f.z+dz/len*back;T.player.position.set(x,tg.floorY,z);T.setShotView({x,y:tg.floorY+1.65,z,tx:s.x,ty:tg.floorY+1.4,tz:s.z,fov:65});return {station:${JSON.stringify(station)},width:${width},back,action:T.trainingDbg.action()}})()`);
   await new Promise(r=>setTimeout(r,180));
   position.overlap=await page.evaluate(`(()=>{const box=id=>document.querySelector(id)?.getBoundingClientRect(),a=box('#trainingHud'),h=box('#hudTopLeft'),p=document.querySelector('#kioskPrompt.on')?.getBoundingClientRect(),cross=(a,b)=>!!a&&!!b&&a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;return {health:cross(a,h),prompt:cross(a,p),score:{top:a?.top,bottom:a?.bottom},promptTop:p?.top}})()`);
   assert(!position.overlap.health && !position.overlap.prompt,`${station} ${width}: score strip overlaps a HUD card or action prompt`);
   await page.screenshot(path.join(out,`approach-${width}-${station}.png`));
   report.push(position);
  }
 }
 assert.deepEqual(page.errors,[]);
 console.log(`PASS GP-20084 approach: ${report.length} eye views, no page errors`);
}finally{fs.writeFileSync(path.join(out,'approach-eye.json'),JSON.stringify(report,null,2));await browser.close();await server.close();}
