// GP-75: actual WebGPU snapshots and movement/pose checks. Probe code exists only in the served page.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { serve } from '../tools/serve.mjs';
const { chromium } = createRequire(import.meta.url)('playwright');
const root = fileURLToPath(new URL('..', import.meta.url));
const before = process.argv.includes('--before');
const output = path.join(root, 'Claude outputs/shots/gp75'); fs.mkdirSync(output,{recursive:true});
let src = fs.readFileSync(before ? path.join(os.tmpdir(),'dead-wave-gp75-before.html') : path.join(root,'index.html'),'utf8');
const check = spawnSync(process.execPath,['--input-type=module','--check'],{input:src.match(/<script type="module">([\s\S]*?)<\/script>/)[1],encoding:'utf8'});
assert.equal(check.status,0,check.stderr); console.log('Main module syntax PASS');
src=src.replace('window.TT = {',()=>`window.rollProbe={
  setup:()=>{endLivePreRoll();TT.finishEffectWarmup();player.position.set(18,sampleHeight(18,18),18);camYawCurrent=camYawTarget=aimYaw=0;
    player.rotation.y=0;velX=velZ=vy=0;grounded=true;playerSwimming=false;rollT=rollCd=0;zoomHeld=false;
    for(const k of Object.keys(keys))keys[k]=false;updateMarinePose(.016,false,false,false);holdWeapon(.016);},
  start:(f,s)=>{for(const k of Object.keys(keys))keys[k]=false;keys.KeyW=f>0;keys.KeyS=f<0;keys.KeyD=s>0;keys.KeyA=s<0;
    rollT=rollCd=0;tryRoll();return {x:rollDirX,z:rollDirZ,t:rollT};},
  pose:(fraction)=>{rollT=ROLL_DUR*fraction;updateMarinePose(.016,true,false,false);holdWeapon(.016);
    const axis=new THREE.Vector3(),angle=2*Math.acos(Math.max(-1,Math.min(1,rollPivot.quaternion.w)));
    const scale=Math.sqrt(1-rollPivot.quaternion.w*rollPivot.quaternion.w);
    axis.set(rollPivot.quaternion.x/(scale||1),rollPivot.quaternion.y/(scale||1),rollPivot.quaternion.z/(scale||1));
    return {axis:[axis.x,axis.y,axis.z],angle,quat:rollPivot.quaternion.toArray(),yaw:player.rotation.y};},
  dir:()=>({x:rollDirX,z:rollDirZ}),
  travel:(f,s,frames=4)=>{const p=player.position;p.set(18,sampleHeight(18,18),18);velX=velZ=vy=0;grounded=true;
    rollT=rollCd=0;for(const k of Object.keys(keys))keys[k]=false;keys.KeyW=f>0;keys.KeyS=f<0;keys.KeyD=s>0;keys.KeyA=s<0;
    tryRoll();const x=p.x,z=p.z;const prev=clock.getDelta;clock.getDelta=()=>.05;
    for(let i=0;i<frames;i++)tick();clock.getDelta=prev;
    return {dx:p.x-x,dz:p.z-z,rollT,rollCd,pivot:rollPivot.quaternion.toArray()};},
  yaw:(v)=>{aimYaw=v;player.rotation.y=v;},
  reset:()=>{rollT=rollCd=0;updateMarinePose(.016,false,false,false);},
  frame:()=>renderFrame(),
  camera:()=>{const p=player.position;camera.position.set(p.x+2.6,p.y+1.8,p.z+4.2);camera.lookAt(p.x,p.y+.85,p.z);camera.fov=35;camera.updateProjectionMatrix();}
};window.TT = {`);
const server=await serve(root,0);let browser;
try{
  browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
  const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/index.html?*',r=>r.fulfill({body:src,contentType:'text/html'}));
  const start=Date.now();await page.goto(server.origin+'/index.html?debug=1');await page.waitForFunction(()=>window.TT&&DWLoad.snapshot().state==='ready',null,{timeout:120000});
  const readyMs=Date.now()-start;await page.evaluate(()=>DWOpening.dismissForTesting());await page.waitForFunction(()=>document.getElementById('opening').hidden);
  await page.fill('#playerName','Roll Tester');await page.click('#modeHunt');
  await page.waitForFunction(()=>TT.getPhase()==='prep'&&!document.body.classList.contains('deploying'),null,{timeout:60000});
  const bench=await page.evaluate(()=>new Promise(resolve=>{const frames=[];let last=performance.now();const step=t=>{
    frames.push(t-last);last=t;if(frames.length<180)requestAnimationFrame(step);else{frames.sort((a,b)=>a-b);resolve({meanMs:frames.reduce((a,b)=>a+b,0)/frames.length,p95Ms:frames[Math.floor(frames.length*.95)]});}};requestAnimationFrame(step);}));
  await page.evaluate(()=>{TT.renderer.setAnimationLoop(null);rollProbe.setup();TT.setWorldTime(.4);rollProbe.camera();});
  await page.waitForTimeout(350);await page.evaluate(()=>{rollProbe.camera();rollProbe.frame();});await page.waitForTimeout(250);
  await page.addStyleTag({content:'body > :not(canvas):not(script):not(style):not(link){visibility:hidden!important}'});
  const directions={forward:[1,0],backward:[-1,0],left:[0,-1],right:[0,1],forwardLeft:[1,-1],forwardRight:[1,1],backwardLeft:[-1,-1],backwardRight:[-1,1]};
  const results={};
  for(const [name,[f,s]] of Object.entries(directions)){
    const result=await page.evaluate(({f,s})=>{const p=rollProbe;p.reset();const move=p.start(f,s);const pose=p.pose(.6464466094);p.camera();p.frame();return {move,pose};},{f,s});
    results[name]=result;await page.waitForTimeout(150);await page.screenshot({path:path.join(output,(before?'before-':'after-')+name+'.png')});
    if(!before){
      // The game's camera convention maps A/screen-left to +X at yaw zero.
      const expected=[-(s||0),0,f||0],l=Math.hypot(expected[0],expected[2]);expected[0]/=l;expected[2]/=l;
      assert(Math.abs(result.move.x-expected[0])<.001&&Math.abs(result.move.z-expected[2])<.001,name+' travel direction');
      // A positive quarter tumble sends the top of the marine into the travel direction.
      const q=result.pose.quat;const top=new (await import('../vendor/three/three.core.js')).Vector3(0,1,0).applyQuaternion(new (await import('../vendor/three/three.core.js')).Quaternion(...q));
      assert(top.x*expected[0]+top.z*expected[2]>.65,name+' visible tumble direction');
    }
    console.log(name,JSON.stringify(result));
  }
  if(!before){
    const check=await page.evaluate(()=>{const p=rollProbe;p.reset();p.start(0,-1);p.yaw(Math.PI/2);const pose=p.pose(.6464466094);
      const q=new TT.THREE.Quaternion(...pose.quat),top=new TT.THREE.Vector3(0,1,0).applyQuaternion(q).applyAxisAngle(new TT.THREE.Vector3(0,1,0),Math.PI/2);
      if(top.x<.65||Math.abs(top.z)>.35)throw Error('turning aim mid-roll changed world tumble direction');
      p.reset();if(Math.abs(p.pose(0).angle)>1e-4)throw Error('roll pivot did not reset');return 'mid-roll aim and recovery PASS';});console.log(check);
    for(const [name,[f,s]] of Object.entries(directions)){
      const movement=await page.evaluate(({f,s})=>rollProbe.travel(f,s),{f,s});
      const chosen=results[name].move;
      assert(movement.dx*chosen.x+movement.dz*chosen.z>.7,name+' physical travel');
      assert(movement.rollT>0,name+' roll still active after 0.2 seconds');
      results[name].physical=movement;
    }
    console.log('PASS all eight directions physically move toward the matching tumble');
    const full=await page.evaluate(()=>rollProbe.travel(0,-1,11));
    assert(full.rollT<=0,'side roll completes');
    assert(Math.abs(full.pivot[0])+Math.abs(full.pivot[1])+Math.abs(full.pivot[2])<1e-5,'pivot upright after sideways roll');
    assert(full.rollCd>0,'roll cooldown retained');
    console.log('PASS side roll completes upright with cooldown',JSON.stringify(full));
  }
  assert.deepEqual(errors,[]);
  const summary={readyMs,bench,backend:await page.evaluate(()=>TT.getRendererBackend()),errors,results};
  fs.writeFileSync(path.join(output,before?'before.json':'after.json'),JSON.stringify(summary,null,2));
  console.log('PASS',before?'baseline captures':'eight directions, matching travel and tumble, aim turn, recovery',JSON.stringify({readyMs,bench,errors}));
}finally{if(browser)await browser.close();server.close();}
