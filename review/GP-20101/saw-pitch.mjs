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
  await page.evaluate(`(()=>{document.getElementById('playerName').value='GP-20101-pitch';document.getElementById('modeTraining').click()})()`);
  assert(await page.waitFor('TT.trainingDbg.state().active', { timeout: 90000 }));
  assert(await page.waitFor('!document.getElementById("trainingBlackout")?.classList.contains("on")', { timeout: 20000 }));
  const proof = await page.evaluate(`(()=>{
    const T=TT,tr=T.trainingDbg.state(),d=tr.dummy,tg=tr.tg,spot=d.model.group.position;
    T.AudioSys.setMuted(true);T.grantAllWeapons();T.setWeapon(T.WEAPON_ORDER.indexOf('chainsaw'));T.setUnarmedDbg(false);
    const tries=[];
    for(const first of [false,true]){
      T.setViewFirstDbg(first);
      for(const side of [-1,1]) for(const pitch of [0]) for(const dx of [0]){
        d.reset();T.player.position.set(spot.x+dx,tg.floorY,spot.z+side*.75);T.setVelDbg(0,0);
        T.setOtsAimDbg(side>0?Math.PI:0,pitch);
        T.aimPointDbg(spot.x,tg.floorY+1.45,spot.z);T.setAimYawDbg(side>0?Math.PI:0);
        T.setMouseFireDbg(true);
        for(let i=0;i<35;i++)T.stepFrame(.016);
        const blade={...T.sawDbg.blade()},direct=d.trace({x:blade.ax,y:blade.ay,z:blade.az},{x:blade.bx,y:blade.by,z:blade.bz},blade.r);
        tries.push({first,active:T.sawDbg.first(),fp:T.fpDbg(),vm:!!T.viewmodelDbg(),vmShow:!!T.viewmodelDbg()?.showing?.('chainsaw'),flags:T.vaultDbg.flags(),side,pitch,dx,blade,direct:direct?.point||null,hits:d.state().byKind.chainsaw});
        T.setMouseFireDbg(false);
      }
    }
    return {spot:{x:spot.x,y:spot.y,z:spot.z},tries};
  })()`);
  proof.errors = page.errors;
  fs.writeFileSync(path.join(out, 'saw-fire.json'), JSON.stringify(proof, null, 2) + '\n');
  assert.deepEqual(proof.errors, []);
  console.log(JSON.stringify(proof.tries.map(t=>({first:t.first,active:t.active,vm:t.vm,vmShow:t.vmShow,flags:t.flags,hits:t.hits,blade:t.blade}))));
} finally { await browser.close(); await server.close(); }
