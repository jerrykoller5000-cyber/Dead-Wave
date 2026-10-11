import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {serve} from '../tools/serve.mjs';
const {chromium}=createRequire(import.meta.url)('playwright');
const phase=process.argv.includes('--before')?'before':'after',out='review/marine-turn/'+phase;
fs.mkdirSync(out,{recursive:true});const server=await serve(process.cwd(),0);let browser;
try {
  browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  const p=await browser.newPage({viewport:{width:900,height:900}});
  if(phase==='before')await p.route('**/studio/marine-turn.js',route=>route.fulfill({contentType:'text/javascript',body:'export function createMarineTurn(){return {restore(){},apply(){},reset(){}}}'}));
  const errors=[];p.on('pageerror',e=>errors.push(e.message));const started=Date.now();
  await p.goto(server.origin+'/index.html?debug=1&raf=timer',{waitUntil:'domcontentloaded'});
  await p.waitForFunction(()=>window.TT&&DWLoad.snapshot().state==='ready',null,{timeout:60000});const loadMs=Date.now()-started;
  await p.evaluate(()=>{DWOpening.dismissForTesting();document.getElementById('playerName').value='Pivot check';document.getElementById('modeTraining').click();});
  await p.waitForFunction(()=>TT.trainingDbg.state().active&&!document.getElementById('trainingBlackout')?.classList.contains('on'));
  await p.evaluate(async()=>{
    window.TH=await import('./vendor/three/three.webgpu.js');const tg=TT.trainingDbg.tg();TT.player.position.set(tg.origin.x,tg.floorY,tg.origin.z-2);
    const origin=TT.getMarine().getWorldPosition(new TH.Vector3());
    TT.setShotView({x:origin.x+.6,y:origin.y+3.5,z:origin.z+4,tx:origin.x,ty:origin.y+.9,tz:origin.z,fov:33});
    const cv=[...document.querySelectorAll('canvas')].sort((a,b)=>b.clientWidth*b.clientHeight-a.clientWidth*a.clientHeight)[0],keep=new Set();
    for(let e=cv;e&&e!==document.body;e=e.parentElement)keep.add(e);
    for(const e of document.body.children)if(!keep.has(e))e.style.setProperty('display','none','important');
    window.pivotFrames=[];
    function sample(t){const m=TT.getMarine(),u=m.userData;
      let hands=null;
      if(TT.getCurrentWeapon()==='m4') {
        const g=TT.weaponMeshes.m4,h=TT.getShoulderDbg().holds.m4;
        hands=[u.elbowRG.localToWorld(new TH.Vector3(-.01,-.26,.12)).distanceTo(g.localToWorld(new TH.Vector3(...h.grip))),
          u.elbowLG.localToWorld(new TH.Vector3(.02,-.27,.13)).distanceTo(g.localToWorld(new TH.Vector3(...h.fore)))];
      }
      window.pivotFrames.push({t,hands,aim:TT.player.rotation.y,root:TT.player.position.toArray(),
      turn:u.turn?{...u.turn}:null,feet:[u.ankleLG,u.ankleRG].map(a=>a.getWorldPosition(new TH.Vector3()).toArray())});requestAnimationFrame(sample);}
    requestAnimationFrame(sample);
  });
  await p.mouse.move(450,200);await p.waitForTimeout(1200);await p.screenshot({path:out+'/00-stance.png'});
  const first=await p.evaluate(()=>pivotFrames.length);
  await p.mouse.move(450,780);
  for(let i=1;i<=6;i++){await p.waitForTimeout(75);await p.screenshot({path:out+`/0${i}-turn.png`});}
  await p.waitForTimeout(600);const turning=await p.evaluate(first=>pivotFrames.slice(first),first);
  await p.keyboard.down('KeyW');await p.waitForTimeout(300);const walking=await p.evaluate(()=>({...TT.getMarine().userData.turn}));await p.keyboard.up('KeyW');
  await p.waitForTimeout(800);await p.keyboard.down('KeyC');await p.waitForTimeout(800);const crouch=await p.evaluate(()=>({...TT.getMarine().userData.turn}));await p.keyboard.up('KeyC');
  // Put the rifle target at chest height, 10 m away: the close overhead screenshot's bottom pixel
  // can land beneath the marine after walking, which tests the existing extreme downward hold instead.
  await p.mouse.move(-10,-10);
  await p.evaluate(()=>{const p=TT.player.position;TT.aimTarget.set(p.x,p.y+1.2,p.z+10);TT.setAimYawDbg(0);
    TT.buyWeapon('m4');TT.setWeapon(TT.WEAPON_ORDER.indexOf('m4'));});await p.waitForTimeout(2600);
  const rifleStart=await p.evaluate(()=>{const p=TT.player.position;TT.aimTarget.set(p.x,p.y+1.2,p.z-10);TT.setAimYawDbg(Math.PI);return pivotFrames.length;});
  await p.waitForTimeout(1000);
  const rifle=await p.evaluate(i=>pivotFrames.slice(i),rifleStart);
  fs.writeFileSync(out+'/checks.json',JSON.stringify({loadMs,turning,walking,crouch,rifle,errors},null,2));
  if(phase==='after') {
    assert(turning.some(f=>f.turn?.lift>.045),'visible lifted boot');
    assert(turning.some(f=>f.turn?.swing===0)&&turning.some(f=>f.turn?.swing===1),'alternating feet');
    assert(turning.every(f=>!f.turn?.active||f.turn.plantedError<.012),'support foot remains planted');
    assert(!walking.active,'walking retains locomotion pose');
    assert(crouch.active&&crouch.crouch>.97,'settled crouch enables low pivot');
    assert(rifle.some(f=>f.turn?.lift>.04),'rifle also pivots');
    assert(rifle.every(f=>f.hands&&f.hands.every(e=>e<.08)),'rifle hands remain attached through turn: '+Math.max(...rifle.flatMap(f=>f.hands||[999])));
  }
  assert.deepEqual(errors,[]);
  await p.close();
  console.log(`PASS ${phase}: ${turning.length} live frames, load ${loadMs} ms, zero page errors; ${phase==='after'?'alternating lifted feet, planted support, walking handoff':'baseline captured'}`);
}finally {await browser?.close();server.close();}
