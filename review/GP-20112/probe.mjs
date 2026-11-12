import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

if (!process.env.DW_GAME_TEST_TOKEN) throw Error('Run through the crew game-test slot');
const root = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const out = path.join(root, 'review/GP-20112');
const source = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const label = process.argv.includes('--after') ? 'after' : 'before';
const visibilityCall = 'trainingBlastHits(training.tg, blastLookFrom, AOE)';
assert(source.includes(visibilityCall), 'shell visibility fix present');
const pageSource = label === 'after' ? source : source.replace(visibilityCall, 'trainingBlastHits(training.tg, g.pos, AOE)');
const needle = '      const baseDmg = (g.damage != null) ? g.damage : 55 * dmgMult();';
assert(pageSource.includes(needle), 'blast injection point present');
const hook = `
      if (window.__gp20112Blasts && training.active && training.tg) {
        const tg = training.tg;
        const targets = tg.targets.map((t, i) => {
          const b = t.box, p = { x: Math.max(b.minX, Math.min(g.pos.x, b.maxX)), y: Math.max(b.minY, Math.min(g.pos.y, b.maxY)), z: Math.max(b.minZ, Math.min(g.pos.z, b.maxZ)) };
          const trace = traceTraining(tg, g.pos, p);
          return { i, state: t.state, box: { ...b }, point: p, onPlate: tg.onPlate(i, p), trace: trace ? { target: trace.solid.target, floor: !!trace.solid.floor, wall: !!trace.solid.wall, solid: { minX:trace.solid.minX,maxX:trace.solid.maxX,minY:trace.solid.minY,maxY:trace.solid.maxY,minZ:trace.solid.minZ,maxZ:trace.solid.maxZ }, t: trace.t, point: trace.point } : null };
        });
        window.__gp20112Blasts.push({ isShell: !!g.isShell, originWeapon:g.originWeapon, handThrown:!!g.handThrown, pos: { x:g.pos.x, y:g.pos.y, z:g.pos.z }, prev: g.prev && {x:g.prev.x,y:g.prev.y,z:g.prev.z}, radius: AOE, hits: trainingBlastHits(tg, g.pos, AOE).map(h => h.index), prevHits: g.prev ? trainingBlastHits(tg, g.prev, AOE).map(h => h.index) : [], targets });
      }
`;
const instrumented = pageSource.replace(needle, needle + hook);
const server = await serve(root, 0);
const browser = await launch({ headless: false, args: [
  '--window-position=40,40', '--window-size=1280,720', '--disable-background-timer-throttling'
] });
try {
  const page = await browser.newPage({ width: 1280, height: 720 });
  const captureScene = async file => {
    for (let attempt = 0; attempt < 12; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 500));
      await page.screenshot(file);
      if (fs.statSync(file).size > 100000) return;
    }
    throw Error(`Training scene stayed blank: ${file}`);
  };
  page.conn.onEvent(msg => {
    if (msg.sessionId !== page.sessionId || msg.method !== 'Fetch.requestPaused') return;
    page.send('Fetch.fulfillRequest', { requestId: msg.params.requestId, responseCode: 200,
      responseHeaders: [{ name: 'Content-Type', value: 'text/html; charset=utf-8' }],
      body: Buffer.from(instrumented).toString('base64') }).catch(e => { throw e; });
  });
  await page.send('Fetch.enable', { patterns: [{ urlPattern: '*index.html*', requestStage: 'Request' }] });
  await page.goto(`${server.origin}/index.html?debug=1&gp20112=probe`, { timeout: 120000 });
  assert(await page.waitFor('!!window.TT && window.DWLoad?.snapshot().state==="ready"', { timeout: 120000 }), 'game ready');
  await page.evaluate(`(() => {
    DWOpening.dismissForTesting();
    document.getElementById('playerName').value = 'GP20112';
    document.getElementById('modeTraining').click();
  })()`);
  assert(await page.waitFor('document.getElementById("opening").hidden', { timeout: 30000 }), 'title overlay hidden');
  assert(await page.waitFor('TT.trainingDbg.state().active && !document.getElementById("trainingBlackout")?.classList.contains("on")', { timeout: 90000 }), 'Training visible');
  await page.evaluate(`(() => {
    window.__gp20112Blasts = [];
    const T=TT, tg=T.trainingDbg.tg(), W=T.WEAPON_ORDER, t=tg.targets[1], b=t.box;
    const cx=(b.minX+b.maxX)/2, face=b.minZ;
    window.__gp20112Aim = { cx, face };
    T.grantAllWeapons(); T.setUnarmedDbg(false); T.setWeapon(W.indexOf('launcher')); T.setViewFirstDbg(false);
    const stand=()=>{T.player.position.set(cx,tg.origin.y,face-6); T.setHp(1e6); T.setAimYawDbg(0); T.setAimTargetDbg(cx,face);};
    stand(); window.__gp20112Stand = setInterval(stand,25);
    window.__gp20112ShotView={x:cx+1.3,y:tg.origin.y+2.2,z:face-9.5,tx:cx,ty:tg.origin.y+1.2,tz:face-4.5,fov:60};
    T.setShotView(window.__gp20112ShotView);
  })()`);
  await new Promise(resolve => setTimeout(resolve, 12000));
  const before = await page.evaluate(`({ target: TT.trainingDbg.tg().targets[1].state, pos: { ...TT.player.position } })`);
  await captureScene(path.join(out, `${label}-before-shot.png`));
  await page.evaluate('TT.setShotView(null); TT.grenadesInFlight.splice(0); window.__gp20112Blasts.length = 0; TT.setMouseFireDbg(true)');
  assert(await page.waitFor('window.__gp20112Blasts?.some(b => b.isShell && Math.abs(b.pos.x - window.__gp20112Aim.cx) < 1 && Math.abs(b.pos.z - window.__gp20112Aim.face) < 1)', { timeout: 20000 }), 'launcher shell reached the target stand');
  await page.evaluate('TT.setMouseFireDbg(false)');
  await page.evaluate('clearInterval(window.__gp20112Stand)');
  await new Promise(resolve => setTimeout(resolve, 1300));
  await page.evaluate('TT.setShotView(window.__gp20112ShotView)');
  const after = await page.evaluate(`({ target: TT.trainingDbg.tg().targets[1].state, blasts: window.__gp20112Blasts })`);
  await captureScene(path.join(out, `${label}-after-shot.png`));
  assert.equal(page.errors.length, 0, 'page errors');
  fs.writeFileSync(path.join(out, `probe-${label}.json`), JSON.stringify({ before, after, pageErrors: page.errors }, null, 2) + '\n');
  console.log(JSON.stringify({ before, target: after.target, blasts: after.blasts.map(b => ({pos:b.pos,hits:b.hits,prevHits:b.prevHits,isShell:b.isShell,originWeapon:b.originWeapon,handThrown:b.handThrown})), pageErrors: page.errors }));
} finally {
  await browser.close();
  await server.close();
}
