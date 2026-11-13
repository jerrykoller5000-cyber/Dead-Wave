import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {serve} from '../../tools/serve.mjs';
import {launch} from '../../tools/cdp.mjs';
if(!process.env.DW_GAME_TEST_TOKEN)throw Error('Use crew slot');
const phase=process.argv[2]||'live',root=fileURLToPath(new URL('../..',import.meta.url)),out=path.join(root,'review/GP-20129'),pause=ms=>new Promise(r=>setTimeout(r,ms)),report={at:new Date().toISOString(),actions:[],failures:[]};
const s=await serve(root,0),b=await launch({headless:false});
try{
 const p=await b.newPage({width:1280,height:720});await p.goto(s.origin+'/index.html?debug=1',{timeout:240000});
 await p.waitFor('!!window.TT && DWLoad.snapshot().state==="ready"',{timeout:120000});await p.evaluate('DWOpening.dismissForTesting()');await p.waitFor('!DWOpening.active');
 await p.evaluate('document.getElementById("playerName").value="Dummy live input";document.getElementById("modeTraining").click()');
 await p.waitFor('TT.trainingDbg.state().active && !document.getElementById("trainingBlackout")?.classList.contains("on")',{timeout:120000});
 await p.evaluate('(()=>{const T=TT,t=T.trainingDbg.tg();T.grantAllWeapons();T.takeOutGun("pistol");T.setWeapon(T.WEAPON_ORDER.indexOf("pistol"));T.setShotView(null);T.setViewFirstDbg(true);T.setUnarmedDbg(false);T.player.position.set(t.origin.x-5.65,t.floorY,t.origin.z-2.1);T.setVelDbg(0,0);T.setAimYawDbg(-Math.PI/2);T.setOtsAimDbg(-Math.PI/2,-.22);T.toggleFlashlightDbg();})()');
 await pause(1400);
 if(process.argv.includes('--contacts-only'))report.idleReference='live-inrange-play.json (exclusive20s,1142frames,median16.7ms,p9516.9ms,0over50ms)';
 else report.idle=await p.evaluate('new Promise(resolve=>{const a=[],start=performance.now();let last=0;function f(t){if(last)a.push(t-last);last=t;if(t-start<20000)requestAnimationFrame(f);else{a.sort((x,y)=>x-y);resolve({frames:a.length,median:a[Math.floor(a.length*.5)],p95:a[Math.floor(a.length*.95)],over50:a.filter(x=>x>50).length});}}requestAnimationFrame(f);})',30000);
 await p.evaluate('(()=>{window.inputWitness=[];const c=TT.inspectHost().renderer.domElement;document.addEventListener("mousedown",e=>inputWitness.push({target:e.target.tagName,id:e.target.id,canvas:e.target===c,button:e.button,x:e.clientX,y:e.clientY}),true);})()');
 for(const first of process.argv.includes('--third-only')?[false]:[true,false])for(const kind of process.argv.includes('--third-only')?['bullet']:['bullet','knife','machete','katana']){
  await p.evaluate(`(()=>{const T=TT,t=T.trainingDbg.tg();T.player.position.set(t.origin.x+${kind==='bullet'?(first?-5.45:-3.8):-5.65},t.floorY,t.origin.z-2.1);T.setViewFirstDbg(${first});T.setUnarmedDbg(false);T.setZoomHeldDbg(${kind==='bullet'&&first});T.setMacheteOwned(${kind==='machete'});T.setKatanaOwned(${kind==='katana'});T.setAimYawDbg(-Math.PI/2);T.setOtsAimDbg(-Math.PI/2,-.22);T.trainingDbg.state().dummy.reset();})()`);await pause(700);
  if(!await p.waitFor('TT.getSwapDbg().swapT<=0 && TT.getSwapDbg().fireCooldown<=0 && !TT.isReloading() && !TT.isUnarmed()',{timeout:5000}))throw Error('weapon not ready before '+kind+' first='+first);
  if(kind==='bullet'){
   const point=await p.evaluate(`(()=>{const T=TT,H=T.inspectHost(),s=T.trainingDbg.state().dummy.solid,b=H.renderer.domElement.getBoundingClientRect(),v=${first?'new T.THREE.Vector3()':'new T.THREE.Vector3(s.cx,s.minY+1.28,s.cz).project(H.camera)'};return{x:b.left+(v.x+1)*b.width/2,y:b.top+(1-v.y)*b.height/2};})()`);
   if(!first&&process.argv.includes("--pin-aim")){report.aimMode="C2-approved per-frame debug aim probe; not ordinary cursor aim proof";await p.evaluate(`(()=>{window.__pinAim=true;const pin=()=>{if(!window.__pinAim)return;const T=TT,s=T.trainingDbg.state().dummy.solid;T.aimPointDbg(s.cx,s.minY+.13,s.cz);T.setAimYawDbg(-Math.PI/2);requestAnimationFrame(pin);};pin();})()`);}
   report.pointer=await p.evaluate(`(()=>{const p=${JSON.stringify(point)},e=document.elementFromPoint(p.x,p.y);return{...p,hit:e?.tagName,id:e?.id,lock:document.pointerLockElement?.tagName,canvas:TT.inspectHost().renderer.domElement.getBoundingClientRect().toJSON(),inner:[innerWidth,innerHeight],ratio:devicePixelRatio};})()`);
   // OTS/eye aim uses relative mouse movement; only the ordinary 3P cursor picks a world point.
   if(!first)await p.send('Input.dispatchMouseEvent',{type:'mouseMoved',...point});await pause(100);
   await p.send('Input.dispatchMouseEvent',{type:'mousePressed',...point,button:'left',clickCount:1});await pause(350);await p.send('Input.dispatchMouseEvent',{type:'mouseReleased',...point,button:'left',clickCount:1});
  }else{await p.send('Input.dispatchKeyEvent',{type:'keyDown',code:'KeyF',key:'f',windowsVirtualKeyCode:70});await pause(70);await p.send('Input.dispatchKeyEvent',{type:'keyUp',code:'KeyF',key:'f',windowsVirtualKeyCode:70});}
  await pause(260);const state=await p.evaluate('TT.trainingDbg.state().dummy.state()'),name=phase+'-'+(first?'eye':'third')+'-'+kind+'.png';await p.screenshot(path.join(out,name));report.actions.push({first,kind,state,name});
  report.actions.at(-1).setup=await p.evaluate('({position:TT.player.position.toArray(),direction:TT.getAimDirDbg().toArray(),knifeCd:TT.getKnifeCd(),ammo:TT.getAmmo().pistol,unarmed:TT.isUnarmed(),swap:TT.getSwapDbg()})');
  if(!state.byKind[kind])report.failures.push('real input missed dummy: '+kind+' first='+first);
  await pause(1100);
 }
 report.doors=[];
 for(const side of [1,-1]){
  const before=await p.evaluate(`(()=>{const T=TT,t=T.trainingDbg.tg(),k=t.securityDoor.keypads.find(k=>k.side===${side});T.player.position.set(k.front.x,t.floorY,k.front.z);T.setVelDbg(0,0);T.setViewFirstDbg(true);T.setUnarmedDbg(true);T.setOtsAimDbg(${-Math.PI/2*side},-.2);return T.trainingDbg.state().security.read();})()`);await pause(350);
  await p.send('Input.dispatchKeyEvent',{type:'keyDown',code:'KeyE',key:'e',windowsVirtualKeyCode:69});await pause(80);await p.send('Input.dispatchKeyEvent',{type:'keyUp',code:'KeyE',key:'e',windowsVirtualKeyCode:69});await pause(800);
  const after=await p.evaluate('TT.trainingDbg.state().security.read()');report.doors.push({side,before,after});await p.screenshot(path.join(out,phase+'-keypad-side'+side+'.png'));if(before.open===after.open)report.failures.push('keypad did not toggle door, side '+side);
 }
 report.errors=p.errors.slice();report.inputWitness=await p.evaluate('inputWitness');console.log(JSON.stringify(report));
 if(report.failures.length)throw Error(report.failures.join('; '));
}catch(e){report.failure=String(e.stack||e);process.exitCode=1;console.error(report.failure);}
finally{fs.writeFileSync(path.join(out,phase+'-play.json'),JSON.stringify(report,null,2));await b.close();await s.close();}
