// Supplemental real-WebGPU proof; leaves the production debug API unchanged.
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
const output = path.join(root, 'Claude outputs/shots/gp74'); fs.mkdirSync(output, {recursive:true});
let src = fs.readFileSync(before ? path.join(os.tmpdir(),'dead-wave-gp74-before.html') : path.join(root,'index.html'),'utf8');
const syntax = spawnSync(process.execPath, ['--input-type=module','--check'], {input:src.match(/<script type="module">([\s\S]*?)<\/script>/)[1],encoding:'utf8'});
assert.equal(syntax.status,0,syntax.stderr); console.log('Main module syntax PASS');
src=src.replace('window.TT = {',()=>`window.idleProbe = {
  ${before ? '' : 'marineIdle, updateMarineIdle,'}
  updateMarinePose, holdWeapon, updateGroundFires, updateSmoke, groundFires, scorchDecals, spawnGroundFire, clearGroundFires, fireCanSpreadTo,
  setup: () => { endLivePreRoll(); TT.finishEffectWarmup(); velX = velZ = vy = 0; grounded = true; playerSwimming = false;
    player.position.set(18, sampleHeight(18,18), 18);
    mouseFireHeld = fireHeld = false; reloading = false; gestureT = 0; hitReaction.time = 0;
    for (const k of Object.keys(keys)) keys[k] = false;
    ${before ? '' : 'marineIdleInput = false; marineIdle.reset();'}
  },
  step: (seconds) => { for(let t=0;t<seconds-1e-7;t+=.05) { const dt=Math.min(.05,seconds-t);
    ${before ? '' : 'updateMarineIdle(dt);'} updateMarinePose(dt,false,false,false); holdWeapon(dt);
    ${before ? '' : 'marineIdle.pose(dt);'} updateGroundFires(dt); updateSmoke(dt);
  } },
  moving: v => { keys.KeyW = v; }, pause: v => { paused=v; },
  hideWorld: () => { for(const g of foliageChunks) g.visible=false; },
  weapons: () => ({main:weaponMount.visible,offhand:offhandMount.visible}),
  frame: () => renderFrame(),
  camera: () => { const p=player.position; camera.position.set(p.x+2.4,p.y+1.6,p.z+3.8); camera.lookAt(p.x,p.y+.85,p.z); camera.fov=34; camera.updateProjectionMatrix(); },
}; window.TT = {`);
const server=await serve(root,0); let browser;
try {
  browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
  const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/index.html?*',r=>r.fulfill({body:src,contentType:'text/html'}));
  const started=Date.now();await page.goto(server.origin+'/index.html?debug=1');
  await page.waitForFunction(()=>window.TT&&DWLoad.snapshot().state==='ready',null,{timeout:120000});
  const readyMs=Date.now()-started;await page.evaluate(()=>DWOpening.dismissForTesting());
  await page.waitForFunction(()=>document.getElementById('opening').hidden);
  await page.fill('#playerName','Idle Tester');await page.click('#modeHunt');
  await page.waitForFunction(()=>TT.getPhase()==='prep'&&!document.body.classList.contains('deploying'),null,{timeout:60000});
  const bench=await page.evaluate(()=>new Promise(resolve=>{const frames=[];let last=performance.now();
    const step=t=>{frames.push(t-last);last=t;if(frames.length<180)requestAnimationFrame(step);else{frames.sort((a,b)=>a-b);resolve({meanMs:frames.reduce((a,b)=>a+b,0)/frames.length,p95Ms:frames[Math.floor(frames.length*.95)]});}};requestAnimationFrame(step);}));
  await page.evaluate(()=>{TT.renderer.setAnimationLoop(null);idleProbe.setup();TT.setWorldTime(.4);TT.player.rotation.y=0;idleProbe.camera();});
  await page.addStyleTag({content:'body > :not(canvas):not(script):not(style):not(link){visibility:hidden!important}'});
  async function shot(name,seconds) {
    const state=await page.evaluate(seconds=>{idleProbe.step(seconds);idleProbe.camera();idleProbe.frame();return idleProbe.marineIdle?.state;},seconds);
    await page.waitForTimeout(250);await page.screenshot({path:path.join(output,name+'.png')});console.log(name,JSON.stringify(state));
  }
  await shot(before?'before':'ready',.1);
  let checks;
  if(!before){
    await shot('bored',8);
    await shot('pack',18.8);
    await shot('lighting',1.7);
    await shot('smoking',2.4);
    await shot('exhaling',1.5);
    checks=await page.evaluate(()=>{
      const p=idleProbe, c=p.marineIdle, require=(v,m)=>{if(!v)throw Error(m);};
      require(c.state.lit&&c.state.phase==='smoking','smoking starts'); require(!p.weapons().main&&!p.weapons().offhand,'both weapons stowed');
      const timer=c.state.time;p.pause(true);p.updateMarineIdle(20);require(c.state.time===timer,'pause freezes cigarette');p.pause(false);
      p.step(59.95-c.state.time);require(c.state.number===1&&c.state.phase==='smoking','first cigarette burns for 60 seconds');
      p.step(.1);require(c.state.phase==='pack'&&!c.state.lit,'spent cigarette replaced');
      p.step(4);require(c.state.number===2&&c.state.lit,'second cigarette lights');
      const count=p.groundFires.length;p.moving(true);p.step(.05);p.moving(false);
      require(c.state.quiet===0&&!c.props.root.visible,'movement cancels immediately');
      require(p.weapons().main,'weapon restored on same frame');require(c.drops.some(d=>d.lit&&!d.landed),'lit cigarette falls');
      p.step(1.5);require(p.groundFires.length===count+1,'one landing fire');
      const f=p.groundFires.at(-1);require(f.cigarette&&f.mesh.scale.x===.16,'tiny flame');
      require(p.scorchDecals.length>0,'char mark exists');
      const hp=TT.getHp();TT.player.position.set(f.x,f.y,f.z);p.updateGroundFires(.1);
      require(TT.getHp()===hp,'tiny cigarette fire does not damage marine');
      TT.player.position.x += .8; // clear the burn spot for the two ground-effect captures
      return {fireSize:f.mesh.scale.x,scorches:p.scorchDecals.length,pass:'timing, pause, repeat, movement, falling cigarette, weapon recovery, tiny harmless fire and char'};
    });
    await shot('dropped-fire',.1);
    await page.evaluate(()=>{idleProbe.step(4);if(idleProbe.groundFires.some(f=>f.cigarette))throw Error('tiny fire did not expire');});
    await shot('char-mark',.1);
    await page.evaluate(()=>{
      const p=idleProbe;let location;
      for(let x=10;x<40&&!location;x++)for(let z=10;z<40&&!location;z++)if(p.fireCanSpreadTo(x,z))location={x,z};
      if(!location)throw Error('no normal fire test site');
      const fire=p.spawnGroundFire(location.x,location.z);
      if(!fire||fire.cigarette||fire.mesh.scale.x!==1)throw Error('normal fire pool did not recover full size');
      TT.player.position.set(fire.x,fire.y,fire.z);const hp=TT.getHp();p.updateGroundFires(.1);
      if(TT.getHp()>=hp)throw Error('normal fire stopped dealing damage');
      p.clearGroundFires();
    });
    console.log('PASS ordinary fire recovers full size from shared pool and still damages player');
    await page.evaluate(()=>{idleProbe.marineIdle.reset();if(idleProbe.marineIdle.drops.length)throw Error('reset left cigarette props');});
    console.log('PASS '+checks.pass);
  }
  assert.deepEqual(errors,[]);
  const result={readyMs,bench,checks,errors,backend:await page.evaluate(()=>TT.getRendererBackend())};
  fs.writeFileSync(path.join(output,before?'before.json':'after.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
} finally { if(browser)await browser.close();server.close(); }
