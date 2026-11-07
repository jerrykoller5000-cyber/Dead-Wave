// qa/2026-11-07-GB-301/probe-after.mjs — sniper bolt after GB-301 (FP RH + cadence).
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
    const T = TT; await startMatch(T, 'GB301a'); T.clearZombies?.(); T.setHp(1e5); T.grantAllWeapons();
    T.setWorldTime?.(0.42);
    for (let i = 0; i < 20 && T.getCurrentWeapon() !== 'sniper'; i++) {
      T.setWeapon(T.WEAPON_ORDER.indexOf('sniper')); await new Promise((r) => setTimeout(r, 150));
    }
    await new Promise((r) => setTimeout(r, 1200));
    T.setAimYawDbg?.(0); T.setOtsAimDbg?.(0, 0);
    T.setViewFirstDbg(true); await new Promise((r) => setTimeout(r, 4500));
    const g = T.weaponMeshes.sniper;
    const v = T.viewmodelDbg?.();
    return {
      w: T.getCurrentWeapon(),
      vm: !!(v && v.info && v.info.active),
      hasBolt: !!(g && g.userData.bolt),
      boltWorkMeta: !!(g && g.userData.boltWork),
      vmBolt: !!(v && v.gun && v.gun.bolt),
      vmBoltBase: !!(v && v.gun && v.gun.boltBase)
    };
  })()`, 600000);
  console.log('setup', setup);
  if (!setup.vm) throw new Error('viewmodel not active');
  if (!setup.hasBolt || !setup.vmBolt) throw new Error('bolt part missing');

  // Deterministic: flightHold + stepFrame fire one shot, sample bolt cycle.
  const afterShot = await page.evaluate(`(async () => {
    const T = TT;
    const g = T.weaponMeshes.sniper;
    const base = g.userData.baseBoltPos.clone();
    T.setAmmoDbg?.('sniper', 4);
    T.flightHold(true);
    T.flightInput({ fire: false });
    // settle a few frames
    for (let i = 0; i < 5; i++) T.stepFrame(1 / 60);
    // fire edge: fire true one frame then false, keep stepping
    T.flightInput({ fire: true });
    T.stepFrame(1 / 60);
    T.flightInput({ fire: false });
    const out = [];
    for (let i = 0; i < 70; i++) {
      T.stepFrame(1 / 60);
      g.updateMatrixWorld(true);
      const S = g.userData.boltCycle || {};
      const d = g.userData.bolt.position.distanceTo(base);
      const v = T.viewmodelDbg?.();
      let vd = null;
      if (v && v.gun && v.gun.bolt && v.gun.boltBase) vd = v.gun.bolt.position.distanceTo(v.gun.boltBase);
      out.push({
        i,
        active: !!S.active,
        hand: +(S.hand || 0).toFixed(3),
        open: +(S.open || 0).toFixed(3),
        back: +(S.back || 0).toFixed(3),
        worldD: +d.toFixed(4),
        viewD: vd != null ? +vd.toFixed(4) : null,
        handPlace: v?.info?.handPlace || null,
        boltHandSt: +(T.vmStateDbg?.()?.boltHand || 0).toFixed(3),
        cd: +(T /* no get */ , 0)
      });
    }
    // Cadence gate: while active, another fire edge must not consume a round
    const ammoBefore = (() => {
      try { return T.weaponMeshes.sniper && (T /* use setAmmo path */); } catch { return null; }
    })();
    // Read ammo via sync — grant path: fire while active and check cycles don't double
    const cyclesBefore = (g.userData.boltCycle && g.userData.boltCycle.cycles) || 0;
    // Restart a fresh shot cycle to test gate: finish current, fire, then try fire mid-cycle
    while (g.userData.boltCycle && g.userData.boltCycle.active) T.stepFrame(1 / 60);
    T.setAmmoDbg?.('sniper', 4);
    T.flightInput({ fire: true }); T.stepFrame(1 / 60); T.flightInput({ fire: false });
    // advance until active
    for (let i = 0; i < 20 && !(g.userData.boltCycle && g.userData.boltCycle.active); i++) T.stepFrame(1 / 60);
    const midActive = !!(g.userData.boltCycle && g.userData.boltCycle.active);
    const cyclesMid = (g.userData.boltCycle && g.userData.boltCycle.cycles) || 0;
    // try to fire again mid-cycle (semi needs edge)
    T.flightInput({ fire: true }); T.stepFrame(1 / 60); T.flightInput({ fire: false });
    for (let i = 0; i < 5; i++) T.stepFrame(1 / 60);
    const cyclesAfter = (g.userData.boltCycle && g.userData.boltCycle.cycles) || 0;
    T.flightHold(false);
    return { samples: out, midActive, cyclesMid, cyclesAfter, gateHeld: cyclesAfter === cyclesMid };
  })()`, 300000);

  fs.writeFileSync(path.join(OUT, 'probe-after-shot.json'), JSON.stringify({ setup, afterShot }, null, 2));
  const peak = afterShot.samples.filter((s) => s.active && s.hand > 0.3);
  console.log('shot peaks', peak.length, 'gateHeld', afterShot.gateHeld, 'midActive', afterShot.midActive);
  console.log('sample handPlaces during active', [...new Set(afterShot.samples.filter(s => s.active).map(s => s.handPlace))]);

  // Capture mid-bolt screenshot
  await page.evaluate(`(async () => {
    const T = TT;
    T.setViewFirstDbg(true);
    T.setAmmoDbg?.('sniper', 4);
    T.flightHold(true);
    T.flightInput({ fire: true }); T.stepFrame(1/60); T.flightInput({ fire: false });
    for (let i = 0; i < 80; i++) {
      T.stepFrame(1/60);
      const S = T.weaponMeshes.sniper.userData.boltCycle || {};
      if (S.active && (S.hand || 0) > 0.5) break;
    }
    T.flightHold(false);
    // let a real frame render
    await new Promise((r) => setTimeout(r, 80));
  })()`, 120000);
  await page.screenshot(path.join(OUT, 'after-shot-bolt.png'));

  // Reload empty: handPlace should be bolt during work, not work-on-forend
  const reloadSamples = await page.evaluate(`(async () => {
    const T = TT;
    T.setAmmoDbg?.('sniper', 0);
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
      await new Promise((q) => setTimeout(q, 30));
      const g = T.weaponMeshes.sniper;
      const base = g.userData.baseBoltPos;
      const d = g.userData.bolt.position.distanceTo(base);
      const v = T.viewmodelDbg?.();
      const r = T.getReloadDbg();
      out.push({
        u: +(1 - (r?.timer || 0) / (r?.anim || 1)).toFixed(3),
        handPlace: v?.info?.handPlace || null,
        boltHandSt: +(T.vmStateDbg?.()?.boltHand || 0).toFixed(3),
        worldD: +d.toFixed(4)
      });
    }
    while (T.isReloading()) await new Promise((q) => setTimeout(q, 40));
    return out;
  })()`, 300000);
  fs.writeFileSync(path.join(OUT, 'probe-after-reload.json'), JSON.stringify(reloadSamples, null, 2));
  console.log('reload', JSON.stringify(reloadSamples, null, 2));

  await page.evaluate(`(async () => {
    const T = TT;
    T.setAmmoDbg?.('sniper', 0);
    T.startReload();
    const t0 = Date.now();
    while (Date.now() - t0 < 25000) {
      const r = T.getReloadDbg();
      if (!T.isReloading()) break;
      if ((1 - r.timer / r.anim) >= 0.75) break;
      await new Promise((q) => setTimeout(q, 8));
    }
    await new Promise((q) => setTimeout(q, 40));
  })()`, 60000);
  await page.screenshot(path.join(OUT, 'after-reload-u75.png'));

  console.log('DONE after probe');
} catch (e) {
  console.log('FAIL', e.stack || e);
  process.exitCode = 1;
} finally {
  try { await browser.close(); } catch {}
  try { server.close(); } catch {}
}
