// t95 - GB-69 (P-8): the laser does what the kiosk sells ("Tighter groups"). While it's on and the gun in hand
// carries one, aimDirWithSpread's random cone is x0.8. 200 samples with the same random draws, laser off and on,
// give x0.8 within 5% on every gun with a laser (the shotgun's pellet cone too); 2000 free draws agree. Off, or
// without the kiosk gear, or on the chainsaw, nothing changes. Recoil climb is the gun's and is left alone.
(async () => {
  const T = window.TT; const out = [];
  const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const f3 = (v) => (+v).toFixed(3);
  const errs = []; window.addEventListener('error', (e) => errs.push(String((e.error && e.error.stack) || e.message || e.error).slice(0, 600)));
  const W = ['minigun', 'm4', 'ak', 'pistol', 'uzi', 'shotgun', 'aa12', 'revolver', 'sniper', 'launcher', 'flamer', 'chainsaw'];
  const seeded = (seed) => () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  // Mean angle (rad) off the aim over n draws; with a seed, both runs see the same draws.
  const meanAngle = (n, spread, seed) => {
    const rnd = Math.random; if (seed != null) Math.random = seeded(seed);
    let sum = 0;
    try {
      const aim = T.getAimDirDbg();
      for (let i = 0; i < n; i++) { T.resetSprayDbg(); const d = T.aimDirWithSpreadDbg(spread); sum += Math.acos(Math.max(-1, Math.min(1, d.dot(aim)))); }
    } finally { Math.random = rnd; }
    return sum / n;
  };
  try {
    await startMatch(T, 'Laser');
    T.clearZombies && T.clearZombies(); T.skipGrace && T.skipGrace(); T.runDevCommand('godmode');
    T.grantAllWeapons();
    const p = T.player.position; p.set(12, T.sampleHeight(12, 12), 12);
    T.setWeapon(W.indexOf('ak')); await wait(300);
    ok(T.LASER_SPREAD_MUL === 0.8, 'the pick is x0.8 (' + T.LASER_SPREAD_MUL + ')');

    // (1) Off by default: no change.
    T.setLasersDbg(false);
    ok(!T.laserSteadies(), 'laser off: the cone is the gun\'s own');

    // (2) Every gun with a laser: 200 samples, same draws, off vs on.
    const bad = [], seen = [];
    for (const w of W) {
      if (w === 'chainsaw' || w === 'flamer') continue;
      T.setWeapon(W.indexOf(w)); await wait(120);
      const spread = w === 'shotgun' || w === 'aa12' ? 0.14 : 0;   // the pellet cone the shotgun passes in
      T.setLasersDbg(false); const off = meanAngle(200, spread, 1234 + seen.length);
      T.setLasersDbg(true); const steady = T.laserSteadies(); const on = meanAngle(200, spread, 1234 + seen.length);
      const k = off > 0 ? on / off : NaN;
      seen.push(w + ' ' + f3(k));
      if (!steady || !(Math.abs(k - 0.8) <= 0.04)) bad.push(w + ' ' + f3(off * 1000) + '->' + f3(on * 1000) + ' mrad (steady ' + steady + ')');
    }
    ok(!bad.length && seen.length === 10, 'every gun with a laser, 200 draws each: x0.8 within 5% (' + (bad.length ? bad.join(', ') : seen.join(' ')) + ')');

    // (3) Free draws, the AK: 2000 each way.
    T.setWeapon(W.indexOf('ak')); await wait(120);
    T.setLasersDbg(false); const a0 = meanAngle(2000, 0);
    T.setLasersDbg(true); const a1 = meanAngle(2000, 0);
    ok(Math.abs(a1 / a0 - 0.8) <= 0.04, 'AK, 2000 free draws each: ' + f3(a0 * 1000) + ' -> ' + f3(a1 * 1000) + ' mrad (x' + f3(a1 / a0) + ')');

    // (4) Z toggles it in play, with the kiosk gear.
    T.setLasersDbg(false);
    T.setGearDbg('laser');
    T.toggleLasers();
    ok(T.laserSteadies(), 'Z (toggleLasers) with the laser sight bought: on, and it steadies');
    T.toggleLasers();
    ok(!T.laserSteadies(), 'Z again: off');

    // (5) Without the kiosk gear, a stray lasersEnabled does nothing.
    T.setLasersDbg(true);
    T.getGearOwned().laser = false;
    const n0 = meanAngle(200, 0, 77); T.setLasersDbg(false); const n1 = meanAngle(200, 0, 77);
    ok(!T.laserSteadies() && Math.abs(n0 - n1) < 1e-9, 'no laser sight owned: no change (' + f3(n0 * 1000) + ' vs ' + f3(n1 * 1000) + ' mrad)');
    T.setGearDbg('laser');

    // (6) The chainsaw carries no laser.
    T.setWeapon(W.indexOf('chainsaw')); await wait(200);
    T.setLasersDbg(true);
    ok(!T.laserSteadies(), 'the chainsaw has no laser: nothing to steady');
    T.setLasersDbg(false);

    ok(!errs.length, 'no page errors' + (errs.length ? ': ' + errs.slice(0, 2).join(' | ') : ''));
  } catch (e) { out.push('FAIL threw: ' + (e && e.stack || e.message)); }
  return out.join('\n');
})()