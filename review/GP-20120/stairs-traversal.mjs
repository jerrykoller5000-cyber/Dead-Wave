// GP-20120: Training build-room stairs with real walk, sprint and crouch input.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';
if(!process.env.DW_GAME_TEST_TOKEN)throw Error('Run through crew slot');
const root=path.resolve(fileURLToPath(new URL('../..',import.meta.url))),out=path.join(root,'review/GP-20120');
const result={at:new Date().toISOString(),runs:[],spikes:[],errors:[]},pause=ms=>new Promise(r=>setTimeout(r,ms));
const server=await serve(root,0),browser=await launch({headless:false,args:['--window-size=1280,720']});
try{
 const page=await browser.newPage({width:1280,height:720});
 await page.goto(server.origin+'/index.html?debug=1',{timeout:400000});
 if(!await page.waitFor('!!window.TT && window.DWLoad?.snapshot().state==="ready"',{timeout:400000}))throw Error('load');
 await page.evaluate('DWOpening.dismissForTesting()');
 await page.waitFor('!window.DWOpening || window.DWOpening.active===false',{timeout:500000});
 await page.evaluate('(()=>{window.__qa={stage:"entry",last:0,spikes:[]};const tick=t=>{const q=__qa;if(q.last&&t-q.last>100)q.spikes.push({stage:q.stage,ms:+(t-q.last).toFixed(1)});q.last=t;requestAnimationFrame(tick)};requestAnimationFrame(tick);document.getElementById("playerName").value="GP-20120 Stairs";document.getElementById("modeTraining").click()})()');
 if(!await page.waitFor('TT.trainingDbg.state().active && !document.getElementById("trainingBlackout")?.classList.contains("on")',{timeout:400000}))throw Error('Training entry');
 result.setup=await page.evaluate('(()=>{const T=TT,tg=T.trainingDbg.tg(),gx=Math.round((tg.origin.x-25)/2),gz=Math.round(tg.origin.z/2);T.grantAllWeapons();T.setViewFirstDbg(false);T.setUnarmedDbg(true);const b=T.placeBuildAt("stairs",gx,gz,0);window.__st=b?.deck?{x:b.deck.x,z:b.deck.z,half:b.deck.hl,rise:b.rise,floor:tg.floorY}:null;return {gx,gz,deck:window.__st,player:T.player.position.toArray(),reason:b?null:T.refusalText?.()};})()');
 console.log('setup',JSON.stringify(result.setup));
 if(!result.setup.deck)throw Error('Training build-room stairs placement failed');
 async function key(code,down){await page.send('Input.dispatchKeyEvent',{type:down?'keyDown':'keyUp',key:code==='KeyW'?'w':code==='KeyC'?'c':'Shift',code,windowsVirtualKeyCode:code==='KeyW'?87:code==='KeyC'?67:16});}
 for(const mode of ['walk','sprint','crouch']){
  await page.evaluate('__qa.stage='+JSON.stringify('stairs '+mode));
  const before=await page.evaluate('(()=>{const T=TT,s=__st;T.setShotView(null);T.setVelDbg(0,0);T.player.position.set(s.x,s.floor,s.z-s.half-1.2);T.setAimYawDbg(0);return {pos:T.player.position.toArray(),stair:T.stairSpeedDbg()};})()');
  await pause(300);await page.screenshot(path.join(out,'stairs-'+mode+'-before.png'));
  if(mode==='sprint')await key('ShiftLeft',true);
  if(mode==='crouch')await key('KeyC',true);
  await page.evaluate('(()=>{window.__path=[];window.__sampler=setInterval(()=>{const p=TT.player.position,s=TT.stairSpeedDbg();__path.push({x:p.x,y:p.y,z:p.z,w:s.w,on:s.on})},50)})()');
  const duration=mode==='crouch'?2500:1900,mid=mode==='crouch'?900:mode==='sprint'?270:400;
  await key('KeyW',true);await pause(mid);await page.screenshot(path.join(out,'stairs-'+mode+'-mid.png'));
  await pause(duration-mid);await key('KeyW',false);
  if(mode==='sprint')await key('ShiftLeft',false);
  if(mode==='crouch')await key('KeyC',false);
  const samples=await page.evaluate('(()=>{clearInterval(__sampler);return __path})()');
  const after=await page.evaluate('(()=>({pos:TT.player.position.toArray(),stair:TT.stairSpeedDbg(),crouch:TT.crouchDbg?.()}))()');
  await page.screenshot(path.join(out,'stairs-'+mode+'-after.png'));
  result.runs.push({mode,before,after,samples,maxRise:Math.max(...samples.map(x=>x.y-before.pos[1])),maxStairW:Math.max(...samples.map(x=>x.w))});console.log(mode,JSON.stringify({before,after,maxRise:result.runs.at(-1).maxRise,maxStairW:result.runs.at(-1).maxStairW}));
 }
 result.spikes=await page.evaluate('__qa.spikes');result.errors=page.errors.slice();
 result.warnings=page.console.filter(x=>/warn|error/i.test(x.type)||/WebGPU|validation/i.test(x.text)).map(x=>x.type+': '+x.text.slice(0,240));
 console.log('summary',JSON.stringify({spikes:result.spikes.length,errors:result.errors.length,warnings:result.warnings.length}));
}catch(e){result.failure=String(e?.stack||e);console.error(result.failure);process.exitCode=1;}
finally{fs.writeFileSync(path.join(out,'stairs-traversal.json'),JSON.stringify(result,null,2)+'\n');await browser.close();await server.close();}
