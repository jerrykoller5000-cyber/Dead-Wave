import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) throw Error('Run through crew game-test slot');
const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const out = path.join(root, 'review/GP-20100');
const server = await serve(root, 0);
const browser = await launch({ headless: false, args: ['--window-size=1280,720'] });
try {
  const page = await browser.newPage({ width: 1280, height: 720 });
  await page.goto(`${server.origin}/index.html?debug=1&raf=timer`);
  assert(await page.waitFor('!!window.TT && window.DWLoad?.snapshot().state==="ready"', { timeout: 90000 }));
  await page.evaluate('DWOpening.dismissForTesting()');
  assert(await page.waitFor('document.getElementById("opening").hidden', { timeout: 15000 }));
  await page.evaluate(`(()=>{document.getElementById('playerName').value='GP-20100 fire-raised';document.getElementById('modeTraining').click()})()`);
  assert(await page.waitFor('TT.trainingDbg.state().active', { timeout: 90000 }));
  assert(await page.waitFor('!document.getElementById("trainingBlackout")?.classList.contains("on")', { timeout: 20000 }));
  const proof = await page.evaluate(`(()=>{
    const T=TT,y=T.trainingDbg.tg().floorY,V=T.THREE.Vector3;
    T.AudioSys.setMuted(true);T.grantAllWeapons();T.setWeapon(T.WEAPON_ORDER.indexOf('m4'));
    T.setAmmoDbg('m4',30);T.setUnarmedDbg(false);T.setViewFirstDbg(false);T.flightHold(true);
    const b={minX:-1,maxX:1,minY:y,maxY:y+2.2,minZ:-640.42,maxZ:-640.32,wall:true};
    T.trainingDbg.tg().solids.push(b);
    const box=new T.THREE.Mesh(new T.THREE.BoxGeometry(2,2.2,.1),new T.THREE.MeshStandardMaterial({color:0x75818b,roughness:.92}));
    box.position.set(0,y+1.1,-640.37);T.scene.add(box);
    T.setShotView({x:2.2,y:y+1.9,z:-642.1,tx:0,ty:y+1.2,tz:-640.48,fov:42});
    T.player.position.set(0,y,-642);T.setVelDbg(0,0);T.player.rotation.y=0;
    T.setOtsAimDbg(0,0);T.aimPointDbg(0,y+1.3,-637);T.setAimYawDbg(0);
    for(let i=0;i<90;i++)T.stepFrame(.016);
    const far=T.getMuzzleWorld().toArray();
    T.player.position.set(0,y,-640.9);T.setVelDbg(0,0);T.player.rotation.y=0;
    for(let i=0;i<35;i++)T.stepFrame(.016);
    const near=T.getMuzzleWorld().toArray(),shots=[];
    const original=T.projectiles.push;
    T.projectiles.push=function(...args){for(const p of args)shots.push({p,origin:p.pos.toArray(),direction:p.dir.toArray()});return original.apply(this,args);};
    T.setMouseFireDbg(true);
    for(let i=0;i<3;i++)T.stepFrame(.016);
    T.setMouseFireDbg(false);
    T.projectiles.push=original;
    for(let i=0;i<12;i++)T.stepFrame(.016);
    return {floor:y,wall:b,far,near,shots:shots.map(s=>({origin:s.origin,direction:s.direction,hit:s.p.hit,position:s.p.pos.toArray(),alive:T.projectiles.includes(s.p)})),
      targetHits:T.trainingDbg.tg().targets.map(t=>t.hits),dummyHits:T.trainingDbg.state().dummy?.state().hits||0,
      errors:window.__pageErrors||[]};
  })()`);
  proof.pageErrors = page.errors;
  fs.writeFileSync(path.join(out, 'fire-raised.json'), JSON.stringify(proof,null,2)+'\n');
  await page.screenshot(path.join(out, 'fire-raised.png'));
  assert.deepEqual(page.errors, []);
  assert(proof.shots.length > 0, 'held trigger must fire');
  assert(proof.near[2] < proof.wall.minZ, 'pulled muzzle must remain outside wall');
  assert(proof.shots.every(s=>s.origin[2] < proof.wall.minZ && s.hit), 'rounds must start clear and hit the wall');
  assert(proof.targetHits.every(n=>n===0) && proof.dummyHits===0, 'wall must block downrange targets');
  console.log(`PASS GP-20100 raised firing: ${proof.shots.length} shot(s) started clear, hit wall, 0 target/dummy hits, 0 page errors`);
} finally { await browser.close(); await server.close(); }
