// tcg4 - CG-4 (ChatGPT 2's native pair probe, GT-20104: with two pistols the off hand's barrel stayed at rest while its
// slide worked, in the eye on a shot and in the world on the reload). Claude 7. The pair's left pistol keeps the
// barrel contract its right one has (CE-11 in the view, CB-331 in the world): back with the slide its first joint, then
// over the unlock its chamber drops and it tilts; home with it.
// - eye: the left view gun fires (its own shot), stepped at 60 fps: every frame its barrel is where P.barrel puts it for
//   its own slide, and the slide's travel passes the unlock (so the barrel really moved);
// - world: an akimbo reload stepped at 60 fps: every frame the left pistol's barrel is where CB-331 puts it for its slide.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (f, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (f()) return true; await wait(50); } return !!f(); };
  try {
    await startMatch(T, 'CG4');
    T.clearZombies && T.clearZombies(); T.setHp(100000); T.grantAllWeapons();
    const take = async (w) => { if (T.isUnarmed && T.isUnarmed()) T.toggleHolster(); for (let i = 0; i < 16 && T.getCurrentWeapon() !== w; i++) { T.setWeapon(T.WEAPON_ORDER.indexOf(w)); await wait(150); } return T.getCurrentWeapon() === w; };
    if (!T.viewmodelDbg || !T.setViewFirstDbg || !T.setDualOwnedDbg || !T.toggleDualWieldDbg) { ok(false, 'the view and dual hooks are there'); return out.join('\n'); }
    const VM = () => T.viewmodelDbg();
    ok(await take('pistol'), 'a pistol in hand');
    T.setViewFirstDbg(true);
    T.setDualOwnedDbg('pistol', true);
    const armory = T.armoryDbg.ui().armory;
    if (!armory.has('pistol:second')) armory.buy({ id: 'pistol:second', kind: 'pistol', loaded: null }, { store: true });
    armory.take('pistol:second', 'secondary', 0);
    for (let i = 0; i < 3 && !(VM() && VM().info.akimbo); i++) { T.toggleDualWieldDbg(); await until(() => VM() && VM().info.akimbo, 3000); }
    ok(await until(() => VM() && VM().info.active && VM().info.akimbo && VM().info.raise > 0.99, 20000), 'first person with the pair: both view guns up');
    const vm = VM();
    if (!vm || !vm.gun || !vm.gun2) { ok(false, 'two view guns'); return out.join('\n'); }
    // --- the eye: the left gun's own shot ---
    const g2 = vm.gun2, br = g2.barrel, bb = g2.barrelBase;
    ok(!!(br && bb && g2.work && g2.workBase), 'the left view pistol has its barrel and slide');
    if (br && bb && g2.work && g2.workBase) {
      const dt = 1 / 60, base = Object.assign({}, T.vmStateDbg ? T.vmStateDbg() : {}, { want: true, weapon: 'pistol', akimbo: true, ads: 0, vx: 0, vz: 0, vy: 0, grounded: true, reloadU: null, settled: false, sprint: false, stream: false });
      T.flightHold(true);   // only our steps drive the view
      const step = () => vm.update(dt, Object.assign({}, base));
      for (let i = 0; i < 30; i++) step();
      g2.src.userData.shots = (g2.src.userData.shots | 0) + 1;   // the left gun fired (index.html counts its own shots)
      let maxS = 0, maxU = 0, moved = 0, eworst = 0;
      for (let f = 0; f < 40; f++) {
        step();
        const s = Math.max(0, g2.workBase.z - g2.work.position.z); maxS = Math.max(maxS, s);
        const d = Math.hypot(br.position.y - bb.y, br.position.z - bb.z) + Math.abs(br.rotation.x - bb.rx); moved = Math.max(moved, d);
        { const j = Math.min(s, 0.004), u = Math.min(1, Math.max(0, (s - 0.004) / 0.004));   // the pistol's table (viewmodel-poses: joint .004, unlock .004, drop .010, tilt -.05)
          const e = Math.max(Math.abs(br.position.x - bb.x), Math.abs(br.position.y - (bb.y - 0.010 * u)), Math.abs(br.position.z - (bb.z - j)), Math.abs(br.rotation.x - (bb.rx - 0.05 * u)));
          eworst = Math.max(eworst, e); maxU = Math.max(maxU, u); }
      }
      ok(maxS > 0.004, 'the left view slide works on its own shot (travel ' + (maxS * 1000).toFixed(1) + ' gun mm)');
      ok(moved > 1e-3, 'and its barrel moves with it (' + (moved * 1000).toFixed(1) + ' mm / rad)');
      ok(maxU > 0.99, 'its slide passes the unlock (u up to ' + maxU.toFixed(2) + ')');
      ok(eworst < 1e-4, 'every frame the left view barrel is where the table puts it for its own slide (worst ' + eworst.toExponential(1) + ')');
      for (let f = 0; f < 60; f++) step();
      const home = Math.hypot(br.position.y - bb.y, br.position.z - bb.z) + Math.abs(br.rotation.x - bb.rx);
      ok(home < 1e-4, 'and home with the slide after (' + home.toExponential(1) + ')');
    }
    // --- the world: the pair's reload ---
    T.flightHold(false); T.setViewFirstDbg(false); await wait(300); T.flightHold(true);
    const off = T.offhandMeshes && T.offhandMeshes.pistol, ud = off && off.userData, b = ud && ud.barrelAssembly;
    ok(!!(b && ud.slide && ud.baseSlidePos), 'the left world pistol has its slide and barrel assembly');
    if (b && ud.slide && ud.baseSlidePos) {
      const base = { x: b.position.x, y: b.position.y, z: b.position.z, rx: ud.baseBarrelRotX || 0 };
      let worst = 0, maxU = 0, n = 0;
      T.setAmmoDbg && T.setAmmoDbg('pistol', 0);
      T.startReload();
      for (let f = 0; f < 900 && (f < 5 || T.isReloading()); f++) {
        T.stepFrame(1 / 60);
        const s = Math.max(0, ud.baseSlidePos.z - ud.slide.position.z), j = Math.min(s, 0.004), u = Math.min(1, Math.max(0, (s - 0.004) / 0.004));
        const e = Math.max(Math.abs(b.position.x - base.x), Math.abs(b.position.y - (base.y - 0.010 * u)), Math.abs(b.position.z - (base.z - j)), Math.abs(b.rotation.x - (base.rx - 0.05 * u)));
        worst = Math.max(worst, e); maxU = Math.max(maxU, u); n++;
      }
      ok(n > 20 && maxU > 0.99, 'the pair reload racks the left slide past the unlock (' + n + ' frames, u up to ' + maxU.toFixed(2) + ')');
      ok(worst < 1e-4, 'every frame the left barrel is where the contract puts it for its slide (worst ' + worst.toExponential(1) + ')');
    }
    ok(errs.length === 0, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 2).join(' | ') : ''));
  } catch (e) { out.push('FAIL threw: ' + (e && e.stack || e.message)); }
  try { T.flightHold(false); T.setViewFirstDbg(false); } catch (_) {}
  return out.join('\n');
})()
