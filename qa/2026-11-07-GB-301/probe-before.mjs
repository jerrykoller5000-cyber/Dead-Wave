// qa/2026-11-07-GB-301/probe-before.mjs — sniper bolt before GB-301 (FP + cycle + fire gate).
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
try {
  const page = await browser.newPage({ width: W, height: H });
  await page.goto(`${server.origin}/index.html?debug=1&raf=timer`, { timeout: 300000 });
  if (!(await page.waitFor('!!window.TT', { timeout: 600000 }))) throw new Error('no TT');
  await page.evaluate(`(() => { if (window.DWOpening?.dismissForTesting) DWOpening.dismissForTesting(); })()`);
  await page.waitFor('!window.DWOpening || window.DWOpening.active === false', { timeout: 60000 });
  await page.evaluate(lib);
  const setup = await page.evaluate(`(async () => {
    const T = TT; await startMatch(T, 'GB301b'); T.clearZombies?.(); T.setHp(1e5); T.grantAllWeapons();
    T.setWorldTime?.(0.42);
    for (let i = 0; i < 20 && T.getCurrentWeapon() !== 'sniper'; i++) {
      T.setWeapon(T.WEAPON_ORDER.indexOf('sniper')); await new Promise((r) => setTimeout(r, 150));
    }
    await new Promise((r) => setTimeout(r, 1200));
    T.setAimYawDbg?.(0); T.setOtsAimDbg?.(0, 0);
    T.setViewFirstDbg(true); await new Promise((r) => setTimeout(r, 4500));
    const g = T.weaponMeshes.sniper;
    return {
      w: T.getCurrentWeapon(),
      vm: !!(T.viewmodelDbg?.()?.info?.active),
      hasBolt: !!(g && g.userData.bolt),
      boltParentIsGun: !!(g && g.userData.bolt && g.userData.bolt.parent === g),
      hasGrab: !!(g && g.userData.bolt && g.userData.bolt.userData.gb145Grab),
      vmBolt: !!(T.viewmodelDbg?.()?.gun?.bolt),
      interval: T.WEAPON_STATS?.sniper?.interval ?? null
    };
  })()`, 600000);
  console.log('setup', setup);

  // Fire one shot (not last round) and sample bolt cycle + hand place over ~1s.
  const afterShot = await page.evaluate(`(async () => {
    const T = TT;
    const g = T.weaponMeshes.sniper;
    const base = g.userData.baseBoltPos.clone();
    const baseRotZ = (g.userData.baseBoltRot && g.userData.baseBoltRot.z) || 0;
    // ensure rounds left after shot
    T.setMagazinesDbg?.('sniper', 1, [4]);
    // click fire once
    T.setFireHeldDbg?.(true); await new Promise((r) => setTimeout(r, 40)); T.setFireHeldDbg?.(false);
    await new Promise((r) => setTimeout(r, 30));
    const out = [];
    const t0 = Date.now();
    while (Date.now() - t0 < 1400) {
      g.updateMatrixWorld(true);
      const S = g.userData.boltCycle || {};
      const d = g.userData.bolt.position.distanceTo(base);
      const openZ = Math.abs(((g.userData.bolt.rotation.z || 0) - baseRotZ));
      const v = T.viewmodelDbg?.();
      let vd = null;
      if (v && v.gun && v.gun.bolt && v.gun.boltBase) vd = v.gun.bolt.position.distanceTo(v.gun.boltBase);
      else if (v && v.gun && v.gun.bolt) {
        // no boltBase yet — compare to resting local roughly
        vd = g.userData.bolt.position.distanceTo(base); // world mirror proxy
      }
      out.push({
        t: +((Date.now() - t0) / 1000).toFixed(3),
        active: !!S.active, hand: +(S.hand || 0).toFixed(3), open: +(S.open || 0).toFixed(3), back: +(S.back || 0).toFixed(3),
        worldD: +d.toFixed(4), openZ: +openZ.toFixed(3),
        viewD: vd != null ? +vd.toFixed(4) : null,
        handPlace: v?.info?.handPlace || null,
        ammo: T.getAmmoDbg?.() ?? null,
        cd: T.getFireCooldownDbg?.() ?? null
      });
      await new Promise((r) => setTimeout(r, 50));
    }
    return out;
  })()`, 300000);
  fs.writeFileSync(path.join(OUT, 'probe-before-shot.json'), JSON.stringify({ setup, afterShot }, null, 2));
  console.log('shot samples', afterShot.length, 'active peaks', afterShot.filter(s => s.active).length);

  // Screenshot mid-cycle if any active sample
  const mid = afterShot.find(s => s.active && s.hand > 0.4) || afterShot.find(s => s.active);
  if (mid) {
    // re-fire and capture near hand peak
    await page.evaluate(`(async () => {
      const T = TT;
      T.setMagazinesDbg?.('sniper', 1, [4]);
      T.setFireHeldDbg?.(true); await new Promise((r) => setTimeout(r, 40)); T.setFireHeldDbg?.(false);
      const t0 = Date.now();
      while (Date.now() - t0 < 2000) {
        const S = T.weaponMeshes.sniper.userData.boltCycle || {};
        if (S.active && (S.hand || 0) > 0.5) break;
        await new Promise((r) => setTimeout(r, 16));
      }
      await new Promise((r) => setTimeout(r, 20));
    })()`, 60000);
    const png = await page.screenshot();
    fs.writeFileSync(path.join(OUT, 'before-shot-bolt.png'), png);
  }

  // Reload empty path: sample handPlace during work window
  const reloadSamples = await page.evaluate(`(async () => {
    const T = TT;
    T.setMagazinesDbg?.('sniper', 1, [0]);
    T.startReload();
    const out = [];
    const beats = [0.10, 0.30, 0.50, 0.62, 0.72, 0.82, 0.92];
    for (const want of beats) {
      const t0 = Date.now();
      while (Date.now() - t0 < 25000) {
        const r = T.getReloadDbg();
        if (!T.isReloading()) break;
        if ((1 - r.timer / r.anim) >= want) break;
        await new Promise((q) => setTimeout(q, 8));
      }
      if (!T.isReloading() && want < 0.9) break;
      await new Promise((q) => setTimeout(q, 20));
      const g = T.weaponMeshes.sniper;
      const S = g.userData.boltCycle || {};
      const base = g.userData.baseBoltPos;
      const d = g.userData.bolt.position.distanceTo(base);
      const v = T.viewmodelDbg?.();
      const r = T.getReloadDbg();
      out.push({
        u: +(1 - (r?.timer || 0) / (r?.anim || 1)).toFixed(3),
        handPlace: v?.info?.handPlace || null,
        worldD: +d.toFixed(4),
        boltActive: !!S.active,
        open: +((g.userData.bolt.rotation.z || 0)).toFixed(3)
      });
    }
    while (T.isReloading()) await new Promise((q) => setTimeout(q, 40));
    return out;
  })()`, 300000);
  fs.writeFileSync(path.join(OUT, 'probe-before-reload.json'), JSON.stringify(reloadSamples, null, 2));
  console.log('reload', JSON.stringify(reloadSamples, null, 2));

  // Capture at u~0.75 during reload
  await page.evaluate(`(async () => {
    const T = TT;
    T.setMagazinesDbg?.('sniper', 1, [0]);
    T.startReload();
    const t0 = Date.now();
    while (Date.now() - t0 < 25000) {
      const r = T.getReloadDbg();
      if (!T.isReloading()) break;
      if ((1 - r.timer / r.anim) >= 0.75) break;
      await new Promise((q) => setTimeout(q, 8));
    }
    await new Promise((q) => setTimeout(q, 20));
  })()`, 60000);
  fs.writeFileSync(path.join(OUT, 'before-reload-u75.png'), await page.screenshot());

  console.log('DONE before probe');
} finally {
  try { await browser.close(); } catch {}
  try { server.close(); } catch {}
}
