// t139 - GB-105 (P-129, D-65): the hearing rule and the suppressor's cost. A shot is heard within its gun's radius;
// a sleeping post with a guard inside it wakes ('shot') and comes. Unsuppressed M4 fire wakes a guard 40 m off;
// suppressed, the radius is SUPPRESSED_HEARING_MUL of it and the guard sleeps on; a suppressed sniper still wakes one
// at 20 m (past the 18 m walk-up wake). Suppressed rounds hit SUPPRESSED_DAMAGE_MUL (0.9) as hard.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const errs = []; window.addEventListener('error', (e) => errs.push(String(e.message || e.error)));
  try {
    await startMatch(T, 'Hearing');
    T.clearZombies(); T.skipGrace && T.skipGrace(); T.runDevCommand('godmode');
    T.setDay(5); T.startPrep(); await wait(300);
    T.clearZombies();
    T.addCash(50000); T.grantAllWeapons();
    const W = T.WEAPON_ORDER;
    const toGun = async (w) => { T.setWeapon(W.indexOf(w)); await wait(600); return T.getCurrentWeapon() === w; };
    const P = T.player.position;
    ok(T.shotHearingRadius('m4') >= 40 && T.shotHearingRadius('m4') * T.SUPPRESSED_HEARING_MUL < 40, 'M4 heard to ' + T.shotHearingRadius('m4') + ' m, suppressed to ' + (T.shotHearingRadius('m4') * T.SUPPRESSED_HEARING_MUL).toFixed(1) + ' m');
    // A sleeping guard `d` m east of him; he shoots one round due west, away from it.
    const guardAt = (d) => {
      T.clearZombies();
      const g = T.spawnZombie(P.x + d, P.z, 'shambler', true, true);
      g.riseT = 0; g.poiGuard = { x: P.x + d, z: P.z, n: 1, kind: 'test' }; g.poiAwake = false;
      return g;
    };
    const shootWest = async () => {
      T.setAimTargetDbg(P.x - 30, P.z); T.setAimYawDbg(Math.atan2(-30, 0));
      const s0 = T.heardShotDbg().lastShotNoise;
      T.setMouseFireDbg(true); await wait(250); T.setMouseFireDbg(false); await wait(150);
      const s1 = T.heardShotDbg().lastShotNoise;
      return s1 && s1 !== s0 ? s1 : null;
    };
    const hold = (g) => { g.mesh.position.x = g.poiGuard.x; g.mesh.position.z = g.poiGuard.z; };
    ok(await toGun('m4'), 'M4 in hand');
    let g = guardAt(40); await wait(300);
    ok(!g.poiAwake, 'a guard 40 m off sleeps while he stands there');
    let shot = await shootWest(); hold(g);
    ok(!!shot && shot.w === 'm4' && !shot.suppressed, 'the M4 shot was heard (radius ' + (shot && shot.r) + ')');
    ok(g.poiAwake && g.poiWake === 'shot', 'unsuppressed, the guard at 40 m wakes: ' + g.poiAwake + ' (' + g.poiWake + ')');
    // Damage bare, from the round it fired.
    const lastDmg = () => { const p = T.projectiles[T.projectiles.length - 1]; return p ? p.damage : null; };
    T.clearZombies(); await wait(100);
    T.setAimTargetDbg(P.x - 30, P.z);
    T.setMouseFireDbg(true); await wait(120); const bareDmg = lastDmg(); T.setMouseFireDbg(false); await wait(150);
    // The can.
    T.buySuppressor('m4');
    g = guardAt(40); await wait(300);
    shot = await shootWest(); hold(g); await wait(200);
    ok(!!shot && shot.suppressed && Math.abs(shot.r - T.shotHearingRadius('m4')) < 1e-9, 'suppressed M4 shot heard to ' + (shot && shot.r.toFixed(1)) + ' m');
    ok(!g.poiAwake, 'suppressed, the guard at 40 m sleeps on (' + g.poiAwake + ')');
    g = guardAt(22); await wait(300);
    shot = await shootWest(); hold(g); await wait(200);
    ok(!g.poiAwake, 'suppressed, a guard at 22 m sleeps on too');
    T.clearZombies(); await wait(100);
    T.setAimTargetDbg(P.x - 30, P.z);
    T.setMouseFireDbg(true); await wait(120); const supDmg = lastDmg(); T.setMouseFireDbg(false); await wait(150);
    ok(bareDmg > 0 && Math.abs(supDmg / bareDmg - T.SUPPRESSED_DAMAGE_MUL) < 1e-6, 'a suppressed M4 round hits ' + (supDmg && supDmg.toFixed(2)) + ' vs ' + (bareDmg && bareDmg.toFixed(2)) + ' bare (x' + T.SUPPRESSED_DAMAGE_MUL + ')');
    // The suppressed sniper still carries past the walk-up wake.
    T.buySuppressor('sniper');
    ok(await toGun('sniper'), 'sniper in hand');
    const rs = T.shotHearingRadius('sniper');
    g = guardAt(20); await wait(300);
    ok(!g.poiAwake, 'a guard at 20 m sleeps before the shot');
    shot = await shootWest(); hold(g);
    ok(rs > 20 && g.poiAwake && g.poiWake === 'shot', 'a suppressed sniper (heard to ' + rs.toFixed(1) + ' m) wakes the guard at 20 m (' + g.poiWake + ')');
    T.clearZombies();
    ok(errs.length === 0, 'no page errors (' + errs.slice(0, 2).join(' | ') + ')');
  } catch (e) {
    out.push('FAIL threw: ' + (e && e.stack || e.message));
  }
  T.setMouseFireDbg && T.setMouseFireDbg(false);
  return out.join('\n');
})()
