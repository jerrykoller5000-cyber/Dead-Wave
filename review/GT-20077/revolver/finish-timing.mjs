import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { launch } from '../../../tools/cdp.mjs';
import { serve } from '../../../tools/serve.mjs';
import { save } from '../../GT-20076/save.mjs';

assert(process.env.DW_GAME_TEST_TOKEN);
const server = await serve(fileURLToPath(new URL('../../../', import.meta.url)), 0);
const browser = await launch({ headless: false });
try {
  const page = await browser.newPage({ width: 1280, height: 720 });
  await page.goto(server.origin + '/index.html?debug=1');
  assert(await page.waitFor('window.TT && DWLoad.snapshot().state==="ready"'));
  await page.evaluate('DWOpening.dismissForTesting()');
  assert(await page.waitFor('!DWOpening.active'));
  await page.evaluate("TT.applyGraphicsPreset('high'); document.getElementById('playerName').value='Finish'; document.getElementById('modeTraining').click()");
  assert(await page.waitFor('TT.trainingDbg.state().active && !document.getElementById("trainingBlackout")?.classList.contains("on")'));
  await page.evaluate("TT.grantAllWeapons(); TT.setViewFirstDbg(true); if(TT.isUnarmed()) TT.toggleHolster(); TT.setWeapon(TT.WEAPON_ORDER.indexOf('revolver'))");
  assert(await page.waitFor('TT.viewmodelDbg().info.key==="revolver" && TT.viewmodelDbg().info.raise>.98 && TT.fpDbg().w>.98'));
  const blocks = await page.evaluate(`(async () => {
    // Old and revised factory material constants. Model, session, camera and preset stay fixed.
    const variants = new Map([
      [0x404955, [0x2c323c, .8, .27]], [0x62584d, [0x4a4744, .82, .32]],
      [0x76492f, [0x855335, 0, .55]], [0x573922, [0x65402b, 0, .70]]
    ]);
    const surfaces = new Map(), found = new Set();
    for (const root of [TT.weaponMeshes.revolver, TT.viewmodelDbg().gun.root]) {
      root.traverse(o => {
        if (!o.isMesh || !o.material?.color || surfaces.has(o.material)) return;
        const m = o.material, hex = m.color.getHex();
        if (!variants.has(hex)) return;
        surfaces.set(m, {before:variants.get(hex), after:[hex,m.metalness,m.roughness], wood:m.map});
        found.add(hex);
      });
    }
    if (found.size !== 4) throw Error('Expected four factory materials, found ' + found.size);
    const frame = () => new Promise(requestAnimationFrame);
    const rows = [];
    for (const phase of ['before','after','after','before','after','before','before','after']) {
      for (const [m, v] of surfaces) {
        const [color, metal, rough] = v[phase];
        m.color.setHex(color); m.metalness = metal; m.roughness = rough;
        if (v.wood) {
          const revised = phase === 'after';
          v.wood.repeat.set(revised ? 6.8 : 3, revised ? 3.1 : 1.5);
          v.wood.offset.set(revised ? .21 : 0, revised ? .18 : 0);
          v.wood.rotation = revised ? -.12 : 0;
        }
      }
      for (let i = 0; i < 30; i++) await frame();
      const times = [];
      let last = await frame();
      for (let i = 0; i < 240; i++) {
        const now = await frame();
        times.push(now - last); last = now;
      }
      rows.push({phase,times});
    }
    return rows;
  })()`, 120000);
  const summary = {};
  for (const phase of ['before', 'after']) {
    const times = blocks.filter(b => b.phase === phase).flatMap(b => b.times);
    assert.equal(times.length, 960);
    const sorted = [...times].sort((a, b) => a - b);
    summary[phase] = { frames: times.length, meanFps: 1000 * times.length / times.reduce((sum, t) => sum + t),
      p99FrameMs: sorted[Math.ceil(.99 * times.length) - 1] };
  }
  assert.deepEqual(page.errors, []);
  await save(new URL('finish-timing.json', import.meta.url), JSON.stringify({summary, blocks}, null, 2));
  console.log(JSON.stringify(summary));
} finally {
  await browser.close();
  await server.close();
}
