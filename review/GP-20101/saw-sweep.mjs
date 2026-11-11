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
  await page.evaluate(`(()=>{document.getElementById('playerName').value='GP-20101-sweep';document.getElementById('modeTraining').click()})()`);
  assert(await page.waitFor('TT.trainingDbg.state().active', { timeout: 90000 }));
  assert(await page.waitFor('!document.getElementById("trainingBlackout")?.classList.contains("on")', { timeout: 20000 }));
  const proof = await page.evaluate(`(()=>{
    const T=TT,tr=T.trainingDbg.state(),d=tr.dummy,tg=tr.tg,spot=d.model.group.position;
    T.AudioSys.setMuted(true);T.grantAllWeapons();T.setWeapon(T.WEAPON_ORDER.indexOf('chainsaw'));T.setUnarmedDbg(false);T.setViewFirstDbg(false);
    const contacts=[],samples=[];
    for(let i=0;i<8;i++) for(let j=0;j<16;j++){
      const around=i*Math.PI/4,yaw=j*Math.PI/8;
      T.player.position.set(spot.x+Math.sin(around)*.76,tg.floorY,spot.z+Math.cos(around)*.76);T.setVelDbg(0,0);
      T.aimPointDbg(spot.x,tg.floorY+1.3,spot.z);T.setAimYawDbg(yaw);
      for(let k=0;k<5;k++)T.stepFrame(.016);
      const blade={...T.sawDbg.blade()},hit=d.trace({x:blade.ax,y:blade.ay,z:blade.az},{x:blade.bx,y:blade.by,z:blade.bz},blade.r);
      const row={around,yaw,player:{x:T.player.position.x,z:T.player.position.z},blade,point:hit?.point||null};
      if(hit)contacts.push(row);if(j%4===0)samples.push(row);
    }
    return {contacts,samples};
  })()`);
  proof.errors = page.errors;
  fs.writeFileSync(path.join(out, 'saw-sweep.json'), JSON.stringify(proof, null, 2) + '\n');
  assert.deepEqual(proof.errors, []);
  console.log(JSON.stringify({contacts:proof.contacts.length,examples:proof.contacts.slice(0,5)}));
} finally { await browser.close(); await server.close(); }
