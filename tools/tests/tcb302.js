// tcb302 - CB-302 (Claude 5's CE-3, J133): through an ammo change's unload his own shotgun's forend is worked once a shell: back
// by the pump's 0.12 travel and home again, the bolt with it; at its base through the load and after; a change stopped by R puts
// it back. Frames stepped at 60 a second (T.stepFrame).
(async () => {
  const T = window.TT; const out = [];
  const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (f, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (f()) return true; await wait(40); } return !!f(); };
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  try {
    const A = T.ammoDbg;
    if (!A || !T.stepFrame) { ok(false, 'the hooks are there'); return out.join('\n'); }
    await startMatch(T, 'CB302');
    T.clearZombies && T.clearZombies(); T.setHp(1e6); T.grantAllWeapons();
    if (T.isUnarmed && T.isUnarmed()) T.toggleHolster();
    for (let i = 0; i < 16 && T.getCurrentWeapon() !== 'shotgun'; i++) { T.setWeapon(T.WEAPON_ORDER.indexOf('shotgun')); await wait(150); }
    await until(() => T.getSwapDbg().swapT <= 0, 3000); await wait(400);
    ok(T.getCurrentWeapon() === 'shotgun', 'the shotgun in hand');
    const gun = T.weaponMeshes.shotgun, pump = gun.userData.pump, bp = gun.userData.basePumpPos;
    ok(!!pump && !!bp, 'it has a pump and its base');
    const back = () => +(bp.z - pump.position.z).toFixed(4);
    A.carry('shotgun', 'buckshot', 20); T.setAmmoDbg('shotgun', 3);
    const dt = 1 / 60; for (let i = 0; i < 30; i++) T.stepFrame(dt);
    ok(Math.abs(back()) < 1e-4, 'at base before (' + back() + ')');
    ok(A.start('buckshot'), 'the change starts (three out)');
    const trace = [];
    for (let i = 0; i < 90 && A.state() && A.state().phase === 'unload'; i++) { T.stepFrame(dt); trace.push(back()); }
    const peaks = trace.filter((v, i) => v > 0.11 && (i === 0 || trace[i - 1] <= 0.11)).length;
    ok(Math.max(...trace) > 0.115 && Math.max(...trace) < 0.125, 'the forend goes back by the pump\'s travel (' + Math.max(...trace).toFixed(3) + ' m)');
    ok(peaks === 3, 'once a shell: three strokes for three shells (' + peaks + ')');
    for (let i = 0; i < 400 && A.state(); i++) T.stepFrame(dt);
    ok(!A.state() && Math.abs(back()) < 1e-4, 'at base after the change (' + back() + ')');
    // stopped by R in the middle of a stroke
    A.carry('shotgun', 'birdshot', 20); T.setAmmoDbg('shotgun', 3);
    ok(A.start('birdshot'), 'another change');
    for (let i = 0; i < 12; i++) T.stepFrame(dt);
    const mid = back();
    T.startReload(); T.stepFrame(dt); T.stepFrame(dt);
    ok(mid > 0.02 && Math.abs(back()) < 1e-4, 'R stops it mid-stroke (' + mid.toFixed(3) + ' m back) and the forend goes home (' + back() + ')');
  } catch (e) { ok(false, 'threw: ' + (e && e.stack || e)); }
  ok(!errs.length, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  return out.join('\n');
})()
