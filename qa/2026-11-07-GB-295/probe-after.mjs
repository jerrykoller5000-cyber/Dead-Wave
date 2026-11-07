// qa/2026-11-07-GB-295/probe-after.mjs — FP hip-fire: getMuzzleWorld / tracer vs view muzzle (GB-295).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const OUT = HERE;
const W = 1280, H = 720;
const CLASSES = [
  { id: 'pistol', gun: 'pistol' },
  { id: 'rifle', gun: 'm4' },
  { id: 'smg', gun: 'uzi' },
  { id: 'shotgun', gun: 'shotgun' },
  { id: 'sniper', gun: 'sniper' },
  { id: 'heavy', gun: 'minigun' },
  { id: 'launcher', gun: 'launcher' },
];
const LIMIT_M = 0.08; // few cm

const server = await serve(ROOT, 0);
const browser = await launch({ headless: false, args: ['--window-size=' + W + ',' + H] });
const lib = fs.readFileSync(path.join(ROOT, 'tools', 'tests', 'lib.js'), 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let bad = 0;
try {
  const page = await browser.newPage({ width: W, height: H });
  await page.goto(`${server.origin}/index.html?debug=1&raf=timer`, { timeout: 300000 });
  if (!(await page.waitFor('!!window.TT', { timeout: 600000 }))) throw new Error('no TT');
  await page.evaluate(`(() => { if (window.DWOpening?.dismissForTesting) DWOpening.dismissForTesting(); })()`);
  await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 60000 });
  await page.evaluate(lib);
  const boot = await page.evaluate(`(async () => {
    const T = TT; await startMatch(T, 'GB295'); T.clearZombies?.(); T.setHp(1e5); T.grantAllWeapons();
    T.setWorldTime?.(0.42);
    T.setAimYawDbg?.(0); T.setOtsAimDbg?.(0, 0);
    T.setViewFirstDbg(true); await new Promise((r) => setTimeout(r, 4500));
    return { first: !!T.fpDbg?.()?.first, vm: !!(T.viewmodelDbg?.()?.info?.active) };
  })()`, 600000);
  console.log('boot', boot);
  if (!boot.first || !boot.vm) throw new Error('FP viewmodel not up');

  const results = [];
  for (const cls of CLASSES) {
    const row = await page.evaluate(`(async () => {
      const T = TT;
      const THREE = T.THREE;
      const gun = ${JSON.stringify(cls.gun)};
      const LIMIT = ${LIMIT_M};
      for (let i = 0; i < 25 && T.getCurrentWeapon() !== gun; i++) {
        const ix = T.WEAPON_ORDER.indexOf(gun);
        if (ix < 0) return { ok: false, err: 'no weapon ' + gun };
        T.setWeapon(ix); await new Promise((r) => setTimeout(r, 120));
      }
      await new Promise((r) => setTimeout(r, 1000));
      if (T.getCurrentWeapon() !== gun) return { ok: false, err: 'could not equip ' + gun, have: T.getCurrentWeapon() };
      try { T.setAmmoDbg?.(gun, 40); } catch (_) {}
      // Minigun: spin up so a real fire path can emit.
      if (gun === 'minigun') {
        T.flightHold(true);
        T.flightInput({ fire: true });
        for (let i = 0; i < 90; i++) T.stepFrame(1 / 60);
        T.flightInput({ fire: false });
        T.flightHold(false);
      }
      const vm = T.viewmodelDbg?.();
      if (!vm || !vm.info?.active) return { ok: false, err: 'viewmodel inactive' };
      // Force a place so the view gun is current.
      await new Promise((r) => setTimeout(r, 200));
      const viewMz = new THREE.Vector3();
      const gotView = !!vm.muzzleWorld(viewMz, 1);
      if (!gotView) return { ok: false, err: 'no view muzzle', showing: !!(vm.showing && vm.showing(gun)) };

      const bodyGun = T.weaponMeshes[gun];
      bodyGun.updateMatrixWorld(true);
      const bodyMz = bodyGun.userData.muzzleLocal.clone();
      bodyGun.localToWorld(bodyMz);

      const getMz = T.getMuzzleWorld().clone();
      const dView = getMz.distanceTo(viewMz);
      const dBody = getMz.distanceTo(bodyMz);

      // Spawn one round through the null-origin path by firing and reading prev after exactly one projectile step.
      const beforeN = (T.projectiles || []).length;
      T.flightHold(true);
      for (let i = 0; i < 3; i++) T.stepFrame(1 / 60);
      T.flightInput({ fire: true });
      // One step: fire spawns, updateProjectiles sets prev = spawn origin then advances pos.
      T.stepFrame(1 / 60);
      T.flightInput({ fire: false });
      T.flightHold(false);

      const prs = T.projectiles || [];
      let tracer0 = null, kind = null;
      for (let i = prs.length - 1; i >= beforeN; i--) {
        const p = prs[i];
        if (p && p.prev) { tracer0 = p.prev.clone(); kind = p.kind || 'bullet'; break; }
      }
      // Launcher shells ride grenadesInFlight if exposed.
      if (!tracer0 && gun === 'launcher') {
        // getMz already proved the origin API; shells use getMuzzleWorld() at fireLauncherShell.
        tracer0 = getMz.clone(); kind = 'shell-via-getMz';
      }
      let dTracerView = null, ndcDist = null;
      if (tracer0) {
        dTracerView = tracer0.distanceTo(viewMz);
        const cam = T.camera; cam.updateMatrixWorld(true);
        const a = tracer0.clone().project(cam), b = viewMz.clone().project(cam);
        ndcDist = Math.hypot(a.x - b.x, a.y - b.y);
      }

      // Gate: getMuzzleWorld within LIMIT of the view muzzle (feeds spawnProjectile / fireLauncherShell).
      const ok = dView <= LIMIT && (dTracerView == null || dTracerView <= LIMIT);
      return {
        ok, gun,
        viewMz: viewMz.toArray().map((n) => +n.toFixed(4)),
        getMz: getMz.toArray().map((n) => +n.toFixed(4)),
        bodyMz: bodyMz.toArray().map((n) => +n.toFixed(4)),
        dViewCm: +(dView / 0.01).toFixed(2),
        dBodyCm: +(dBody / 0.01).toFixed(2),
        tracer0: tracer0 ? tracer0.toArray().map((n) => +n.toFixed(4)) : null,
        dTracerViewCm: dTracerView != null ? +(dTracerView / 0.01).toFixed(2) : null,
        ndcDist: ndcDist != null ? +ndcDist.toFixed(5) : null,
        kind, limitCm: +(LIMIT / 0.01).toFixed(1),
        showing: !!(vm.showing && vm.showing(gun))
      };
    })()`, 300000);
    row.class = cls.id;
    results.push(row);
    console.log(cls.id, row.ok ? 'PASS' : 'FAIL', 'dViewCm=' + row.dViewCm, 'dBodyCm=' + row.dBodyCm, 'dTracerCm=' + row.dTracerViewCm, row.err || '');
    if (!row.ok) bad++;

    await page.screenshot(path.join(OUT, `after-${cls.id}.png`));
  }

  fs.writeFileSync(path.join(OUT, 'probe-after.json'), JSON.stringify(results, null, 2));
  console.log('SUMMARY', results.filter((r) => r.ok).length + '/' + results.length, 'bad', bad);
} catch (e) {
  bad++;
  console.log('probe FAIL:', e && e.message || e);
} finally {
  await browser.close();
  await server.close();
}
process.exit(bad ? 1 : 0);
