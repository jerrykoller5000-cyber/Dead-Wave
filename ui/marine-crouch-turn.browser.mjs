import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {serve} from '../tools/serve.mjs';
const {chromium}=createRequire(import.meta.url)('playwright');
const before=process.argv.includes('--before'),out='review/marine-crouch-turn/'+(before?'before':'after');
fs.mkdirSync(out,{recursive:true});const server=await serve(process.cwd(),0);let browser;
try {
 browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const p=await browser.newPage({viewport:{width:900,height:900}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(server.origin+'/index.html?debug=1&raf=timer',{waitUntil:'domcontentloaded'});
 await p.waitForFunction(()=>window.TT&&DWLoad.snapshot().state==='ready',null,{timeout:60000});
 await p.evaluate(()=>{DWOpening.dismissForTesting();document.getElementById('playerName').value='Crouch pivot';document.getElementById('modeTraining').click();});
 await p.waitForFunction(()=>TT.trainingDbg.state().active&&!document.getElementById('trainingBlackout')?.classList.contains('on'));
 await p.evaluate(async()=>{
  window.TH=await import('./vendor/three/three.webgpu.js');const tg=TT.trainingDbg.tg();TT.player.position.set(tg.origin.x,tg.floorY,tg.origin.z-2);
  const o=TT.getMarine().getWorldPosition(new TH.Vector3());TT.setShotView({x:o.x+.8,y:o.y+2.8,z:o.z+3.8,tx:o.x,ty:o.y+.7,tz:o.z,fov:32});
  const cv=[...document.querySelectorAll('canvas')].sort((a,b)=>b.clientWidth*b.clientHeight-a.clientWidth*a.clientHeight)[0],keep=new Set();
  for(let e=cv;e&&e!==document.body;e=e.parentElement)keep.add(e);for(const e of document.body.children)if(!keep.has(e))e.style.setProperty('display','none','important');
  window.aimPivot=yaw=>{const o=TT.player.position;TT.aimTarget.set(o.x+Math.sin(yaw)*10,o.y+.9,o.z+Math.cos(yaw)*10);TT.setAimYawDbg(yaw);};
  window.frames=[];window.aimPivot(0);
  function sample(t){const m=TT.getMarine(),u=m.userData;let hands=null;
   if(TT.getCurrentWeapon()==='m4'&&!TT.isUnarmed()) {const g=TT.weaponMeshes.m4,h=TT.getShoulderDbg().holds.m4;
    hands=[u.elbowRG.localToWorld(new TH.Vector3(-.01,-.26,.12)).distanceTo(g.localToWorld(new TH.Vector3(...h.grip))),
     u.elbowLG.localToWorld(new TH.Vector3(.02,-.27,.13)).distanceTo(g.localToWorld(new TH.Vector3(...h.fore)))];}
   frames.push({t,turn:{...u.turn},crouch:TT.gaitDbg.pose().crouch,y:m.position.y,root:TT.player.position.toArray(),hands,
    feet:[u.ankleLG,u.ankleRG].map(a=>a.getWorldPosition(new TH.Vector3()).toArray())});requestAnimationFrame(sample);}
  requestAnimationFrame(sample);
 });
 await p.keyboard.down('KeyC');await p.waitForTimeout(1200);await p.screenshot({path:out+'/00-stance.png'});
 const cases=[];
 for(const [id,yaw,gun]of [['right',Math.PI/2,'pistol'],['reverse',-Math.PI/2,'pistol'],['rifle',Math.PI/2,'m4'],['unarmed',-Math.PI/2,'unarmed']]){
  if(gun==='m4'){await p.evaluate(()=>{TT.buyWeapon('m4');TT.setWeapon(TT.WEAPON_ORDER.indexOf('m4'));});await p.waitForTimeout(2600);}
  if(gun==='unarmed'){await p.evaluate(()=>TT.toggleHolster());await p.waitForTimeout(1800);}
  const start=await p.evaluate(y=>{aimPivot(y);return frames.length;},yaw);
  for(let i=1;i<=4;i++){await p.waitForTimeout(90);await p.screenshot({path:out+`/${id}-${i}.png`});}
  await p.waitForTimeout(800);cases.push({id,frames:await p.evaluate(i=>frames.slice(i),start)});
 }
 await p.keyboard.down('KeyW');await p.waitForTimeout(350);const walk=await p.evaluate(()=>frames.at(-1));await p.keyboard.up('KeyW');await p.waitForTimeout(700);
 const riseStart=await p.evaluate(()=>frames.length);await p.keyboard.up('KeyC');await p.waitForTimeout(1200);
 const rise=await p.evaluate(i=>frames.slice(i),riseStart);await p.screenshot({path:out+'/standing.png'});
 fs.writeFileSync(out+'/checks.json',JSON.stringify({cases,walk,rise,errors},null,2));
 if(!before){for(const c of cases){
  assert(c.frames.some(f=>f.turn.active&&f.turn.lift>.025),c.id+' crouch step');
  assert(c.frames.every(f=>f.crouch>.97&&f.y<-.83),c.id+' stays low');
  assert(c.frames.every(f=>!f.turn.active||f.turn.plantedError<.012),c.id+' planted support');
  const last=c.frames.at(-1);assert.equal(last.turn.swing,-1,c.id+' settles');
  if(c.id==='rifle')assert(c.frames.every(f=>f.hands&&f.hands.every(e=>e<.08)),'rifle hands');
 }
 assert(!walk.turn.active&&walk.crouch>.97,'crouch walk owns legs');assert(rise.at(-1).crouch<.03&&rise.at(-1).turn.active,'returns to standing pivot');
 assert(rise.slice(1).every((f,i)=>Math.abs(f.y-rise[i].y)<.07),'smooth rise');}
 assert.deepEqual(errors,[]);console.log(`PASS ${before?'before':'after'}: four live crouch turns, weapon holds, crouch walk and rise; no page errors`);
}finally{await browser?.close();server.close();}
