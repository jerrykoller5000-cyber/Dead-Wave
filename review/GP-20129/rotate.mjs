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
 await page.evaluate('document.getElementById("playerName").value="Workbench rotate";document.getElementById("modeTraining").click()');
 await page.waitFor('TT.trainingDbg.state().active && !document.getElementById("trainingBlackout")?.classList.contains("on")',{timeout:120000});
 await page.evaluate('(()=>{const T=TT,t=T.trainingDbg.tg(),f=t.stations.armory.front;T.grantAllWeapons();T.player.position.set(f.x,t.floorY,f.z);T.doAction();T.armoryDbg.ui().bench("m4");})()');
 if(process.argv.includes('--first'))await page.evaluate('TT.setViewFirstDbg(true)');
 if(process.argv.includes('--night'))await page.evaluate('TT.setWorldTime(0)');
 if(!await page.waitFor('document.querySelector("#armoryPanel .armory-preview-stage")?.dataset.ready==="true"',{timeout:60000}))throw Error('preview not ready');
 await page.evaluate('document.querySelector("#armoryPanel .armory-preview-stage").scrollIntoView({block:"center"})');
 await pause(150);
 await page.screenshot(path.join(out,phase+'-front.png'));
 const box=await page.evaluate('(()=>{const e=document.querySelector("#armoryPanel .armory-preview-stage"),b=e.getBoundingClientRect();window.R={updates:[],start:0,end:0};new MutationObserver(rs=>{if(rs.some(r=>r.attributeName==="src"))R.updates.push(performance.now());}).observe(e.querySelector("img"),{attributes:true});return {x:b.x,y:b.y,w:b.width,h:b.height};})()');
 const x=box.x+box.w*.25,y=box.y+box.h*.5;
 await page.send('Input.dispatchMouseEvent',{type:'mousePressed',x,y,button:'left',clickCount:1});
 await page.evaluate('R.start=performance.now()');
 for(let i=1;i<=60;i++){await page.send('Input.dispatchMouseEvent',{type:'mouseMoved',x:x+box.w*.5*i/60,y,buttons:1});await pause(20);}
 await page.evaluate('R.end=performance.now()');
 await page.send('Input.dispatchMouseEvent',{type:'mouseReleased',x:x+box.w*.5,y,button:'left',clickCount:1});
 await pause(1200);result.measure=await page.evaluate('({...R,during:R.updates.filter(t=>t>=R.start&&t<=R.end).length,lastDelay:R.updates.length?R.updates.at(-1)-R.end:null})');
 await page.screenshot(path.join(out,phase+'-turned.png'));result.errors=page.errors.slice();console.log(JSON.stringify(result));
}catch(e){result.failure=String(e.stack||e);console.error(result.failure);process.exitCode=1;}
finally{fs.writeFileSync(path.join(out,phase+'-rotate.json'),JSON.stringify(result,null,2));await browser.close();await server.close();}
