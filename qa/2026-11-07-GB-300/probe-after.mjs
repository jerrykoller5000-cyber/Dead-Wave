// qa/2026-11-07-GB-300/probe-after.mjs — akimbo revolver cylinders after GB-300 (FP).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../../tools/serve.mjs';
import { launch } from '../../tools/cdp.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const OUT = HERE;
const W = 1280, H = 720;
const server = await serve(ROOT, 0);
const browser = await launch({ headless: false, args: ['--window-size=' + W + ',' + H] });
const lib = fs.readFileSync(path.join(ROOT, 'tools', 'tests', 'lib.js'), 'utf8');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
try {
  const page = await browser.newPage({ width: W, height: H });
  await page.goto(`${server.origin}/index.html?debug=1&raf=timer`, { timeout: 300000 });
  if (!(await page.waitFor('!!window.TT', { timeout: 600000 }))) throw new Error('no TT');
  await page.evaluate(`(() => { if (window.DWOpening?.dismissForTesting) DWOpening.dismissForTesting(); })()`);
  await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 60000 });
  await page.evaluate(lib);
  const setup = await page.evaluate(`(async () => {
    const T = TT; await startMatch(T, 'GB300a'); T.clearZombies?.(); T.setHp(1e5); T.grantAllWeapons();
    T.setWorldTime?.(0.42);
    for (let i = 0; i < 20 && T.getCurrentWeapon() !== 'revolver'; i++) {
      T.setWeapon(T.WEAPON_ORDER.indexOf('revolver')); await new Promise((r) => setTimeout(r, 150));
    }
    await new Promise((r) => setTimeout(r, 1800));
    const on = !!T.offhandMeshes.revolver && T.offhandMeshes.revolver.visible;
    if (!on) { T.toggleDualWieldDbg(); await new Promise((r) => setTimeout(r, 1200)); }
    T.setAimYawDbg?.(0); T.setOtsAimDbg?.(0, 0);
    T.setViewFirstDbg(true); await new Promise((r) => setTimeout(r, 4500));
    return {
      w: T.getCurrentWeapon(),
      aki: !!T.akimboOn?.(),
      offVis: !!(T.offhandMeshes.revolver && T.offhandMeshes.revolver.visible),
      vm: !!(T.viewmodelDbg?.()?.info?.active),
      akiVm: !!(T.viewmodelDbg?.()?.info?.akimbo),
      pairMeta: !!(T.weaponMeshes.revolver.userData.pairReload)
    };
  })()`, 600000);
  console.log('setup', setup);
  if (!setup.offVis) throw new Error('akimbo not on');

  const samples = await page.evaluate(`(async () => {
    const T = TT;
    const right = T.weaponMeshes.revolver, left = T.offhandMeshes.revolver;
    const baseR = right.userData.baseCylinderPos.clone();
    const baseL = left.userData.baseCylinderPos.clone();
    T.setMagazinesDbg?.('revolver', 2, [4, 4]);
    T.startReload();
    const out = [];
    const beats = [0.08, 0.18, 0.28, 0.40, 0.52, 0.62, 0.72, 0.85, 0.95];
    for (const want of beats) {
      const t0 = Date.now();
      while (Date.now() - t0 < 25000) {
        const r = T.getReloadDbg();
        if (!T.isReloading()) break;
        if ((1 - r.timer / r.anim) >= want) break;
        await new Promise((q) => setTimeout(q, 8));
      }
      if (!T.isReloading() && want < 0.9) break;
      // force a frame so view sync runs
      await new Promise((q) => setTimeout(q, 30));
      right.updateMatrixWorld(true); left.updateMatrixWorld(true);
      const dR = right.userData.cylinder.position.distanceTo(baseR);
      const dL = left.userData.cylinder.position.distanceTo(baseL);
      const v = T.viewmodelDbg?.();
      let dVR = null, dVL = null;
      if (v && v.gun) {
        const c1 = v.gun.cylinder || v.gun.mag;
        if (c1 && v.gun.magBase) dVR = c1.position.distanceTo(v.gun.magBase.pos);
      }
      if (v && v.gun2) {
        const c2 = v.gun2.cylinder || v.gun2.mag;
        if (c2 && v.gun2.magBase) dVL = c2.position.distanceTo(v.gun2.magBase.pos);
      }
      const r = T.getReloadDbg();
      out.push({
        u: +(1 - (r?.timer || 0) / (r?.anim || 1)).toFixed(3),
        worldR: +dR.toFixed(4), worldL: +dL.toFixed(4),
        viewR: dVR != null ? +dVR.toFixed(4) : null,
        viewL: dVL != null ? +dVL.toFixed(4) : null,
        aki: !!T.akimboOn?.(), vmAki: !!(v && v.info && v.info.akimbo)
      });
    }
    while (T.isReloading()) await new Promise((q) => setTimeout(q, 40));
    return out;
  })()`, 300000);
  fs.writeFileSync(path.join(OUT, 'probe-after.json'), JSON.stringify(samples, null, 2));
  console.log(JSON.stringify(samples, null, 2));

  for (const [name, at] of [['after-u25', 0.25], ['after-u55', 0.55], ['after-u75', 0.75]]) {
    await page.evaluate(`(async () => {
      const T = TT;
      T.setMagazinesDbg?.('revolver', 1, [4, 4]);
      T.startReload();
      const t0 = Date.now();
      while (Date.now() - t0 < 25000) {
        const r = T.getReloadDbg();
        if (!T.isReloading()) break;
        if ((1 - r.timer / r.anim) >= ${at}) break;
        await new Promise((q) => setTimeout(q, 8));
      }
      if (T.reloadClipDbg?.hold) T.reloadClipDbg.hold(${at});
      return 1;
    })()`, 120000);
    await wait(250);
    await page.screenshot(path.join(OUT, name + '.png'));
    await page.evaluate(`(() => { TT.reloadClipDbg?.hold(null); return 1; })()`);
    await page.evaluate(`(async () => { const T = TT; while (T.isReloading()) await new Promise((q) => setTimeout(q, 40)); return 1; })()`, 120000);
    console.log('shot', name);
  }
} catch (e) { console.log('FAIL', e.stack || e); process.exitCode = 1; }
await browser.close?.(); server.close?.();