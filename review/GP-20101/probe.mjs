import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) throw Error('Use crew game-test slot');
const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const out = path.join(root, 'review/GP-20101');
fs.mkdirSync(out, { recursive: true });
const server = await serve(root, 0);
const browser = await launch({ headless: false, args: ['--window-size=1280,720'] });
const proof = {};
try {
  const page = await browser.newPage({ width: 1280, height: 720 });
  await page.goto(`${server.origin}/index.html?debug=1&raf=timer`);
  assert(await page.waitFor('!!window.TT && window.DWLoad?.snapshot().state==="ready"', { timeout: 90000 }));
  await page.evaluate('DWOpening.dismissForTesting()');
  assert(await page.waitFor('document.getElementById("opening").hidden', { timeout: 15000 }));
  await page.evaluate(`(()=>{document.getElementById('playerName').value='GP-20101';document.getElementById('modeTraining').click()})()`);
  assert(await page.waitFor('TT.trainingDbg.state().active', { timeout: 90000 }));
  assert(await page.waitFor('!document.getElementById("trainingBlackout")?.classList.contains("on")', { timeout: 20000 }));
  proof.contact = await page.evaluate(`(()=>{
    const T=TT,tr=T.trainingDbg.state(),d=tr.dummy,tg=tr.tg,spot=d.model.group.position;
    const calls=[],raw=d.strike;d.strike=(hit)=>{const r=raw(hit);calls.push({kind:hit.kind,point:hit.point,normal:hit.normal,result:r});return r;};
    T.AudioSys.setMuted(true);
    T.player.position.set(spot.x,tg.floorY,spot.z+1.05);T.setVelDbg(0,0);
    const step=(kind,m,k)=>{T.setMacheteOwned(m);T.setKatanaOwned(k);T.setAimYawDbg(Math.PI);T.setKnifeCd(0);T.knifeAttack();return{kind,state:d.state()};};
    const blades=[step('knife',false,false),step('machete',true,false),step('katana',true,true)];
    T.grantAllWeapons();T.setWeapon(T.WEAPON_ORDER.indexOf('chainsaw'));
    const sawAttempts=[];
    for(const a of [{x:spot.x,z:spot.z+1.05,yaw:Math.PI},{x:spot.x-.2,z:spot.z-.9,yaw:0}]){
      T.player.position.set(a.x,tg.floorY,a.z);T.setVelDbg(0,0);
      T.aimPointDbg(spot.x,tg.floorY+1.2,spot.z);T.setAimYawDbg(a.yaw);
      for(let i=0;i<20;i++)T.stepFrame(.016);
      T.setAimYawDbg(a.yaw);
      const blade=T.sawDbg.blade(),prior=d.state().byKind.chainsaw;
      for(let i=0;i<3;i++)T.sawDbg.tick();
      sawAttempts.push({a,blade,hits:d.state().byKind.chainsaw-prior});
      if(d.state().byKind.chainsaw>0)break;
    }
    const saw=d.state();
    const bullet={prev:{x:spot.x,y:tg.floorY+1.25,z:spot.z+3},pos:{x:spot.x,y:tg.floorY+1.25,z:spot.z-1},dir:{x:0,y:0,z:-1},damage:20,hit:false};
    const bulletDone=T.trainingDbg.round(bullet);
    const after=d.state();d.strike=raw;
    return {spot:{x:spot.x,y:spot.y,z:spot.z},solid:d.solid,blades,sawAttempts,saw,bulletDone,bulletHit:bullet.hit,after,calls};
  })()`);
  const cam = { x: -6.4, y: -197.3, z: -641.1, tx: -5, ty: -198.9, tz: -642.8, fov: 52 };
  await page.evaluate(`((cam)=>{const T=TT,d=T.trainingDbg.state().dummy;T.player.position.set(-2,d.model.group.position.y,-646);T.setVelDbg(0,0);T.setWorldTime(.5);d.model.group.visible=false;T.setShotView(cam);for(let i=0;i<5;i++)T.stepFrame(.016)})(${JSON.stringify(cam)})`);
  await page.screenshot(path.join(out, 'before-noon.png'));
  for (const [name, time] of [['noon', .5], ['overcast', .43], ['dusk', .74], ['night', .02]]) {
    await page.evaluate(`((cam,time)=>{const T=TT,d=T.trainingDbg.state().dummy;d.model.group.visible=true;T.setWorldTime(time);T.setShotView(cam);for(let i=0;i<5;i++)T.stepFrame(.016)})(${JSON.stringify(cam)},${time})`);
    await page.screenshot(path.join(out, `after-${name}.png`));
  }
  proof.counter = await page.evaluate(`(()=>{const T=TT;T.trainingDbg.act('rangeConsole');const panel=document.getElementById('rangeDummyCounter');return {before:panel?.textContent||'',visible:!!panel}})()`);
  await page.screenshot(path.join(out, 'after-counter-hits.png'));
  proof.counter.after = await page.evaluate(`(()=>{const d=TT.trainingDbg.state().dummy;document.querySelector('#rangeDummyCounter [data-dummy-reset]')?.click();return d.state()})()`);
  await page.screenshot(path.join(out, 'after-counter-reset.png'));
  proof.errors = page.errors;
  fs.writeFileSync(path.join(out, 'probe.json'), JSON.stringify(proof, null, 2) + '\n');
  assert.deepEqual(page.errors, []);
  console.log(JSON.stringify({calls:proof.contact.calls.map(c=>c.kind),blades:proof.contact.blades.map(b=>b.state.byKind),saw:proof.contact.saw.byKind,bullet:proof.contact.bulletDone,after:proof.contact.after}));
} finally {
  await browser.close();
  await server.close();
}
