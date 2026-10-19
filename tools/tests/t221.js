// t221 - GB-146 (Jerry, 2026-10-09: "The sniper bolt is on the wrong side. Move it to the other side of the gun and make
// an animation for the bolt action in-between shots").
//  - the model: every part of the bolt handle is on the gun's right (gun-local -x), the knob furthest out, and the
//    support hand's grab point is the knob;
//  - a shot that leaves a round works the bolt: up (the knob rises), back, forward, down, all inside the wait the gun
//    already has between shots: it starts after the shot, is over while fireCooldown is still running, and the next
//    shot still comes at the gun's interval (shotInterval('sniper'), unchanged); no round is fired during it;
//  - the case comes out on the pull, on the gun's right, moving right;
//  - the last round: no cycle (the reload's bolt beat works it);
//  - the support hand on the knob mid-cycle: needs the arm IK, SKIP on the test page (Matrix4.transpose stub), measured
//    on the real renderer (handoffs/2026-10-09-grokbot-GB-146/sniper-real.mjs t221).
(async () => {
  const T = window.TT; const out = []; const ok = (c, m) => out.push((c ? 'PASS ' : 'FAIL ') + m);
  const info = (m) => out.push('INFO ' + m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const THREE = T.THREE || window.THREE, V = () => new THREE.Vector3();
  const f3 = (n) => (+n).toFixed(3);
  const tm = new THREE.Matrix4().makeRotationX(0.3), tmE = tm.elements.slice(); tm.transpose();
  const ikWorks = tm.elements[6] === tmE[9] && tm.elements[9] === tmE[6] && tmE[6] !== tmE[9];
  const ikOk = (c, m) => out.push(ikWorks ? (c ? 'PASS ' : 'FAIL ') + m : 'SKIP (test-page arm IK inert) ' + m);
  let aimer = null;
  try {
    if (typeof startMatch === 'function' && !(T.getPhase && T.getPhase() === 'prep' && T.weaponMeshes)) await startMatch(T, 'Sniper bolt');
    T.clearZombies && T.clearZombies(); T.setHp(100000); T.grantAllWeapons();
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'F13', key: 'F13', bubbles: true }));   // busy: no idle
    const m = T.marine || window.worldMarine, ud = m.userData;
    const pin = () => { const p = T.player.position; T.aimTarget.set(p.x, T.sampleHeight(p.x, p.z) + 1.25, p.z + 10); };
    aimer = setInterval(pin, 5); pin();
    const palmL = () => ud.elbowLG.localToWorld(V().set(0.02, -0.27, 0.13));
    for (let i = 0; i < 16 && T.getCurrentWeapon() !== 'sniper'; i++) T.setWeapon(i);
    await new Promise((r) => { const t0 = Date.now(); const f = () => (T.getCurrentWeapon() === 'sniper' && T.getSwapDbg().swapT <= 0 && !(T.drawDbg && T.drawDbg().active)) || Date.now() - t0 > 6000 ? r() : setTimeout(f, 50); f(); });
    await wait(1500);
    ok(T.getCurrentWeapon() === 'sniper', 'the sniper is in hand');
    const gun = T.weaponMeshes.sniper, bolt = gun.userData.bolt;
    ok(!!bolt, 'the sniper has its bolt handle');

    // The model: the handle on the gun's right.
    gun.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(gun.matrixWorld).invert(), v = V();
    let minX = 1e9, maxX = -1e9;
    bolt.traverse((o) => {
      const pa = o.isMesh && o.geometry && o.geometry.attributes && o.geometry.attributes.position; if (!pa) return;
      const mm = new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld);
      for (let i = 0; i < pa.count; i++) { v.fromBufferAttribute(pa, i).applyMatrix4(mm); minX = Math.min(minX, v.x); maxX = Math.max(maxX, v.x); }
    });
    ok(maxX < 0, 'the whole bolt handle is on the gun\'s right, gun-local x < 0 (x ' + f3(minX) + ' .. ' + f3(maxX) + ')');
    ok(minX < -0.08, 'the knob stands out on the right (' + f3(minX) + ')');
    ok(gun.userData.boltSide === -1, 'gun.userData.boltSide is -1');
    const grab = bolt.userData.gb145Grab;
    const knobL = () => { gun.updateMatrixWorld(true); return gun.worldToLocal(bolt.localToWorld(grab.clone())); };
    const knob0 = grab && knobL();
    ok(!!grab && knob0.x < -0.1, 'the hand\'s grab point is the knob (gun-local x ' + (knob0 ? f3(knob0.x) : '-') + ')');

    const I = T.WEAPON_STATS.sniper.interval;
    ok(Math.abs(I - 0.9) < 1e-9 && T.WEAPON_STATS.sniper.damage === 92 && T.WEAPON_STATS.sniper.maxAmmo === 5, 'the sniper\'s interval (0.9 s), damage (92) and magazine (5) are unchanged');
    const casingList = () => (T.m240VisDbg ? T.m240VisDbg().casingsList : []);

    // Two shots from a full magazine: the trigger pulled for the first, let go, pulled again as soon as the gun allows.
    const ammo = () => T.getAmmo().sniper;
    T.setAmmoDbg('sniper', 5); await wait(1200);
    const seen = new Set(casingList()), newCases = [];
    const S0 = () => gun.userData.boltCycle || {};
    const cycles0 = S0().cycles || 0;
    const log = [], shotAt = [];
    // Game time (TT.getSimTime, GB-131), not the wall clock: the real renderer runs slow and the sim's dt is capped.
    const now = () => (T.getSimTime ? T.getSimTime() * 1000 : performance.now());
    let last = ammo(), held = true, kUp = 0, kBack = 0, handWorst = 0, handN = 0;
    const t0 = now(), w0 = Date.now();
    T.setMouseFireDbg(true);
    while (Date.now() - w0 < 40000 && now() - t0 < 4000 && shotAt.length < 2) {
      const t = now() - t0, S = S0(), a = ammo();
      if (a < last) shotAt.push(t);
      last = a;
      // GB-181: its throw as it leaves the port (the live c.vx is read seconds later, after the bounce or the settle).
      for (const c of casingList()) if (!seen.has(c)) { seen.add(c); newCases.push({ t, c, v: { x: c.vx, y: c.vy, z: c.vz }, age: c.age, b: c.bounced, s: c.settled, q: gun.getWorldQuaternion(new THREE.Quaternion()).invert() }); }
      log.push({ t, active: !!S.active, c: S.c || 0, open: S.open || 0, back: S.back || 0, hand: S.hand || 0, cd: T.getSwapDbg().fireCooldown, a });
      if (S.active && knob0) {
        const k = knobL(); kUp = Math.max(kUp, k.y - knob0.y); kBack = Math.max(kBack, knob0.z - k.z);
        if (S.hand > 0.95) { m.updateMatrixWorld(true); handWorst = Math.max(handWorst, palmL().distanceTo(bolt.localToWorld(grab.clone()))); handN++; }
      }
      if (held && shotAt.length === 1) { held = false; T.setMouseFireDbg(false); }
      // Semi-automatic: a fresh pull once the gun will take it (fireCooldown run out, the bolt long home).
      if (!held && shotAt.length === 1 && !S.active && log.some((l) => l.active) && T.getSwapDbg().fireCooldown <= 0) { held = true; T.setMouseFireDbg(true); }
      await wait(5);
    }
    T.setMouseFireDbg(false);
    ok(shotAt.length === 2, 'two shots fired (' + shotAt.map((x) => (x / 1000).toFixed(3) + ' s').join(', ') + ')');
    const [t1, t2] = shotAt;
    const act = log.filter((l) => l.active && l.t >= t1 && (t2 == null || l.t < t2));
    ok(S0().cycles >= cycles0 + 1 && act.length > 0, 'the bolt is worked after the first shot (' + act.length + ' frames)');
    if (act.length) {
      const a0 = act[0].t, a1 = act[act.length - 1].t;
      const after = log.find((l) => l.t > a1 && !l.active);
      ok(a0 >= t1, 'the cycle starts after the shot (+' + ((a0 - t1) / 1000).toFixed(3) + ' s)');
      ok(t2 == null || a1 < t2, 'and is over before the next shot (last frame ' + ((a1 - t1) / 1000).toFixed(3) + ' s after the shot; next shot at ' + (t2 != null ? ((t2 - t1) / 1000).toFixed(3) : '-') + ' s)');
      ok(!!after && after.cd > 0, 'the bolt is home while fireCooldown is still running (' + (after ? f3(after.cd) : '-') + ' s left)');
      ok(act.every((l) => l.a === act[0].a), 'no round goes off during the cycle');
      ok(Math.max(...act.map((l) => l.open)) > 0.9 && Math.max(...act.map((l) => l.back)) > 0.9, 'it goes all the way: up and back (open ' + f3(Math.max(...act.map((l) => l.open))) + ', back ' + f3(Math.max(...act.map((l) => l.back))) + ')');
      const iBack = act.findIndex((l) => l.back > 0.5), iUp = act.findIndex((l) => l.open > 0.5);
      ok(iUp >= 0 && iBack >= iUp, 'up before back');
      const peakBack = act.reduce((b, l, k) => (l.back > act[b].back ? k : b), 0);
      ok(act.slice(peakBack).some((l) => l.back < 0.2 && l.open > 0.5), 'then forward before it turns down');
    }
    ok(kUp > 0.03, 'the knob rises as the bolt is turned up (' + f3(kUp) + ' m)');
    ok(kBack > 0.07, 'and comes back with the bolt (' + f3(kBack) + ' m)');
    if (t2 != null) ok(t2 - t1 >= I * 1000 * 0.95 - 20 && t2 - t1 <= I * 1000 + 300, 'the next shot comes at the gun\'s interval (' + ((t2 - t1) / 1000).toFixed(3) + ' s, interval ' + I + ' s)');
    ikOk(handN > 0 && handWorst < 0.06, 'the support hand is on the knob through the cycle (' + handN + ' frames, worst ' + f3(handWorst) + ' m)');
    const c1 = newCases.find((n) => n.t >= t1 && (t2 == null || n.t < t2));
    ok(!!c1, 'the first shot\'s case comes out');
    if (c1) {
      ok(c1.t - t1 > 0.2 * 1000, 'on the bolt\'s pull, not on the shot (+' + ((c1.t - t1) / 1000).toFixed(3) + ' s)');
      const q = c1.q;
      const vl = V().set(c1.v.x, c1.v.y, c1.v.z).applyQuaternion(q);
      ok(vl.x < -1, 'thrown out to the gun\'s right (gun-local vx ' + f3(vl.x) + '; world ' + [c1.v.x, c1.v.y, c1.v.z].map(f3).join(',') + ' age ' + f3(c1.age) + (c1.b ? ' bounced' : '') + (c1.s ? ' settled' : '') + ')');
    }
    for (let w1 = Date.now(); (S0().cycles || 0) < cycles0 + 2 && Date.now() - w1 < 10000;) await wait(10);   // the second shot's cycle
    for (let w1 = Date.now(); S0().active && Date.now() - w1 < 30000;) await wait(20);
    await wait(300);
    const kHome = knob0 && knobL();
    ok(!!kHome && kHome.distanceTo(knob0) < 0.002, 'the bolt is home after the cycle (' + (kHome ? f3(kHome.distanceTo(knob0)) : '-') + ' m)');

    // The last round: no cycle; the reload works the bolt and throws that case.
    T.setAmmoDbg('sniper', 1); await wait(300);
    for (let w1 = Date.now(); (S0().active || T.getSwapDbg().fireCooldown > 0) && Date.now() - w1 < 30000;) await wait(20);
    const cyc = S0().cycles, seen2 = new Set(casingList());
    let sawActive = false, lastShot = false, reloadCase = false, reloadSeen = false;
    T.setMouseFireDbg(true);
    const t3 = Date.now();
    while (Date.now() - t3 < 60000) {
      if (ammo() === 0) lastShot = true;
      if (lastShot && !reloadSeen && !T.getReloadDbg().weapon) { T.setMouseFireDbg(false); await wait(150); if (!T.getReloadDbg().weapon) T.startReload(); }   // he reloads (R)
      if (S0().active) sawActive = true;
      if (T.getReloadDbg().weapon) reloadSeen = true;
      for (const c of casingList()) if (!seen2.has(c)) { seen2.add(c); if (T.getReloadDbg().weapon) reloadCase = true; }
      if (reloadSeen && !T.getReloadDbg().weapon) break;
      await wait(10);
    }
    T.setMouseFireDbg(false);
    ok(lastShot, 'the last round fired');
    ok(!sawActive && S0().cycles === cyc, 'no bolt cycle after the last round');
    ok(reloadSeen, 'the reload runs');
    if (reloadSeen) ok(reloadCase, 'the last round\'s case comes out on the reload\'s bolt pull');
  } catch (e) { ok(false, 'threw ' + (e && e.stack || e)); }
  if (aimer) clearInterval(aimer);
  return out.join('\n');
})();
