// GP-20120: CIF first and second open without screenshot overhead.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';
if(!process.env.DW_GAME_TEST_TOKEN)throw Error('Run through crew slot');
const root=path.resolve(fileURLToPath(new URL('../..',import.meta.url))),out=path.join(root,'review/GP-20120');
const result={at:new Date().toISOString(),spikes:[],rows:[],errors:[]},pause=ms=>new Promise(r=>setTimeout(r,ms));
const server=await serve(root,0),browser=await launch({headless:false,args:['--window-size=1280,720']});
try{
 const page=await browser.newPage({width:1280,height:720});
 await page.goto(server.origin+'/index.html?debug=1',{timeout:400000});
 if(!await page.waitFor('!!window.TT && window.DWLoad?.snapshot().state==="ready"',{timeout:400000}))throw Error('load');
 await page.evaluate('DWOpening.dismissForTesting()');
 await page.waitFor('!window.DWOpening || window.DWOpening.active===false',{timeout:500000});
 await page.evaluate('(()=>{window.__qa={stage:"entry",last:0,spikes:[]};const tick=t=>{const q=__qa;if(q.last&&t-q.last>100)q.spikes.push({stage:q.stage,ms:+(t-q.last).toFixed(1)});q.last=t;requestAnimationFrame(tick)};requestAnimationFrame(tick);document.getElementById("playerName").value="GP-20120 CIF";document.getElementById("modeTraining").click()})()');
 if(!await page.waitFor('TT.trainingDbg.state().active && !document.getElementById("trainingBlackout")?.classList.contains("on")',{timeout:400000}))throw Error('Training entry');
 await page.evaluate('TT.setWorldTime(0.5)');
 for(let i=1;i<=2;i++){
  await page.evaluate('__qa.stage='+JSON.stringify('CIF open '+i));
  const before=await page.evaluate('performance.now()');
  const open=await page.evaluate('(()=>{const T=TT,tg=T.trainingDbg.tg(),f=tg.stations.cif.front;T.player.position.set(f.x,tg.floorY,f.z);T.doAction();return T.isCIFOpen();})()');
  await pause(1100);
  const visible=await page.evaluate('TT.isCIFOpen()');
  const duration=await page.evaluate('performance.now()')-before;
  result.rows.push({i,open,visible,duration});
  await page.evaluate('__qa.stage='+JSON.stringify('CIF close '+i));
  await page.evaluate('TT.closeCIF()');await pause(650);
 }
 result.spikes=await page.evaluate('__qa.spikes');result.errors=page.errors.slice();
 console.log(JSON.stringify({rows:result.rows,spikes:result.spikes,errors:result.errors}));
}catch(e){result.failure=String(e?.stack||e);console.error(result.failure);process.exitCode=1;}
finally{fs.writeFileSync(path.join(out,'cif-perf.json'),JSON.stringify(result,null,2)+'\n');await browser.close();await server.close();}
