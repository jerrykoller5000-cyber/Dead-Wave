// review/GB-274/filmstrip.mjs - brute get-up on the real mesh and renderer, before (the old engine) and after (GB-274).
//   node tools/... no: queue it:  node crew/crew.mjs slot run grokbot GB-274 --checks "..." -- node review/GB-274/filmstrip.mjs
// Both passes use the same brute.json v3, one blast from behind-above, and body.follow(); update(); apply() each 1/60 s.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

const HERE = path.resolve(path.dirname(fileURLToPath(import.meta.url)));
const ROOT = path.resolve(HERE, '..', '..');
const TESTS = path.join(ROOT, 'tools', 'tests');
const W = 1280, H = 720;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const server = await serve(ROOT, 0);
const browser = await launch({ headless: false, args: ['--disable-features=CalculateNativeWinOcclusion', `--window-size=${W},${H}`] });
const summary = { passes: {}, errors: [] };
try {
  const page = await browser.newPage({ width: W, height: H });
  await page.goto(`${server.origin}/index.html?debug=1&raf=timer`, { timeout: 240000 });
  if (!(await page.waitFor('!!window.TT', { timeout: 300000 }))) throw new Error('no TT');
  await page.evaluate(`(() => { if (window.DWOpening && typeof DWOpening.dismissForTesting === 'function') DWOpening.dismissForTesting(); })()`);
  await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 60000 });
  await page.evaluate(fs.readFileSync(path.join(TESTS, 'lib.js'), 'utf8'));
  await page.evaluate(`(async () => {
    const T = TT; await startMatch(T, 'GB274');
    T.clearZombies && T.clearZombies(); T.setHp(1e5); T.setWorldTime(0.42);
    if (T.weather) { T.weather.rain = 0; T.weather.thunder = 0; }
    document.body.classList.add('test-hide-hud');
    await new Promise((r) => setTimeout(r, 400));
  })()`, 120000);
  const beats = [0.02, 0.2, 0.35, 0.5, 0.6, 0.7, 0.85, 0.98];
  const views = {
    side: { dx: 5.2, dy: 1.3, dz: 0, ty: 1.0, fov: 40 },
    game: { dx: 0, dy: 9.0, dz: 7.5, ty: 0.6, fov: 40 }
  };
  for (const pass of ['before', 'after']) {
    const enginePath = pass === 'before' ? '/review/GB-274/motion.before.js' : '/studio/motion.js';
    const info = await page.evaluate(`(async () => {
      const T = TT; T.clearZombies && T.clearZombies();
      const { rigs } = await import('/studio/rigs.js');
      const Eng = await import('${enginePath}');
      const { loadMotion } = await import('/studio/index.js');
      const preset = loadMotion(await (await fetch('/studio/motion/zombie/brute.json')).json());
      const px = 0, pz = 14, py = T.sampleHeight(px, pz);
      const z = T.spawnZombie(px, pz, 'brute', true, true);
      z.hp = 999999; z.riseT = 0; z.mesh.position.set(px, py, pz); z.mesh.rotation.set(0, 0, 0);
      const inst = rigs.get('zombie').create({ group: z.mesh });
      const body = Eng.createBody(inst, preset, { ground: () => py });
      body.follow();
      body.hit({ at: 'pelvis', dir: [0, 0.3, -1], power: 30, kind: 'blast' });
      let el = 0, g = false;
      while (!g && el < 6) { body.follow(); for (const e of body.update(1 / 60)) if (e[0] === 'getup') g = true; body.apply(); el += 1 / 60; }
      const idx = T.zombies.indexOf(z); if (idx >= 0) T.zombies.splice(idx, 1);
      window.__gb = { z, inst, body, preset, px, py, pz, u: 0 };
      return { enginePath: '${enginePath}', reachedGetup: g, elapsed: +el.toFixed(2), version: preset.version };
    })()`, 180000);
    summary.passes[pass] = { info, beats: [] };
    for (const u of beats) {
      const row = await page.evaluate(`(async () => {
        const THREE = await import('three');
        const B = window.__gb, dur = B.preset.getup.time;
        const steps = Math.max(1, Math.round((${u} - B.u) * dur * 60));
        for (let i = 0; i < steps; i++) { B.body.follow(); B.body.update(1 / 60); B.body.apply(); }
        B.u = ${u};
        B.z.mesh.updateMatrixWorld(true);
        const q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
        const spine = B.inst.R.spine; spine.getWorldQuaternion(q); up.applyQuaternion(q);
        const wp = (n) => { const v = new THREE.Vector3(); B.inst.R[n].getWorldPosition(v); return +(v.y - B.py).toFixed(2); };
        const P = B.body.points();
        return { u: ${u}, state: B.body.state, weight: +B.body.weight.toFixed(2), spineUpY: +up.y.toFixed(2),
          simPelvisY: +(P.pelvis[1] - B.py).toFixed(2), simChestY: +(P.chest[1] - B.py).toFixed(2),
          meshHeadY: wp('head'), meshPelvisY: wp('pelvis') };
      })()`);
      summary.passes[pass].beats.push(row);
      for (const [vn, v] of Object.entries(views)) {
        await page.evaluate(`(async () => { const THREE = await import('three'); const B = window.__gb, V = ${JSON.stringify(v)};
          const pv = new THREE.Vector3(); B.inst.R.pelvis.getWorldPosition(pv); const c = [pv.x, pv.y, pv.z]; TT.setShotView({ x: c[0] + V.dx, y: B.py + V.dy, z: c[2] + V.dz, tx: c[0], ty: B.py + V.ty, tz: c[2], fov: V.fov }); })()`);
        await wait(250);
        await page.screenshot(path.join(HERE, `${pass}-${vn}-${String(Math.round(u * 100)).padStart(3, '0')}.png`));
      }
    }
    await page.evaluate(`(() => { const B = window.__gb; TT.scene.remove(B.z.mesh); window.__gb = null; TT.setShotView(null); })()`);
  }
} catch (e) { summary.errors.push(String(e && e.stack || e)); process.exitCode = 1; }
finally {
  fs.writeFileSync(path.join(HERE, 'filmstrip-summary.json'), JSON.stringify(summary, null, 1));
  await browser.close(); server.close && server.close();
}
console.log(JSON.stringify(summary, null, 1));
