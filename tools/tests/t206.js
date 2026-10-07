// t206 - GB-134 (Jerry's playthrough 1, 2026-10-06): the grenade's arc, and the launcher's. Hold G: an arc grows from a
//  short lob (a tap) to the longest throw at 3 s, to where the ground first takes it; letting go throws that throw.
//  The 40 mm launcher in hand shows its shell's arc, like the mortar's. The flight maths is in game/arcs.test.mjs.
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (f, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (f()) return true; await wait(30); } return !!f(); };
  const f2 = (v) => (+v).toFixed(2);
  try {
    await startMatch(T, 'Arcs134');
    T.clearZombies && T.clearZombies(); T.setHp(100000); T.runDevCommand && T.runDevCommand('godmode');
    const D = () => T.grenadeArcDbg();
    ok(typeof T.grenadeArcDbg === 'function' && typeof T.startGrenadeCharge === 'function' && T.GRENADE_THROW && T.GRENADE_THROW.FULL_S === 3, 'hooks: grenadeArcDbg, start/releaseGrenadeCharge, GRENADE_THROW (3 s)');
    const p = T.player.position;
    const away = (h) => Math.hypot(h.x - p.x, h.z - p.z);
    const n0 = D().n;
    ok(n0 >= 3, 'he starts with ' + n0 + ' grenades');
    // (1) Hold: the arc shows and grows; at 3 s it stops growing; letting go throws the longest throw where it said.
    ok(T.startGrenadeCharge() === true && D().charging, 'G down starts the hold');
    await until(() => D().t > 0.25 && D().visible, 3000);
    const early = D();
    ok(early.visible && early.dots === 18 && early.hit && early.hit.kind === 'ground', 'the arc shows: 18 dots to the ground (' + (early.hit && early.hit.kind) + ')');
    const d1 = away(early.hit);
    await until(() => D().t >= 3, 9000);
    await wait(250);
    const full = D();
    const d2 = away(full.hit);
    ok(full.t === 3 && d2 > d1 + 6, 'it grows with the hold: ' + f2(d1) + ' m at ' + f2(early.t) + ' s, ' + f2(d2) + ' m at 3 s (capped: ' + f2(full.t) + ')');
    const before = T.grenadesInFlight.length, want = full.hit;
    ok(T.releaseGrenadeCharge() === true, 'let go: thrown');
    const g = T.grenadesInFlight[T.grenadesInFlight.length - 1];
    ok(T.grenadesInFlight.length === before + 1 && !D().charging && !D().visible && D().n === n0 - 1, 'one grenade out, the arc gone, ' + D().n + ' left');
    ok(D().last && Math.abs(D().last.h - T.GRENADE_THROW.FAR.h) < 1e-9 && Math.abs(D().last.charge - 3) < 1e-9, 'the longest throw: ' + JSON.stringify(D().last));
    let land = null;
    { const c0 = Date.now(); let prevVy = g.vy;
      while (!land && Date.now() - c0 < 4000 && T.grenadesInFlight.includes(g)) { if (g.vy > prevVy + 0.5) land = { x: g.pos.x, z: g.pos.z }; prevVy = g.vy; await wait(10); } }
    ok(land && Math.hypot(land.x - want.x, land.z - want.z) < 2.5, 'it came down where the arc said: ' + (land ? f2(Math.hypot(land.x - want.x, land.z - want.z)) + ' m off' : 'no bounce seen'));
    await wait(1600);
    // (2) A tap lobs it short.
    ok(T.startGrenadeCharge() === true, 'G down again');
    T.releaseGrenadeCharge();
    ok(D().last && D().last.h <= T.GRENADE_THROW.LOB.h + 0.5 && D().last.charge < 0.1, 'a tap is a short lob: ' + JSON.stringify(D().last));
    await wait(1700);
    // (3) The keys: G down holds, G up throws.
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyG', key: 'g', bubbles: true }));
    const held = D().charging;
    await wait(400);
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyG', key: 'g', bubbles: true }));
    ok(held && !D().charging && D().last.charge > 0.1 && D().n === n0 - 3, 'G down holds, G up throws (held ' + f2(D().last.charge) + ' s)');
    await wait(1700);
    ok(T.startGrenadeCharge() === false && !D().charging, 'none left: G does not start a hold');
    // (4) The launcher in hand shows its shell's arc; it comes down where it said.
    const take = async (w) => {
      for (let i = 0; i < 16 && T.getCurrentWeapon() !== w; i++) T.setWeapon(i);
      await until(() => T.getCurrentWeapon() === w && T.getSwapDbg().swapT <= 0, 3000);
      await wait(250);
      return T.getCurrentWeapon() === w;
    };
    T.grantAllWeapons && T.grantAllWeapons();
    ok(await take('launcher'), 'launcher in hand');
    await until(() => D().launcher, 2000);
    const L = D();
    ok(L.launcher && L.lhit && ['ground', 'solid', 'fuse'].includes(L.lhit.kind), 'the launcher shows its arc (ends: ' + (L.lhit && L.lhit.kind) + ' at ' + (L.lhit ? f2(away(L.lhit)) : '-') + ' m)');
    const lwant = D().lhit, nb = T.grenadesInFlight.length;
    T.setMouseFireDbg(true); await wait(90); T.setMouseFireDbg(false);
    const sh = T.grenadesInFlight.find((q) => q.isShell);
    let last = null;
    { const c0 = Date.now(); while (sh && T.grenadesInFlight.includes(sh) && Date.now() - c0 < 6000) { last = { x: sh.pos.x, z: sh.pos.z }; await wait(10); } }
    ok(sh && last && Math.hypot(last.x - lwant.x, last.z - lwant.z) < 3.5, 'the shell burst where the arc ended: ' + (last ? f2(Math.hypot(last.x - lwant.x, last.z - lwant.z)) + ' m off (spread)' : 'no shell'));
    ok(await take('pistol'), 'pistol in hand');
    await wait(150);
    ok(!D().launcher, 'no launcher, no arc');
  } catch (e) { ok(false, 'threw ' + (e && e.stack || e)); }
  try { T.setMouseFireDbg && T.setMouseFireDbg(false); T.releaseGrenadeCharge && T.releaseGrenadeCharge(); } catch (_) {}
  return out.join('\n');
})();