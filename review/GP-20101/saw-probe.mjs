import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) throw Error('Use crew game-test slot');
const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const out = path.join(root, 'review/GP-20101');
const server = await serve(root, 0);
const browser = await launch({ headless: false, args: ['--window-size=1280,720'] });
try {
  const page = await browser.newPage({ width: 1280, height: 720 });
  await page.goto(`${server.origin}/index.html?debug=1&raf=timer`);
  assert(await page.waitFor('!!window.TT && window.DWLoad?.snapshot().state==="ready"', { timeout: 90000 }));
  await page.evaluate('DWOpening.dismissForTesting()');
  assert(await page.waitFor('document.getElementById("opening").hidden', { timeout: 15000 }));
  await page.evaluate(`(()=>{document.getElementById('playerName').value='GP-20101-saw';document.getElementById('modeTraining').click()})()`);
  assert(await page.waitFor('TT.trainingDbg.state().active', { timeout: 90000 }));
  assert(await page.waitFor('!document.getElementById("trainingBlackout")?.classList.contains("on")', { timeout: 20000 }));
  const proof = await page.evaluate(`(()=>{
    const T=TT,tr=T.trainingDbg.state(),d=tr.dummy,tg=tr.tg,spot=d.model.group.position;
    T.AudioSys.setMuted(true);T.grantAllWeapons();T.setWeapon(T.WEAPON_ORDER.indexOf('chainsaw'));
    const tries=[];
    for(const first of [false,true]){
      T.setViewFirstDbg(first);
      for(const side of [-1,1]) for(const dist of [.95,.8,.75,.7,.66]){
        d.reset();T.player.position.set(spot.x,tg.floorY,spot.z+side*dist);T.setVelDbg(0,0);
        T.aimPointDbg(spot.x,tg.floorY+1.2,spot.z);T.setAimYawDbg(side>0?Math.PI:0);
        for(let i=0;i<15;i++)T.stepFrame(.016);
        T.setAimYawDbg(side>0?Math.PI:0);
        const before={x:T.player.position.x,y:T.player.position.y,z:T.player.position.z};
        const blade={...T.sawDbg.blade()};
        for(let i=0;i<3;i++)T.sawDbg.tick();
        tries.push({first,side,dist,before,blade,hits:d.state().byKind.chainsaw});
      }
    }
    return {spot:{x:spot.x,y:spot.y,z:spot.z},tries};
  })()`);
  proof.errors = page.errors;
  fs.writeFileSync(path.join(out, 'saw-probe.json'), JSON.stringify(proof, null, 2) + '\n');
  assert.deepEqual(proof.errors, []);
  console.log(JSON.stringify(proof.tries.map(t=>({first:t.first,side:t.side,dist:t.dist,hits:t.hits,blade:[t.blade.az,t.blade.bz],player:t.before.z}))));
} finally { await browser.close(); await server.close(); }
