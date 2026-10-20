// t206 - GB-134 (Jerry's playthrough 1, 2026-10-06): the grenade's arc. Hold G: an arc grows from a
//  short lob (a tap) to the longest throw, to where the ground first takes it; letting go throws that throw.
//  The 40 mm launcher draws no arc and the round flies the cursor (Jerry, 2026-10-09). The flight maths is in game/arcs.test.mjs.
//  CU-97 (Jerry, 2026-10-09): the longest throw at 1.6 s (was 3 s); the grenade's arc is one simple line, not the
//  mortar's dots; and it leaves his hand at the top of his throw, a moment after G comes up (t225 has the throw itself).
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (f, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (f()) return true; await wait(30); } return !!f(); };
  const f2 = (v) => (+v).toFixed(2);
  try {
    await startMatch(T, 'Arcs134');
    T.clearZombies && T.clearZombies(); T.setHp(100000); T.runDevCommand && T.runDevCommand('godmode');
    const D = () => T.grenadeArcDbg();
    const FULL = T.GRENADE_THROW && T.GRENADE_THROW.FULL_S;
    ok(typeof T.grenadeArcDbg === 'function' && typeof T.startGrenadeCharge === 'function' && FULL === 0.8, 'hooks: grenadeArcDbg, start/releaseGrenadeCharge, GRENADE_THROW (0.8 s)');
    const p = T.player.position;
    const away = (h) => Math.hypot(h.x - p.x, h.z - p.z);
    const n0 = D().n;
    ok(n0 >= 3, 'he starts with ' + n0 + ' grenades');
    // (1) Hold: the arc shows and grows; at 1.6 s it stops growing; letting go throws the longest throw where it said.
    ok(T.startGrenadeCharge() === true && D().charging, 'G down starts the hold');
    await until(() => D().t > 0.25 && D().visible, 3000);
    const early = D(), A = T.grenadeAnimDbg ? T.grenadeAnimDbg() : {};
    ok(early.visible && A.simple && early.dots >= 20 && early.hit && early.hit.kind === 'ground', 'the arc shows: one line of ' + early.dots + ' pieces to the ground (' + (early.hit && early.hit.kind) + ')');
    const d1 = away(early.hit);
    await until(() => D().t >= FULL, 6000);
    await wait(250);
    const full = D();
    const d2 = away(full.hit);
    ok(full.t === FULL && d2 > d1 + 6, 'it grows with the hold: ' + f2(d1) + ' m at ' + f2(early.t) + ' s, ' + f2(d2) + ' m at 0.8 s (capped: ' + f2(full.t) + ')');
    const before = T.grenadesInFlight.length, want = full.hit;
    ok(T.releaseGrenadeCharge() === true, 'let go: thrown');
    await until(() => T.grenadesInFlight.length === before + 1, 1500);   // it leaves his hand at the top of the swing
    const g = T.grenadesInFlight[T.grenadesInFlight.length - 1];
    ok(T.grenadesInFlight.length === before + 1 && !D().charging && !D().visible && D().n === n0 - 1, 'one grenade out, the arc gone, ' + D().n + ' left');
    ok(D().last && Math.abs(D().last.h - T.GRENADE_THROW.FAR.h) < 1e-9 && Math.abs(D().last.charge - FULL) < 1e-9, 'the longest throw: ' + JSON.stringify(D().last));
    let land = null;
    { const c0 = Date.now(); let prevVy = g.vy;
      while (!land && Date.now() - c0 < 4000 && T.grenadesInFlight.includes(g)) { if (g.vy > prevVy + 0.5) land = { x: g.pos.x, z: g.pos.z }; prevVy = g.vy; await wait(10); } }
    ok(land && Math.hypot(land.x - want.x, land.z - want.z) < 2.5, 'it came down where the arc said: ' + (land ? f2(Math.hypot(land.x - want.x, land.z - want.z)) + ' m off' : 'no bounce seen'));
    { const s0 = T.getSimTime(), w0 = Date.now(); while (T.getSimTime() - s0 < 1.6 && Date.now() - w0 < 15000) await wait(50); }   // GB-202 sweep: game time (the 0.6 s cooldown and the throw swing run on it)
    // (2) A tap lobs it short.
    ok(T.startGrenadeCharge() === true, 'G down again');
    T.releaseGrenadeCharge();
    await until(() => D().n === n0 - 2, 1500);
    ok(D().last && D().last.h <= T.GRENADE_THROW.LOB.h + 0.5 && D().last.charge < 0.1, 'a tap is a short lob: ' + JSON.stringify(D().last));
    { const s0 = T.getSimTime(), w0 = Date.now(); while (T.getSimTime() - s0 < 1.7 && Date.now() - w0 < 15000) await wait(50); }   // GB-202 sweep: game time (the 0.6 s cooldown and the throw swing run on it)
    // (3) The keys: G down holds, G up throws.
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyG', key: 'g', bubbles: true }));
    const held = D().charging;
    await wait(400);
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyG', key: 'g', bubbles: true }));
    await until(() => D().n === n0 - 3, 1500);
    ok(held && !D().charging && D().last.charge > 0.1 && D().n === n0 - 3, 'G down holds, G up throws (held ' + f2(D().last.charge) + ' s)');
    { const s0 = T.getSimTime(), w0 = Date.now(); while (T.getSimTime() - s0 < 1.7 && Date.now() - w0 < 15000) await wait(50); }   // GB-202 sweep: game time (the 0.6 s cooldown and the throw swing run on it)
    ok(T.startGrenadeCharge() === false && !D().charging, 'none left: G does not start a hold');
    // (4) The 40 mm draws no arc. The round leaves along the cursor and stays on that line.
    const take = async (w) => {
      for (let i = 0; i < 16 && T.getCurrentWeapon() !== w; i++) T.setWeapon(i);
      await until(() => T.getCurrentWeapon() === w && T.getSwapDbg().swapT <= 0, 3000);
      await wait(250);
      return T.getCurrentWeapon() === w;
    };
    T.grantAllWeapons && T.grantAllWeapons();
    ok(await take('launcher'), 'launcher in hand');
    const ax = p.x, az = p.z + 24;
    if (T.levelGroundRect) T.levelGroundRect(p.x - 6, p.z - 6, ax + 6, az + 6, T.sampleHeight(p.x, p.z), 4);
    p.y = T.sampleHeight(p.x, p.z);
    T.setAimTargetDbg(ax, az);
    await wait(200);
    ok(!D().launcher, 'the launcher draws no arc');
    T.setMouseFireDbg(true); await wait(40); T.setMouseFireDbg(false);
    const sh = T.grenadesInFlight.find((q) => q.direct);
    const aim = T.aimTarget;
    const toAim = sh ? { x: aim.x - sh.pos.x, y: aim.y - sh.pos.y, z: aim.z - sh.pos.z } : null;
    const spd0 = sh ? Math.hypot(sh.vx, sh.vy, sh.vz) : 0;
    const aimL = toAim ? Math.hypot(toAim.x, toAim.y, toAim.z) : 1;
    const dot = sh ? (sh.vx * toAim.x + sh.vy * toAim.y + sh.vz * toAim.z) / ((spd0 * aimL) || 1) : 0;
    ok(!!sh && dot > 0.98, 'the shell leaves along the cursor (' + dot.toFixed(3) + ')');
    const vy0 = sh ? sh.vy : 0, o = sh ? { x: sh.pos.x, y: sh.pos.y, z: sh.pos.z } : null;
    const dir = sh ? { x: sh.vx / spd0, y: sh.vy / spd0, z: sh.vz / spd0 } : null;
    await wait(220);
    if (sh && T.grenadesInFlight.includes(sh)) {
      const wx = sh.pos.x - o.x, wy = sh.pos.y - o.y, wz = sh.pos.z - o.z;
      const along = wx * dir.x + wy * dir.y + wz * dir.z;
      const off = Math.hypot(wx - dir.x * along, wy - dir.y * along, wz - dir.z * along);
      ok(off < 0.35 && Math.abs(sh.vy - vy0) < 0.4, 'it stays on that line (' + f2(off) + ' m off, vy ' + f2(sh.vy - vy0) + ')');
    } else ok(false, 'the shell was gone before the line could be read');
    ok(await take('pistol'), 'pistol in hand');
    await wait(150);
    ok(!D().launcher, 'still no launcher arc');
  } catch (e) { ok(false, 'threw ' + (e && e.stack || e)); }
  try { T.setMouseFireDbg && T.setMouseFireDbg(false); T.releaseGrenadeCharge && T.releaseGrenadeCharge(); } catch (_) {}
  return out.join('\n');
})();