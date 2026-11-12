// GP-20120: mortar shoulder and death at a clear firing-range position.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';
if(!process.env.DW_GAME_TEST_TOKEN)throw Error('Run through crew slot');
const root=path.resolve(fileURLToPath(new URL('../..',import.meta.url))),out=path.join(root,'review/GP-20120');
const report={at:new Date().toISOString(),spikes:[],errors:[]},pause=ms=>new Promise(r=>setTimeout(r,ms));
const server=await serve(root,0),browser=await launch({headless:false,args:['--window-size=1280,720']});
try{
 const page=await browser.newPage({width:1280,height:720});
 await page.goto(server.origin+'/index.html?debug=1',{timeout:400000});
 if(!await page.waitFor('!!window.TT && window.DWLoad?.snapshot().state==="ready"',{timeout:400000}))throw Error('load');
 await page.evaluate('DWOpening.dismissForTesting()');
 await page.waitFor('!window.DWOpening || window.DWOpening.active===false',{timeout:500000});
 await page.evaluate('(()=>{window.__qa={stage:"entry",last:0,spikes:[]};const tick=t=>{const q=__qa;if(q.last&&t-q.last>100)q.spikes.push({stage:q.stage,ms:+(t-q.last).toFixed(1)});q.last=t;requestAnimationFrame(tick)};requestAnimationFrame(tick);document.getElementById("playerName").value="GP-20120 Mortar";document.getElementById("modeTraining").click()})()');
 if(!await page.waitFor('TT.trainingDbg.state().active && !document.getElementById("trainingBlackout")?.classList.contains("on")',{timeout:400000}))throw Error('Training entry');
 report.shoulder=await page.evaluate('(()=>{const T=TT,tg=T.trainingDbg.tg();T.setWorldTime(.5);T.setViewFirstDbg(false);T.player.position.set(tg.origin.x,tg.floorY,tg.origin.z-10);T.setVelDbg(0,0);const p=T.player.position,b=T.spawnBuild("mortar",p.x+1.2,p.z),mounted=b&&T.mountMortar(b);if(mounted)T.shoulderMortar();return {player:p.toArray(),spawned:!!b,mounted,carried:T.getMortarCarried()?.kind};})()');
 console.log('shoulder',JSON.stringify(report.shoulder));
 if(report.shoulder.carried!=='mortar')throw Error('mortar not shouldered');
 await page.evaluate('(()=>{const T=TT,p=T.player.position;T.setShotView({x:p.x+1.5,y:p.y+2.2,z:p.z-3.5,tx:p.x,ty:p.y+1.1,tz:p.z,fov:55})})()');
 await page.evaluate('__qa.stage="mortar shoulder"');await pause(650);
 await page.screenshot(path.join(out,'mortar-shoulder-3p.png'));
 await page.evaluate('TT.setShotView(null)');
 await page.evaluate('__qa.stage="mortar death and wake"');
 await page.evaluate('TT.runDevCommand("rip")');
 if(!await page.waitFor('!!TT.trainingDbg.state().wake',{timeout:20000}))throw Error('death did not start');
 if(!await page.waitFor('!TT.trainingDbg.state().wake',{timeout:90000}))throw Error('wake did not finish');
 report.wake=await page.evaluate('(()=>({player:TT.player.position.toArray(),carried:TT.getMortarCarried()?.kind||null,placed:TT.builds.filter(b=>b.type==="mortar").map(b=>({hp:b.hp,belt:b.belt})),fence:TT.trainingDbg.state().infirmaryFence?.state()}))()');
 await page.screenshot(path.join(out,'mortar-wake.png'));
 await page.evaluate('__qa.stage="mortar infirmary exit"');
 await page.send('Input.dispatchKeyEvent',{type:'keyDown',key:'w',code:'KeyW',windowsVirtualKeyCode:87});await pause(1800);
 await page.send('Input.dispatchKeyEvent',{type:'keyUp',key:'w',code:'KeyW',windowsVirtualKeyCode:87});
 report.exit=await page.evaluate('(()=>({player:TT.player.position.toArray(),fence:TT.trainingDbg.state().infirmaryFence?.state()}))()');
 await page.screenshot(path.join(out,'mortar-exit.png'));
 report.spikes=await page.evaluate('__qa.spikes');report.errors=page.errors.slice();
 console.log('wake/exit',JSON.stringify({wake:report.wake,exit:report.exit,spikes:report.spikes.length,errors:report.errors.length}));
 if(report.wake.carried||report.wake.placed.length!==1||!(report.exit.player[2]>report.wake.player[2]+5))throw Error('mortar recovery failed');
}catch(e){report.failure=String(e?.stack||e);console.error(report.failure);process.exitCode=1;}
finally{fs.writeFileSync(path.join(out,'mortar-wake.json'),JSON.stringify(report,null,2)+'\n');await browser.close();await server.close();}
